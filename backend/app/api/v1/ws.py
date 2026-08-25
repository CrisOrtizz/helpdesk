import uuid

from fastapi import APIRouter, Query, WebSocket, WebSocketDisconnect
from jose import JWTError

from app.core.security import decode_access_token
from app.core.ws_manager import manager

router = APIRouter()


@router.websocket("/ws/tickets/{ticket_id}")
async def ws_ticket(
    ticket_id: uuid.UUID,
    ws: WebSocket,
    token: str = Query(...),
) -> None:
    """
    WebSocket autenticado por query param ?token=<access_token>.
    Cierra con código 4001 si el token es inválido o expirado.
    Transmite eventos JSON: {"event": "...", "data": {...}}
    """
    try:
        payload = decode_access_token(token)
    except JWTError:
        await ws.close(code=4001)
        return

    rol: str = payload.get("role", "")
    await manager.connect(ticket_id, ws, rol)
    try:
        while True:
            # Mantiene la conexión viva; el cliente puede mandar pings ignorados
            await ws.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(ticket_id, ws)


@router.post("/debug/trigger-sla-check", tags=["debug"])
async def trigger_sla_check() -> dict:
    """Fuerza la ejecución inmediata del job de SLA (solo para pruebas/dev)."""
    from app.core.scheduler import check_sla_breaches
    await check_sla_breaches()
    return {"message": "SLA check ejecutado"}
