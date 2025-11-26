// src/pages/operator/OperatorQueue.tsx
import { useEffect, useState } from "react";
import { getOutboxAll, deleteOutbox } from "../../utils/idb";
import client from "../../api/axiosClient";

export default function OperatorQueue() {
  const [items, setItems] = useState<any[]>([]);

  async function load() {
    const q = await getOutboxAll();
    setItems(q);
  }

  useEffect(() => { load(); }, []);

  async function retry(item: any) {
    try {
      await client.post("/api/operator/log", item);
      await deleteOutbox(item.id);
      load();
      alert("Sent");
    } catch (e) {
      alert("Send failed");
    }
  }

  return (
    <div className="p-6 min-h-screen bg-[#0f1724] text-white">
      <h2 className="text-xl mb-4">Queued items</h2>
      {items.length === 0 && <div>No queued items</div>}
      <div className="space-y-2">
        {items.map(it => (
          <div key={it.id} className="bg-[#07121a] p-3 rounded">
            <div className="text-sm">{it.machine_id} — {it.reason}</div>
            <div className="mt-2 flex gap-2">
              <button onClick={() => retry(it)} className="px-2 py-1 bg-green-600 rounded">Retry</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
