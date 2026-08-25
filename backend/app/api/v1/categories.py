import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_user, require_role
from app.models.category import Category
from app.models.user import User

router = APIRouter()


class CategoryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    nombre: str
    prioridad_sugerida: str


class CategoryCreate(BaseModel):
    nombre: str
    prioridad_sugerida: str = "media"


@router.get("", response_model=list[CategoryResponse])
async def list_categories(
    _current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[Category]:
    result = await db.execute(select(Category).order_by(Category.nombre))
    return list(result.scalars().all())


@router.post("", response_model=CategoryResponse, status_code=status.HTTP_201_CREATED)
async def create_category(
    body: CategoryCreate,
    _admin: User = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
) -> Category:
    existing = (
        await db.execute(select(Category).where(Category.nombre == body.nombre))
    ).scalar_one_or_none()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"La categoría '{body.nombre}' ya existe",
        )
    cat = Category(nombre=body.nombre, prioridad_sugerida=body.prioridad_sugerida)
    db.add(cat)
    await db.commit()
    await db.refresh(cat)
    return cat
