import { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import ManagerLayout from "../../components/layout/ManagerLayout";
import client from "../../api/axiosClient";

export default function DowntimeDetails() {
  const { id } = useParams();
  const [data, setData] = useState<any>(null);
  const [analysis, setAnalysis] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    load();
    setupWS();
  }, []);

  const load = async () => {
    try {
      const dt = await client.get(`/api/management/downtimes/${id}`);
      setData(dt.data);

      const ai = await client.get(`/api/ai/analysis/${id}`);
      setAnalysis(ai.data || null);
    } catch (err) {
      console.log("Details load error:", err);
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

        if (msg.type === "downtime_resolved" && Number(msg.id) === Number(id)) {
          load(); // auto refresh
        }
      } catch {}
    };
  };

  const resolve = async () => {
    const notes = prompt("Enter resolution notes:");
    if (notes === null) return;

    try {
      await client.patch(`/api/management/downtimes/${id}/resolve`, {
        resolution_notes: notes,
      });

      alert("Downtime marked as resolved");
      load();
    } catch (err) {
      console.log("Resolve error:", err);
    }
  };

  if (loading)
    return (
      <ManagerLayout>
        <div className="text-gray-400 animate-pulse">Loading details...</div>
      </ManagerLayout>
    );

  if (!data)
    return (
      <ManagerLayout>
        <div className="text-red-400">Downtime not found.</div>
      </ManagerLayout>
    );

  return (
    <ManagerLayout>
      <h1 className="text-2xl font-semibold mb-6">Downtime Details</h1>

      {/* MAIN CARD */}
      <div className="bg-[#07121a] p-6 rounded-lg border border-gray-800 space-y-4">

        <Row label="Machine ID" value={data.machine_id} />
        <Row label="Reason" value={data.reason} />
        <Row label="Category" value={data.category || "—"} />
        <Row label="Description" value={data.description || "—"} />

        <Row label="Severity" value={
          <span
            className={`px-2 py-1 rounded text-xs ${
              data.severity === "high"
                ? "bg-red-600/30 text-red-300"
                : data.severity === "medium"
                ? "bg-amber-600/30 text-amber-300"
                : "bg-green-600/30 text-green-300"
            }`}
          >
            {data.severity || "low"}
          </span>
        }/>

        <Row
          label="Status"
          value={
            data.status === "resolved" ? (
              <span className="text-green-400">Resolved</span>
            ) : (
              <span className="text-red-400">Open</span>
            )
          }
        />

        <Row label="Start Time" value={data.start_time?.slice(0, 16)} />
        <Row label="End Time" value={data.end_time?.slice(0, 16) || "—"} />
        <Row label="Operator" value={data.operator_email || "—"} />

        {/* ATTACHMENTS */}
        {(data.image_path || data.audio_path) && (
          <div className="pt-4">
            <h2 className="text-lg mb-2 font-semibold">Attachments</h2>

            {data.image_path && (
              <img
                src={data.image_path}
                alt="downtime-img"
                className="w-64 rounded border border-gray-700 mb-3"
              />
            )}

            {data.audio_path && (
              <audio controls className="w-full">
                <source src={data.audio_path} />
              </audio>
            )}
          </div>
        )}

      </div>

      {/* AI ANALYSIS */}
      {analysis && (
        <div className="mt-8 bg-[#07121a] p-6 rounded-lg border border-gray-800">
          <h2 className="text-xl font-semibold mb-4">AI Analysis</h2>

          <Row label="Root Cause" value={analysis.root_cause || "—"} />
          <Row
            label="Immediate Actions"
            value={analysis.immediate_actions || "—"}
          />
          <Row
            label="Preventive Measures"
            value={analysis.preventive_measures || "—"}
          />
          <Row
            label="Predicted Next Failure"
            value={analysis.predicted_next_failure || "—"}
          />
          <Row
            label="Confidence Score"
            value={analysis.confidence_score?.toFixed(2) || "—"}
          />
        </div>
      )}

      {/* RESOLVE BUTTON */}
      {data.status !== "resolved" && (
        <button
          onClick={resolve}
          className="mt-8 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg"
        >
          Resolve Downtime
        </button>
      )}
    </ManagerLayout>
  );
}

/* --------------------------
    Row Component
--------------------------- */
function Row({ label, value }: any) {
  return (
    <div className="flex justify-between border-b border-gray-800 py-2">
      <div className="text-gray-400">{label}</div>
      <div className="text-gray-200 text-right max-w-lg">{value}</div>
    </div>
  );
}
