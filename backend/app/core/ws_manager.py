import json
import uuid
from collections import defaultdict

from fastapi import WebSocket


class ConnectionManager:
    def __init__(self) -> None:
        # ticket_id → [(WebSocket, rol_str)]
        self._connections: dict[uuid.UUID, list[tuple[WebSocket, str]]] = defaultdict(list)

    async def connect(self, ticket_id: uuid.UUID, ws: WebSocket, rol: str) -> None:
        await ws.accept()
        self._connections[ticket_id].append((ws, rol))

    def disconnect(self, ticket_id: uuid.UUID, ws: WebSocket) -> None:
        self._connections[ticket_id] = [
            (w, r) for w, r in self._connections[ticket_id] if w is not ws
        ]
        if not self._connections[ticket_id]:
            self._connections.pop(ticket_id, None)

    async def broadcast(
        self,
        ticket_id: uuid.UUID,
        event: str,
        data: dict,
        *,
        roles_allowed: set[str] | None = None,
    ) -> None:
        """
        Envía {"event": event, "data": data} a todos los sockets del ticket.
        Si roles_allowed no es None, filtra por rol del cliente conectado.
        """
        if ticket_id not in self._connections:
            return
        message = json.dumps({"event": event, "data": data}, default=str)
        dead: list[WebSocket] = []
        for ws, rol in list(self._connections[ticket_id]):
            if roles_allowed is not None and rol not in roles_allowed:
                continue
            try:
                await ws.send_text(message)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.disconnect(ticket_id, ws)


manager = ConnectionManager()
