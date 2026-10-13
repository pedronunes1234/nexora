"use client";
import { create } from "zustand";
import type { Proposal } from "@/lib/copilot";
import { uid } from "@/lib/utils";

export interface ChatMsg {
  id: string;
  role: "user" | "ai";
  text: string;
  at: string;
  proposal?: Proposal;
  off?: string[]; // ids de mudanças desmarcadas
  applied?: boolean;
}
interface ChatState {
  msgs: ChatMsg[];
  busy: boolean;
  push: (m: Omit<ChatMsg, "id" | "at">) => string;
  patch: (id: string, p: Partial<ChatMsg>) => void;
  setBusy: (b: boolean) => void;
  clear: () => void;
}
export const useChat = create<ChatState>()((set) => ({
  msgs: [], busy: false,
  push: (m) => { const id = uid(); set((s) => ({ msgs: [...s.msgs, { ...m, id, at: new Date().toISOString() }] })); return id; },
  patch: (id, p) => set((s) => ({ msgs: s.msgs.map((m) => (m.id === id ? { ...m, ...p } : m)) })),
  setBusy: (busy) => set({ busy }),
  clear: () => set({ msgs: [] }),
}));
