import localforage from "localforage";
import client from "../api/axiosClient";

localforage.config({
  name: "quickdowntime",
  storeName: "outbox",
});

// --------------------------
// PUSH TO OUTBOX (offline queue)
// --------------------------
export async function pushOutbox(item: any) {
  const key = `task-${item.id || Date.now()}`;
  await localforage.setItem(key, item);
  console.log("Outbox stored:", key);
}

// --------------------------
// SYNC OUTBOX (drain queue)
// --------------------------
export async function drainOutbox() {
  const keys = await localforage.keys();

  for (const key of keys) {
    const item = await localforage.getItem<any>(key);
    if (!item) continue;

    try {
      const res = await client.post(item.url, item.body, {
        headers: item.headers,
      });

      console.log("Synced:", res.data);
      await localforage.removeItem(key);
    } catch (err) {
      console.log("Still offline, retry later.");
      return; // stop draining, still offline
    }
  }
}
