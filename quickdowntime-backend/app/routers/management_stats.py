# app/routers/management_stats.py
from fastapi import APIRouter, Depends
from datetime import datetime, timedelta
from app.auth.security import get_current_user, require_manager
from app.config import supabase

router = APIRouter(prefix="/api/management/stats", tags=["Management Stats"])

# ====================================================================
# 1) HOURLY STATS (0–23)
# ====================================================================
@router.get("/hourly")
def hourly_stats(user=Depends(get_current_user)):
    require_manager(user)

    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)

    res = (
        supabase.table("downtime_logs")
        .select("start_time")
        .gte("start_time", today_start.isoformat())
        .execute()
    )

    hours = {str(i): 0 for i in range(24)}

    for row in res.data:
        hr = int(row["start_time"][11:13])
        hours[str(hr)] += 1

    return hours   # simple object: {"0":0, "1":0 ...}
    

# ====================================================================
# 2) DAILY (LAST 30 DAYS)
# ====================================================================
@router.get("/daily")
def daily_stats(user=Depends(get_current_user)):
    require_manager(user)

    since = (datetime.utcnow() - timedelta(days=30)).isoformat()

    res = (
        supabase.table("downtime_logs")
        .select("start_time")
        .gte("start_time", since)
        .execute()
    )

    counts = {}

    for row in res.data:
        day = row["start_time"].split("T")[0]
        counts[day] = counts.get(day, 0) + 1

    result = [{"day": d, "count": counts[d]} for d in sorted(counts.keys())]
    return result   # pure array


# ====================================================================
# 3) WEEKLY (LAST 12 WEEKS)
# ====================================================================
@router.get("/weekly")
def weekly_stats(user=Depends(get_current_user)):
    require_manager(user)

    since = (datetime.utcnow() - timedelta(weeks=12)).isoformat()

    res = (
        supabase.table("downtime_logs")
        .select("start_time")
        .gte("start_time", since)
        .execute()
    )

    weeks = {}

    for row in res.data:
        dt = datetime.fromisoformat(row["start_time"].replace("Z", ""))
        week_start = dt - timedelta(days=dt.weekday())
        week_str = week_start.strftime("%Y-%m-%d")
        weeks[week_str] = weeks.get(week_str, 0) + 1

    result = [{"week_start": w, "count": weeks[w]} for w in sorted(weeks.keys())]
    return result   # pure array


# ====================================================================
# 4) ROOT CAUSES (Top 10)
# ====================================================================
@router.get("/root-causes")
def root_cause_stats(user=Depends(get_current_user)):
    require_manager(user)

    res = (
        supabase.table("downtime_logs")
        .select("root_cause")
        .not_.is_("root_cause", None)
        .execute()
    )

    freq = {}
    for row in res.data:
        rc = row["root_cause"]
        freq[rc] = freq.get(rc, 0) + 1

    sorted_freq = sorted(
        [{"root_cause": k, "count": v} for k, v in freq.items()],
        key=lambda x: -x["count"]
    )

    # IMPORTANT: return ARRAY, not object
    return sorted_freq[:10]
