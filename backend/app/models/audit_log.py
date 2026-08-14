import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.user import User


class AuditLog(Base):
    __tablename__ = "audit_log"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    entidad_tipo: Mapped[str] = mapped_column(String(100))
    entidad_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True))
    accion: Mapped[str] = mapped_column(String(255))
    # FK column; relación ORM: realizado_por_user
    realizado_por: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id")
    )
    fecha: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    realizado_por_user: Mapped["User"] = relationship(
        "User", back_populates="audit_logs"
    )
