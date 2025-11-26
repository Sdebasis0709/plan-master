import { create } from "zustand";

interface AlertState {
  addAlert: any;
  count: number;
  setCount: (v: number) => void;
  increment: () => void;
}

export const useAlertStore = create<AlertState>((set) => ({
  count: 0,
  setCount: (v) => set({ count: v }),
  increment: () =>
    set((state) => ({
      count: state.count + 1,
    })),
}));
