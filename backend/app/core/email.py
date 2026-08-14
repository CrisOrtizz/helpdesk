import logging

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)


async def send_password_reset_email(to_email: str, reset_link: str) -> None:
    """
    Envía el email de reset con Resend.
    Si RESEND_API_KEY no está configurada, imprime el link en logs (modo dev).
    """
    if not settings.RESEND_API_KEY:
        logger.warning(
            "[DEV] RESEND_API_KEY no configurada. "
            "Link de reset para %s: %s",
            to_email,
            reset_link,
        )
        return

    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.post(
            "https://api.resend.com/emails",
            headers={"Authorization": f"Bearer {settings.RESEND_API_KEY}"},
            json={
                "from": "noreply@helpdesk-el-constructor.com",
                "to": [to_email],
                "subject": "Restablecer contraseña — Helpdesk El Constructor",
                "html": (
                    f"<p>Solicitaste restablecer tu contraseña.</p>"
                    f'<p><a href="{reset_link}">Haz clic aquí</a> para continuar.'
                    f" Este enlace expira en 15 minutos.</p>"
                    f"<p>Si no lo solicitaste, ignora este correo.</p>"
                ),
            },
        )
        resp.raise_for_status()
