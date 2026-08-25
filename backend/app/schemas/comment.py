import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class CommentCreate(BaseModel):
    contenido: str
    es_interno: bool = False


class CommentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    ticket_id: uuid.UUID
    autor_id: uuid.UUID
    contenido: str
    es_interno: bool
    created_at: datetime
