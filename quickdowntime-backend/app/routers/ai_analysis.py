from fastapi import APIRouter, Depends
from app.auth.security import get_current_user, require_manager
from app.config import supabase
from app.services.ai_engine import ai_engine
from datetime import datetime, timedelta

router = APIRouter(prefix="/api/ai/analysis", tags=["AI Analysis"])


# ---------------------------
# Helper function
# ---------------------------
def calculate_duration(start_time, end_time):
    """Calculate duration between start and end time"""
    if not start_time:
        return "Unknown"
    
    if not end_time:
        return "Ongoing"
    
    try:
        start = datetime.fromisoformat(start_time.replace('Z', '+00:00'))
        end = datetime.fromisoformat(end_time.replace('Z', '+00:00'))
        delta = end - start
        
        hours = delta.seconds // 3600
        minutes = (delta.seconds % 3600) // 60
        
        if hours > 0:
            return f"{hours}h {minutes}m"
        else:
            return f"{minutes}m"
    except:
        return "Unknown"


# ---------------------------
# 1) DAILY AI SUMMARY (Today's downtimes only)
# ---------------------------
@router.get("/daily")
async def ai_daily_summary(user=Depends(get_current_user)):
    require_manager(user)

    # Get today's downtimes only
    today_start = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
    today_start_str = today_start.isoformat()

    res = supabase.table("downtime_logs") \
        .select("*") \
        .gte("start_time", today_start_str) \
        .order("start_time", desc=True) \
        .execute()

    rows = res.data or []

    if not rows:
        return {
            "analysis": "✅ No downtimes recorded today. Excellent performance! All machines are running smoothly.",
            "total_incidents": 0
        }

    # Prepare summary data for AI
    summary_text = f"Today's JSW Steel Downtime Analysis ({len(rows)} incidents):\n\n"
    
    for idx, event in enumerate(rows, 1):
        duration = calculate_duration(event.get("start_time"), event.get("end_time"))
        summary_text += f"{idx}. Machine: {event.get('machine_id')}\n"
        summary_text += f"   Root Cause: {event.get('root_cause')} - {event.get('sub_category')}\n"
        summary_text += f"   Duration: {duration}\n"
        summary_text += f"   Description: {event.get('description', 'N/A')}\n\n"

    # Send to AI for analysis
    ai_result = await ai_engine.analyze_downtime_summary(summary_text, rows)
    
    return {
        "analysis": ai_result,
        "total_incidents": len(rows),
        "events": rows
    }


# ---------------------------
# 2) WEEKLY AI SUMMARY (Last 7 days)
# ---------------------------
@router.get("/weekly")
async def ai_weekly_summary(user=Depends(get_current_user)):
    require_manager(user)

    # Get last 7 days of downtimes
    week_start = datetime.now() - timedelta(days=7)
    week_start_str = week_start.isoformat()

    res = supabase.table("downtime_logs") \
        .select("*") \
        .gte("start_time", week_start_str) \
        .order("start_time", desc=True) \
        .execute()

    rows = res.data or []

    if not rows:
        return {
            "analysis": "✅ No downtimes recorded in the last 7 days. Outstanding performance!",
            "total_incidents": 0,
            "machine_stats": {},
            "cause_stats": {}
        }

    # Group by machine and cause
    machine_stats = {}
    cause_stats = {}
    
    for event in rows:
        machine = event.get('machine_id', 'Unknown')
        cause = event.get('root_cause', 'Unknown')
        
        machine_stats[machine] = machine_stats.get(machine, 0) + 1
        cause_stats[cause] = cause_stats.get(cause, 0) + 1

    # Prepare summary for AI
    summary_text = f"Weekly JSW Steel Downtime Analysis (Last 7 days - {len(rows)} total incidents):\n\n"
    
    summary_text += "Top Affected Machines:\n"
    for machine, count in sorted(machine_stats.items(), key=lambda x: x[1], reverse=True)[:5]:
        summary_text += f"  - {machine}: {count} incidents\n"
    
    summary_text += "\nTop Root Causes:\n"
    for cause, count in sorted(cause_stats.items(), key=lambda x: x[1], reverse=True)[:5]:
        summary_text += f"  - {cause}: {count} incidents\n"
    
    summary_text += "\nRecent Events:\n"
    for idx, event in enumerate(rows[:10], 1):
        duration = calculate_duration(event.get("start_time"), event.get("end_time"))
        summary_text += f"{idx}. {event.get('machine_id')} - {event.get('root_cause')}, Duration: {duration}\n"

    # Send to AI for analysis
    ai_result = await ai_engine.analyze_downtime_summary(summary_text, rows)
    
    return {
        "analysis": ai_result,
        "total_incidents": len(rows),
        "machine_stats": machine_stats,
        "cause_stats": cause_stats,
        "events": rows
    }


# ---------------------------
# 3) SINGLE EVENT ANALYSIS
# ---------------------------
@router.get("/{downtime_id}")
async def ai_single_event(downtime_id: int, user=Depends(get_current_user)):
    require_manager(user)

    res = supabase.table("downtime_logs") \
        .select("*") \
        .eq("id", downtime_id) \
        .single() \
        .execute()

    event = res.data

    if not event:
        return {"error": "Event not found"}

    history_res = supabase.table("downtime_logs") \
        .select("*") \
        .order("start_time", desc=True) \
        .limit(50) \
        .execute()

    history = history_res.data or []

    ai_result = await ai_engine.analyze_downtime(event, history)
    return ai_result