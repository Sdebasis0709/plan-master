// src/services/wsClient.ts
/* eslint-disable no-console */
type MessageHandler = (msg: any) => void;

class WSClient {
  private ws: WebSocket | null = null;
  private url = import.meta.env.VITE_WS_URL || "ws://localhost:8000";
  private token: string | null = null;

  // reconnection
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 20;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  // heartbeat
  private pingTimer: ReturnType<typeof setInterval> | null = null;
  private pingIntervalMs = 30000; // 30s

  // handlers
  public onMessage: MessageHandler | null = null;
  public onOpen: (() => void) | null = null;
  public onClose: ((code?: number) => void) | null = null;
  public onError: ((err?: any) => void) | null = null;

  // debug
  public debug = false;

  // sound
  private alertAudio: HTMLAudioElement | null = null;
  private soundEnabled = false; // start disabled until unlocked

  constructor() {
    // prepare audio - user must add file at /public/sounds/alert.mp3
    try {
      this.alertAudio = new Audio("/sounds/alert.mp3");
      this.alertAudio.preload = "auto";
      this.alertAudio.volume = 0.6;
    } catch (e) {
      this.alertAudio = null;
    }
  }

  private log(...args: any[]) {
    if (this.debug) console.log("[wsclient]", ...args);
  }

  public setSoundEnabled(v: boolean) {
    this.soundEnabled = v;
  }

  // Attempt to unlock / prime sound (call from a user gesture handler)
  public async unlockSound() {
    this.soundEnabled = true;
    if (!this.alertAudio) return;
    try {
      // play & pause quickly to prime audio stack (most browsers accept this if user gesture)
      await this.alertAudio.play();
      this.alertAudio.pause();
      this.alertAudio.currentTime = 0;
      this.log("Sound unlocked");
    } catch (e) {
      this.log("Sound unlock blocked:", e);
      // still keep soundEnabled true so later user gestures may allow it
    }
  }

  public playSound() {
    try {
      if (!this.soundEnabled) return;
      if (!this.alertAudio) return;
      this.alertAudio.currentTime = 0;
      this.alertAudio.play().catch((e) => {
        this.log("Sound play blocked:", e);
      });
    } catch (e) {
      this.log("Sound error:", e);
    }
  }

  public isConnected() {
    return !!(this.ws && this.ws.readyState === WebSocket.OPEN);
  }

  public connect(token?: string) {
    const newToken = token ?? this.token;
    if (!newToken) {
      this.log("No token provided - not connecting");
      return;
    }
    this.token = newToken;

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.log("WS already open");
      return;
    }

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    const url = `${this.url}/api/ws/manager?token=${encodeURIComponent(this.token)}`;
    this.log("Connecting to", url);
    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      this.log("Connected");
      this.reconnectAttempts = 0;
      this.startPing();
      this.onOpen?.();
    };

    this.ws.onmessage = (ev) => {
      let data: any = null;
      try {
        data = JSON.parse(ev.data);
      } catch (e) {
        this.log("Non-JSON WS message:", ev.data);
        return;
      }

      if (data?.type === "pong") {
        this.log("pong");
        return;
      }

      // play sound + notification for key types
      if (data?.type === "new_downtime" || data?.type === "new_downtime_with_ai") {
        // play sound & show notification (UI will also update via hook)
        this.playSound();
        if (Notification.permission === "granted") {
          try {
            const title = "New Downtime Alert";
            const body = data.downtime
              ? `${data.downtime.machine_id}: ${data.downtime.reason}`
              : "New downtime reported";
            new Notification(title, { body, icon: "/favicon.ico", tag: `downtime-${data.downtime?.id ?? Math.random()}` });
          } catch {}
        }
      }

      this.onMessage && this.onMessage(data);
    };

    this.ws.onerror = (err) => {
      this.log("WS error", err);
      this.onError?.(err);
    };

    this.ws.onclose = (ev) => {
      this.log("WS closed", ev.code, ev.reason);
      this.stopPing();
      this.onClose?.(ev.code);
      if (ev.code === 1000 || ev.code === 4001 || ev.code === 4003) {
        this.log("Not reconnecting (clean/auth close)");
        return;
      }
      this.scheduleReconnect();
    };
  }

  private scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.log("Max reconnect attempts reached");
      return;
    }
    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    this.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
    this.reconnectTimer = setTimeout(() => {
      this.connect(this.token ?? undefined);
    }, delay);
  }

  public disconnect() {
    this.log("Manual disconnect");
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.stopPing();
    if (this.ws) {
      try {
        this.ws.close(1000, "Client disconnect");
      } catch {}
      this.ws = null;
    }
  }

  private startPing() {
    this.stopPing();
    this.pingTimer = setInterval(() => {
      try {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
          this.ws.send(JSON.stringify({ type: "ping", ts: Date.now() }));
        }
      } catch (e) {
        this.log("Ping failed", e);
      }
    }, this.pingIntervalMs);
  }

  private stopPing() {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
  }
}

export const wsClient = new WSClient();
export default wsClient;
