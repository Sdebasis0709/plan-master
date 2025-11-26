import { useEffect, useState } from "react";
import client from "../../api/axiosClient";

export default function OperatorHistory() {
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    const r = await client.get("/api/operator/history");
    setItems(r.data);
  };

  return (
    <div className="min-h-screen bg-[#0f1724] text-white p-5">
      <h2 className="text-2xl font-semibold mb-4">History</h2>

      <div className="space-y-4">
        {items.map((x, i) => (
          <div
            key={i}
            className="bg-[#07121a] p-4 rounded border border-gray-700"
          >
            <div className="font-semibold text-blue-400">{x.machine_id}</div>
            <div className="text-sm text-gray-300">{x.reason}</div>
            <div className="text-xs text-gray-500 mt-1">{x.created_at}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
