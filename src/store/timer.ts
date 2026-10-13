"use client";
import { create } from "zustand";
import { flowAudio, playTimbre, PRESET_FOR, type Ambient, type Beat } from "@/lib/audio";
import { useApp } from "./app";

interface TimerState {
  status: "idle" | "running" | "paused";
  totalSec: number;
  leftSec: number;
  endAt: number;
  cycle: number; // 1..4
  taskTitle: string;
  beat: Beat;
  ambient: Ambient;
  volume: number; // 0..1
  setMinutes: (m: number) => void;
  setTitle: (t: string) => void;
  setBeat: (b: Beat) => void;
  setAmbient: (a: Ambient) => void;
  setVolume: (v: number) => void;
  start: () => void;
  pause: () => void;
  reset: () => void;
  extend: (min: number) => void;
  finish: (completed: boolean) => void;
  tick: () => void;
}

const syncAudio = (s: Pick<TimerState, "beat" | "ambient" | "volume" | "status">) => {
  const a = flowAudio();
  if (!a) return;
  if (s.status === "running" && (s.beat !== "off" || s.ambient !== "none")) a.start({ beat: s.beat, ambient: s.ambient, volume: s.volume });
  else a.stop();
};

export const useTimer = create<TimerState>()((set, get) => ({
  status: "idle", totalSec: 45 * 60, leftSec: 45 * 60, endAt: 0, cycle: 1, taskTitle: "", beat: "alpha", ambient: "rain", volume: 0.65,
  setMinutes: (m) => { if (get().status === "idle") set({ totalSec: m * 60, leftSec: m * 60 }); },
  setTitle: (t) => set({ taskTitle: t }),
  setBeat: (b) => { set({ beat: b }); syncAudio(get()); },
  setAmbient: (a) => { set({ ambient: a }); syncAudio(get()); },
  setVolume: (v) => { set({ volume: v }); flowAudio()?.setVolume(v); },
  start: () => {
    const s = get();
    const left = s.status === "paused" ? s.leftSec : s.totalSec;
    set({ status: "running", endAt: Date.now() + left * 1000, leftSec: left });
    syncAudio(get());
  },
  pause: () => { const left = Math.max(0, Math.ceil((get().endAt - Date.now()) / 1000)); set({ status: "paused", leftSec: left }); syncAudio(get()); },
  reset: () => { set({ status: "idle", leftSec: get().totalSec }); syncAudio(get()); },
  extend: (min) => {
    const s = get();
    if (s.status === "running") set({ endAt: s.endAt + min * 60000, totalSec: s.totalSec + min * 60, leftSec: s.leftSec + min * 60 });
    else set({ totalSec: s.totalSec + min * 60, leftSec: s.leftSec + min * 60 });
  },
  finish: (completed) => {
    const s = get();
    const elapsed = s.status === "running" ? s.totalSec - Math.max(0, Math.ceil((s.endAt - Date.now()) / 1000)) : s.totalSec - s.leftSec;
    const mins = completed ? Math.round(s.totalSec / 60) : Math.round(elapsed / 60);
    const app = useApp.getState();
    if (mins >= 1) {
      app.addSession(mins, PRESET_FOR[s.beat] ?? (s.ambient === "brown" ? "brown_noise" : undefined), s.taskTitle || undefined);
      app.notify({ kind: "focus", title: completed ? "Bloco de foco concluído" : "Sessão de foco encerrada", body: `${mins} min registrados${s.taskTitle ? ` em “${s.taskTitle}”` : ""}.` });
    }
    set({ status: "idle", leftSec: s.totalSec, cycle: completed ? (s.cycle % 4) + 1 : s.cycle });
    syncAudio(get());
    if (completed) {
      const st = app.settings;
      if (st.sound) playTimbre(st.softBreaks ? "zen_gong" : "nexora_pulse", st.volume / 100);
      app.toast(`Bloco de ${mins} min concluído. Hora de uma pausa.`, "alarm");
    }
  },
  tick: () => {
    const s = get();
    if (s.status !== "running") return;
    const left = Math.max(0, Math.ceil((s.endAt - Date.now()) / 1000));
    if (left !== s.leftSec) set({ leftSec: left });
    if (left <= 0) get().finish(true);
  },
}));
