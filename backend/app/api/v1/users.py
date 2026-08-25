from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_user, require_role
from app.core.security import hash_password
from app.models.user import User, UserRole
from app.schemas.user import UserCreate, UserResponse

router = APIRouter()


@router.get("", response_model=list[UserResponse])
async def list_users(
    rol: str | None = Query(default=None),
    _admin: User = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
) -> list[User]:
    stmt = select(User)
    if rol:
        try:
            stmt = stmt.where(User.rol == UserRole(rol))
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Rol inválido: {rol}",
            )
    result = await db.execute(stmt.order_by(User.nombre))
    return list(result.scalars().all())


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)) -> User:
    return current_user


@router.post("", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_user(
    body: UserCreate,
    _admin: User = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
) -> User:
    # Verificar email único antes de intentar insertar
    stmt = select(User).where(User.email == body.email)
    existing = (await db.execute(stmt)).scalar_one_or_none()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"El email '{body.email}' ya está registrado",
        )

    user = User(
        nombre=body.nombre,
        email=body.email,
        password_hash=hash_password(body.password),
        rol=body.rol,
        departamento=body.departamento,
    )
    db.add(user)
    try:
        await db.commit()
        await db.refresh(user)
    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"El email '{body.email}' ya está registrado",
        )
    return user
