# Importar todos los modelos aquí para que SQLAlchemy los registre en Base.metadata
# y Alembic los detecte automáticamente en autogenerate.
from app.models.asset import Asset, AssetEstado
from app.models.attachment import Attachment
from app.models.audit_log import AuditLog
from app.models.category import Category
from app.models.comment import Comment
from app.models.ticket import Ticket, TicketEstado, TicketPrioridad
from app.models.user import User, UserRole

__all__ = [
    "User",
    "UserRole",
    "Category",
    "Asset",
    "AssetEstado",
    "Ticket",
    "TicketEstado",
    "TicketPrioridad",
    "Comment",
    "Attachment",
    "AuditLog",
]
