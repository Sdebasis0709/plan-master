# app/routers/dashboard.py
from fastapi import APIRouter, Depends, HTTPException
from app.auth.security import get_current_user, require_manager
from app.config import supabase
from datetime import datetime, timedelta
from typing import List, Optional

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


# -------------------------------
# MANAGER ONLY – KPI Dashboard
# -------------------------------
@router.get("/kpis")
def get_kpis(user=Depends(get_current_user)):
    require_manager(user)

    try:
        # Get today's date range
        today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        today_start_iso = today_start.isoformat()
        
        # Fetch all downtime logs
        all_logs = supabase.table("downtime_logs").select("*").execute()
        
        # Filter for today's logs
        today_logs = [
            log for log in all_logs.data 
            if log.get("created_at") and log["created_at"] >= today_start_iso
        ]
        
        # Calculate KPIs
        total_today = len(today_logs)
        
        # Resolved today: logs with resolved_at timestamp from today
        resolved_today = sum(
            1 for log in today_logs 
            if log.get("resolved_at") is not None
        )
        
        # High priority breakdown: logs with severity = "high"
        high_priority = sum(
            1 for log in today_logs 
            if log.get("severity") == "high"
        )
        
        # Unseen alerts (for badge)
        unseen = sum(1 for log in all_logs.data if not log.get("seen", False))

        return {
            "today_downtimes": total_today,
            "resolved_today": resolved_today,
            "high_priority": high_priority,
            "unseen_alerts": unseen,
        }
    except Exception as e:
        print(f"Error fetching KPIs: {e}")
        import traceback
        traceback.print_exc()
        return {
            "today_downtimes": 0,
            "resolved_today": 0,
            "high_priority": 0,
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
        # Get user ID safely - handle different user object structures
        user_id = None
        if isinstance(user, dict):
            user_id = user.get("sub") or user.get("id") or user.get("user_id") or user.get("email")
        else:
            # If user is an object, try to get attributes
            user_id = getattr(user, "sub", None) or getattr(user, "id", None) or getattr(user, "email", None)
        
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
        
        # Mark all as seen - update fields
        marked_count = 0
        
        for alert_id in alert_ids:
            try:
                update_data = {
                    "seen": True,
                    "seen_at": datetime.utcnow().isoformat()
                }
                
                # Only add seen_by if we have a valid user_id
                if user_id:
                    update_data["seen_by"] = str(user_id)
                
                supabase.table("downtime_logs").update(update_data).eq("id", alert_id).execute()
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
        # Get user ID safely
        user_id = None
        if isinstance(user, dict):
            user_id = user.get("sub") or user.get("id") or user.get("user_id") or user.get("email")
        else:
            user_id = getattr(user, "sub", None) or getattr(user, "id", None) or getattr(user, "email", None)
        
        update_data = {
            "seen": True,
            "seen_at": datetime.utcnow().isoformat()
        }
        
        # Only add seen_by if we have a valid user_id
        if user_id:
            update_data["seen_by"] = str(user_id)
        
        result = supabase.table("downtime_logs").update(update_data).eq("id", alert_id).execute()
        
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
    # This will help you see what's in the user object
    return {
        "message": "Access granted",
        "user": user,
        "user_type": type(user).__name__,
        "user_keys": list(user.keys()) if isinstance(user, dict) else dir(user)
    }