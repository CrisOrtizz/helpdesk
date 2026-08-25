import uuid
from datetime import datetime
from typing import TYPE_CHECKING, Optional

from sqlalchemy import Boolean, DateTime, ForeignKey, String, func, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.ticket import Ticket
    from app.models.user import User


class Attachment(Base):
    __tablename__ = "attachments"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    ticket_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tickets.id")
    )
    # R2 object key: "tickets/{ticket_id}/{attachment_id}/{filename}"
    s3_key: Mapped[Optional[str]] = mapped_column(String(1000))
    nombre_archivo: Mapped[Optional[str]] = mapped_column(String(500))
    mime_type: Mapped[Optional[str]] = mapped_column(String(100))
    # True después de que el frontend confirma la subida exitosa a R2
    confirmado: Mapped[bool] = mapped_column(
        Boolean, default=False, server_default=text("false")
    )
    # Campo legado — nullable ahora que usamos URLs prefirmadas en lugar de URLs permanentes
    url_archivo: Mapped[Optional[str]] = mapped_column(String(1000))
    # FK column; la relación ORM se llama subido_por_user para evitar colisión
    subido_por: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id")
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    ticket: Mapped["Ticket"] = relationship("Ticket", back_populates="adjuntos")
    subido_por_user: Mapped["User"] = relationship(
        "User", back_populates="attachments"
    )
