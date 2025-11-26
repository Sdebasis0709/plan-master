# app/routers/machine_monitoring.py
from fastapi import APIRouter, Depends
from datetime import datetime, timedelta
from app.auth.security import get_current_user, require_manager
from app.config import supabase
from typing import List, Dict

router = APIRouter(prefix="/api/management/machines", tags=["Machine Monitoring"])

# Static list of all machines in the plant
MACHINES = [
    "Hot Strip Mill",
    "Cold Rolling Mill",
    "Blast Furnace",
    "Basic Oxygen Furnace",
    "Continuous Casting Machine",
    "Plate Mill",
    "Wire Rod Mill",
    "Galvanizing Line",
    "Pickling Line",
    "Sinter Plant"
]


# ====================================================================
# 1) LIVE MACHINE STATUS - Get all machines with today's downtime count
# ====================================================================
@router.get("/status")
def get_machines_status(user=Depends(get_current_user)):
    """
    Returns live status of all machines with:
    - Today's downtime count
    - Priority (based on frequency)
    - Last downtime time
    - Current status (running/down)
    """
    require_manager(user)
    
    # Get today's start time
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    
    # Fetch all downtimes from today
    today_downtimes = (
        supabase.table("downtime_logs")
        .select("*")
        .gte("created_at", today_start.isoformat())
        .execute()
    )
    
    # Fetch last 7 days for priority calculation
    week_ago = (datetime.utcnow() - timedelta(days=7)).isoformat()
    week_downtimes = (
        supabase.table("downtime_logs")
        .select("machine_id, created_at")
        .gte("created_at", week_ago)
        .execute()
    )
    
    # Process data for each machine
    machine_stats = []
    
    for machine in MACHINES:
        # Today's downtime count
        today_count = sum(1 for d in today_downtimes.data if d.get("machine_id") == machine)
        
        # Week's downtime count for priority
        week_count = sum(1 for d in week_downtimes.data if d.get("machine_id") == machine)
        
        # Calculate priority
        if week_count >= 10:
            priority = "high"
        elif week_count >= 5:
            priority = "medium"
        else:
            priority = "low"
        
        # Get last downtime for this machine
        machine_downtimes = [d for d in today_downtimes.data if d.get("machine_id") == machine]
        last_downtime = None
        status = "running"
        
        if machine_downtimes:
            # Sort by created_at descending
            sorted_downtimes = sorted(machine_downtimes, key=lambda x: x.get("created_at", ""), reverse=True)
            latest = sorted_downtimes[0]
            last_downtime = latest.get("created_at")
            
            # Check if still down (status = 'open')
            if latest.get("status") == "open":
                status = "down"
        
        machine_stats.append({
            "machine_id": machine,
            "status": status,
            "today_downtime_count": today_count,
            "week_downtime_count": week_count,
            "priority": priority,
            "last_downtime": last_downtime,
            "last_reason": machine_downtimes[0].get("reason") if machine_downtimes else None
        })
    
    # Sort by priority (high first) then by downtime count
    priority_order = {"high": 0, "medium": 1, "low": 2}
    machine_stats.sort(key=lambda x: (priority_order[x["priority"]], -x["today_downtime_count"]))
    
    return machine_stats


# ====================================================================
# 2) MACHINE DETAIL - Get all downtimes for a specific machine
# ====================================================================
@router.get("/{machine_id}/history")
def get_machine_history(machine_id: str, user=Depends(get_current_user)):
    """
    Returns downtime history for a specific machine
    - All downtimes (paginated or last 30 days)
    - Grouped by day
    """
    require_manager(user)
    
    # Decode URL-encoded machine name
    from urllib.parse import unquote
    machine_id = unquote(machine_id)
    
    # Get last 30 days of data
    since = (datetime.utcnow() - timedelta(days=30)).isoformat()
    
    downtimes = (
        supabase.table("downtime_logs")
        .select("*")
        .eq("machine_id", machine_id)
        .gte("created_at", since)
        .order("created_at", desc=True)
        .execute()
    )
    
    return {
        "machine_id": machine_id,
        "total_count": len(downtimes.data),
        "downtimes": downtimes.data
    }


# ====================================================================
# 3) MACHINE HEARTBEAT DATA - For graph (last 24 hours)
# ====================================================================
@router.get("/{machine_id}/heartbeat")
def get_machine_heartbeat(machine_id: str, user=Depends(get_current_user)):
    """
    Returns hourly uptime/downtime data for last 24 hours
    Used for heartbeat graph visualization
    """
    require_manager(user)
    
    from urllib.parse import unquote
    machine_id = unquote(machine_id)
    
    # Get last 24 hours
    since = (datetime.utcnow() - timedelta(hours=24)).isoformat()
    
    downtimes = (
        supabase.table("downtime_logs")
        .select("created_at, duration_minutes, status")
        .eq("machine_id", machine_id)
        .gte("created_at", since)
        .execute()
    )
    
    # Create hourly buckets (last 24 hours)
    hourly_data = []
    now = datetime.utcnow()
    
    for i in range(24):
        hour_start = now - timedelta(hours=23-i)
        hour_end = hour_start + timedelta(hours=1)
        
        # Count downtimes in this hour
        count = sum(
            1 for d in downtimes.data 
            if hour_start.isoformat() <= d.get("created_at", "") < hour_end.isoformat()
        )
        
        hourly_data.append({
            "hour": hour_start.strftime("%H:00"),
            "downtime_count": count,
            "status": "down" if count > 0 else "running"
        })
    
    return hourly_data