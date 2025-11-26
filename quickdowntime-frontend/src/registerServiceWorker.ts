/* src/registerServiceWorker.ts */
export async function registerServiceWorker() {
  if ("serviceWorker" in navigator) {
    try {
      const reg = await navigator.serviceWorker.register("/sw.js");
      console.log("SW registered", reg);
    } catch (err) {
      console.warn("SW register failed", err);
    }
  }
}

// Send queued item to SW via postMessage; SW will persist it
export async function queueForSync(payload: any) {
  if (navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({
      type: "QUEUE_DOWNTIME",
      payload,
    });

    // Request background sync if available
    try {
      const reg = await navigator.serviceWorker.ready;
      // @ts-ignore
      if (reg.sync) await reg.sync.register("qd-sync");
    } catch (err) {
      // no sync support; fallback: you can attempt immediate upload or prompt user
      console.warn("Background sync not available", err);
    }
  } else {
    // fallback: attempt to open a window-based uploader or use local enqueue via idb
    console.warn("No active SW controller");
  }
}
