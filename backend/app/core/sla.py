from datetime import datetime, timedelta

from app.models.ticket import TicketPrioridad

_RULES: dict[str, tuple[timedelta, timedelta]] = {
    "critica": (timedelta(hours=4),  timedelta(hours=24)),
    "alta":    (timedelta(hours=8),  timedelta(hours=72)),
    "media":   (timedelta(hours=24), timedelta(hours=120)),
    "baja":    (timedelta(hours=48), timedelta(hours=240)),
}


def compute_sla(
    prioridad: TicketPrioridad,
    created_at: datetime,
) -> tuple[datetime, datetime]:
    """Retorna (sla_response_due_at, sla_resolution_due_at) según la prioridad."""
    response_delta, resolution_delta = _RULES[prioridad.value]
    return created_at + response_delta, created_at + resolution_delta
