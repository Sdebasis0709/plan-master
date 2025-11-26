# app/routers/management.py
from fastapi import APIRouter, Depends, Query, HTTPException
from typing import Optional
from datetime import datetime
from app.auth.security import get_current_user, require_manager
from app.config import supabase
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from io import StringIO
import csv

# import ws_manager for broadcasts
from app.services.websocket_manager import ws_manager

router = APIRouter(prefix="/api/management", tags=["Management Dashboard"])


# -----------------------------
# Utility for parsing datetime
# -----------------------------
def parse_dt(dt: Optional[str]):
    if not dt:
        return None
    return datetime.fromisoformat(dt)


# -----------------------------
# 1) KPI SUMMARY
# -----------------------------
@router.get("/kpis")
def get_kpis(user=Depends(get_current_user)):
    require_manager(user)

    res = supabase.table("downtime_logs").select("*").execute()
    data = res.data or []

    total = len(data)

    # category breakdown
    categories = {}
    machines = {}

    for d in data:
        cat = d.get("category") or "Uncategorized"
        categories[cat] = categories.get(cat, 0) + 1

        mid = d["machine_id"]
        machines[mid] = machines.get(mid, 0) + 1

    return {
        "total_downtimes": total,
        "category_breakdown": categories,
        "machine_breakdown": machines,
    }


# -----------------------------
# 2) LIST DOWNTIMES (PAGINATION + FILTERS)
# -----------------------------
@router.get("/downtimes")
def list_downtimes(
    user=Depends(get_current_user),
    page: int = Query(1, ge=1),
    per_page: int = Query(25, ge=1, le=200),
    machine_id: Optional[str] = None,
    category: Optional[str] = None,
    reason: Optional[str] = None,
    severity: Optional[str] = None,
    status: Optional[str] = None,
    operator_email: Optional[str] = None,
    start_after: Optional[str] = None,
    start_before: Optional[str] = None,
    search: Optional[str] = None,
    order_by: str = Query("created_at"),
    order_dir: str = Query("desc"),
):
    require_manager(user)

    q = supabase.table("downtime_logs").select("*")

    # Filters
    if machine_id:
        q = q.eq("machine_id", machine_id)
    if category:
        q = q.eq("category", category)
    if reason:
        q = q.eq("reason", reason)
    if severity:
        q = q.eq("severity", severity)
    if status:
        q = q.eq("status", status)
    if operator_email:
        q = q.eq("operator_email", operator_email)
    if start_after:
        q = q.gte("start_time", parse_dt(start_after).isoformat())
    if start_before:
        q = q.lte("start_time", parse_dt(start_before).isoformat())

    # Ordering
    if order_dir.lower() == "desc":
        q = q.order(order_by, desc=True)
    else:
        q = q.order(order_by, desc=False)

    # Pagination
    start = (page - 1) * per_page
    end = start + per_page - 1
    resp = q.range(start, end).execute()

    # Total count
    count_resp = supabase.table("downtime_logs").select("id", count="exact").execute()
    total = getattr(count_resp, "count", 0)

    return {
        "page": page,
        "per_page": per_page,
        "total": total,
        "data": resp.data,
    }


# -----------------------------
# 3) SINGLE DOWNTIME DETAILS
# -----------------------------
@router.get("/downtimes/{id}")
def get_downtime(id: int, user=Depends(get_current_user)):
    require_manager(user)

    resp = supabase.table("downtime_logs").select("*").eq("id", id).execute()
    if not resp.data:
        raise HTTPException(status_code=404, detail="Downtime entry not found")

    return resp.data[0]


# -----------------------------
# 4) RESOLVE A DOWNTIME
# -----------------------------
class ResolveIn(BaseModel):
    resolution_notes: Optional[str] = None


@router.patch("/downtimes/{id}/resolve")
async def resolve_downtime(id: int, payload: ResolveIn, user=Depends(get_current_user)):
    require_manager(user)

    updates = {
        "status": "resolved",
        "resolved_at": datetime.utcnow().isoformat(),
        "resolved_by": user["id"],
        "resolution_notes": payload.resolution_notes,
        "updated_at": datetime.utcnow().isoformat(),
    }

    resp = supabase.table("downtime_logs").update(updates).eq("id", id).execute()

    # resp may not have .error property; check status_code or data
    status = getattr(resp, "status_code", None)
    data = getattr(resp, "data", None)
    if status is not None and status >= 400:
        raise HTTPException(500, "Failed to update downtime")

    # ---------------------------------------------
    # 🔥 WEB SOCKET BROADCAST (Managers + Operators)
    # ---------------------------------------------
    # broadcast to managers
    await ws_manager.broadcast_managers({
        "type": "downtime_resolved",
        "id": id,
        "resolved_by": user["id"],
        "resolved_at": updates["resolved_at"],
    })

    # broadcast to operators
    await ws_manager.broadcast_operators({
        "type": "downtime_resolved",
        "id": id,
    })

    return {"message": "Downtime resolved", "data": data}


# -----------------------------
# 5) MACHINE STATS (TOP MACHINES BY COUNT)
# -----------------------------
@router.get("/stats/machines")
def machine_stats(user=Depends(get_current_user), top_n: int = 10):
    require_manager(user)

    res = supabase.table("downtime_logs").select("machine_id").execute()
    data = res.data or []

    counts = {}
    for d in data:
        mid = d["machine_id"]
        counts[mid] = counts.get(mid, 0) + 1

    sorted_list = sorted(
        [{"machine_id": k, "count": v} for k, v in counts.items()],
        key=lambda x: -x["count"]
    )

    return {"top_machines": sorted_list[:top_n]}


# -----------------------------
# 6) ROOT CAUSE STATS
# -----------------------------
@router.get("/stats/root-causes")
def root_cause_stats(user=Depends(get_current_user)):
    require_manager(user)

    res = supabase.table("downtime_logs").select("root_cause").execute()

    freq = {}
    for row in res.data:
        rc = row.get("root_cause")
        if rc:
            freq[rc] = freq.get(rc, 0) + 1

    sorted_freq = sorted(
        [{"root_cause": k, "count": v} for k, v in freq.items()],
        key=lambda x: -x["count"]
    )

    return sorted_freq[:10]   # ⬅ Return array, not object



# -----------------------------
# 7) LATEST ALERTS (RECENT 5)
# -----------------------------
@router.get("/alerts")
def get_alerts(user=Depends(get_current_user)):
    require_manager(user)

    res = (
        supabase.table("downtime_logs")
        .select("*")
        .order("created_at", desc=True)
        .limit(5)
        .execute()
    )

    return res.data


# -----------------------------
# 8) CSV EXPORT
# -----------------------------
@router.get("/export")
def export_csv(
    user=Depends(get_current_user),
    status: Optional[str] = None,
    machine_id: Optional[str] = None,
):
    require_manager(user)

    q = supabase.table("downtime_logs").select("*")
    if status:
        q = q.eq("status", status)
    if machine_id:
        q = q.eq("machine_id", machine_id)

    res = q.execute()
    data = res.data or []

    headers = [
        "id", "machine_id", "reason", "category", "description",
        "duration_minutes", "severity", "status", "operator_email",
        "root_cause", "industry_label", "created_at", "updated_at",
        "start_time", "end_time", "duration_seconds"
    ]

    si = StringIO()
    writer = csv.writer(si)
    writer.writerow(headers)

    for row in data:
        writer.writerow([row.get(h) for h in headers])

    si.seek(0)

    return StreamingResponse(
        si,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=downtimes.csv"},
    )
