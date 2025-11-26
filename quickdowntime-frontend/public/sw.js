/* -------------------------------------------------
   QuickDowntime – FIXED Service Worker
-------------------------------------------------- */

// 🔥 Disable during development (NO return usage!)
if (self.location.hostname === "localhost") {
  console.log("[SW] Disabled in DEV");

  // Keep minimal events so browser stops complaining
  self.addEventListener("install", () => self.skipWaiting());
  self.addEventListener("activate", () => self.clients.claim());

  // ❗ NO return allowed at top level
} else {
  /* -----------------------------
     Cache Settings
  ----------------------------- */
  const CACHE_NAME = "qd-cache-v1";
  const OFFLINE_URL = "/offline.html";

  self.addEventListener("install", () => {
    console.log("[SW] Installed");
  });

  self.addEventListener("activate", (event) => {
    console.log("[SW] Activated");

    event.waitUntil(
      caches.keys().then((keys) =>
        Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
      )
    );

    self.clients.claim();
  });

  /* -----------------------------
     FETCH HANDLER
  ----------------------------- */
  self.addEventListener("fetch", (event) => {
    const req = event.request;
    if (req.method !== "GET") return;

    event.respondWith(
      caches.match(req).then(
        cached =>
          cached ||
          fetch(req)
            .then(res => {
              const clone = res.clone();
              caches.open(CACHE_NAME).then(cache => cache.put(req, clone));
              return res;
            })
            .catch(() => caches.match(OFFLINE_URL))
      )
    );
  });

  /* -----------------------------
     Background Sync
  ----------------------------- */
  self.addEventListener("sync", (event) => {
    if (event.tag === "qd-sync") {
      event.waitUntil(syncOutbox());
    }
  });

  async function syncOutbox() {
    const items = await readOutbox();
    if (!items.length) return;

    for (const entry of items) {
      try {
        const token = await getToken();

        const res = await fetch("http://localhost:8000/api/operator/log", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: token ? `Bearer ${token}` : ""
          },
          body: JSON.stringify(entry)
        });

        if (!res.ok) throw new Error("Upload failed");

        await removeFromOutbox(entry.id);
        console.log("[SW] Synced:", entry.id);
      } catch (err) {
        console.warn("[SW] Sync error:", err);
        return;
      }
    }
  }

  /* -----------------------------
     IndexedDB Helpers
  ----------------------------- */

  async function readOutbox() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open("qd-offline-db", 1);

      req.onerror = reject;

      req.onsuccess = () => {
        const db = req.result;
        const tx = db.transaction("outbox", "readonly");
        const store = tx.objectStore("outbox");
        const all = store.getAll();
        all.onsuccess = () => resolve(all.result || []);
        all.onerror = reject;
      };
    });
  }

  async function removeFromOutbox(id) {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open("qd-offline-db", 1);

      req.onsuccess = () => {
        const db = req.result;
        const tx = db.transaction("outbox", "readwrite");
        tx.objectStore("outbox").delete(id);
        tx.oncomplete = resolve;
        tx.onerror = reject;
      };
    });
  }

  async function getToken() {
    const clients = await self.clients.matchAll({
      includeUncontrolled: true
    });

    if (!clients.length) return null;

    return new Promise((resolve) => {
      const channel = new MessageChannel();
      channel.port1.onmessage = (e) => resolve(e.data?.token || null);
      clients[0].postMessage({ type: "REQUEST_TOKEN" }, [channel.port2]);
    });
  }
}
