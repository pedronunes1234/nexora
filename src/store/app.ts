"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { BinauralPreset, CalendarEvent, Capture, Category, FocusSession, HabitLog, KanbanCard, Note, NotificationItem, Profile, Task, Timbre } from "@/types/database";
import { db, TABLES, type TableName } from "@/lib/db";
import { playTimbre } from "@/lib/audio";
import { applyToEvents, type PlanChange } from "@/lib/copilot";
import { demoData, starterData, type Persona } from "@/lib/seed";
import { syncAll, type Tombstone } from "@/lib/sync";
import { supabase } from "@/lib/supabase";
import { fromMin, nowIso, nowMin, todayStr, toMin, uid, ymd, addDays } from "@/lib/utils";

export interface Settings {
  persona: Persona;
  timbre: Timbre;
  volume: number; // 0-100
  sound: boolean;
  repeatUntilOff: boolean;
  overdueAlerts: boolean;
  haptics: boolean;
  leadMin: number;
  pomodoroMin: 25 | 45 | 60 | 90;
  softBreaks: boolean;
  quietNight: boolean;
  dailyGoalMin: number;
  onboarded: boolean;
}
export interface Toast { id: string; text: string; tone: "ok" | "alarm" | "warn" }
export interface Ringing { key: string; title: string; timbre: Timbre }

const defaultProfile = (): Profile => ({
  id: uid(), name: "Você", bio: "", avatar_color: "#8b5cf6", circadian_peak_start: "14:00", circadian_peak_end: "18:00", hide_streaks: false,
});
const defaultSettings: Settings = {
  persona: "estudos", timbre: "nexora_pulse", volume: 85, sound: true, repeatUntilOff: false, overdueAlerts: true, haptics: true,
  leadMin: 10, pomodoroMin: 45, softBreaks: true, quietNight: true, dailyGoalMin: 210, onboarded: false,
};

interface AppState {
  ready: boolean;
  profile: Profile;
  settings: Settings;
  tombstones: Tombstone[];
  lastSync: string | null;
  syncing: boolean;
  userId: string | null; // id do Supabase, se logado

  tasks: Task[]; events: CalendarEvent[]; sessions: FocusSession[]; habits: HabitLog[];
  notes: Note[]; cards: KanbanCard[]; captures: Capture[]; notifications: NotificationItem[];
  toasts: Toast[]; ringing: Ringing | null;
  paletteOpen: boolean;

  hydrate: () => Promise<void>;
  setProfile: (p: Partial<Profile>) => void;
  setSettings: (s: Partial<Settings>) => void;
  toast: (text: string, tone?: Toast["tone"]) => void;
  dismissToast: (id: string) => void;
  setPalette: (o: boolean) => void;

  addTask: (t: Partial<Task> & { title: string }) => Task;
  updateTask: (id: string, p: Partial<Task>) => void;
  toggleTask: (id: string) => void;
  deleteTask: (id: string) => void;
  addEvent: (e: Partial<CalendarEvent> & { title: string; date: string; start_time: string; end_time: string }) => CalendarEvent;
  updateEvent: (id: string, p: Partial<CalendarEvent>) => void;
  deleteEvent: (id: string) => void;
  setHabit: (habit: HabitLog["habit"], value: number, date?: string) => void;
  addSession: (minutes: number, preset?: BinauralPreset, title?: string) => void;
  addCapture: (text: string) => void;
  deleteCapture: (id: string) => void;
  addNote: (n?: Partial<Note>) => Note;
  updateNote: (id: string, p: Partial<Note>) => void;
  deleteNote: (id: string) => void;
  addCard: (c: Partial<KanbanCard> & { title: string }) => void;
  moveCard: (id: string, column: KanbanCard["column"]) => void;
  deleteCard: (id: string) => void;
  notify: (n: Omit<NotificationItem, "id" | "user_id" | "created_at" | "read" | "updated_at">) => void;
  updateNotification: (id: string, p: Partial<NotificationItem>) => void;
  markAllRead: () => void;
  clearOld: () => void;
  applyChanges: (changes: PlanChange[]) => void;
  finishOnboarding: (persona: Persona, peak: { start: string; end: string }, timbre: Timbre, lead: number, loadDemo: boolean) => Promise<void>;
  loadDemo: () => Promise<void>;
  clearAll: () => Promise<void>;
  exportJson: () => Promise<string>;
  tick: () => void;
  stopRinging: () => void;
  snooze: (key: string, minutes: number) => void;
  sync: () => Promise<void>;
  setUserId: (id: string | null) => void;
}

