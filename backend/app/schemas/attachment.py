import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


class PresignUploadRequest(BaseModel):
    nombre_archivo: str
    mime_type: str


class PresignUploadResponse(BaseModel):
    attachment_id: uuid.UUID
    upload_url: str


class AttachmentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    nombre_archivo: Optional[str]
    mime_type: Optional[str]
    confirmado: bool
    subido_por: uuid.UUID
    created_at: datetime


class DownloadUrlResponse(BaseModel):
    download_url: str
