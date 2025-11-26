# app/routers/dashboard.py
from fastapi import APIRouter, Depends, HTTPException
from app.auth.security import get_current_user, require_manager
from app.config import supabase
from datetime import datetime
from typing import List, Optional

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


# -------------------------------
# MANAGER ONLY – KPI Dashboard
# -------------------------------
@router.get("/kpis")
def get_kpis(user=Depends(get_current_user)):
    require_manager(user)

    try:
        today = supabase.table("downtime_logs").select("*").execute()

        total = len(today.data)
        critical = sum(1 for d in today.data if d.get("severity") == "high")
        ai_issues = sum(1 for d in today.data if d.get("root_cause"))
        unseen = sum(1 for d in today.data if not d.get("seen", False))

        return {
            "today_downtimes": total,
            "critical_machines": critical,
            "ai_issues": ai_issues,
            "unseen_alerts": unseen,
        }
    except Exception as e:
        print(f"Error fetching KPIs: {e}")
        return {
            "today_downtimes": 0,
            "critical_machines": 0,
            "ai_issues": 0,
            "unseen_alerts": 0,
        }


# -------------------------------
# MANAGER ONLY – Get All Alerts
# -------------------------------
@router.get("/alerts")
def get_alerts(
    user=Depends(get_current_user),
    limit: int = 50,
    only_unseen: bool = False
):
    require_manager(user)

    try:
        query = supabase.table("downtime_logs").select("*")
        
        if only_unseen:
            query = query.eq("seen", False)
        
        data = (
            query
            .order("created_at", desc=True)
            .limit(limit)
            .execute()
        )

        return data.data or []
    
    except Exception as e:
        print(f"Error fetching alerts: {e}")
        return []


# -------------------------------
# Get Unseen Alert Count
# -------------------------------
@router.get("/alerts/unseen-count")
def get_unseen_count(user=Depends(get_current_user)):
    require_manager(user)
    
    try:
        result = (
            supabase.table("downtime_logs")
            .select("id", count="exact")
            .eq("seen", False)
            .execute()
        )
        
        count = result.count if hasattr(result, 'count') else 0
        return {"count": count}
    
    except Exception as e:
        print(f"Error counting unseen alerts: {e}")
        return {"count": 0}


# -------------------------------
# Mark All Alerts as Seen
# -------------------------------
@router.post("/alerts/mark-seen")
def mark_alerts_seen(user=Depends(get_current_user)):
    require_manager(user)
    
    try:
        # Get all unseen alert IDs
        unseen = (
            supabase.table("downtime_logs")
            .select("id")
            .eq("seen", False)
            .execute()
        )
        
        if not unseen.data:
            return {"marked": 0, "message": "No unseen alerts"}
        
        alert_ids = [row["id"] for row in unseen.data]
        
        # Mark all as seen in one update
        # Note: Supabase doesn't support bulk updates easily, so we do it in batches
        marked_count = 0
        
        for alert_id in alert_ids:
            try:
                supabase.table("downtime_logs").update({
                    "seen": True,
                    "seen_at": datetime.utcnow().isoformat(),
                    "seen_by": user["sub"]
                }).eq("id", alert_id).execute()
                marked_count += 1
            except Exception as update_error:
                print(f"Error marking alert {alert_id}: {update_error}")
        
        return {
            "marked": marked_count,
            "message": f"Marked {marked_count} alert(s) as seen"
        }
    
    except Exception as e:
        print(f"Error in mark_alerts_seen: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# -------------------------------
# Mark Single Alert as Seen
# -------------------------------
@router.post("/alerts/{alert_id}/mark-seen")
def mark_single_alert_seen(alert_id: int, user=Depends(get_current_user)):
    require_manager(user)
    
    try:
        result = supabase.table("downtime_logs").update({
            "seen": True,
            "seen_at": datetime.utcnow().isoformat(),
            "seen_by": user["sub"]
        }).eq("id", alert_id).execute()
        
        if not result.data:
            raise HTTPException(status_code=404, detail="Alert not found")
        
        return {"success": True, "message": "Alert marked as seen"}
    
    except Exception as e:
        print(f"Error marking alert {alert_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# -------------------------------
# TEST ROUTE (for debugging token)
# -------------------------------
@router.get("/test")
def test_dashboard(user=Depends(get_current_user)):
    return {
        "message": "Access granted",
        "user": user
    }