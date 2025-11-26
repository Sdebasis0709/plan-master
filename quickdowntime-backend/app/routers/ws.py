# app/routers/ws.py
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from jose import jwt, JWTError
from typing import Optional
from app.config import settings
from app.services.websocket_manager import ws_manager

router = APIRouter(prefix="/api/ws", tags=["WebSockets"])


async def _decode_token_from_ws(websocket: WebSocket) -> Optional[dict]:
    """
    Read token from query params and decode it. Return payload dict or None.
    """
    token = websocket.query_params.get("token")
    if not token:
        return None

    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
        return payload
    except JWTError:
        return None


# ------------------------------------------------------
# MANAGER WEBSOCKET (Receives: machine down, alerts, etc.)
# ------------------------------------------------------
@router.websocket("/manager")
async def manager_ws(websocket: WebSocket):
    user = await _decode_token_from_ws(websocket)
    if not user:
        await websocket.close(code=4001)
        return

    if user.get("role") != "manager":
        await websocket.close(code=4003)
        return

    await ws_manager.connect_role(websocket, "manager")

    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
        # optional logging
        print("Manager disconnected")


# ------------------------------------------------------
# OPERATOR WEBSOCKET (Receives: approved/resolved updates)
# ------------------------------------------------------
@router.websocket("/operator")
async def operator_ws(websocket: WebSocket):
    user = await _decode_token_from_ws(websocket)
    if not user:
        await websocket.close(code=4001)
        return

    if user.get("role") != "operator":
        await websocket.close(code=4003)
        return

    await ws_manager.connect_role(websocket, "operator")

    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
        print("Operator disconnected")


# ------------------------------------------------------
# MACHINE-SPECIFIC CHANNEL
# e.g.: /api/ws/machine/M1?token=...
# ------------------------------------------------------
@router.websocket("/machine/{machine_id}")
async def machine_ws(websocket: WebSocket, machine_id: str):
    # machine channels are typically open to any authenticated user; still validate token optionally
    user = await _decode_token_from_ws(websocket)
    if not user:
        # allow anonymous machine sockets only if your app intends so; otherwise reject
        await websocket.close(code=4001)
        return

    await ws_manager.join_channel(websocket, machine_id)

    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
        print(f"Machine channel disconnected: {machine_id}")
