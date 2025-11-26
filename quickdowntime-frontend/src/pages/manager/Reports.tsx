import { useEffect, useState } from "react";
import ManagerLayout from "../../components/layout/ManagerLayout";
import client from "../../api/axiosClient";

export default function ManagerReports() {
  const [machines, setMachines] = useState<{ machine_id: string; count: number }[]>([]);
  const [status, setStatus] = useState<"" | "open" | "resolved">("");
  const [machine, setMachine] = useState<string>("");
  const [previewCount, setPreviewCount] = useState<number | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadMachines();
  }, []);

  // load machine list (for select)
  const loadMachines = async () => {
    try {
      const r = await client.get("/api/management/stats/machines?top_n=200");
      setMachines(r.data.top_machines || []);
    } catch (err) {
      console.error("Failed to load machines", err);
    }
  };

  // get preview count using list endpoint (reads total)
  const refreshPreview = async () => {
    setLoadingPreview(true);
    setPreviewCount(null);
    setError(null);

    try {
      const r = await client.get("/api/management/downtimes", {
        params: {
          page: 1,
          per_page: 1, // we only need the total
          machine_id: machine || undefined,
          status: status || undefined,
        },
      });

      setPreviewCount(r.data.total ?? 0);
    } catch (err: any) {
      console.error("Preview error", err);
      setError(err?.response?.data?.detail || "Failed to fetch preview count");
    } finally {
      setLoadingPreview(false);
    }
  };

  // call export CSV endpoint and trigger download
  const exportCsv = async () => {
    setExporting(true);
    setError(null);

    try {
      const resp = await client.get("/api/management/export", {
        params: {
          machine_id: machine || undefined,
          status: status || undefined,
        },
        responseType: "blob",
      });

      const blob = new Blob([resp.data], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;

      // filename with filters and timestamp
      const stamp = new Date().toISOString().slice(0,19).replace(/[:T]/g, "-");
      const fileMachine = machine ? `${machine}-` : "";
      const fileStatus = status ? `${status}-` : "";
      a.download = `downtimes-${fileMachine}${fileStatus}${stamp}.csv`;

      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error("Export failed", err);
      setError(err?.response?.data?.detail || "Export failed");
    } finally {
      setExporting(false);
    }
  };

  return (
    <ManagerLayout>
      <div className="max-w-3xl">
        <h1 className="text-2xl font-semibold mb-4">Reports & CSV Export</h1>

        <div className="bg-[#07121a] p-4 rounded-lg border border-gray-800 mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-sm text-gray-400 block mb-2">Machine</label>
              <select
                value={machine}
                onChange={(e) => setMachine(e.target.value)}
                className="w-full bg-[#0f1724] text-white p-2 rounded border border-gray-700"
              >
                <option value="">All machines</option>
                {machines.map((m) => (
                  <option key={m.machine_id} value={m.machine_id}>
                    {m.machine_id} ({m.count})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm text-gray-400 block mb-2">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full bg-[#0f1724] text-white p-2 rounded border border-gray-700"
              >
                <option value="">Any status</option>
                <option value="open">Open</option>
                <option value="resolved">Resolved</option>
              </select>
            </div>

            <div className="flex items-end gap-2">
              <button
                onClick={refreshPreview}
                className="w-full bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded text-white"
                disabled={loadingPreview}
              >
                {loadingPreview ? "Checking..." : "Preview Count"}
              </button>
            </div>
          </div>
        </div>

        {/* Preview / Info */}
        <div className="bg-[#07121a] p-4 rounded-lg border border-gray-800 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-400">Records matching filters</div>
              <div className="text-2xl font-bold text-blue-400">
                {loadingPreview ? "…" : previewCount !== null ? previewCount : "—"}
              </div>
            </div>

            <div className="text-right">
              <div className="text-sm text-gray-400">Export action</div>
              <div className="mt-2">
                <button
                  onClick={exportCsv}
                  className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded text-white"
                  disabled={exporting || (previewCount !== null && previewCount === 0)}
                >
                  {exporting ? "Exporting..." : "Download CSV"}
                </button>
              </div>
            </div>
          </div>

          {error && <div className="mt-3 text-sm text-red-400">{error}</div>}

          <div className="mt-4 text-xs text-gray-500">
            Note: export filters currently support <strong>Machine</strong> and <strong>Status</strong>.
            If you need additional filters (date range, category), we can add backend support and update this UI.
          </div>
        </div>

        {/* Quick actions */}
        <div className="flex gap-3">
          <button
            onClick={() => {
              setMachine("");
              setStatus("");
              setPreviewCount(null);
            }}
            className="px-4 py-2 rounded bg-gray-700 text-white"
          >
            Reset filters
          </button>

          <button
            onClick={() => {
              // quick export everything
              setMachine("");
              setStatus("");
              refreshPreview().then(() => exportCsv());
            }}
            className="px-4 py-2 rounded bg-[#0ea5e9] text-black"
          >
            Export all
          </button>
        </div>
      </div>
    </ManagerLayout>
  );
}
