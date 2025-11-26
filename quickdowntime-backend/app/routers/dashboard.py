from fastapi import APIRouter, Depends
from app.auth.security import get_current_user, require_manager
from app.config import supabase

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


# -------------------------------
# MANAGER ONLY – KPI Dashboard
# -------------------------------

@router.get("/kpis")
def get_kpis(user = Depends(get_current_user)):
    require_manager(user)

    today = supabase.table("downtime_logs").select("*").execute()

    total = len(today.data)
    critical = sum(1 for d in today.data if d.get("severity") == "high")
    ai_issues = sum(1 for d in today.data if d.get("root_cause"))

    return {
        "today_downtimes": total,
        "critical_machines": critical,
        "ai_issues": ai_issues,
    }


# -------------------------------
# MANAGER ONLY – Alerts
# -------------------------------

@router.get("/alerts")
def get_alerts(user = Depends(get_current_user)):
    require_manager(user)

    data = (
        supabase.table("downtime_logs")
        .select("*")
        .order("id", desc=True)
        .limit(5)
        .execute()
    )

    return data.data


# -------------------------------
# TEST ROUTE (for debugging token)
# -------------------------------

@router.get("/test")
def test_dashboard(user = Depends(get_current_user)):
    return {
        "message": "Access granted",
        "user": user
    }
