// src/components/SoundUnlocker.tsx
import { useEffect } from "react";
import { wsClient } from "../services/wsClient";

export default function SoundUnlocker() {
  useEffect(() => {
    const unlockHandler = async () => {
      try {
        await wsClient.unlockSound();
      } catch (e) {
        // ignore
      } finally {
        document.removeEventListener("click", unlockHandler);
      }
    };

    document.addEventListener("click", unlockHandler, { once: true });
    return () => document.removeEventListener("click", unlockHandler);
  }, []);

  return null;
}
