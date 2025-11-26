import { useEffect, useState } from "react";

// Mock client for demonstration
const client = {
  get: async (url: string) => {
    // Simulating your API response
    return {
      data: {
        active: [
          {
            id: 52,
            machine_id: "Blast Furnace",
            reason: "Electrical Failure",
            category: "Sensor Malfunction",
            description: "sensor is not working",
            severity: "high",
            status: "open",
            created_at: "2025-11-26T13:08:26.019911"
          },
          {
            id: 51,
            machine_id: "Cold Rolling Mill",
            reason: "",
            category: "",
            description: "jam at machine",
            severity: "high",
            status: "open",
            created_at: "2025-11-26T12:36:37.066798"
          }
        ]
      }
    };
  },
  post: async (url: string, data: any) => {
    return { data: { success: true } };
  }
};

export default function OperatorActive() {
  const [activeList, setActiveList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [resolving, setResolving] = useState<number | null>(null);

  async function loadActive() {
    try {
      const res = await client.get("/api/operator/active");
      setActiveList(res.data.active || []);
    } catch (e) {
      console.error("Error loading active:", e);
    } finally {
      setLoading(false);
    }
  }

  async function resolveDowntime(downtimeId: number) {
    if (!confirm("Are you sure you want to resolve this downtime?")) return;

    setResolving(downtimeId);

    const form = new FormData();
    form.append("id", downtimeId.toString());
    form.append("notes", "Resolved by operator");

    try {
      await client.post("/api/operator/resolve", form);
      alert("Downtime resolved");
      // Remove resolved item from list
      setActiveList(prev => prev.filter(item => item.id !== downtimeId));
    } catch (e) {
      console.error("Resolve error:", e);
      alert("Failed to resolve");
    } finally {
      setResolving(null);
    }
  }

  useEffect(() => {
    loadActive();
    const interval = setInterval(loadActive, 10000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#0a1322] text-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a1322] text-white p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Active Downtimes</h1>
          <span className="px-4 py-2 bg-blue-600 rounded-lg font-semibold">
            {activeList.length} Active
          </span>
        </div>

        {activeList.length === 0 ? (
          <div className="p-8 bg-[#07121a] border border-gray-700 rounded-xl text-center">
            <h2 className="text-xl font-semibold text-gray-300">No Active Downtime</h2>
            <p className="text-gray-500 mt-2">
              You have not raised any active downtime.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {activeList.map((active) => (
              <div
                key={active.id}
                className="bg-[#07121a] border border-gray-700 rounded-xl p-6 space-y-4 hover:border-gray-600 transition-colors"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-2xl font-bold text-white">
                      {active.machine_id}
                    </h2>
                    <p className="text-sm text-gray-400 mt-1">
                      ID: {active.id} • Started: {new Date(active.created_at).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex gap-2 items-center">
                    <span
                      className={`px-4 py-1 text-sm rounded-full font-semibold ${
                        active.severity === "critical"
                          ? "bg-red-600"
                          : active.severity === "high"
                          ? "bg-orange-600"
                          : "bg-yellow-600"
                      }`}
                    >
                      {active.severity?.toUpperCase() || "MEDIUM"}
                    </span>
                    <span className="px-4 py-1 text-sm bg-red-600 rounded-full font-semibold">
                      OPEN
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-gray-300">
                  <div>
                    <p className="font-semibold text-white">Reason</p>
                    <p>{active.reason || "N/A"}</p>
                  </div>

                  <div>
                    <p className="font-semibold text-white">Category</p>
                    <p>{active.category || "N/A"}</p>
                  </div>

                  <div className="sm:col-span-2">
                    <p className="font-semibold text-white">Description</p>
                    <p className="mt-1">{active.description || "No description"}</p>
                  </div>
                </div>

                {/* Root Cause */}
                {active.root_cause && (
                  <div className="bg-[#0a1322] border border-gray-700 rounded-lg p-4">
                    <p className="font-semibold text-white mb-2">Root Cause Analysis</p>
                    <p className="text-gray-300 text-sm">{active.root_cause}</p>
                  </div>
                )}

                {/* IMAGE */}
                {active.image_path && (
                  <div className="mt-4">
                    <p className="font-semibold mb-2">Photo Evidence</p>
                    <img
                      src={
                        active.image_path.startsWith("/uploads")
                          ? active.image_path
                          : `${import.meta.env.VITE_API_URL || ""}${active.image_path}`
                      }
                      alt="Evidence"
                      className="w-full max-w-md rounded-lg border border-gray-700"
                    />
                  </div>
                )}

                {/* AUDIO */}
                {active.audio_path && (
                  <div className="mt-4">
                    <p className="font-semibold mb-2">Voice Note</p>
                    <audio
                      controls
                      src={
                        active.audio_path.startsWith("/uploads")
                          ? active.audio_path
                          : `${import.meta.env.VITE_API_URL || ""}${active.audio_path}`
                      }
                      className="w-full"
                    />
                  </div>
                )}

                {/* Resolve Button */}
                <button
                  onClick={() => resolveDowntime(active.id)}
                  disabled={resolving === active.id}
                  className="mt-6 w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {resolving === active.id ? "Resolving..." : "Resolve Downtime"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}