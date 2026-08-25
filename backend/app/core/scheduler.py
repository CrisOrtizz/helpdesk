import logging
from datetime import datetime, timezone

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from sqlalchemy import and_, or_, select

from app.core.database import AsyncSessionLocal
from app.models.ticket import Ticket, TicketEstado
from app.models.user import User, UserRole

logger = logging.getLogger(__name__)

scheduler = AsyncIOScheduler()


async def check_sla_breaches() -> None:
    """
    Revisa tickets con SLA vencido que aún no hayan sido notificados.
    Corre cada 15 min via APScheduler; también se puede disparar manualmente
    desde el endpoint POST /debug/trigger-sla-check.
    """
    # Imports locales para evitar circularidad al iniciar el módulo
    from app.core.email import send_sla_breach_email
    from app.core.ws_manager import manager as ws_manager

    logger.info("[SLA] Iniciando revisión de SLA vencido...")
    now = datetime.now(timezone.utc)

    async with AsyncSessionLocal() as db:
        stmt = select(Ticket).where(
            and_(
                Ticket.sla_breach_notified == False,  # noqa: E712
                Ticket.estado.notin_([TicketEstado.resuelto, TicketEstado.cerrado]),
                or_(
                    Ticket.sla_response_due_at < now,
                    Ticket.sla_resolution_due_at < now,
                ),
            )
        )
        tickets = (await db.execute(stmt)).scalars().all()

        for ticket in tickets:
            logger.warning(
                "[SLA BREACH] ticket_id=%s titulo='%s'", ticket.id, ticket.titulo
            )

            # Destinatarios: agente asignado o todos los agentes/admins
            if ticket.agente_id:
                agente = await db.get(User, ticket.agente_id)
                recipients = [agente.email] if agente else []
            else:
                agents_result = await db.execute(
                    select(User.email).where(
                        User.rol.in_([UserRole.agente_soporte, UserRole.admin])
                    )
                )
                recipients = list(agents_result.scalars().all())

            await send_sla_breach_email(recipients, str(ticket.id), ticket.titulo)

            await ws_manager.broadcast(
                ticket.id,
                "sla_breach",
                {"ticket_id": str(ticket.id), "titulo": ticket.titulo},
            )

            ticket.sla_breach_notified = True

        await db.commit()

    logger.info("[SLA] Revisión completada. Tickets procesados: %d.", len(tickets))
