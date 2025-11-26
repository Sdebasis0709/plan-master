/* src/sw.ts */
const CACHE_NAME = "qd-shell-v1";
const ASSETS_TO_CACHE = [
  "/",
  "/index.html",
  "/favicon.ico",
  "/manifest.json"
  // optional: add static built JS/CSS paths if you want them cached explicitly
];

// Small IndexedDB helper for SW usage
function openDB() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open("qd-offline-db", 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains("outbox")) {
        db.createObjectStore("outbox", { keyPath: "id", autoIncrement: true });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function saveOutboxEntry(payload: any) {
  const db = await openDB();
  return new Promise((res, rej) => {
    const tx = db.transaction("outbox", "readwrite");
    const store = tx.objectStore("outbox");
    store.add(payload);
    tx.oncomplete = () => res(true);
    tx.onerror = () => rej(tx.error);
  });
}

async function getOutboxEntries() {
  const db = await openDB();
  return new Promise<any[]>((res, rej) => {
    const tx = db.transaction("outbox", "readonly");
    const store = tx.objectStore("outbox");
    const req = store.getAll();
    req.onsuccess = () => res(req.result || []);
    req.onerror = () => rej(req.error);
  });
}
async function deleteOutboxEntry(id: number) {
  const db = await openDB();
  return new Promise((res, rej) => {
    const tx = db.transaction("outbox", "readwrite");
    const store = tx.objectStore("outbox");
    store.delete(id);
    tx.oncomplete = () => res(true);
    tx.onerror = () => rej(tx.error);
  });
}

/* install */
self.addEventListener("install", (ev: any) => {
  ev.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE))
  );
  // Activate immediately
  // @ts-ignore
  self.skipWaiting();
});

/* activate */
self.addEventListener("activate", (ev: any) => {
  ev.waitUntil(clients.claim());
});

/* fetch - cache-first for shell, network-first for API */
self.addEventListener("fetch", (ev: any) => {
  const req = ev.request;

  // let API requests go to network (but you could implement runtime caching)
  if (req.url.includes("/api/")) {
    ev.respondWith(
      fetch(req)
        .then((res) => {
          // optionally cache GET responses
          return res;
        })
        .catch(() =>
          // if network fails, try to return cached GET if present
          caches.match(req)
        )
    );
    return;
  }

  // cache-first for shell assets
  ev.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req)
        .then((networkRes) => {
          // optionally cache new resources
          return networkRes;
        })
        .catch(() => {
          // fallback could be offline page
          return caches.match("/");
        });
    })
  );
});

/* Listen for messages from client (used to enqueue from page) */
self.addEventListener("message", (ev: any) => {
  const msg = ev.data || {};
  if (msg.type === "QUEUE_DOWNTIME") {
    // payload contains: { form: { ... }, files: { image: {...}, audio: {...} } }
    saveOutboxEntry(msg.payload).then(() => {
      // try to register sync
      // @ts-ignore
      if (self.registration && (self.registration as any).sync) {
        // @ts-ignore
        (self.registration as any).sync.register("qd-sync");
      }
    });
  }
});

/* Background sync: flush queue */
self.addEventListener("sync", (ev: any) => {
  if (ev.tag === "qd-sync") {
    ev.waitUntil(flushOutbox());
  }
});

async function flushOutbox() {
  const entries = await getOutboxEntries();
  for (const e of entries) {
    try {
      // e.payload includes formFields and blobs (we stored blobs as data URLs)
      const fd = new FormData();
      Object.entries(e.payload.form || {}).forEach(([k, v]) => {
        fd.append(k, String(v));
      });

      // rebuild blobs from dataURL if present
      if (e.payload.imageDataUrl) {
        const blob = dataURLtoBlob(e.payload.imageDataUrl);
        fd.append("image", blob, e.payload.imageName || "image.jpg");
      }
      if (e.payload.audioDataUrl) {
        const blob = dataURLtoBlob(e.payload.audioDataUrl);
        fd.append("audio", blob, e.payload.audioName || "audio.webm");
      }

      // post to your upload endpoint
      const fetchResp = await fetch("/api/downtime/log", {
        method: "POST",
        body: fd,
        credentials: "same-origin"
      });

      if (fetchResp.ok) {
        await deleteOutboxEntry(e.id);
      } else {
        // server replied non-200; keep entry to retry later
        console.warn("Failed to send queued item", fetchResp.status);
      }
    } catch (err) {
      console.warn("Error flushing outbox entry", err);
      // keep retrying next sync
    }
  }
}

// helper: convert dataURL to Blob
function dataURLtoBlob(dataurl: string) {
  const arr = dataurl.split(",");
  const mime = arr[0].match(/:(.*?);/)?.[1] || "application/octet-stream";
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
}
