import Dexie, { type Table } from "dexie";
import type { CalendarEvent, Capture, FocusSession, HabitLog, KanbanCard, Note, NotificationItem, Task } from "@/types/database";

// Banco local (IndexedDB): o app funciona 100% offline; o Supabase é opcional e sincroniza em segundo plano.
class NexoraDB extends Dexie {
  tasks!: Table<Task, string>;
  events!: Table<CalendarEvent, string>;
  sessions!: Table<FocusSession, string>;
  habits!: Table<HabitLog, string>;
  notes!: Table<Note, string>;
  cards!: Table<KanbanCard, string>;
  captures!: Table<Capture, string>;
  notifications!: Table<NotificationItem, string>;

  constructor() {
    super("nexora");
    this.version(1).stores({
      tasks: "id, due_date, completed, updated_at",
      events: "id, date, updated_at",
      sessions: "id, completed_at, updated_at",
      habits: "id, date, habit, updated_at",
      notes: "id, updated_at",
      cards: "id, column, updated_at",
      captures: "id, created_at, updated_at",
      notifications: "id, created_at, updated_at",
    });
  }
}

let _db: NexoraDB | null = null;
export function db() {
  if (typeof window === "undefined") throw new Error("Dexie só roda no navegador");
  return (_db ??= new NexoraDB());
}
export type TableName = "tasks" | "events" | "sessions" | "habits" | "notes" | "cards" | "captures" | "notifications";
export const TABLES: TableName[] = ["tasks", "events", "sessions", "habits", "notes", "cards", "captures", "notifications"];
