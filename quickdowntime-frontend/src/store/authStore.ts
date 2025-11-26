import { create } from "zustand";
import jwtDecode from "jwt-decode";

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
  },

  logout: () => {
    localStorage.removeItem("token");
    set({ token: null, user: null });
    // Redirect to home/login page
    window.location.href = "/";
  },
}));