from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
    )

    DATABASE_URL: str = "postgresql+asyncpg://helpdesk:helpdesk@db:5432/helpdesk_db"
    SECRET_KEY: str = "change-me-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    RESEND_API_KEY: str = ""
    FRONTEND_URL: str = "http://localhost:5173"

    # Cookies — sobreescribir en producción: COOKIE_SECURE=true, COOKIE_SAMESITE=none
    COOKIE_SECURE: bool = False
    COOKIE_SAMESITE: str = "lax"

    # Cloudflare R2 (compatible con S3)
    R2_ACCOUNT_ID: str = ""
    R2_ACCESS_KEY_ID: str = ""
    R2_SECRET_ACCESS_KEY: str = ""
    R2_BUCKET_NAME: str = ""
    R2_ENDPOINT_URL: str = ""

    @field_validator("DATABASE_URL", mode="before")
    @classmethod
    def fix_asyncpg_scheme(cls, v: str) -> str:
        # Railway provee postgresql:// pero SQLAlchemy async necesita postgresql+asyncpg://
        if isinstance(v, str) and v.startswith("postgresql://"):
            return v.replace("postgresql://", "postgresql+asyncpg://", 1)
        return v


settings = Settings()
