# app/routers/operator.py
import os
import uuid
import base64
from pathlib import Path
from typing import Optional

from fastapi import (
    APIRouter, Depends, File, UploadFile, Form,
    HTTPException, Request
)
from fastapi.responses import JSONResponse

from app.config import settings, supabase
from app.auth.security import get_current_user, require_operator

from app.services.ai_engine import ai_engine
from app.services.websocket_manager import ws_manager


router = APIRouter(prefix="/api/operator", tags=["Operator"])


# --------------------------------------------------------------
# Helpers
# --------------------------------------------------------------
def _ensure_upload_dir():
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)


def _save_upload_file(upload: UploadFile, prefix: str = "") -> str:
    _ensure_upload_dir()
    ext = Path(upload.filename).suffix or ""
    filename = f"{prefix}{uuid.uuid4().hex}{ext}"
    abs_path = os.path.join(settings.UPLOAD_DIR, filename)

    upload.file.seek(0)
    with open(abs_path, "wb") as f:
        f.write(upload.file.read())

    return abs_path


def _save_base64_data(b64: str, default_ext: str, prefix: str) -> str:
    _ensure_upload_dir()

    header = None
    if b64.startswith("data:"):
        header, b64data = b64.split(",", 1)
    else:
        b64data = b64

    ext = default_ext
    if header:
        try:
            mime = header.split(":")[1].split(";")[0]
            ext = "." + mime.split("/")[1]
        except:
            pass

    filename = f"{prefix}{uuid.uuid4().hex}{ext}"
    abs_path = os.path.join(settings.UPLOAD_DIR, filename)

    raw = base64.b64decode(b64data)
    with open(abs_path, "wb") as f:
        f.write(raw)

    return abs_path


# --------------------------------------------------------------
# MAIN OPERATOR ENDPOINT
# --------------------------------------------------------------
@router.post("/log")
async def operator_log(
    request: Request,

    machine_id: Optional[str] = Form(None),
    reason: Optional[str] = Form(None),
    category: Optional[str] = Form(None),
    description: Optional[str] = Form(None),

    image: Optional[UploadFile] = File(None),
    audio: Optional[UploadFile] = File(None),

    image_base64: Optional[str] = Form(None),
    audio_base64: Optional[str] = Form(None),

    user=Depends(get_current_user)
):
    require_operator(user)

    # Fallback for JSON input
    ct = request.headers.get("content-type", "")
    if not machine_id and ct.startswith("application/json"):
        data = await request.json()
        machine_id = data.get("machine_id")
        reason = data.get("reason")
        category = data.get("category")
        description = data.get("description")
        image_base64 = data.get("image_base64")
        audio_base64 = data.get("audio_base64")

    if not machine_id:
        raise HTTPException(400, "machine_id is required")

    downtime_data = {
        "machine_id": machine_id,
        "reason": reason or "",
        "category": category or "",
        "description": description or "",
        "operator_id": user["id"],
        "operator_email": user["email"],
        "status": "open",
    }

    saved_image_path = None
    saved_audio_path = None

    # --------------------------------------------------------------
    # Save local files or base64
    # --------------------------------------------------------------
    try:
        if image and image.filename:
            saved_image_path = _save_upload_file(image, "img_")
            downtime_data["image_path"] = saved_image_path

        if audio and audio.filename:
            saved_audio_path = _save_upload_file(audio, "aud_")
            downtime_data["audio_path"] = saved_audio_path

        if image_base64 and not saved_image_path:
            saved_image_path = _save_base64_data(image_base64, ".jpg", "img_")
            downtime_data["image_path"] = saved_image_path

        if audio_base64 and not saved_audio_path:
            saved_audio_path = _save_base64_data(audio_base64, ".webm", "aud_")
            downtime_data["audio_path"] = saved_audio_path

        insert_res = supabase.table("downtime_logs").insert(downtime_data).execute()
        if not insert_res.data:
            raise Exception("Insert failed")

        downtime = insert_res.data[0]

    except Exception as e:
        raise HTTPException(500, f"Insert failed: {e}")

    # --------------------------------------------------------------
    # AI Analysis (your previous logic)
    # --------------------------------------------------------------
    try:
        history = (
            supabase.table("downtime_logs")
            .select("*")
            .order("created_at", desc=True)
            .limit(20)
            .execute()
        ).data or []

        ai_result = await ai_engine.analyze_downtime(downtime, history)

        supabase.table("ai_analysis").insert({
            "downtime_id": downtime["id"],
            "root_cause": ai_result.get("root_cause"),
            "immediate_actions": ", ".join(ai_result.get("recommended_actions", [])),
            "preventive_measures": ", ".join(ai_result.get("preventive_measures", [])),
            "severity": ai_result.get("severity"),
            "predicted_next_failure": ai_result.get("predicted_next_failure"),
            "confidence_score": ai_result.get("confidence_score"),
        }).execute()

        supabase.table("downtime_logs").update({
            "severity": ai_result.get("severity"),
            "root_cause": ai_result.get("root_cause"),
        }).eq("id", downtime["id"]).execute()

        downtime["severity"] = ai_result.get("severity")
        downtime["root_cause"] = ai_result.get("root_cause")

    except Exception as e:
        print("AI analysis failed:", e)

    # --------------------------------------------------------------
    # WebSocket broadcast (your previous logic)
    # --------------------------------------------------------------
    try:
        await ws_manager.broadcast_managers({
            "type": "new_downtime",
            "id": downtime["id"],
            "machine_id": downtime["machine_id"],
            "reason": downtime["reason"],
            "category": downtime["category"],
            "description": downtime["description"],
            "severity": downtime.get("severity", "unknown"),
            "created_at": downtime["created_at"],
            "operator_email": downtime["operator_email"],
        })
    except Exception as e:
        print("WS broadcast error:", e)

    return JSONResponse({"message": "Downtime logged", "data": downtime})
