import enum
import uuid
from datetime import datetime
from typing import TYPE_CHECKING, Optional

from sqlalchemy import DateTime, Enum as SAEnum, ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.asset import Asset
    from app.models.attachment import Attachment
    from app.models.category import Category
    from app.models.comment import Comment
    from app.models.user import User


class TicketEstado(str, enum.Enum):
    abierto = "abierto"
    en_progreso = "en_progreso"
    resuelto = "resuelto"
    cerrado = "cerrado"


class TicketPrioridad(str, enum.Enum):
    baja = "baja"
    media = "media"
    alta = "alta"
    critica = "critica"


class Ticket(Base):
    __tablename__ = "tickets"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    titulo: Mapped[str] = mapped_column(String(500))
    descripcion: Mapped[str] = mapped_column(Text)
    estado: Mapped[TicketEstado] = mapped_column(
        SAEnum(TicketEstado, name="ticket_estado"), default=TicketEstado.abierto
    )
    prioridad: Mapped[TicketPrioridad] = mapped_column(
        SAEnum(TicketPrioridad, name="ticket_prioridad"), default=TicketPrioridad.media
    )
    categoria_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("categories.id")
    )
    solicitante_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id")
    )
    # Nullable: el ticket puede no estar asignado a un agente aún
    agente_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id")
    )
    activo_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("assets.id")
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    resolved_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))

    # foreign_keys explícito requerido porque hay dos FK hacia users
    solicitante: Mapped["User"] = relationship(
        "User", foreign_keys=[solicitante_id], back_populates="tickets_solicitados"
    )
    agente: Mapped[Optional["User"]] = relationship(
        "User", foreign_keys=[agente_id], back_populates="tickets_atendidos"
    )
    categoria: Mapped["Category"] = relationship(
        "Category", back_populates="tickets"
    )
    activo: Mapped[Optional["Asset"]] = relationship(
        "Asset", back_populates="tickets"
    )
    comentarios: Mapped[list["Comment"]] = relationship(
        "Comment", back_populates="ticket", cascade="all, delete-orphan"
    )
    adjuntos: Mapped[list["Attachment"]] = relationship(
        "Attachment", back_populates="ticket", cascade="all, delete-orphan"
    )
