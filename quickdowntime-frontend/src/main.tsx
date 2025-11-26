import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import { syncOfflineLogs } from "./utils/sync";
import { registerServiceWorker } from "./registerServiceWorker";
import "./service-worker-registration";

// Sync on initial load if online
if (navigator.onLine) {
  syncOfflineLogs().catch((err) => {
    console.error("Initial sync failed:", err);
  });
}

// Sync every 20 seconds if online
setInterval(() => {
  if (navigator.onLine) {
    syncOfflineLogs().catch((err) => {
      console.error("Periodic sync failed:", err);
    });
  }
}, 20000); // every 20 sec

// Listen for online event to sync immediately
window.addEventListener("online", () => {
  console.log("🌐 Back online - syncing offline data...");
  syncOfflineLogs().catch((err) => {
    console.error("Online sync failed:", err);
  });
});

// Listen for offline event
window.addEventListener("offline", () => {
  console.log("📴 Gone offline - data will be queued");
});

// Render React app
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Register Service Worker
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    registerServiceWorker();
  });
}

// Service Worker message handling
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.ready.then((_reg) => {
    navigator.serviceWorker.addEventListener("message", (event) => {
      if (event.data?.type === "REQUEST_TOKEN") {
        const token = localStorage.getItem("token");
        event.ports[0].postMessage({ token });
      }
    });
  });

  navigator.serviceWorker.register("/sw.js").then((registration) => {
    console.log("✅ Service Worker registered:", registration);
  }).catch((error) => {
    console.error("❌ Service Worker registration failed:", error);
  });
}