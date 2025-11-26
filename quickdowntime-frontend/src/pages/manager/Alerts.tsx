// src/pages/manager/Alerts.tsx
import { useEffect, useState } from "react";
import ManagerLayout from "../../components/layout/ManagerLayout";
import client from "../../api/axiosClient";
import { useAlertStore } from "../../store/alertStore";

export default function ManagerAlerts() {
  const alerts = useAlertStore((s) => s.alerts);
  const setAlertsStore = useAlertStore((s) => s.setAlerts);
  const setCount = useAlertStore((s) => s.setCount);

  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState(false);

  useEffect(() => {
    loadAlerts();
  }, []);

  const loadAlerts = async () => {
    try {
      const r = await client.get("/dashboard/alerts");
      // This will automatically calculate and set the unseen count
      setAlertsStore(r.data);
    } catch (e) {
      console.log("Alerts load error:", e);
    }
    setLoading(false);
  };

  const markAllSeen = async () => {
    setMarking(true);
    try {
      await client.post("/dashboard/alerts/mark-seen");
      
      // Update local state - mark all alerts as seen
      const updatedAlerts = alerts.map(a => ({ ...a, seen: true }));
      setAlertsStore(updatedAlerts);
      
      // This will set count to 0 since all are seen now
      setCount(0);
      
      // Optionally reload to confirm with server
      await loadAlerts();
    } catch (e) {
      console.log("Mark seen error:", e);
    }
    setMarking(false);
  };

  return (
    <ManagerLayout>
      <div className="mb-6 flex justify-between">
        <h1 className="text-2xl font-semibold">Alerts</h1>

        <button
          onClick={markAllSeen}
          disabled={marking || alerts.length === 0}
          className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg text-white disabled:bg-gray-600 disabled:cursor-not-allowed"
        >
          {marking ? "Marking..." : "Mark All as Seen"}
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
            className={`bg-[#0f1724] p-4 rounded-lg border transition ${
              a.seen 
                ? "border-gray-700 opacity-60" 
                : "border-gray-700 hover:border-blue-600"
            }`}
          >
            <div className="flex justify-between items-center">
              <div>
                <div className="flex items-center gap-2">
                  <div className="text-blue-400 font-semibold">
                    {a.machine_id}
                  </div>
                  {!a.seen && (
                    <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                  )}
                </div>
                <div className="text-gray-300 text-sm opacity-80">
                  {a.reason}
                </div>
                <div className="text-gray-500 text-xs mt-1">
                  {new Date(a.created_at).toLocaleString()}
                </div>
              </div>

              <div className="flex flex-col items-end gap-2">
                {a.severity && (
                  <span
                    className={`text-xs px-2 py-1 rounded 
                      ${
                        a.severity === "high"
                          ? "bg-red-600/30 text-red-300 border border-red-700"
                          : a.severity === "medium"
                          ? "bg-amber-600/30 text-amber-300 border border-amber-700"
                          : "bg-green-600/30 text-green-300 border border-green-700"
                      }`}
                  >
                    {a.severity}
                  </span>
                )}
                {a.seen && (
                  <span className="text-xs text-gray-500">✓ Seen</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </ManagerLayout>
  );
}