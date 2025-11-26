from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from .routers import downtime, dashboard
from .services.websocket_manager import ws_manager
from app.auth.router import router as auth_router
from app.routers.management import router as management_router
from app.routers.ws import router as ws_router
from app.routers.management_stats import router as stats_router
from app.routers import operator
from app.routers import ai_analysis
from app.routers.machine_monitoring import router as machine_monitoring_router  # NEW
import os
from fastapi.staticfiles import StaticFiles


app = FastAPI()

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routes
app.include_router(downtime.router)
app.include_router(dashboard.router)
app.include_router(auth_router)
app.include_router(management_router)
app.include_router(ws_router)
app.include_router(stats_router)
app.include_router(operator.router)
app.include_router(ai_analysis.router)
app.include_router(machine_monitoring_router)  # NEW - Machine Monitoring

# Health check
@app.get("/")
async def root():
    return {"status": "ok"}

# WebSocket
@app.websocket("/ws/management")
async def management_ws(websocket: WebSocket):
    await ws_manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text()
    except:
        ws_manager.disconnect(websocket)


# Mount uploads folder so saved images/audio are accessible
UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")