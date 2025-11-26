# app/routers/downtime.py
import uuid
import json
import os
from fastapi import APIRouter, Form, File, UploadFile, Depends, HTTPException
from typing import Optional
from ..config import supabase, settings
from ..services.ai_engine import ai_engine
from ..services.websocket_manager import ws_manager
from datetime import datetime

router = APIRouter(prefix="/api/downtime", tags=["downtime"])


def optional_file(file: Optional[UploadFile] = File(None)):
    if isinstance(file, str):  # swagger odd case
        return None
    return file


def save_file_local(file: UploadFile, folder: str):
    """Save UploadFile to settings.UPLOAD_DIR/{folder}/uuid.ext and return public path."""
    ext = (file.filename or "bin").split(".")[-1]
    unique = f"{uuid.uuid4().hex}.{ext}"
    folder_path = os.path.join(settings.UPLOAD_DIR, folder)
    os.makedirs(folder_path, exist_ok=True)
    path = os.path.join(folder_path, unique)

    # write bytes
    with open(path, "wb") as f:
        f.write(file.file.read())

    # return the public URL served by FastAPI static mount
    # e.g. /uploads/images/xxx.jpg
    public_url = f"/uploads/{folder}/{unique}"
    return public_url


def insert_downtime_record_supabase(data: dict):
    """Try inserting a record into Supabase; return (success, resp_data_or_error)."""
    try:
        resp = supabase.table("downtime_logs").insert(data).execute()
        # resp may be a SingleAPIResponse; check .data
        return True, resp.data[0] if getattr(resp, "data", None) else resp
    except Exception as e:
        return False, str(e)


def queue_local_record(record: dict):
    """Queue record locally to unsynced folder as a JSON file for later sync."""
    qdir = os.path.join(settings.UPLOAD_DIR, "unsynced")
    os.makedirs(qdir, exist_ok=True)
    fname = os.path.join(qdir, f"{uuid.uuid4().hex}.json")
    with open(fname, "w", encoding="utf-8") as f:
        json.dump(record, f, default=str)
    return fname


@router.post("/log-local")
async def log_downtime_local(
    machine_id: str = Form(...),
    reason: str = Form(...),
    category: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    duration_minutes: Optional[int] = Form(None),
    image: Optional[UploadFile] = File(None),
    audio: Optional[UploadFile] = File(None),
    operator_email: Optional[str] = Form(None),
):
    """
    Local upload endpoint:
    - saves image/audio to app/uploads/{images|audio}
    - constructs downtime record
    - attempts to insert into Supabase; if fails, writes to unsynced queue
    Returns: saved record or queued filepath.
    """
    image_url = None
    audio_url = None

    try:
        if image:
            image_url = save_file_local(image, "images")
        if audio:
            audio_url = save_file_local(audio, "audio")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save files: {e}")

    now = datetime.utcnow().isoformat()

    downtime_data = {
        "machine_id": machine_id,
        "reason": reason,
        "category": category,
        "description": description,
        "duration_minutes": duration_minutes,
        "image_path": image_url,
        "audio_path": audio_url,
        "operator_email": operator_email,
        "status": "open",
        "created_at": now,
        "updated_at": now,
        "start_time": now,
    }

    # Try insert to supabase
    ok, resp = insert_downtime_record_supabase(downtime_data)
    if ok:
        saved = resp
        # optionally run AI analysis asynchronously — we'll call AI and save to ai_analysis table if supabase is fine
        try:
            history = supabase.table("downtime_logs").select("*").order("created_at", desc=True).limit(20).execute().data or []
            analysis = await ai_engine.analyze_downtime(saved, history)
            supabase.table("ai_analysis").insert({
                "downtime_id": saved.get("id"),
                "root_cause": analysis.get("root_cause"),
                "immediate_actions": analysis.get("recommended_actions"),
                "preventive_measures": analysis.get("preventive_measures"),
                "severity": analysis.get("severity"),
                "predicted_next_failure": analysis.get("predicted_next_failure"),
                "confidence_score": analysis.get("confidence_score"),
            }).execute()
        except Exception:
            # ignore AI failures — not fatal
            pass

        # Broadcast via websocket if exists
        try:
            await ws_manager.broadcast({
                "type": "new_downtime_with_ai",
                "downtime": saved,
                "ai_analysis": analysis if 'analysis' in locals() else {}
            })
        except Exception:
            pass

        return {"status": "saved", "downtime": saved}
    else:
        # Supabase failed — queue locally for later sync
        qname = queue_local_record(downtime_data)
        return {"status": "queued", "queued_file": qname, "error": resp}


@router.post("/sync")
def sync_queued_records():
    """
    Manually push unsynced JSON files from uploads/unsynced -> Supabase.
    Returns summary.
    """
    qdir = os.path.join(settings.UPLOAD_DIR, "unsynced")
    if not os.path.exists(qdir):
        return {"synced": 0, "errors": []}

    files = [os.path.join(qdir, f) for f in os.listdir(qdir) if f.endswith(".json")]
    synced = 0
    errors = []

    for fpath in files:
        try:
            with open(fpath, "r", encoding="utf-8") as fh:
                record = json.load(fh)
            ok, resp = insert_downtime_record_supabase(record)
            if ok:
                # remove queued file
                os.remove(fpath)
                synced += 1
            else:
                errors.append({"file": fpath, "error": resp})
        except Exception as e:
            errors.append({"file": fpath, "error": str(e)})

    return {"synced": synced, "errors": errors}
