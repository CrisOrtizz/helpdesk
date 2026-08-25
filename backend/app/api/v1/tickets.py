import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, status
from sqlalchemy import and_, func, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.deps import get_current_user, require_role
from app.core.email import (
    send_new_comment_email,
    send_estado_changed_email,
    send_ticket_assigned_email,
    send_ticket_created_emails,
)
from app.core.r2 import object_exists, presign_download, presign_upload
from app.core.ws_manager import manager as ws_manager
from app.core.sla import compute_sla
from app.models.attachment import Attachment
from app.models.comment import Comment
from app.models.category import Category
from app.models.ticket import Ticket, TicketEstado, TicketPrioridad
from app.models.user import User, UserRole
from app.schemas.attachment import (
    AttachmentResponse,
    DownloadUrlResponse,
    PresignUploadRequest,
    PresignUploadResponse,
)
from app.schemas.auth import MessageResponse
from app.schemas.comment import CommentCreate, CommentResponse
from app.schemas.ticket import (
    TicketAssign,
    TicketCreate,
    TicketDetailResponse,
    TicketEstadoChange,
    TicketListItem,
    TicketListResponse,
    TicketResponse,
    TicketUpdate,
)

router = APIRouter()

# ---------------------------------------------------------------------------
# Estado máquina: transiciones permitidas
# ---------------------------------------------------------------------------
_VALID_TRANSITIONS: dict[TicketEstado, set[TicketEstado]] = {
    TicketEstado.abierto:     {TicketEstado.en_progreso},
    TicketEstado.en_progreso: {TicketEstado.resuelto},
    TicketEstado.resuelto:    {TicketEstado.cerrado, TicketEstado.en_progreso},
    TicketEstado.cerrado:     set(),  # Terminal
}


# ---------------------------------------------------------------------------
# Helpers internos
# ---------------------------------------------------------------------------

def _is_sla_vencido(ticket: Ticket) -> bool:
    if ticket.sla_resolution_due_at is None:
        return False
    return datetime.now(timezone.utc) > ticket.sla_resolution_due_at


async def _get_ticket_or_404(
    ticket_id: uuid.UUID,
    db: AsyncSession,
    *,
    load_relations: bool = False,
) -> Ticket:
    if load_relations:
        stmt = (
            select(Ticket)
            .where(Ticket.id == ticket_id)
            .options(
                selectinload(Ticket.comentarios),
                selectinload(Ticket.adjuntos),
            )
        )
        result = await db.execute(stmt)
        ticket = result.scalar_one_or_none()
    else:
        ticket = await db.get(Ticket, ticket_id)

    if ticket is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticket no encontrado")
    return ticket


def _assert_visible(ticket: Ticket, current_user: User) -> None:
    """Solicitante solo puede ver sus propios tickets. Devuelve 404 para no revelar existencia."""
    if (
        current_user.rol == UserRole.solicitante
        and ticket.solicitante_id != current_user.id
    ):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticket no encontrado")


