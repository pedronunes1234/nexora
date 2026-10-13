export type Category = "Trabalho" | "Estudos" | "Saúde" | "Pessoal";
export type Priority = "low" | "medium" | "high";
export type Timbre = "nexora_pulse" | "electric_chime" | "zen_gong" | "urgent_alarm";
export type BinauralPreset = "alpha_10hz" | "gamma_40hz" | "brown_noise";

export interface Profile {
  id: string;
  name: string;
  email?: string;
  bio?: string;
  avatar_url?: string;
  avatar_color?: string;
  circadian_peak_start: string; // "14:00"
  circadian_peak_end: string; // "18:00"
  hide_streaks: boolean;
}

export interface Task {
  id: string;
  user_id: string;
  title: string;
  note?: string;
  category: Category;
  due_date?: string; // YYYY-MM-DD
  due_time?: string; // HH:MM
  completed: boolean;
  completed_at?: string;
  priority: Priority;
  estimated_minutes?: number;
  alarm: boolean;
  alarm_lead_min: number;
  alarm_fired?: boolean;
  snooze_until?: string; // HH:MM
  timbre?: Timbre;
  position: number;
  updated_at: string;
}

export interface CalendarEvent {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  date: string; // YYYY-MM-DD
  start_time: string; // HH:MM
  end_time: string; // HH:MM
  area: Category;
  meet_url?: string;
  kind?: "event" | "focus" | "break";
  dnd?: boolean;
  alarm: boolean;
  alarm_lead_min: number;
  alarm_fired?: boolean;
  snooze_until?: string; // HH:MM
  timbre?: Timbre;
  updated_at: string;
}

export interface FocusSession {
  id: string;
  user_id: string;
  duration_minutes: number;
  completed_at: string;
  binaural_preset?: BinauralPreset;
  task_title?: string;
  updated_at: string;
}

export interface HabitLog {
  id: string; // `${date}:${habit}`
  user_id: string;
  date: string;
  habit: "water" | "reading" | "workout" | "mind";
  value: number;
  updated_at: string;
}

export interface Note {
  id: string;
  user_id: string;
  title: string;
  body: string; // markdown
  space: string;
  tags: string[];
  pinned?: boolean;
  updated_at: string;
}

export interface KanbanCard {
  id: string;
  user_id: string;
  title: string;
  tag: string;
  column: "todo" | "doing" | "done";
  priority: Priority;
  position: number;
  updated_at: string;
}

export interface Capture {
  id: string;
  user_id: string;
  text: string;
  created_at: string;
  updated_at: string;
}

export interface NotificationItem {
  id: string;
  user_id: string;
  kind: "alarm" | "copilot" | "habit" | "system" | "focus";
  title: string;
  body: string;
  created_at: string;
  read: boolean;
  dismissed?: boolean;
  priority?: "high" | "normal";
  action?: { type: "open"; href: string; label: string } | { type: "accept_reschedule"; label: string };
  updated_at: string;
}
