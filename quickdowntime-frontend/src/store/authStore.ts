// src/store/authStore.ts
import { create } from "zustand";
import jwtDecode from "jwt-decode";
import { wsClient } from "../services/wsClient";

interface AuthState {
  token: string | null;
  user: any | null;
  setToken: (tk: string) => void;
  logout: () => void;
}

export const useAuth = create<AuthState>((set) => ({
  token: localStorage.getItem("token"),
  user: localStorage.getItem("token")
    ? jwtDecode(localStorage.getItem("token")!)
    : null,

  setToken: (tk: string) => {
    localStorage.setItem("token", tk);
    const user = jwtDecode(tk);
    set({ token: tk, user });
    // connect WS with new token immediately
    wsClient.connect(tk);
  },

  logout: () => {
    localStorage.removeItem("token");
    // disconnect websocket immediately
    try {
      wsClient.disconnect();
    } catch {}
    set({ token: null, user: null });
    // Redirect to home/login page
    window.location.href = "/";
  },
}));
