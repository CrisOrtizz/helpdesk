import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Cookie, Depends, HTTPException, Response, status
from sqlalchemy import and_, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_user
from app.core.email import send_password_reset_email
from app.core.security import (
    create_access_token,
    create_password_reset_token,
    create_refresh_token,
    hash_raw_token,
    hash_password,
    verify_password,
)
from app.core.config import settings
from app.models.password_reset_token import PasswordResetToken
from app.models.refresh_token import RefreshToken
from app.models.user import User
from app.schemas.auth import (
    ForgotPasswordRequest,
    LoginRequest,
    MessageResponse,
    ResetPasswordRequest,
    TokenResponse,
)

logger = logging.getLogger(__name__)
router = APIRouter()

_COOKIE_NAME = "refresh_token"
_COOKIE_KWARGS = dict(
    key=_COOKIE_NAME,
    httponly=True,
    secure=False,   # True en producción (HTTPS)
    samesite="lax",
    path="/auth",
    max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 86_400,
)


def _set_refresh_cookie(response: Response, raw_token: str) -> None:
    response.set_cookie(value=raw_token, **_COOKIE_KWARGS)


def _clear_refresh_cookie(response: Response) -> None:
    response.delete_cookie(_COOKIE_NAME, path="/auth")


@router.post("/login", response_model=TokenResponse)
async def login(
    body: LoginRequest,
    response: Response,
    db: AsyncSession = Depends(get_db),
) -> TokenResponse:
    stmt = select(User).where(User.email == body.email)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()

    if user is None or not verify_password(body.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales inválidas",
        )

    raw_refresh, refresh_hash, expires_at = create_refresh_token()
    db.add(RefreshToken(user_id=user.id, token_hash=refresh_hash, expires_at=expires_at))
    await db.commit()

    _set_refresh_cookie(response, raw_refresh)
    return TokenResponse(access_token=create_access_token(user.id, user.rol))


@router.post("/refresh", response_model=TokenResponse)
async def refresh(
    response: Response,
    refresh_token: str | None = Cookie(default=None),
    db: AsyncSession = Depends(get_db),
) -> TokenResponse:
    if not refresh_token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Sin refresh token")

    token_hash = hash_raw_token(refresh_token)
    stmt = select(RefreshToken).where(
        and_(
            RefreshToken.token_hash == token_hash,
            RefreshToken.revoked == False,  # noqa: E712
            RefreshToken.expires_at > datetime.now(timezone.utc),
        )
    )
    result = await db.execute(stmt)
    db_token = result.scalar_one_or_none()

    if db_token is None:
        _clear_refresh_cookie(response)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token inválido o revocado")

    # Rotación: revocar el token viejo antes de emitir uno nuevo
    db_token.revoked = True

    raw_new, new_hash, new_expires = create_refresh_token()
    db.add(RefreshToken(user_id=db_token.user_id, token_hash=new_hash, expires_at=new_expires))
    await db.commit()

    user = await db.get(User, db_token.user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Usuario no encontrado")

    _set_refresh_cookie(response, raw_new)
    return TokenResponse(access_token=create_access_token(user.id, user.rol))


@router.post("/logout", response_model=MessageResponse)
async def logout(
    response: Response,
    refresh_token: str | None = Cookie(default=None),
    db: AsyncSession = Depends(get_db),
) -> MessageResponse:
    if refresh_token:
        token_hash = hash_raw_token(refresh_token)
        await db.execute(
            update(RefreshToken)
            .where(RefreshToken.token_hash == token_hash)
            .values(revoked=True)
        )
        await db.commit()

    _clear_refresh_cookie(response)
    return MessageResponse(message="Sesión cerrada")


@router.post("/logout-all", response_model=MessageResponse)
async def logout_all(
    response: Response,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> MessageResponse:
    await db.execute(
        update(RefreshToken)
        .where(
            and_(RefreshToken.user_id == current_user.id, RefreshToken.revoked == False)  # noqa: E712
        )
        .values(revoked=True)
    )
    await db.commit()
    _clear_refresh_cookie(response)
    return MessageResponse(message="Todas las sesiones cerradas")


@router.post("/forgot-password", response_model=MessageResponse)
async def forgot_password(
    body: ForgotPasswordRequest,
    db: AsyncSession = Depends(get_db),
) -> MessageResponse:
    # Respuesta genérica intencional: no revelar si el email existe
    generic_response = MessageResponse(
        message="Si el email está registrado, recibirás un correo con instrucciones"
    )

    stmt = select(User).where(User.email == body.email)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()
    if user is None:
        return generic_response

    # Invalidar tokens pendientes anteriores (solo un reset válido a la vez)
    await db.execute(
        update(PasswordResetToken)
        .where(
            and_(
                PasswordResetToken.user_id == user.id,
                PasswordResetToken.used == False,  # noqa: E712
            )
        )
        .values(used=True)
    )

    raw_token, token_hash, expires_at = create_password_reset_token()
    db.add(PasswordResetToken(user_id=user.id, token_hash=token_hash, expires_at=expires_at))
    await db.commit()

    reset_link = f"{settings.FRONTEND_URL}/reset-password?token={raw_token}"
    await send_password_reset_email(user.email, reset_link)

    return generic_response


@router.post("/reset-password", response_model=MessageResponse)
async def reset_password(
    body: ResetPasswordRequest,
    db: AsyncSession = Depends(get_db),
) -> MessageResponse:
    token_hash = hash_raw_token(body.token)
    stmt = select(PasswordResetToken).where(
        and_(
            PasswordResetToken.token_hash == token_hash,
            PasswordResetToken.used == False,  # noqa: E712
            PasswordResetToken.expires_at > datetime.now(timezone.utc),
        )
    )
    result = await db.execute(stmt)
    db_token = result.scalar_one_or_none()

    if db_token is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Token inválido o expirado",
        )

    # Marcar token de reset como usado
    db_token.used = True

    # Cambiar contraseña
    user = await db.get(User, db_token.user_id)
    user.password_hash = hash_password(body.new_password)

    # Revocar TODOS los refresh tokens del usuario (invalidar sesiones activas)
    await db.execute(
        update(RefreshToken)
        .where(RefreshToken.user_id == user.id)
        .values(revoked=True)
    )

    await db.commit()
    return MessageResponse(message="Contraseña actualizada correctamente")
