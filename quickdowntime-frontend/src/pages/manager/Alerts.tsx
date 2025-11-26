import { useEffect, useRef, useState } from "react";
import ManagerLayout from "../../components/layout/ManagerLayout";
import client from "../../api/axiosClient";
import { useAlertStore } from "../../store/alertStore";

export default function ManagerAlerts() {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const wsRef = useRef<WebSocket | null>(null);

  const setAlertCount = useAlertStore((s) => s.setCount);
  const increment = useAlertStore((s) => s.increment);

  useEffect(() => {
    loadAlerts();
    setupWS();

    // when entering alerts page → clear badge
    setAlertCount(0);
  }, []);

  const loadAlerts = async () => {
    try {
      const r = await client.get("/dashboard/alerts");
      setAlerts(r.data);
    } catch (e) {
      console.log("Alerts load error:", e);
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
          setAlerts((prev) => [msg.downtime, ...prev]);
          increment(); // show unread until page reload or mark all as seen
        }
      } catch {}
    };
  };

  // 🔥 Mark All as Seen
  const markAllSeen = () => {
    setAlertCount(0);
  };

  return (
    <ManagerLayout>
      <div className="mb-6 flex justify-between">
        <h1 className="text-2xl font-semibold">Alerts</h1>

        <button
          onClick={markAllSeen}
          className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg text-white"
        >
          Mark All as Seen
        </button>
      </div>

      {loading && (
        <div className="text-gray-400 animate-pulse">Loading alerts...</div>
      )}

      {!loading && alerts.length === 0 && (
        <div className="text-gray-400">No alerts available.</div>
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
    </ManagerLayout>
  );
}
