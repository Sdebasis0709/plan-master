import { useEffect, useState } from "react";
import ManagerLayout from "../../components/layout/ManagerLayout";
import client from "../../api/axiosClient";
import { Search } from "lucide-react";

export default function ManagerDowntimeList() {
  const [data, setData] = useState<any[]>([]);
  const [total, setTotal] = useState(0);

  const [loading, setLoading] = useState(true);

  // Filters + pagination
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [machine, setMachine] = useState("");
  const [severity, setSeverity] = useState("");
  const [status, setStatus] = useState("");

  const perPage = 20;

  useEffect(() => {
    load();
  }, [page, search, machine, severity, status]);

  const load = async () => {
    setLoading(true);

    try {
      const r = await client.get("/api/management/downtimes", {
        params: {
          page,
          per_page: perPage,
          search,
          machine_id: machine || undefined,
          severity: severity || undefined,
          status: status || undefined,
        },
      });

      setData(r.data.data);
      setTotal(r.data.total);
    } catch (err) {
      console.log("Load DT error", err);
    }

    setLoading(false);
  };

  const totalPages = Math.ceil(total / perPage);

  return (
    <ManagerLayout>
      <h1 className="text-2xl font-semibold mb-6">Downtimes</h1>

      {/* ------------------------------------------- */}
      {/* Filters */}
      {/* ------------------------------------------- */}
      <div className="bg-[#07121a] p-4 rounded-lg mb-6 border border-gray-800">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">

          {/* Search */}
          <div className="relative">
            <Search
              size={18}
              className="absolute left-3 top-3 text-gray-400"
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search..."
              className="w-full bg-[#0f1724] text-white pl-10 p-3 rounded-lg border border-gray-700 focus:border-blue-500"
            />
          </div>

          {/* Machine ID */}
          <select
            value={machine}
            onChange={(e) => setMachine(e.target.value)}
            className="bg-[#0f1724] text-white p-3 rounded-lg border border-gray-700"
          >
            <option value="">All Machines</option>
            <option value="M1">M1</option>
            <option value="M2">M2</option>
            <option value="M3">M3</option>
          </select>

          {/* Severity */}
          <select
            value={severity}
            onChange={(e) => setSeverity(e.target.value)}
            className="bg-[#0f1724] text-white p-3 rounded-lg border border-gray-700"
          >
            <option value="">Any Severity</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>

          {/* Status */}
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="bg-[#0f1724] text-white p-3 rounded-lg border border-gray-700"
          >
            <option value="">Any Status</option>
            <option value="open">Open</option>
            <option value="resolved">Resolved</option>
          </select>
        </div>
      </div>

      {/* ------------------------------------------- */}
      {/* Table */}
      {/* ------------------------------------------- */}
      <div className="rounded-lg overflow-hidden border border-gray-800">
        <table className="w-full bg-[#07121a] text-white">
          <thead className="bg-[#0d1c29] text-gray-300">
            <tr>
              <th className="p-3 text-left">ID</th>
              <th className="p-3 text-left">Machine</th>
              <th className="p-3 text-left">Reason</th>
              <th className="p-3 text-left">Severity</th>
              <th className="p-3 text-left">Status</th>
              <th className="p-3 text-left">Created</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="p-4 text-center text-gray-400">
                  Loading...
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-4 text-center text-gray-400">
                  No data found.
                </td>
              </tr>
            ) : (
              data.map((d) => (
                <tr
                  key={d.id}
                  className="border-b border-gray-800 hover:bg-[#0f1724] transition cursor-pointer"
                  onClick={() =>
                    (window.location.href = `/manager/downtimes/${d.id}`)
                  }
                >
                  <td className="p-3">{d.id}</td>
                  <td className="p-3">{d.machine_id}</td>
                  <td className="p-3 text-gray-300">{d.reason}</td>
                  <td className="p-3 capitalize">
                    <span
                      className={`px-2 py-1 rounded text-xs 
                      ${
                        d.severity === "high"
                          ? "bg-red-600/30 text-red-300"
                          : d.severity === "medium"
                          ? "bg-amber-600/30 text-amber-300"
                          : "bg-green-600/30 text-green-300"
                      }`}
                    >
                      {d.severity || "low"}
                    </span>
                  </td>
                  <td className="p-3 capitalize">
                    {d.status === "resolved" ? (
                      <span className="text-green-400">Resolved</span>
                    ) : (
                      <span className="text-red-400">Open</span>
                    )}
                  </td>
                  <td className="p-3">{d.created_at?.slice(0, 16)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ------------------------------------------- */}
      {/* Pagination */}
      {/* ------------------------------------------- */}
      <div className="flex justify-between items-center mt-6">

        <button
          disabled={page === 1}
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          className={`px-4 py-2 rounded-lg
            ${
              page === 1
                ? "bg-gray-700 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700"
            }
          `}
        >
          Prev
        </button>

        <div className="text-gray-300">
          Page {page} of {totalPages || 1}
        </div>

        <button
          disabled={page >= totalPages}
          onClick={() => setPage((p) => p + 1)}
          className={`px-4 py-2 rounded-lg
            ${
              page >= totalPages
                ? "bg-gray-700 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700"
            }
          `}
        >
          Next
        </button>
      </div>
    </ManagerLayout>
  );
}
