// src/services/wsManager.ts
import { useEffect, useRef } from "react";
import { useAlertStore } from "../store/alertStore";

export function useManagerWS() {
  const addAlert = useAlertStore((s) => s.addAlert);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    function connect() {
      const ws = new WebSocket(
        `ws://localhost:8000/api/ws/manager?token=${token}`
      );
      wsRef.current = ws;

      ws.onopen = () => {
        console.log("WS Connected: manager");
      };

      ws.onclose = () => {
        console.log("WS Closed → Reconnecting in 5s...");
        setTimeout(connect, 5000); // reconnect WITHOUT calling hook
      };

      ws.onerror = (err) => {
        console.error("WS Error:", err);
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);

          if (msg.type === "downtime_created") {
            addAlert(msg.data); // Send alert to store
          }
        } catch (e) {
          console.error("WS message parse error", e);
        }
      };
    }

    connect();

    return () => {
      wsRef.current?.close();
    };
  }, []);
}
