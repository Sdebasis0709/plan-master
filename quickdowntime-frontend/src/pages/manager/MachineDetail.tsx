import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import client from "../../api/axiosClient";
import ManagerLayout from "../../components/layout/ManagerLayout";
import { ArrowLeft, Activity, Clock, AlertCircle } from "lucide-react";

export default function MachineDetail() {
  const { machineId } = useParams();
  const navigate = useNavigate();
  const [history, setHistory] = useState<any>(null);
  const [heartbeat, setHeartbeat] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (machineId) {
      loadMachineData();
    }
  }, [machineId]);

  const loadMachineData = async () => {
    try {
      const [historyRes, heartbeatRes] = await Promise.all([
        client.get(`/api/management/machines/${encodeURIComponent(machineId!)}/history`),
        client.get(`/api/management/machines/${encodeURIComponent(machineId!)}/heartbeat`),
      ]);

      setHistory(historyRes.data);
      setHeartbeat(heartbeatRes.data);
    } catch (err) {
      console.log("Failed to load machine data:", err);
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <ManagerLayout>
        <div className="text-gray-400 animate-pulse">Loading machine details...</div>
      </ManagerLayout>
    );
  }

  if (!history) {
    return (
      <ManagerLayout>
        <div className="text-red-400">Failed to load machine data</div>
      </ManagerLayout>
    );
  }

  return (
    <ManagerLayout>
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate("/manager")}
          className="flex items-center gap-2 text-gray-400 hover:text-white transition mb-4"
        >
          <ArrowLeft size={18} />
          Back to Dashboard
        </button>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">{history.machine_id}</h1>
            <p className="text-gray-400 mt-1">Machine Performance Overview</p>
          </div>

          <div className="bg-[#0f1724] border border-gray-700 rounded-lg p-4">
            <div className="text-sm text-gray-400">Total Downtimes (30 days)</div>
            <div className="text-3xl font-bold text-blue-400 mt-1">
              {history.total_count}
            </div>
          </div>
        </div>
      </div>

      {/* Heartbeat Graph */}
      <div className="bg-[#0f1724] border border-gray-700 rounded-xl p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Activity className="text-blue-400" size={20} />
          <h2 className="text-xl font-semibold">24-Hour Activity</h2>
        </div>

        {heartbeat.length === 0 ? (
          <div className="h-64 flex items-center justify-center text-gray-400">
            No activity data available
          </div>
        ) : (
          <div className="h-64 flex items-end gap-1">
            {heartbeat.map((hour, i) => {
              const maxCount = Math.max(...heartbeat.map((h) => h.downtime_count), 1);
              const heightPercent = (hour.downtime_count / maxCount) * 100;

            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-2">
                {/* Bar */}
                <div className="w-full flex items-end justify-center" style={{ height: "200px" }}>
                  <div
                    className={`w-full rounded-t transition-all ${
                      hour.downtime_count > 0
                        ? "bg-red-500/70 hover:bg-red-500"
                        : "bg-green-500/30 hover:bg-green-500/50"
                    }`}
                    style={{ height: `${Math.max(heightPercent, 5)}%` }}
                    title={`${hour.hour}: ${hour.downtime_count} downtime(s)`}
                  />
                </div>

                {/* Label */}
                <div className="text-xs text-gray-500 rotate-45 origin-top-left whitespace-nowrap">
                  {hour.hour}
                </div>
              </div>
            );
          })}
        </div>
        )}

        <div className="flex justify-center gap-6 mt-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500/30 rounded" />
            <span className="text-gray-400">Running</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-500/70 rounded" />
            <span className="text-gray-400">Downtime</span>
          </div>
        </div>
      </div>

      {/* Downtime History */}
      <div className="bg-[#0f1724] border border-gray-700 rounded-xl p-6">
        <h2 className="text-xl font-semibold mb-4">Downtime History (Last 30 Days)</h2>

        {!history.downtimes || history.downtimes.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <Activity className="mx-auto mb-3 opacity-50" size={48} />
            <p>No downtimes recorded in the last 30 days</p>
          </div>
        ) : (
          <div className="space-y-3">
            {history.downtimes.map((downtime: any, i: number) => (
              <DowntimeCard key={downtime.id || i} downtime={downtime} />
            ))}
          </div>
        )}
      </div>
    </ManagerLayout>
  );
}

/* -----------------------------
   DOWNTIME CARD COMPONENT
------------------------------ */
function DowntimeCard({ downtime }: { downtime: any }) {
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const severityConfig: any = {
    high: { bg: "bg-red-600/20", text: "text-red-400", border: "border-red-700" },
    medium: { bg: "bg-amber-600/20", text: "text-amber-400", border: "border-amber-700" },
    low: { bg: "bg-green-600/20", text: "text-green-400", border: "border-green-700" },
  };

  // Normalize severity value and default to 'low' if not found
  const rawSeverity = downtime.severity?.toLowerCase() || "low";
  const severity = ["high", "medium", "low"].includes(rawSeverity) ? rawSeverity : "low";
  const config = severityConfig[severity];

  return (
    <div className="bg-[#07121a] border border-gray-700 rounded-lg p-4 hover:border-blue-500 transition">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <AlertCircle className="text-red-400 flex-shrink-0" size={18} />
            <h3 className="text-white font-semibold">{downtime.reason}</h3>
          </div>

          {downtime.category && (
            <div className="text-sm text-gray-400 mb-1">
              Category: <span className="text-gray-300">{downtime.category}</span>
            </div>
          )}

          {downtime.description && (
            <p className="text-sm text-gray-400 mt-2">{downtime.description}</p>
          )}
        </div>

        {/* Severity Badge */}
        <span
          className={`text-xs px-3 py-1 rounded ${config.bg} ${config.text} border ${config.border}`}
        >
          {severity.toUpperCase()}
        </span>
      </div>

      {/* Footer Info */}
      <div className="flex items-center gap-4 text-xs text-gray-500 pt-3 border-t border-gray-800">
        <div className="flex items-center gap-1">
          <Clock size={14} />
          <span>{formatDate(downtime.created_at)}</span>
        </div>

        {downtime.duration_minutes && (
          <div>
            Duration: <span className="text-gray-400">{downtime.duration_minutes} min</span>
          </div>
        )}

        {downtime.operator_email && (
          <div>
            Reported by: <span className="text-gray-400">{downtime.operator_email}</span>
          </div>
        )}

        <div className={`ml-auto px-2 py-1 rounded ${
          downtime.status === "open" ? "bg-red-600/20 text-red-400" : "bg-green-600/20 text-green-400"
        }`}>
          {downtime.status}
        </div>
      </div>
    </div>
  );
}