import { openDB } from "idb";

export const getDB = async () =>
  await openDB("qdown", 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains("offline_logs")) {
        db.createObjectStore("offline_logs", { keyPath: "id" });
      }
    }
  });

export const saveOfflineLog = async (record: any) => {
  const db = await getDB();
  await db.put("offline_logs", record);
};

export const getPendingLogs = async () => {
  const db = await getDB();
  return await db.getAllFromIndex("offline_logs", "id");
};

export const deleteLog = async (id: string) => {
  const db = await getDB();
  await db.delete("offline_logs", id);
};
