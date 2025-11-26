// src/utils/idb.ts
export interface OutboxItem {
  id?: number;
  machine_id?: string;
  reason?: string;
  category?: string;
  description?: string;
  image_base64?: string | null;
  audio_base64?: string | null;
  createdAt?: number;
}

const DB_NAME = "qd-offline-db";
const DB_VERSION = 1;
const STORE_OUTBOX = "outbox";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_OUTBOX)) {
        const store = db.createObjectStore(STORE_OUTBOX, { keyPath: "id", autoIncrement: true });
        // create index for queries by creation time
        store.createIndex("by-created", "createdAt");
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function addOutbox(item: OutboxItem): Promise<number> {
  const db = await openDb();
  return new Promise<number>((resolve, reject) => {
    const tx = db.transaction(STORE_OUTBOX, "readwrite");
    const store = tx.objectStore(STORE_OUTBOX);
    const entry = { ...item, createdAt: item.createdAt || Date.now() };
    const req = store.add(entry);
    req.onsuccess = () => {
      // request.result is the auto-generated key
      resolve(req.result as number);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function getOutboxAll(): Promise<OutboxItem[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_OUTBOX, "readonly");
    const req = tx.objectStore(STORE_OUTBOX).getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

export async function clearOutboxEntry(id: number): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_OUTBOX, "readwrite");
    tx.objectStore(STORE_OUTBOX).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getPendingSortedByCreated(): Promise<OutboxItem[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_OUTBOX, "readonly");
    const store = tx.objectStore(STORE_OUTBOX);
    try {
      const idx = store.index("by-created");
      const req = idx.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    } catch (err) {
      // fallback to getAll
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    }
  });
}

// ✅ OPTION B: Add alias to fix the error
export const getPendingLogs = getPendingSortedByCreated;