const lastRemind: Record<string, number> = {};
const nonce = () => Math.random().toString(36).slice(2);

async function notifyOS(title: string, body: string) {
  try {
    if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
    const reg = await navigator.serviceWorker?.getRegistration();
    if (reg) await reg.showNotification(title, { body, icon: "/icon.svg", tag: title });
    else new Notification(title, { body });
  } catch { /* sem permissão */ }
}

export const useApp = create<AppState>()(
  persist(
    (set, get) => {
      const put = async <T extends { id: string }>(tbl: TableName, row: T) => {
        try { await (db()[tbl] as unknown as import("dexie").Table<T, string>).put(row); } catch (e) { console.error("Dexie", e); }
      };
      const del = async (tbl: TableName, id: string) => {
        try { await (db()[tbl] as unknown as import("dexie").Table<unknown, string>).delete(id); } catch (e) { console.error("Dexie", e); }
        set((s) => ({ tombstones: [...s.tombstones, { tbl, id, at: nowIso() }].slice(-500) }));
      };
      const uidNow = () => get().userId ?? get().profile.id;

      return {
        ready: false, profile: defaultProfile(), settings: defaultSettings, tombstones: [], lastSync: null, syncing: false, userId: null,
        tasks: [], events: [], sessions: [], habits: [], notes: [], cards: [], captures: [], notifications: [],
        toasts: [], ringing: null, paletteOpen: false,

        hydrate: async () => {
          const d = db();
          const [tasks, events, sessions, habits, notes, cards, captures, notifications] = await Promise.all([
            d.tasks.toArray(), d.events.toArray(), d.sessions.toArray(), d.habits.toArray(), d.notes.toArray(), d.cards.toArray(), d.captures.toArray(), d.notifications.toArray(),
          ]);
          set({ tasks, events, sessions, habits, notes, cards, captures, notifications: notifications.sort((a, b) => (a.created_at < b.created_at ? 1 : -1)), ready: true });
        },
        setProfile: (p) => set((s) => ({ profile: { ...s.profile, ...p } })),
        setSettings: (p) => set((s) => ({ settings: { ...s.settings, ...p } })),
        toast: (text, tone = "ok") => {
          const id = nonce();
          set((s) => ({ toasts: [...s.toasts.slice(-3), { id, text, tone }] }));
          setTimeout(() => get().dismissToast(id), tone === "alarm" ? 7000 : 2800);
        },
        dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
        setPalette: (o) => set({ paletteOpen: o }),

        addTask: (t) => {
          const row: Task = {
            id: uid(), user_id: uidNow(), category: "Pessoal", completed: false, priority: "medium", alarm: false, alarm_lead_min: get().settings.leadMin,
            position: Date.now(), updated_at: nowIso(), ...t,
          };
          set((s) => ({ tasks: [...s.tasks, row] }));
          void put("tasks", row);
          return row;
        },
        updateTask: (id, p) => {
          let next: Task | undefined;
          set((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? (next = { ...t, ...p, updated_at: nowIso() }) : t)) }));
          if (next) void put("tasks", next);
        },
        toggleTask: (id) => {
          const t = get().tasks.find((x) => x.id === id);
          if (!t) return;
          get().updateTask(id, { completed: !t.completed, completed_at: !t.completed ? nowIso() : undefined });
        },
        deleteTask: (id) => { set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) })); void del("tasks", id); },
        addEvent: (e) => {
          const row: CalendarEvent = { id: uid(), user_id: uidNow(), area: "Pessoal", alarm: false, alarm_lead_min: get().settings.leadMin, kind: "event", updated_at: nowIso(), ...e };
          set((s) => ({ events: [...s.events, row] }));
          void put("events", row);
          return row;
        },
        updateEvent: (id, p) => {
          let next: CalendarEvent | undefined;
          set((s) => ({ events: s.events.map((e) => (e.id === id ? (next = { ...e, ...p, updated_at: nowIso() }) : e)) }));
          if (next) void put("events", next);
        },
        deleteEvent: (id) => { set((s) => ({ events: s.events.filter((e) => e.id !== id) })); void del("events", id); },
        setHabit: (habit, value, date = todayStr()) => {
          const row: HabitLog = { id: `${date}:${habit}`, user_id: uidNow(), date, habit, value, updated_at: nowIso() };
          set((s) => ({ habits: [...s.habits.filter((h) => h.id !== row.id), row] }));
          void put("habits", row);
        },
        addSession: (minutes, preset, title) => {
          const row: FocusSession = { id: uid(), user_id: uidNow(), duration_minutes: minutes, completed_at: nowIso(), binaural_preset: preset, task_title: title, updated_at: nowIso() };
          set((s) => ({ sessions: [...s.sessions, row] }));
          void put("sessions", row);
        },
        addCapture: (text) => {
          const row: Capture = { id: uid(), user_id: uidNow(), text, created_at: nowIso(), updated_at: nowIso() };
          set((s) => ({ captures: [row, ...s.captures] }));
          void put("captures", row);
        },
        deleteCapture: (id) => { set((s) => ({ captures: s.captures.filter((c) => c.id !== id) })); void del("captures", id); },
        addNote: (n) => {
          const row: Note = { id: uid(), user_id: uidNow(), title: "Nova nota", body: "# Nova nota\n\n", space: "Segundo Cérebro", tags: [], updated_at: nowIso(), ...n };
          set((s) => ({ notes: [row, ...s.notes] }));
          void put("notes", row);
          return row;
        },
        updateNote: (id, p) => {
          let next: Note | undefined;
          set((s) => ({ notes: s.notes.map((n) => (n.id === id ? (next = { ...n, ...p, updated_at: nowIso() }) : n)) }));
          if (next) void put("notes", next);
        },
        deleteNote: (id) => { set((s) => ({ notes: s.notes.filter((n) => n.id !== id) })); void del("notes", id); },
        addCard: (c) => {
          const row: KanbanCard = { id: uid(), user_id: uidNow(), tag: "Geral", column: "todo", priority: "medium", position: Date.now(), updated_at: nowIso(), ...c };
          set((s) => ({ cards: [...s.cards, row] }));
          void put("cards", row);
        },
        moveCard: (id, column) => {
          let next: KanbanCard | undefined;
          set((s) => ({ cards: s.cards.map((c) => (c.id === id ? (next = { ...c, column, position: Date.now(), updated_at: nowIso() }) : c)) }));
          if (next) void put("cards", next);
        },
        deleteCard: (id) => { set((s) => ({ cards: s.cards.filter((c) => c.id !== id) })); void del("cards", id); },
        notify: (n) => {
          const row: NotificationItem = { id: uid(), user_id: uidNow(), created_at: nowIso(), read: false, updated_at: nowIso(), ...n };
          set((s) => ({ notifications: [row, ...s.notifications] }));
          void put("notifications", row);
        },
        updateNotification: (id, p) => {
          let next: NotificationItem | undefined;
          set((s) => ({ notifications: s.notifications.map((n) => (n.id === id ? (next = { ...n, ...p, updated_at: nowIso() }) : n)) }));
          if (next) void put("notifications", next);
        },
        markAllRead: () => {
          const upd = get().notifications.map((n) => (n.read ? n : { ...n, read: true, updated_at: nowIso() }));
          set({ notifications: upd });
          upd.forEach((n) => void put("notifications", n));
        },
        clearOld: () => {
          const cut = Date.now() - 7 * 86400000;
          const old = get().notifications.filter((n) => new Date(n.created_at).getTime() < cut);
          set((s) => ({ notifications: s.notifications.filter((n) => new Date(n.created_at).getTime() >= cut) }));
          old.forEach((n) => void del("notifications", n.id));
        },
        applyChanges: (changes) => {
          const before = get().events;
          const after = applyToEvents(before, changes, uidNow());
          set({ events: after });
          const ids = new Set(before.map((e) => e.id));
          after.forEach((e) => {
            const prev = before.find((b) => b.id === e.id);
            if (!ids.has(e.id) || (prev && prev.updated_at !== e.updated_at)) void put("events", e);
          });
        },
        finishOnboarding: async (persona, peak, timbre, lead, loadDemo) => {
          const s = get();
          set({ settings: { ...s.settings, persona, timbre, leadMin: lead, onboarded: true }, profile: { ...s.profile, circadian_peak_start: peak.start, circadian_peak_end: peak.end } });
          const seed = starterData(uidNow(), persona, peak.start);
          seed.events.forEach((e) => { e.alarm_lead_min = lead; e.timbre = timbre; });
          set((st) => ({ events: [...st.events, ...seed.events], tasks: [...st.tasks, ...seed.tasks], notes: [...st.notes, ...seed.notes] }));
          await Promise.all([...seed.events.map((e) => put("events", e)), ...seed.tasks.map((t) => put("tasks", t)), ...seed.notes.map((n) => put("notes", n))]);
          if (loadDemo) await get().loadDemo();
        },
        loadDemo: async () => {
          const d = demoData(uidNow());
          set((s) => ({
            events: [...s.events, ...d.events], tasks: [...s.tasks, ...d.tasks], sessions: [...s.sessions, ...d.sessions],
            habits: [...s.habits.filter((h) => !d.habits.some((x) => x.id === h.id)), ...d.habits], cards: [...s.cards, ...d.cards], notes: [...s.notes, ...d.notes],
            notifications: [...d.notifications, ...s.notifications],
          }));
          const x = db();
          await Promise.all([x.events.bulkPut(d.events), x.tasks.bulkPut(d.tasks), x.sessions.bulkPut(d.sessions), x.habits.bulkPut(d.habits), x.cards.bulkPut(d.cards), x.notes.bulkPut(d.notes), x.notifications.bulkPut(d.notifications)]);
        },
        clearAll: async () => {
          const x = db();
          await Promise.all(TABLES.map((t) => (x[t] as unknown as import("dexie").Table).clear()));
          set({ tasks: [], events: [], sessions: [], habits: [], notes: [], cards: [], captures: [], notifications: [], tombstones: [] });
        },
        exportJson: async () => {
          const x = db();
          const out: Record<string, unknown> = { exported_at: nowIso(), profile: get().profile, settings: get().settings };
          for (const t of TABLES) out[t] = await (x[t] as unknown as import("dexie").Table).toArray();
          return JSON.stringify(out, null, 2);
        },

        // Motor de alarmes: roda a cada 10 s enquanto o app está aberto (e o Service Worker mantém notificações do sistema).
        tick: () => {
          const s = get();
          const T = todayStr();
          const nm = nowMin();
          const fire = (key: string, title: string, body: string, timbre: Timbre | undefined, high: boolean, href: string) => {
            const tb = timbre ?? s.settings.timbre;
            s.toast(`${title} · ${body}`, "alarm");
            if (s.settings.sound) playTimbre(tb, s.settings.volume / 100);
            if (s.settings.haptics && typeof navigator !== "undefined" && "vibrate" in navigator && navigator.userActivation?.hasBeenActive) navigator.vibrate?.(high ? [200, 100, 200, 100, 400] : [150]);
            void notifyOS(title, body);
            s.notify({ kind: "alarm", title: `Alarme: ${title}`, body, priority: high ? "high" : "normal", action: { type: "open", href, label: "Ver na agenda" } });
            if (s.settings.repeatUntilOff) set({ ringing: { key, title, timbre: tb } });
          };
          const quiet = s.settings.quietNight && (nm >= 22 * 60 || nm < 7 * 60);
          // eventos
          s.events.forEach((e) => {
            if (!e.alarm || e.alarm_fired || e.date !== T) return;
            const trig = e.snooze_until ? toMin(e.snooze_until) : toMin(e.start_time) - (e.alarm_lead_min ?? 0);
            if (nm < trig) return;
            s.updateEvent(e.id, { alarm_fired: true, snooze_until: undefined });
            if (nm - trig > 120) return; // evento antigo: não dispara ao abrir o app
            if (quiet && e.kind !== "focus") return;
            fire(`event:${e.id}`, e.title, `Começa às ${e.start_time}`, e.timbre, false, "/agenda");
          });
          // tarefas
          s.tasks.forEach((t) => {
            if (!t.alarm || t.completed || t.due_date !== T || !t.due_time) return;
            const trig = t.snooze_until ? toMin(t.snooze_until) : toMin(t.due_time) - (t.alarm_lead_min ?? 0);
            if (!t.alarm_fired) {
              if (nm < trig) return;
              s.updateTask(t.id, { alarm_fired: true, snooze_until: undefined });
              if (nm - trig > 120) return;
              if (quiet && t.priority !== "high") return;
              fire(`task:${t.id}`, t.title, `Prazo às ${t.due_time}`, t.timbre ?? (t.priority === "high" ? "urgent_alarm" : undefined), t.priority === "high", "/");
            } else if (s.settings.overdueAlerts && nm > toMin(t.due_time) + 1 && nm - toMin(t.due_time) < 240) {
              const last = lastRemind[t.id] ?? Date.now();
              if (!lastRemind[t.id]) lastRemind[t.id] = Date.now();
              if (Date.now() - last >= 15 * 60000) {
                lastRemind[t.id] = Date.now();
                s.toast(`Atrasada: ${t.title}`, "warn");
                if (s.settings.sound) playTimbre("electric_chime", s.settings.volume / 100);
              }
            }
          });
          // repetição até desligar
          if (s.ringing && s.settings.sound) playTimbre(s.ringing.timbre, s.settings.volume / 100);
        },
        stopRinging: () => set({ ringing: null }),
        snooze: (key, minutes) => {
          const [kind, id] = key.split(":");
          const at = fromMin(nowMin() + minutes);
          if (kind === "event") get().updateEvent(id, { alarm_fired: false, snooze_until: at });
          else get().updateTask(id, { alarm_fired: false, snooze_until: at });
          set({ ringing: null });
          get().toast(`Adiado em ${minutes} min`);
        },
        setUserId: (id) => set({ userId: id }),
        sync: async () => {
          const s = get();
          if (!s.userId || s.syncing || !supabase()) return;
          set({ syncing: true });
          try {
            const r = await syncAll(s.userId, s.lastSync, s.tombstones);
            set({ lastSync: r.at, tombstones: [] });
            await get().hydrate();
            get().toast(`Sincronizado · ${r.pushed} enviados, ${r.pulled} recebidos`);
          } catch (e) {
            get().toast("Falha ao sincronizar. Verifique a conexão e o esquema do Supabase.", "warn");
            console.error(e);
          } finally { set({ syncing: false }); }
        },
      };
    },
    {
      name: "nexora.app",
      partialize: (s) => ({ profile: s.profile, settings: s.settings, tombstones: s.tombstones, lastSync: s.lastSync }),
    },
  ),
);

export { ymd, addDays };
export type { Category };
