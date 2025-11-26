//app/src/pages/manager/Dashboard.tsx

import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import client from "../../api/axiosClient";
import ManagerLayout from "../../components/layout/ManagerLayout";
import { useAlertStore } from "../../store/alertStore";
import { Activity, AlertTriangle, CheckCircle, AlertOctagon } from "lucide-react";

export default function ManagerDashboard() {
  const [stats, setStats] = useState<any>(null);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [machines, setMachines] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const setAlertCount = useAlertStore((s) => s.setCount);
  const increment = useAlertStore((s) => s.increment);
  const navigate = useNavigate();

  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    load();
    setupWS();
  }, []);

  const load = async () => {
    try {
      const [s, a, m] = await Promise.all([
        client.get("/dashboard/kpis"), // ✅ Changed to /dashboard/kpis
        client.get("/dashboard/alerts?limit=5"), // ✅ Changed to /dashboard/alerts
        client.get("/api/management/machines/status"),
      ]);

      setStats(s.data);
      setAlerts(a.data);
      setMachines(m.data);
      
      // ✅ Count only UNSEEN alerts
      const unseenCount = a.data.filter((alert: any) => !alert.seen).length;
      setAlertCount(unseenCount);
    } catch (err) {
      console.log("Dashboard load error:", err);
    }
    setLoading(false);
  };

  const setupWS = () => {
    const token = localStorage.getItem("token");
    if (!token) return;

    const ws = new WebSocket(
      `${import.meta.env.VITE_WS_URL}/api/ws/manager?token=${token}`
    );

    wsRef.current = ws;

    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);

        if (msg.type === "new_downtime_with_ai") {
          setAlerts((prev) => [msg.downtime, ...prev.slice(0, 4)]);
          increment();
          load(); // Refresh all data including machine status
        }
      } catch (err) {
        console.log("WS message parse error", err);
      }
    };

    ws.onerror = (e) => console.log("WS error:", e);
    ws.onclose = () => console.log("WS closed");
  };

  return (
    <ManagerLayout>
      {/* Loading State */}
      {loading && (
        <div className="text-gray-400 animate-pulse">Loading dashboard...</div>
      )}

      {/* KPI Cards */}
      {!loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          <KpiCard
            label="Total Downtimes Today"
            value={stats?.today_downtimes}
            color="from-blue-500 to-blue-400"
            icon={<Activity size={28} className="text-blue-400" />}
          />

          <KpiCard
            label="Resolved Today"
            value={stats?.resolved_today}
            color="from-green-500 to-green-400"
            icon={<CheckCircle size={28} className="text-green-400" />}
          />

          <KpiCard
            label="High Priority Breakdown"
            value={stats?.high_priority}
            color="from-red-500 to-red-400"
            icon={<AlertOctagon size={28} className="text-red-400" />}
          />
        </div>
      )}

      {/* MACHINE MONITORING SECTION */}
      {!loading && (
        <div className="mt-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Activity className="text-blue-400" size={24} />
              Live Machine Status
            </h2>
            <div className="text-sm text-gray-400">
              {machines.filter((m) => m.status === "running").length}/
              {machines.length} Running
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {machines.map((machine) => (
              <MachineCard
                key={machine.machine_id}
                machine={machine}
                onClick={() =>
                  navigate(`/manager/machines/${encodeURIComponent(machine.machine_id)}`)
                }
              />
            ))}
          </div>
        </div>
      )}

      {/* Alerts Section */}
      <div className="mt-10">
        <h2 className="text-xl font-semibold mb-4">Recent Alerts</h2>

        {alerts.length === 0 && (
          <div className="text-gray-400">No alerts yet.</div>
        )}

        <div className="space-y-3">
          {alerts.map((a, i) => (
            <div
              key={i}
              className="bg-[#0f1724] p-4 rounded-lg border border-gray-700 hover:border-blue-600 transition"
            >
              <div className="flex justify-between items-center">
                <div>
                  <div className="text-blue-400 font-semibold">
                    {a.machine_id}
                  </div>
                  <div className="text-gray-300 text-sm opacity-80">
                    {a.reason}
                  </div>
                </div>

                {a.severity && (
                  <span
                    className={`text-xs px-2 py-1 rounded 
                    ${
                      a.severity === "high"
                        ? "bg-red-600/30 text-red-300 border border-red-700"
                        : a.severity === "medium"
                        ? "bg-amber-600/30 text-amber-300 border border-amber-700"
                        : "bg-green-600/30 text-green-300 border border-green-700"
                    }
                  `}
                  >
                    {a.severity}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </ManagerLayout>
  );
}

/* -----------------------------
   KPI CARD COMPONENT
------------------------------ */
function KpiCard({
  label,
  value,
  color,
  icon,
}: {
  label: string;
  value: number | undefined;
  color: string;
  icon?: React.ReactNode;
}) {
  return (
    <div
      className={`bg-[#0f1724] border border-gray-700 rounded-xl p-5 shadow-lg hover:shadow-blue-900/20 transition relative overflow-hidden`}
    >
      <div
        className={`absolute inset-0 bg-gradient-to-br ${color} opacity-10`}
      />
      <div className="relative flex items-start justify-between">
        <div>
          <div className="text-sm text-gray-300 mb-2">{label}</div>
          <div className="text-4xl font-bold text-white mt-1">
            {value ?? 0}
          </div>
        </div>
        {icon && <div className="opacity-80">{icon}</div>}
      </div>
    </div>
  );
}

/* -----------------------------
   MACHINE CARD COMPONENT
------------------------------ */
function MachineCard({
  machine,
  onClick,
}: {
  machine: any;
  onClick: () => void;
}) {
  const statusColor =
    machine.status === "running"
      ? "bg-green-500"
      : "bg-red-500 animate-pulse";

  const priorityConfig = {
    high: { bg: "bg-red-600/20", text: "text-red-400", border: "border-red-700" },
    medium: { bg: "bg-amber-600/20", text: "text-amber-400", border: "border-amber-700" },
    low: { bg: "bg-green-600/20", text: "text-green-400", border: "border-green-700" },
  };

  const priority = priorityConfig[machine.priority as keyof typeof priorityConfig];

  return (
    <div
      onClick={onClick}
      className="bg-[#0f1724] border border-gray-700 rounded-lg p-4 hover:border-blue-500 transition cursor-pointer group relative overflow-hidden"
    >
      {/* Heartbeat Animation */}
      {machine.status === "running" && (
        <div className="absolute top-0 right-0 w-32 h-32 opacity-10">
          <svg viewBox="0 0 100 50" className="w-full h-full">
            <polyline
              points="0,25 20,25 25,10 30,40 35,20 40,25 100,25"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="text-green-500 animate-pulse"
            />
          </svg>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${statusColor}`} />
          <span className="text-xs text-gray-400 uppercase">
            {machine.status}
          </span>
        </div>

        {/* Priority Badge */}
        <span
          className={`text-xs px-2 py-1 rounded ${priority.bg} ${priority.text} border ${priority.border}`}
        >
          {machine.priority.toUpperCase()}
        </span>
      </div>

      {/* Machine Name */}
      <h3 className="text-white font-semibold mb-2 group-hover:text-blue-400 transition">
        {machine.machine_id}
      </h3>

      {/* Stats */}
      <div className="space-y-1 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-400">Today's Downtime:</span>
          <span className="text-blue-400 font-semibold">
            {machine.today_downtime_count}
          </span>
        </div>

        <div className="flex justify-between">
          <span className="text-gray-400">This Week:</span>
          <span className="text-gray-300">{machine.week_downtime_count}</span>
        </div>
      </div>

      {/* Last Issue */}
      {machine.last_reason && (
        <div className="mt-3 pt-3 border-t border-gray-700">
          <div className="flex items-start gap-2">
            <AlertTriangle size={14} className="text-amber-400 mt-0.5 flex-shrink-0" />
            <span className="text-xs text-gray-400 line-clamp-2">
              {machine.last_reason}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}