// src/services/wsManager.ts
import { useEffect } from "react";
import { wsClient } from "./wsClient";
import { useAlertStore } from "../store/alertStore";
import { useAuth } from "../store/authStore";

export function useManagerWS() {
  const { addAlert, increment } = useAlertStore();
  const { token, user } = useAuth.getState(); // synchronous snapshot

  useEffect(() => {
    // attach handlers
    wsClient.onMessage = (msg) => {
      const payload = msg.downtime ?? msg.data ?? msg;
      switch (msg.type) {
        case "new_downtime":
        case "new_downtime_with_ai":
        case "downtime_created":
          if (payload) {
            addAlert(payload);
            increment();
          }
          break;
        default:
          break;
      }
    };

    wsClient.onOpen = () => console.log("Manager WS opened (hook)");
    wsClient.onClose = (c) => console.log("Manager WS closed (hook)", c);
    wsClient.onError = (err) => console.log("Manager WS error (hook)", err);

    // Connect only if current user role is manager and token exists.
    if (user?.role === "manager" && (token || localStorage.getItem("token"))) {
      const t = token ?? localStorage.getItem("token")!;
      wsClient.connect(t);
    } else {
      // Ensure no connection for non-managers
      // do NOT forcibly disconnect here if you want persistent globally; but to be safe:
      // wsClient.disconnect(); // optional: uncomment if you want to close when not manager
    }

    // on unmount: remove handlers (avoid leaks)
    return () => {
      wsClient.onMessage = null;
      wsClient.onOpen = null;
      wsClient.onClose = null;
      wsClient.onError = null;
      // don't disconnect here — keep client persistent across route changes
    };
  }, []); // only attach once
}
