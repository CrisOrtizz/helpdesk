import hashlib
import secrets
import uuid
from datetime import datetime, timedelta, timezone

from jose import jwt
from passlib.context import CryptContext

from app.core.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def create_access_token(user_id: uuid.UUID, rol: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(
        minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
    )
    payload = {
        "sub": str(user_id),
        "role": rol,
        "type": "access",
        "exp": expire,
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def create_refresh_token() -> tuple[str, str, datetime]:
    """
    Genera un token opaco de alta entropía.
    Retorna (raw_token, sha256_hash, expires_at).
    raw_token va en la cookie httpOnly; el hash se almacena en DB.
    """
    raw_token = secrets.token_urlsafe(64)
    token_hash = _sha256(raw_token)
    expires_at = datetime.now(timezone.utc) + timedelta(
        days=settings.REFRESH_TOKEN_EXPIRE_DAYS
    )
    return raw_token, token_hash, expires_at


def create_password_reset_token() -> tuple[str, str, datetime]:
    """
    Token opaco de un solo uso para reset de contraseña.
    Retorna (raw_token, sha256_hash, expires_at).
    raw_token viaja en el link de email; el hash se almacena en DB.
    """
    raw_token = secrets.token_urlsafe(64)
    token_hash = _sha256(raw_token)
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=15)
    return raw_token, token_hash, expires_at


def decode_access_token(token: str) -> dict:
    """Valida firma y expiración del access token. Lanza JWTError si inválido."""
    payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    if payload.get("type") != "access":
        from jose import JWTError
        raise JWTError("Not an access token")
    return payload


def hash_raw_token(raw_token: str) -> str:
    return _sha256(raw_token)


def _sha256(value: str) -> str:
    return hashlib.sha256(value.encode()).hexdigest()
