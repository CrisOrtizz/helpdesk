import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_user, require_role
from app.models.asset import Asset, AssetEstado
from app.models.user import User

router = APIRouter()


class AssetResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    nombre: str
    tipo: str
    numero_serie: str
    ubicacion: Optional[str]
    asignado_a: Optional[uuid.UUID]
    estado: AssetEstado


class AssetCreate(BaseModel):
    nombre: str
    tipo: str
    numero_serie: str
    ubicacion: Optional[str] = None
    estado: AssetEstado = AssetEstado.activo


class AssetUpdate(BaseModel):
    nombre: Optional[str] = None
    tipo: Optional[str] = None
    ubicacion: Optional[str] = None
    asignado_a: Optional[uuid.UUID] = None
    estado: Optional[AssetEstado] = None


@router.get("", response_model=list[AssetResponse])
async def list_assets(
    _user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[Asset]:
    result = await db.execute(select(Asset).order_by(Asset.nombre))
    return list(result.scalars().all())


@router.post("", response_model=AssetResponse, status_code=status.HTTP_201_CREATED)
async def create_asset(
    body: AssetCreate,
    _admin: User = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
) -> Asset:
    asset = Asset(**body.model_dump())
    db.add(asset)
    try:
        await db.commit()
        await db.refresh(asset)
    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"El número de serie '{body.numero_serie}' ya existe",
        )
    return asset


@router.patch("/{asset_id}", response_model=AssetResponse)
async def update_asset(
    asset_id: uuid.UUID,
    body: AssetUpdate,
    _admin: User = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
) -> Asset:
    asset = (
        await db.execute(select(Asset).where(Asset.id == asset_id))
    ).scalar_one_or_none()
    if not asset:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Activo no encontrado")
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(asset, k, v)
    await db.commit()
    await db.refresh(asset)
    return asset
