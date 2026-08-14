import enum
import uuid
from typing import TYPE_CHECKING, Optional

from sqlalchemy import Enum as SAEnum, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.ticket import Ticket
    from app.models.user import User


class AssetEstado(str, enum.Enum):
    activo = "activo"
    en_reparacion = "en_reparacion"
    dado_de_baja = "dado_de_baja"


class Asset(Base):
    __tablename__ = "assets"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    nombre: Mapped[str] = mapped_column(String(255))
    tipo: Mapped[str] = mapped_column(String(100))
    numero_serie: Mapped[str] = mapped_column(String(100), unique=True)
    ubicacion: Mapped[Optional[str]] = mapped_column(String(255))
    # FK column: asignado_a guarda el UUID; la relación ORM se llama usuario_asignado
    asignado_a: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id")
    )
    estado: Mapped[AssetEstado] = mapped_column(
        SAEnum(AssetEstado, name="asset_estado")
    )

    usuario_asignado: Mapped[Optional["User"]] = relationship(
        "User",
        foreign_keys="[Asset.asignado_a]",
        back_populates="activos_asignados",
    )
    tickets: Mapped[list["Ticket"]] = relationship(
        "Ticket", back_populates="activo"
    )
