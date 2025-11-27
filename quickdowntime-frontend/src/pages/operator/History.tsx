import { useEffect, useState } from "react";
import { CheckCircle, Clock, AlertCircle } from "lucide-react";
import client from "../../api/axiosClient";

export default function OperatorHistory() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "critical" | "high" | "medium">("all");

  useEffect(() => {
    load();
    const interval = setInterval(load, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const load = async () => {
    try {
      setLoading(true);
      const r = await client.get("/api/operator/resolved");
      setItems(r.data.resolved || []);
    } catch (e) {
      console.error("Failed to load history:", e);
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return "N/A";
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const formatDateTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const filteredItems = items.filter(item => {
    if (filter === "all") return true;
    return item.severity === filter;
  });

  const severityStats = {
    critical: items.filter(i => i.severity === "critical").length,
    high: items.filter(i => i.severity === "high").length,
    medium: items.filter(i => i.severity === "medium").length
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#0a1322] text-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p>Loading history...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a1322] text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h2 className="text-3xl font-bold mb-2">Downtime History</h2>
          <p className="text-gray-400">Resolved downtime events</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
          <div className="bg-[#07121a] border border-gray-700 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Total Resolved</p>
                <p className="text-2xl font-bold">{items.length}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
          </div>

          <div className="bg-[#07121a] border border-gray-700 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Critical</p>
                <p className="text-2xl font-bold text-red-500">{severityStats.critical}</p>
              </div>
              <AlertCircle className="w-8 h-8 text-red-500" />
            </div>
          </div>

          <div className="bg-[#07121a] border border-gray-700 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">High</p>
                <p className="text-2xl font-bold text-orange-500">{severityStats.high}</p>
              </div>
              <AlertCircle className="w-8 h-8 text-orange-500" />
            </div>
          </div>

          <div className="bg-[#07121a] border border-gray-700 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Medium</p>
                <p className="text-2xl font-bold text-yellow-500">{severityStats.medium}</p>
              </div>
              <AlertCircle className="w-8 h-8 text-yellow-500" />
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {["all", "critical", "high", "medium"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f as any)}
              className={`px-4 py-2 rounded-lg font-semibold whitespace-nowrap transition-colors ${
                filter === f
                  ? "bg-blue-600 text-white"
                  : "bg-[#07121a] text-gray-400 hover:bg-[#0f1724] border border-gray-700"
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {/* History List */}
        {filteredItems.length === 0 ? (
          <div className="bg-[#07121a] border border-gray-700 rounded-xl p-8 text-center">
            <Clock className="w-12 h-12 text-gray-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-300 mb-2">No History Found</h3>
            <p className="text-gray-500">
              {filter === "all" 
                ? "You haven't resolved any downtimes yet."
                : `No ${filter} severity downtimes found.`}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredItems.map((item) => (
              <div
                key={item.id}
                className="bg-[#07121a] border border-gray-700 rounded-xl p-6 hover:border-gray-600 transition-colors"
              >
                {/* Header */}
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-white">{item.machine_id}</h3>
                    <p className="text-sm text-gray-400 mt-1">ID: {item.id}</p>
                  </div>
                  <div className="flex gap-2 items-center">
                    <span
                      className={`px-3 py-1 text-xs rounded-full font-semibold ${
                        item.severity === "critical"
                          ? "bg-red-600"
                          : item.severity === "high"
                          ? "bg-orange-600"
                          : "bg-yellow-600"
                      }`}
                    >
                      {item.severity?.toUpperCase() || "MEDIUM"}
                    </span>
                    <span className="px-3 py-1 text-xs bg-green-600 rounded-full font-semibold flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" />
                      RESOLVED
                    </span>
                  </div>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-xs text-gray-500 uppercase mb-1">Reason</p>
                    <p className="text-gray-300">{item.reason || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase mb-1">Category</p>
                    <p className="text-gray-300">{item.category || "N/A"}</p>
                  </div>
                  <div className="sm:col-span-2">
                    <p className="text-xs text-gray-500 uppercase mb-1">Description</p>
                    <p className="text-gray-300">{item.description || "No description"}</p>
                  </div>
                </div>

                {/* Timeline */}
                <div className="bg-[#0a1322] border border-gray-700 rounded-lg p-4 mb-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500 mb-1">Started</p>
                      <p className="text-gray-300 font-medium">{formatDateTime(item.created_at)}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 mb-1">Resolved</p>
                      <p className="text-gray-300 font-medium">
                        {item.resolved_at ? formatDateTime(item.resolved_at) : "N/A"}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500 mb-1">Duration</p>
                      <p className="text-green-400 font-bold text-lg">
                        {formatDuration(item.duration_seconds)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Resolution Info */}
                {(item.resolution_notes || item.resolved_by) && (
                  <div className="bg-green-900/20 border border-green-700/50 rounded-lg p-4 mb-4">
                    {item.resolved_by && (
                      <p className="text-sm text-gray-400 mb-2">
                        Resolved by: <span className="text-white font-semibold">{item.resolved_by}</span>
                      </p>
                    )}
                    {item.resolution_notes && (
                      <div>
                        <p className="text-xs text-gray-500 uppercase mb-1">Resolution Notes</p>
                        <p className="text-gray-300">{item.resolution_notes}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Root Cause */}
                {item.root_cause && (
                  <div className="bg-[#0a1322] border border-gray-700 rounded-lg p-4">
                    <p className="text-xs text-gray-500 uppercase mb-2">Root Cause Analysis</p>
                    <p className="text-gray-300 text-sm">{item.root_cause}</p>
                  </div>
                )}

                {/* IMAGE */}
                {item.image_path && (
                  <div className="mt-4">
                    <p className="text-xs text-gray-500 uppercase mb-2">Photo Evidence</p>
                    <img
                      src={
                        item.image_path.startsWith("/uploads")
                          ? item.image_path
                          : `${import.meta.env.VITE_API_URL || ""}${item.image_path}`
                      }
                      alt="Evidence"
                      className="w-full max-w-md rounded-lg border border-gray-700"
                    />
                  </div>
                )}

                {/* AUDIO */}
                {item.audio_path && (
                  <div className="mt-4">
                    <p className="text-xs text-gray-500 uppercase mb-2">Voice Note</p>
                    <audio
                      controls
                      src={
                        item.audio_path.startsWith("/uploads")
                          ? item.audio_path
                          : `${import.meta.env.VITE_API_URL || ""}${item.audio_path}`
                      }
                      className="w-full"
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}