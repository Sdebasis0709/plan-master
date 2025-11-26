// src/service-worker-registration.ts
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/sw.js").then((reg) => {
    console.log("SW registered", reg);
  });

  navigator.serviceWorker.addEventListener("message", (event) => {
    // handle token request from SW
    if (event.data?.type === "REQUEST_TOKEN") {
      const token = localStorage.getItem("token");
      // event.ports[0] exists when SW used MessageChannel; otherwise ignore
      if (event.ports?.[0]) {
        event.ports[0].postMessage({ token });
      } else {
        // fallback: postMessage back to SW clients
        navigator.serviceWorker.controller?.postMessage({ type: "TOKEN", token });
      }
    }
  });
}
