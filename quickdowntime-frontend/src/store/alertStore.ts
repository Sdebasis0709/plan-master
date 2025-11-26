// src/store/alertStore.ts
import { create } from "zustand";

interface Alert {
  id: number;
  machine_id: string;
  reason: string;
  severity?: string;
  seen: boolean;
  created_at: string;
}

interface AlertState {
  count: number;
  alerts: Alert[];

  setCount: (v: number) => void;
  increment: () => void;
  reset: () => void;

  addAlert: (alert: Alert) => void;
  setAlerts: (alerts: Alert[]) => void;
  markAllSeen: () => void;
}

export const useAlertStore = create<AlertState>((set) => ({
  count: 0,
  alerts: [],

  setCount: (v) => set(() => ({ count: Math.max(0, v) })),

  increment: () =>
    set((state) => ({
      count: state.count + 1,
    })),

  reset: () =>
    set(() => ({
      count: 0,
      alerts: [], // ❗ fix
    })),

  addAlert: (alert) =>
    set((state) => ({
      alerts: [alert, ...state.alerts], // new array = re-render
      count: state.count + 1,
    })),

  setAlerts: (alerts) =>
    set(() => ({
      alerts: [...alerts], // always new copy
    })),

  markAllSeen: () =>
    set((state) => ({
      alerts: state.alerts.map((a) => ({ ...a, seen: true })), // new array = re-render
      count: 0,
    })),
}));
