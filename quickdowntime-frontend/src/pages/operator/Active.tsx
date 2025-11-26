import { useEffect, useState, useRef } from "react";
import client from "../../api/axiosClient";

export default function OperatorActive() {
  const [active, setActive] = useState<any>(null);

  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    load();
    setupWS();      // ← ADD THIS
  }, []);

  const load = async () => {
    const r = await client.get("/api/operator/active");
    setActive(r.data || null);
  };

  // --------------------------------------
  // 🔥 NEW: WebSocket listener
  // --------------------------------------
  const setupWS = () => {
    const token = localStorage.getItem("token");
    if (!token) return;

    const ws = new WebSocket(
      `${import.meta.env.VITE_WS_URL}/api/ws/operator?token=${token}`
    );

    wsRef.current = ws;

    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);

        // Manager resolved THIS operator's downtime
        if (msg.type === "downtime_resolved") {
          load(); // refresh and show "No active downtime"
        }
      } catch {}
    };
  };
  // --------------------------------------

  const endDowntime = async () => {
    const r = await client.post("/api/operator/end", {
      id: active.id,
      notes: "Operator ended manually"
    });

    alert("Downtime ended");
    window.location.href = "/operator";
  };

  if (!active)
    return (
      <div className="p-6 text-gray-300">
        No active downtime.
      </div>
    );

  return (
    <div className="min-h-screen bg-[#0f1724] text-white p-5">
      <h2 className="text-2xl font-semibold mb-4">Active Downtime</h2>

      <div className="bg-[#07121a] p-4 rounded-lg space-y-2">
        <div><span className="text-gray-400">Machine:</span> {active.machine_id}</div>
        <div><span className="text-gray-400">Reason:</span> {active.reason}</div>
        <div><span className="text-gray-400">Started:</span> {active.start_time}</div>
      </div>

      <button
        onClick={endDowntime}
        className="w-full bg-red-600 text-white py-3 rounded-lg mt-5 font-semibold"
      >
        End Downtime
      </button>
    </div>
  );
}
