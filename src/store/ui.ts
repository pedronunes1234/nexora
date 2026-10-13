"use client";
import { create } from "zustand";

interface UIState {
  addOpen: boolean;
  addDate?: string;
  addKind?: "task" | "event";
  openAdd: (date?: string, kind?: "task" | "event") => void;
  closeAdd: () => void;
}
export const useUI = create<UIState>()((set) => ({
  addOpen: false,
  openAdd: (date, kind) => set({ addOpen: true, addDate: date, addKind: kind }),
  closeAdd: () => set({ addOpen: false }),
}));