def _assert_not_closed_unless_admin(ticket: Ticket, current_user: User) -> None:
    if ticket.estado == TicketEstado.cerrado and current_user.rol != UserRole.admin:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El ticket está cerrado y no puede modificarse",
        )


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.post("", response_model=TicketResponse, status_code=status.HTTP_201_CREATED)
async def create_ticket(
    body: TicketCreate,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> TicketResponse:
    now = datetime.now(timezone.utc)

    prioridad = body.prioridad
    if prioridad is None:
        cat = (await db.execute(select(Category).where(Category.id == body.categoria_id))).scalar_one_or_none()
        prioridad = TicketPrioridad(cat.prioridad_sugerida) if cat else TicketPrioridad.media

    sla_response_due, sla_resolution_due = compute_sla(prioridad, now)

    ticket = Ticket(
        titulo=body.titulo,
        descripcion=body.descripcion,
        prioridad=prioridad,
        categoria_id=body.categoria_id,
        activo_id=body.activo_id,
        solicitante_id=current_user.id,
        sla_response_due_at=sla_response_due,
        sla_resolution_due_at=sla_resolution_due,
    )
    db.add(ticket)
    await db.commit()
    await db.refresh(ticket)

    # Email a todos los agentes/admins para que alguien tome el ticket
    agents_result = await db.execute(
        select(User.email).where(User.rol.in_([UserRole.agente_soporte, UserRole.admin]))
    )
    agent_emails = list(agents_result.scalars().all())
    _ticket_id_str = str(ticket.id)
    _titulo = ticket.titulo
    background_tasks.add_task(send_ticket_created_emails, agent_emails, _ticket_id_str, _titulo)

    return TicketResponse.model_validate(ticket)


@router.get("", response_model=TicketListResponse)
async def list_tickets(
    estado: list[TicketEstado] = Query(default=[]),
    prioridad: TicketPrioridad | None = Query(default=None),
    categoria_id: uuid.UUID | None = Query(default=None),
    asignado_a_mi: bool = Query(default=False),
    offset: int = Query(default=0, ge=0),
    limit: int = Query(default=20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> TicketListResponse:
    base = select(Ticket)

    # Visibilidad por rol
    if current_user.rol == UserRole.solicitante:
        base = base.where(Ticket.solicitante_id == current_user.id)

    # Filtros opcionales
    if estado:
        base = base.where(Ticket.estado.in_(estado))
    if prioridad is not None:
        base = base.where(Ticket.prioridad == prioridad)
    if categoria_id is not None:
        base = base.where(Ticket.categoria_id == categoria_id)
    if asignado_a_mi:
        base = base.where(Ticket.agente_id == current_user.id)

    # Conteo total
    count_stmt = select(func.count()).select_from(base.subquery())
    total = (await db.execute(count_stmt)).scalar_one()

    # Resultados paginados
    paginated = base.order_by(Ticket.created_at.desc()).offset(offset).limit(limit)
    rows = (await db.execute(paginated)).scalars().all()

    items: list[TicketListItem] = []
    for t in rows:
        item = TicketListItem.model_validate(t)
        item.sla_vencido = _is_sla_vencido(t)
        items.append(item)

    return TicketListResponse(items=items, total=total, offset=offset, limit=limit)


@router.get("/{ticket_id}", response_model=TicketDetailResponse)
async def get_ticket(
    ticket_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> TicketDetailResponse:
    ticket = await _get_ticket_or_404(ticket_id, db, load_relations=True)
    _assert_visible(ticket, current_user)

    # Solicitante no ve comentarios internos
    comentarios = ticket.comentarios
    if current_user.rol == UserRole.solicitante:
        comentarios = [c for c in comentarios if not c.es_interno]

    # Solo adjuntos confirmados
    adjuntos = [a for a in ticket.adjuntos if a.confirmado]

    response = TicketDetailResponse.model_validate(ticket)
    response.sla_vencido = _is_sla_vencido(ticket)
    response.comentarios = [CommentResponse.model_validate(c) for c in comentarios]
    response.adjuntos = [AttachmentResponse.model_validate(a) for a in adjuntos]
    return response


@router.patch("/{ticket_id}", response_model=TicketResponse)
async def update_ticket(
    ticket_id: uuid.UUID,
    body: TicketUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> TicketResponse:
    ticket = await _get_ticket_or_404(ticket_id, db)
    _assert_visible(ticket, current_user)
    _assert_not_closed_unless_admin(ticket, current_user)

    # Solicitante solo puede editar sus propios tickets en estado abierto
    if current_user.rol == UserRole.solicitante:
        if ticket.solicitante_id != current_user.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Permisos insuficientes")
        if ticket.estado != TicketEstado.abierto:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Solo se puede editar el ticket en estado 'abierto'",
            )
    elif current_user.rol == UserRole.agente_soporte:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Permisos insuficientes")

    if body.titulo is not None:
        ticket.titulo = body.titulo
    if body.descripcion is not None:
        ticket.descripcion = body.descripcion
    if body.categoria_id is not None:
        ticket.categoria_id = body.categoria_id

    await db.commit()
    await db.refresh(ticket)
    return TicketResponse.model_validate(ticket)


@router.post("/{ticket_id}/estado", response_model=TicketResponse)
async def change_estado(
    ticket_id: uuid.UUID,
    body: TicketEstadoChange,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> TicketResponse:
    ticket = await _get_ticket_or_404(ticket_id, db)
    _assert_visible(ticket, current_user)

    # Solo agente asignado o admin pueden cambiar el estado
    is_assigned_agent = (
        current_user.rol == UserRole.agente_soporte
        and ticket.agente_id == current_user.id
    )
    if current_user.rol not in (UserRole.admin,) and not is_assigned_agent:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Permisos insuficientes")

    # Validar máquina de estados
    allowed = _VALID_TRANSITIONS[ticket.estado]
    if body.estado not in allowed:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Transición inválida: '{ticket.estado.value}' → '{body.estado.value}'. "
                f"Permitidas: {[e.value for e in allowed] or 'ninguna (estado terminal)'}."
            ),
        )

    now = datetime.now(timezone.utc)
    ticket.estado = body.estado

    if body.estado == TicketEstado.en_progreso and ticket.first_response_at is None:
        ticket.first_response_at = now
    if body.estado == TicketEstado.resuelto:
        ticket.resolved_at = now
    if body.estado == TicketEstado.en_progreso and ticket.resolved_at is not None:
        ticket.resolved_at = None  # Reabrir limpia la fecha de resolución

    await db.commit()
    await db.refresh(ticket)

    # WS broadcast a todos los conectados a este ticket
    await ws_manager.broadcast(
        ticket_id,
        "estado_changed",
        {"ticket_id": str(ticket_id), "estado": ticket.estado.value},
    )

    # Email al solicitante cuando el ticket se resuelve o cierra
    if body.estado in (TicketEstado.resuelto, TicketEstado.cerrado):
        sol = await db.get(User, ticket.solicitante_id)
        if sol:
            background_tasks.add_task(
                send_estado_changed_email,
                sol.email,
                str(ticket_id),
                ticket.titulo,
                body.estado.value,
            )

    return TicketResponse.model_validate(ticket)


@router.post("/{ticket_id}/assign", response_model=TicketResponse)
async def assign_ticket(
    ticket_id: uuid.UUID,
    body: TicketAssign,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> TicketResponse:
    ticket = await _get_ticket_or_404(ticket_id, db)
    _assert_visible(ticket, current_user)
    _assert_not_closed_unless_admin(ticket, current_user)

    if current_user.rol == UserRole.solicitante:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Permisos insuficientes")

    # agente_soporte solo puede auto-asignarse
    if current_user.rol == UserRole.agente_soporte and body.agente_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Un agente solo puede auto-asignarse tickets",
        )

    # Verificar que el agente destino existe y es agente/admin
    agente = await db.get(User, body.agente_id)
    if agente is None or agente.rol == UserRole.solicitante:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El usuario destino no existe o no es agente",
        )

    ticket.agente_id = body.agente_id
    await db.commit()
    await db.refresh(ticket)

    # WS broadcast + email al agente asignado
    await ws_manager.broadcast(
        ticket_id,
        "agent_assigned",
        {"ticket_id": str(ticket_id), "agente_id": str(body.agente_id)},
    )
    background_tasks.add_task(
        send_ticket_assigned_email,
        agente.email,
        str(ticket_id),
        ticket.titulo,
    )

    return TicketResponse.model_validate(ticket)


@router.post("/{ticket_id}/comments", response_model=CommentResponse, status_code=status.HTTP_201_CREATED)
async def add_comment(
    ticket_id: uuid.UUID,
    body: CommentCreate,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> CommentResponse:
    ticket = await _get_ticket_or_404(ticket_id, db)
    _assert_visible(ticket, current_user)
    _assert_not_closed_unless_admin(ticket, current_user)

    # Solo agentes/admins pueden crear comentarios internos
    if body.es_interno and current_user.rol == UserRole.solicitante:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Los solicitantes no pueden crear comentarios internos",
        )

    comment = Comment(
        ticket_id=ticket_id,
        autor_id=current_user.id,
        contenido=body.contenido,
        es_interno=body.es_interno,
    )
    db.add(comment)

    # Primer comentario de agente/admin llena first_response_at
    if current_user.rol in (UserRole.agente_soporte, UserRole.admin):
        if ticket.first_response_at is None:
            ticket.first_response_at = datetime.now(timezone.utc)

    # Recoger emails ANTES del commit (sesión aún activa)
    _sol_email: str | None = None
    _agente_email: str | None = None
    if not body.es_interno:
        sol = await db.get(User, ticket.solicitante_id)
        _sol_email = sol.email if sol else None
        if ticket.agente_id:
            agt = await db.get(User, ticket.agente_id)
            _agente_email = agt.email if agt else None

    await db.commit()
    await db.refresh(comment)

    # WS broadcast — internos solo a agentes/admins
    comment_data = {
        "ticket_id": str(ticket_id),
        "comment_id": str(comment.id),
        "contenido": comment.contenido,
        "es_interno": comment.es_interno,
        "autor_id": str(comment.autor_id),
    }
    if body.es_interno:
        await ws_manager.broadcast(
            ticket_id,
            "new_comment",
            comment_data,
            roles_allowed={"admin", "agente_soporte"},
        )
    else:
        await ws_manager.broadcast(ticket_id, "new_comment", comment_data)

    # Email — nunca al autor, nunca internos al solicitante
    _autor_nombre = current_user.nombre
    _ticket_titulo = ticket.titulo
    _ticket_id_str = str(ticket_id)
    if not body.es_interno:
        if current_user.rol in (UserRole.agente_soporte, UserRole.admin):
            # Agente/admin comenta → notificar al solicitante
            if _sol_email and _sol_email != current_user.email:
                background_tasks.add_task(
                    send_new_comment_email,
                    _sol_email,
                    _ticket_id_str,
                    _ticket_titulo,
                    _autor_nombre,
                )
        else:
            # Solicitante comenta → notificar al agente asignado
            if _agente_email:
                background_tasks.add_task(
                    send_new_comment_email,
                    _agente_email,
                    _ticket_id_str,
                    _ticket_titulo,
                    _autor_nombre,
                )

    return CommentResponse.model_validate(comment)


@router.post(
    "/{ticket_id}/attachments/presign-upload",
    response_model=PresignUploadResponse,
    status_code=status.HTTP_201_CREATED,
)
async def presign_upload_attachment(
    ticket_id: uuid.UUID,
    body: PresignUploadRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> PresignUploadResponse:
    ticket = await _get_ticket_or_404(ticket_id, db)
    _assert_visible(ticket, current_user)
    _assert_not_closed_unless_admin(ticket, current_user)

    attachment_id = uuid.uuid4()
    s3_key = f"tickets/{ticket_id}/{attachment_id}/{body.nombre_archivo}"

    upload_url = await presign_upload(s3_key, body.mime_type)

    attachment = Attachment(
        id=attachment_id,
        ticket_id=ticket_id,
        s3_key=s3_key,
        nombre_archivo=body.nombre_archivo,
        mime_type=body.mime_type,
        confirmado=False,
        subido_por=current_user.id,
    )
    db.add(attachment)
    await db.commit()

    return PresignUploadResponse(attachment_id=attachment_id, upload_url=upload_url)


@router.post(
    "/{ticket_id}/attachments/{attachment_id}/confirm",
    response_model=MessageResponse,
)
async def confirm_attachment(
    ticket_id: uuid.UUID,
    attachment_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> MessageResponse:
    ticket = await _get_ticket_or_404(ticket_id, db)
    _assert_visible(ticket, current_user)

    attachment = await db.get(Attachment, attachment_id)
    if attachment is None or attachment.ticket_id != ticket_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Adjunto no encontrado")
    if attachment.subido_por != current_user.id and current_user.rol not in (UserRole.admin,):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Permisos insuficientes")
    if attachment.confirmado:
        return MessageResponse(message="El adjunto ya estaba confirmado")

    if not attachment.s3_key:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="El adjunto no tiene s3_key")

    # Verifica en R2 que el archivo realmente fue subido
    if not await object_exists(attachment.s3_key):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El archivo aún no ha sido subido a R2 o la subida falló",
        )

    attachment.confirmado = True
    await db.commit()
    return MessageResponse(message="Adjunto confirmado correctamente")


@router.get(
    "/{ticket_id}/attachments/{attachment_id}/download-url",
    response_model=DownloadUrlResponse,
)
async def get_download_url(
    ticket_id: uuid.UUID,
    attachment_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> DownloadUrlResponse:
    ticket = await _get_ticket_or_404(ticket_id, db)
    _assert_visible(ticket, current_user)

    attachment = await db.get(Attachment, attachment_id)
    if attachment is None or attachment.ticket_id != ticket_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Adjunto no encontrado")
    if not attachment.confirmado:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El adjunto aún no ha sido confirmado",
        )
    if not attachment.s3_key:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="El adjunto no tiene s3_key")

    url = await presign_download(attachment.s3_key, attachment.nombre_archivo or "archivo")
    return DownloadUrlResponse(download_url=url)
