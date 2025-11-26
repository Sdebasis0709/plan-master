# app/routers/management_stats.py
from fastapi import APIRouter, Depends
from datetime import datetime, timedelta
from app.auth.security import get_current_user, require_manager
from app.config import supabase

router = APIRouter(prefix="/api/management/stats", tags=["Management Stats"])

# Valid machines list
VALID_MACHINES = [
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
# UNIFIED STATS ENDPOINT - Load all data at once
# ====================================================================
@router.get("/all")
def all_stats(user=Depends(get_current_user)):
    require_manager(user)

    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    thirty_days_ago = (datetime.utcnow() - timedelta(days=30)).isoformat()
    twelve_weeks_ago = (datetime.utcnow() - timedelta(weeks=12)).isoformat()

    # Fetch all downtime logs - using only existing columns
    res = (
        supabase.table("downtime_logs")
        .select("start_time, end_time, resolved_at, root_cause, machine_id, severity, reason, category")
        .gte("start_time", twelve_weeks_ago)
        .execute()
    )

    # Filter and process data
    all_data = []
    for row in res.data:
        machine_name = row.get("machine_id")  # Use machine_id as machine_name
        
        # Calculate duration in minutes
        duration_minutes = 0
        if row.get("start_time"):
            try:
                start_str = row["start_time"].replace("Z", "+00:00")
                start = datetime.fromisoformat(start_str)
                
                # Use end_time, resolved_at, or current time
                end_time = row.get("end_time") or row.get("resolved_at")
                if end_time:
                    end_str = end_time.replace("Z", "+00:00")
                    end = datetime.fromisoformat(end_str)
                    duration_minutes = (end - start).total_seconds() / 60
            except Exception as e:
                print(f"Error calculating duration: {e}")
                duration_minutes = 0
        
        row["duration_minutes"] = duration_minutes
        row["machine_name"] = machine_name
        all_data.append(row)

    # Process all stats
    result = {
        "hourly": process_hourly(all_data, today_start),
        "daily": process_daily(all_data, thirty_days_ago),
        "weekly": process_weekly(all_data),
        "root_causes": process_root_causes(all_data),
        "machines": list(set([d.get("machine_name") for d in all_data if d.get("machine_name")])),
        "downtime_by_machine": process_downtime_by_machine(all_data),
        "average_resolution_time": process_avg_resolution_time(all_data),
        "severity_distribution": process_severity_distribution(all_data),
        "longest_downtimes": process_longest_downtimes(all_data),
        "mttr_by_machine": process_mttr_by_machine(all_data),
        "downtime_trend": process_downtime_trend(all_data, thirty_days_ago)
    }

    return result


def process_hourly(data, today_start):
    """Process hourly breakdown for today"""
    hours = {str(i): 0 for i in range(24)}
    
    for row in data:
        start_time = row.get("start_time", "")
        if not start_time:
            continue
        try:
            start_str = start_time.replace("Z", "+00:00")
            dt = datetime.fromisoformat(start_str)
            
            # Make today_start timezone-aware for comparison
            if dt.tzinfo and not today_start.tzinfo:
                from datetime import timezone
                today_start = today_start.replace(tzinfo=timezone.utc)
            
            if dt >= today_start:
                hr = dt.hour
                hours[str(hr)] += 1
        except Exception as e:
            print(f"Error processing hourly: {e}")
            continue
    
    return hours


def process_daily(data, since):
    """Process daily counts for last 30 days"""
    try:
        since_str = since.replace("Z", "+00:00")
        since_dt = datetime.fromisoformat(since_str)
    except:
        since_dt = datetime.fromisoformat(since)
    
    counts = {}
    
    for row in data:
        start_time = row.get("start_time", "")
        if not start_time:
            continue
        try:
            start_str = start_time.replace("Z", "+00:00")
            dt = datetime.fromisoformat(start_str)
            
            if dt >= since_dt:
                day = start_time.split("T")[0]
                machine = row.get("machine_name", "Unknown")
                key = f"{day}_{machine}"
                if day not in counts:
                    counts[day] = {"day": day, "count": 0, "machine_name": machine}
                counts[day]["count"] += 1
        except Exception as e:
            print(f"Error processing daily: {e}")
            continue
    
    result = sorted(counts.values(), key=lambda x: x["day"])
    return result


def process_weekly(data):
    """Process weekly breakdown for last 12 weeks"""
    weeks = {}
    
    for row in data:
        start_time = row.get("start_time", "")
        if not start_time:
            continue
        try:
            start_str = start_time.replace("Z", "+00:00")
            dt = datetime.fromisoformat(start_str)
            week_start = dt - timedelta(days=dt.weekday())
            week_str = week_start.strftime("%Y-%m-%d")
            
            machine = row.get("machine_name", "Unknown")
            key = f"{week_str}_{machine}"
            if week_str not in weeks:
                weeks[week_str] = {"week_start": week_str, "count": 0, "machine_name": machine}
            weeks[week_str]["count"] += 1
        except Exception as e:
            print(f"Error processing weekly: {e}")
            continue
    
    result = sorted(weeks.values(), key=lambda x: x["week_start"])
    return result


def process_root_causes(data):
    """Process top 10 root causes"""
    freq = {}
    
    for row in data:
        rc = row.get("root_cause") or row.get("reason") or "Unknown"
        machine = row.get("machine_name", "Unknown")
        
        if rc not in freq:
            freq[rc] = {"root_cause": rc, "count": 0, "machine_name": machine}
        freq[rc]["count"] += 1
    
    sorted_freq = sorted(freq.values(), key=lambda x: -x["count"])
    return sorted_freq[:10]


def process_downtime_by_machine(data):
    """Total downtime minutes by machine"""
    machine_downtime = {}
    
    for row in data:
        machine = row.get("machine_name", "Unknown")
        duration = row.get("duration_minutes", 0)
        
        if machine not in machine_downtime:
            machine_downtime[machine] = 0
        machine_downtime[machine] += duration
    
    result = [
        {"machine": m, "total_minutes": round(machine_downtime[m], 2)} 
        for m in sorted(machine_downtime.keys())
    ]
    return result


def process_avg_resolution_time(data):
    """Average resolution time by root cause"""
    cause_times = {}
    cause_counts = {}
    
    for row in data:
        rc = row.get("root_cause") or row.get("reason") or "Unknown"
        duration = row.get("duration_minutes", 0)
        
        if duration > 0:
            if rc not in cause_times:
                cause_times[rc] = 0
                cause_counts[rc] = 0
            cause_times[rc] += duration
            cause_counts[rc] += 1
    
    result = []
    for rc in cause_times:
        if cause_counts[rc] > 0:
            avg = cause_times[rc] / cause_counts[rc]
            result.append({"root_cause": rc, "avg_minutes": round(avg, 2)})
    
    result.sort(key=lambda x: -x["avg_minutes"])
    return result[:10]


def process_severity_distribution(data):
    """Count by severity level"""
    severity_counts = {}
    
    for row in data:
        severity = row.get("severity", "Unknown")
        if severity not in severity_counts:
            severity_counts[severity] = 0
        severity_counts[severity] += 1
    
    result = [{"severity": s, "count": severity_counts[s]} for s in severity_counts]
    return result


def process_longest_downtimes(data):
    """Top 10 longest downtime incidents"""
    incidents = []
    
    for row in data:
        if row.get("duration_minutes", 0) > 0:
            incidents.append({
                "machine": row.get("machine_name", "Unknown"),
                "root_cause": row.get("root_cause") or row.get("reason") or "Unknown",
                "duration_minutes": round(row.get("duration_minutes", 0), 2),
                "start_time": row.get("start_time", "")[:10]
            })
    
    incidents.sort(key=lambda x: -x["duration_minutes"])
    return incidents[:10]


def process_mttr_by_machine(data):
    """Mean Time To Repair by machine"""
    machine_times = {}
    machine_counts = {}
    
    for row in data:
        machine = row.get("machine_name", "Unknown")
        duration = row.get("duration_minutes", 0)
        
        if duration > 0:
            if machine not in machine_times:
                machine_times[machine] = 0
                machine_counts[machine] = 0
            machine_times[machine] += duration
            machine_counts[machine] += 1
    
    result = []
    for machine in machine_times:
        if machine_counts[machine] > 0:
            mttr = machine_times[machine] / machine_counts[machine]
            result.append({
                "machine": machine, 
                "mttr_minutes": round(mttr, 2),
                "incidents": machine_counts[machine]
            })
    
    result.sort(key=lambda x: -x["mttr_minutes"])
    return result


def process_downtime_trend(data, since):
    """Daily total downtime minutes trend"""
    try:
        since_str = since.replace("Z", "+00:00")
        since_dt = datetime.fromisoformat(since_str)
    except:
        since_dt = datetime.fromisoformat(since)
    
    daily_downtime = {}
    
    for row in data:
        start_time = row.get("start_time", "")
        if not start_time:
            continue
        try:
            start_str = start_time.replace("Z", "+00:00")
            dt = datetime.fromisoformat(start_str)
            
            if dt >= since_dt:
                day = start_time.split("T")[0]
                duration = row.get("duration_minutes", 0)
                machine = row.get("machine_name", "Unknown")
                
                if day not in daily_downtime:
                    daily_downtime[day] = {"day": day, "total_minutes": 0, "machine_name": machine}
                daily_downtime[day]["total_minutes"] += duration
        except Exception as e:
            print(f"Error processing trend: {e}")
            continue
    
    result = sorted(daily_downtime.values(), key=lambda x: x["day"])
    
    for item in result:
        item["total_minutes"] = round(item["total_minutes"], 2)
    
    return result




