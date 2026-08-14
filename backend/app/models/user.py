import enum
import uuid
from datetime import datetime
from typing import TYPE_CHECKING, Optional

from sqlalchemy import DateTime, Enum as SAEnum, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.asset import Asset
    from app.models.attachment import Attachment
    from app.models.audit_log import AuditLog
    from app.models.comment import Comment
    from app.models.password_reset_token import PasswordResetToken
    from app.models.refresh_token import RefreshToken
    from app.models.ticket import Ticket


class UserRole(str, enum.Enum):
    admin = "admin"
    agente_soporte = "agente_soporte"
    solicitante = "solicitante"


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    nombre: Mapped[str] = mapped_column(String(255))
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    rol: Mapped[UserRole] = mapped_column(SAEnum(UserRole, name="user_role"))
    departamento: Mapped[Optional[str]] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    # Un usuario puede haber creado muchos tickets como solicitante
    tickets_solicitados: Mapped[list["Ticket"]] = relationship(
        "Ticket",
        foreign_keys="[Ticket.solicitante_id]",
        back_populates="solicitante",
    )
    # Un usuario (agente) puede atender muchos tickets
    tickets_atendidos: Mapped[list["Ticket"]] = relationship(
        "Ticket",
        foreign_keys="[Ticket.agente_id]",
        back_populates="agente",
    )
    comentarios: Mapped[list["Comment"]] = relationship(
        "Comment", back_populates="autor"
    )
    activos_asignados: Mapped[list["Asset"]] = relationship(
        "Asset", back_populates="usuario_asignado"
    )
    audit_logs: Mapped[list["AuditLog"]] = relationship(
        "AuditLog", back_populates="realizado_por_user"
    )
    attachments: Mapped[list["Attachment"]] = relationship(
        "Attachment", back_populates="subido_por_user"
    )
    refresh_tokens: Mapped[list["RefreshToken"]] = relationship(
        "RefreshToken", back_populates="user", cascade="all, delete-orphan"
    )
    password_reset_tokens: Mapped[list["PasswordResetToken"]] = relationship(
        "PasswordResetToken", back_populates="user", cascade="all, delete-orphan"
    )
