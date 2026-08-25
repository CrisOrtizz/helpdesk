import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict

from app.models.ticket import TicketEstado, TicketPrioridad
from app.schemas.attachment import AttachmentResponse
from app.schemas.comment import CommentResponse


class TicketCreate(BaseModel):
    titulo: str
    descripcion: str
    prioridad: Optional[TicketPrioridad] = None
    categoria_id: uuid.UUID
    activo_id: Optional[uuid.UUID] = None


class TicketUpdate(BaseModel):
    titulo: Optional[str] = None
    descripcion: Optional[str] = None
    categoria_id: Optional[uuid.UUID] = None


class TicketEstadoChange(BaseModel):
    estado: TicketEstado


class TicketAssign(BaseModel):
    agente_id: uuid.UUID


class TicketResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    titulo: str
    descripcion: str
    estado: TicketEstado
    prioridad: TicketPrioridad
    categoria_id: uuid.UUID
    solicitante_id: uuid.UUID
    agente_id: Optional[uuid.UUID]
    activo_id: Optional[uuid.UUID]
    created_at: datetime
    resolved_at: Optional[datetime]
    sla_response_due_at: Optional[datetime]
    sla_resolution_due_at: Optional[datetime]
    first_response_at: Optional[datetime]


class TicketListItem(TicketResponse):
    sla_vencido: bool = False


class TicketDetailResponse(TicketListItem):
    comentarios: list[CommentResponse] = []
    adjuntos: list[AttachmentResponse] = []


class TicketListResponse(BaseModel):
    items: list[TicketListItem]
    total: int
    offset: int
    limit: int
