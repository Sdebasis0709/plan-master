import client from "../api/axiosClient";
import { getPendingLogs, deleteLog } from "./db";

export async function syncOfflineLogs() {
  const logs = await getPendingLogs();
  if (!logs.length) return;

  for (const log of logs) {
    const fd = new FormData();
    fd.append("machine_id", log.machine_id);
    fd.append("reason", log.reason);
    fd.append("category", log.category ?? "");
    fd.append("description", log.description ?? "");
    fd.append("created_at", log.created_at);

    if (log.imageBlob)
      fd.append("image", log.imageBlob, `${log.id}.jpg`);
    if (log.audioBlob)
      fd.append("audio", log.audioBlob, `${log.id}.webm`);

    try {
      await client.post("/api/downtime/log-local", fd);
      await deleteLog(log.id);
    } catch (err) {
      console.log("sync failed, will retry", err);
      return; // stop loop until next timer
    }
  }
}
