import json
from typing import Any

from fastapi import WebSocket

from app.core.logging import get_logger

logger = get_logger()


class ConnectionManager:
    def __init__(self) -> None:
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket) -> None:
        await websocket.accept()
        self.active_connections.append(websocket)
        logger.info("ws_client_connected", total=len(self.active_connections))

    def disconnect(self, websocket: WebSocket) -> None:
        self.active_connections.remove(websocket)
        logger.info("ws_client_disconnected", total=len(self.active_connections))

    async def broadcast(self, event: str, data: dict[str, Any]) -> None:
        message = json.dumps({"event": event, "data": data})
        dead = []
        for connection in self.active_connections:
            try:
                await connection.send_text(message)
            except Exception:
                dead.append(connection)
        for conn in dead:
            self.disconnect(conn)

    async def send_personal(self, event: str, data: dict[str, Any], websocket: WebSocket) -> None:
        message = json.dumps({"event": event, "data": data})
        try:
            await websocket.send_text(message)
        except Exception:
            self.disconnect(websocket)


manager = ConnectionManager()
