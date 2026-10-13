import type { CalendarEvent, FocusSession, HabitLog, Task } from "@/types/database";
import { addDays, parseYmd, todayStr, ymd } from "./utils";

export const tasksOn = (tasks: Task[], date: string) => tasks.filter((t) => t.due_date === date);
export const eventsOn = (events: CalendarEvent[], date: string) => events.filter((e) => e.date === date).sort((a, b) => (a.start_time < b.start_time ? -1 : 1));

export function focusSecByDate(sessions: FocusSession[]) {
  const m: Record<string, number> = {};
  sessions.forEach((s) => {
    const d = ymd(new Date(s.completed_at));
    m[d] = (m[d] ?? 0) + s.duration_minutes * 60;
  });
  return m;
}

export const habitValue = (habits: HabitLog[], habit: HabitLog["habit"], date = todayStr()) => habits.find((h) => h.id === `${date}:${habit}`)?.value ?? 0;
export const HABIT_GOAL = { water: 2500, reading: 20, workout: 1, mind: 10 } as const;
export const habitDone = (habits: HabitLog[], habit: HabitLog["habit"], date = todayStr()) => habitValue(habits, habit, date) >= HABIT_GOAL[habit];

export function activeDates(tasks: Task[], sessions: FocusSession[], habits: HabitLog[]) {
  const set = new Set<string>();
  tasks.forEach((t) => t.completed && t.completed_at && set.add(ymd(new Date(t.completed_at))));
  sessions.forEach((s) => set.add(ymd(new Date(s.completed_at))));
  habits.forEach((h) => h.value > 0 && set.add(h.date));
  return set;
}
export function streak(dates: Set<string>) {
  let d = new Date();
  if (!dates.has(ymd(d))) d = addDays(d, -1);
  let n = 0;
  while (dates.has(ymd(d))) { n++; d = addDays(d, -1); }
  return n;
}

export function dayStats(tasks: Task[], sessions: FocusSession[], goalMin: number, date = todayStr()) {
  const list = tasksOn(tasks, date);
  const done = list.filter((t) => t.completed).length;
  const focus = focusSecByDate(sessions)[date] ?? 0;
  const tp = list.length ? done / list.length : 0;
  const pct = Math.round(Math.min(1, tp) * 40 + Math.min(1, focus / (goalMin * 60)) * 60);
  return { total: list.length, done, focus, pct };
}

export function weekDays(from = new Date()) {
  const dow = (from.getDay() + 6) % 7; // segunda = 0
  const start = addDays(from, -dow);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}
export { parseYmd };
