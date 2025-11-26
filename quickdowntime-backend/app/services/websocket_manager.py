
## app/service/websocket_manager.py

from typing import List, Dict
from fastapi import WebSocket


class WebSocketManager:
    def __init__(self):
        # Global connections (old behavior)
        self.active_connections: List[WebSocket] = []

        # Role-based connections
        self.managers: List[WebSocket] = []
        self.operators: List[WebSocket] = []

        # Channel-based (machine-specific)
        self.channels: Dict[str, List[WebSocket]] = {}

    # -----------------------------------------------
    # Global Connect
    # -----------------------------------------------
    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    # -----------------------------------------------
    # Role-based connect
    # -----------------------------------------------
    async def connect_role(self, websocket: WebSocket, role: str):
        await websocket.accept()

        if role == "manager":
            self.managers.append(websocket)
        elif role == "operator":
            self.operators.append(websocket)

    # -----------------------------------------------
    # Machine/channel connect
    # -----------------------------------------------
    async def join_channel(self, websocket: WebSocket, channel: str):
        await websocket.accept()

        if channel not in self.channels:
            self.channels[channel] = []

        self.channels[channel].append(websocket)

    # -----------------------------------------------
    # Remove from all lists
    # -----------------------------------------------
    def disconnect(self, websocket: WebSocket):
        for group in [self.active_connections, self.managers, self.operators]:
            if websocket in group:
                group.remove(websocket)

        for channel in self.channels.values():
            if websocket in channel:
                channel.remove(websocket)

    # -------------------------------------------------
    # Broadcast to ALL connections (old behavior)
    # -------------------------------------------------
    async def broadcast(self, message: dict):
        for connection in list(self.active_connections):
            try:
                await connection.send_json(message)
            except:
                self.disconnect(connection)

    # -------------------------------------------------
    # Broadcast to managers only
    # -------------------------------------------------
    async def broadcast_managers(self, message: dict):
        for connection in list(self.managers):
            try:
                await connection.send_json(message)
            except:
                self.disconnect(connection)

    # -------------------------------------------------
    # Broadcast to operators only
    # -------------------------------------------------
    async def broadcast_operators(self, message: dict):
        for connection in list(self.operators):
            try:
                await connection.send_json(message)
            except:
                self.disconnect(connection)

    # -------------------------------------------------
    # Broadcast to channel (e.g., machine_id)
    # -------------------------------------------------
    async def broadcast_channel(self, channel: str, message: dict):
        if channel not in self.channels:
            return

        for connection in list(self.channels[channel]):
            try:
                await connection.send_json(message)
            except:
                self.disconnect(connection)


ws_manager = WebSocketManager()
