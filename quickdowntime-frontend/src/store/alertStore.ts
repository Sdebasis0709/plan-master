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
  updateCountFromAlerts: () => void;
}

export const useAlertStore = create<AlertState>((set, get) => ({
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
      alerts: [],
    })),
  
  addAlert: (alert) =>
    set((state) => {
      const newAlerts = [alert, ...state.alerts];
      // Don't auto-calculate count here - let the API be the source of truth
      return {
        alerts: newAlerts,
        count: state.count + 1, // Just increment
      };
    }),
  
  setAlerts: (alerts) =>
    set(() => {
      // Calculate unseen count from alerts
      const unseenCount = alerts.filter(a => !a.seen).length;
      return {
        alerts: [...alerts],
        count: unseenCount,
      };
    }),
  
  markAllSeen: () =>
    set((state) => ({
      alerts: state.alerts.map((a) => ({ ...a, seen: true })),
      count: 0,
    })),
  
  // Helper to recalculate count from current alerts
  updateCountFromAlerts: () =>
    set((state) => ({
      count: state.alerts.filter(a => !a.seen).length,
    })),
}));