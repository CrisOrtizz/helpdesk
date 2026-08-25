import logging

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)


async def send_password_reset_email(to_email: str, reset_link: str) -> None:
    """
    Envía el email de reset con Resend.
    Si RESEND_API_KEY no está configurada, imprime el link en logs (modo dev).
    """
    if not settings.RESEND_API_KEY:
        logger.warning(
            "[DEV] RESEND_API_KEY no configurada. "
            "Link de reset para %s: %s",
            to_email,
            reset_link,
        )
        return

    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.post(
            "https://api.resend.com/emails",
            headers={"Authorization": f"Bearer {settings.RESEND_API_KEY}"},
            json={
                "from": "noreply@helpdesk-el-constructor.com",
                "to": [to_email],
                "subject": "Restablecer contraseña — Helpdesk El Constructor",
                "html": (
                    f"<p>Solicitaste restablecer tu contraseña.</p>"
                    f'<p><a href="{reset_link}">Haz clic aquí</a> para continuar.'
                    f" Este enlace expira en 15 minutos.</p>"
                    f"<p>Si no lo solicitaste, ignora este correo.</p>"
                ),
            },
        )
        resp.raise_for_status()


# ---------------------------------------------------------------------------
# Helper interno — todas las funciones específicas lo invocan
# ---------------------------------------------------------------------------

async def _send_email(to: list[str], subject: str, html: str) -> None:
    if not to:
        return
    if not settings.RESEND_API_KEY:
        logger.warning(
            "[DEV-EMAIL] To: %s | Subject: %s | Preview: %s",
            to,
            subject,
            html[:200],
        )
        return
    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.post(
            "https://api.resend.com/emails",
            headers={"Authorization": f"Bearer {settings.RESEND_API_KEY}"},
            json={
                "from": "noreply@helpdesk-el-constructor.com",
                "to": to,
                "subject": subject,
                "html": html,
            },
        )
        if resp.status_code >= 400:
            logger.error(
                "[EMAIL ERROR] status=%d body=%s", resp.status_code, resp.text[:200]
            )


# ---------------------------------------------------------------------------
# Funciones específicas por evento
# ---------------------------------------------------------------------------

async def send_ticket_created_emails(
    agent_emails: list[str], ticket_id: str, titulo: str
) -> None:
    await _send_email(
        to=agent_emails,
        subject=f"[Nuevo ticket] {titulo}",
        html=(
            f"<p>Se ha creado un nuevo ticket que requiere atención.</p>"
            f"<p><strong>Título:</strong> {titulo}</p>"
            f"<p><strong>ID:</strong> {ticket_id}</p>"
        ),
    )


async def send_ticket_assigned_email(
    agente_email: str, ticket_id: str, titulo: str
) -> None:
    await _send_email(
        to=[agente_email],
        subject=f"[Ticket asignado] {titulo}",
        html=(
            f"<p>Se te ha asignado el ticket <strong>{titulo}</strong>.</p>"
            f"<p><strong>ID:</strong> {ticket_id}</p>"
        ),
    )


async def send_new_comment_email(
    to_email: str, ticket_id: str, titulo: str, autor_nombre: str
) -> None:
    await _send_email(
        to=[to_email],
        subject=f"[Nuevo comentario] {titulo}",
        html=(
            f"<p><strong>{autor_nombre}</strong> ha comentado en el ticket "
            f"<strong>{titulo}</strong>.</p>"
            f"<p><strong>ID:</strong> {ticket_id}</p>"
        ),
    )


async def send_estado_changed_email(
    solicitante_email: str, ticket_id: str, titulo: str, nuevo_estado: str
) -> None:
    await _send_email(
        to=[solicitante_email],
        subject=f"[Ticket {nuevo_estado}] {titulo}",
        html=(
            f"<p>El estado de tu ticket <strong>{titulo}</strong> "
            f"ha cambiado a <strong>{nuevo_estado}</strong>.</p>"
            f"<p><strong>ID:</strong> {ticket_id}</p>"
        ),
    )


async def send_sla_breach_email(
    to_emails: list[str], ticket_id: str, titulo: str
) -> None:
    await _send_email(
        to=to_emails,
        subject=f"[SLA Vencido] {titulo}",
        html=(
            f"<p>El SLA del ticket <strong>{titulo}</strong> ha vencido. "
            f"Por favor atiéndalo de inmediato.</p>"
            f"<p><strong>ID:</strong> {ticket_id}</p>"
        ),
    )
