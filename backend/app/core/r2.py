import anyio
import boto3
from botocore.client import Config
from botocore.exceptions import ClientError
from fastapi import HTTPException, status

from app.core.config import settings


def _make_client():
    if not settings.R2_ENDPOINT_URL:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Almacenamiento R2 no configurado — define R2_ENDPOINT_URL en .env",
        )
    return boto3.client(
        "s3",
        endpoint_url=settings.R2_ENDPOINT_URL,
        aws_access_key_id=settings.R2_ACCESS_KEY_ID,
        aws_secret_access_key=settings.R2_SECRET_ACCESS_KEY,
        config=Config(signature_version="s3v4"),
        region_name="auto",
    )


async def presign_upload(s3_key: str, content_type: str, expires_in: int = 600) -> str:
    """URL prefirmada para que el cliente suba (PUT) directamente a R2."""
    def _sync() -> str:
        return _make_client().generate_presigned_url(
            "put_object",
            Params={
                "Bucket": settings.R2_BUCKET_NAME,
                "Key": s3_key,
                "ContentType": content_type,
            },
            ExpiresIn=expires_in,
        )
    return await anyio.to_thread.run_sync(_sync)


async def presign_download(s3_key: str, filename: str, expires_in: int = 600) -> str:
    """URL prefirmada para que el cliente descargue (GET) desde R2."""
    def _sync() -> str:
        return _make_client().generate_presigned_url(
            "get_object",
            Params={
                "Bucket": settings.R2_BUCKET_NAME,
                "Key": s3_key,
                "ResponseContentDisposition": f'attachment; filename="{filename}"',
            },
            ExpiresIn=expires_in,
        )
    return await anyio.to_thread.run_sync(_sync)


async def object_exists(s3_key: str) -> bool:
    """Verifica con HEAD si el objeto ya fue subido a R2."""
    def _sync() -> bool:
        try:
            _make_client().head_object(Bucket=settings.R2_BUCKET_NAME, Key=s3_key)
            return True
        except ClientError as e:
            if e.response["Error"]["Code"] in ("404", "NoSuchKey"):
                return False
            raise
    return await anyio.to_thread.run_sync(_sync)
