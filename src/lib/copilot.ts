import type { CalendarEvent, Category, Task } from "@/types/database";
import { addDays, durMin, fmtDur, fromMin, nowMin, pad, toMin, uid, ymd } from "./utils";
import { parseCommand } from "./nlp";

export interface Slot { date: string; start: string; end: string }
export interface PlanChange {
  id: string;
  kind: "move" | "create";
  refId?: string;
  title: string;
  category: Category;
  from?: Slot;
  to: Slot;
  durationMin: number;
  focus?: boolean;
  dnd?: boolean;
}
export interface Proposal {
  message: string;
  changes: PlanChange[];
  conflicts: number;
  source: "claude" | "local";
}

const overlaps = (a: Slot, b: Slot) => a.date === b.date && toMin(a.start) < toMin(b.end) && toMin(b.start) < toMin(a.end);

/** Procura o primeiro horário livre a partir de `start`, empurrando em passos de 15 min. */
export function findFreeSlot(busy: Slot[], date: string, start: number, dur: number): Slot {
  let s = start;
  for (let i = 0; i < 96; i++) {
    const cand: Slot = { date, start: fromMin(s), end: fromMin(s + dur) };
    if (s + dur <= 1440 && !busy.some((b) => overlaps(cand, b))) return cand;
    s += 15;
  }
  return { date, start: fromMin(start), end: fromMin(start + dur) };
}

export function countConflicts(events: CalendarEvent[]) {
  let n = 0;
  const list = [...events].sort((a, b) => (a.date + a.start_time < b.date + b.start_time ? -1 : 1));
  for (let i = 0; i < list.length; i++)
    for (let j = i + 1; j < list.length; j++) {
      if (list[j].date !== list[i].date) break;
      if (overlaps({ date: list[i].date, start: list[i].start_time, end: list[i].end_time }, { date: list[j].date, start: list[j].start_time, end: list[j].end_time })) n++;
    }
  return n;
}

export function applyToEvents(events: CalendarEvent[], changes: PlanChange[], userId: string): CalendarEvent[] {
  const out = events.map((e) => ({ ...e }));
  for (const ch of changes) {
    if (ch.kind === "move" && ch.refId) {
      const e = out.find((x) => x.id === ch.refId);
      if (e) { e.date = ch.to.date; e.start_time = ch.to.start; e.end_time = ch.to.end; e.alarm_fired = false; e.updated_at = new Date().toISOString(); }
    } else if (ch.kind === "create") {
      out.push({
        id: uid(), user_id: userId, title: ch.title, date: ch.to.date, start_time: ch.to.start, end_time: ch.to.end,
        area: ch.category, kind: ch.focus ? "focus" : "event", dnd: ch.dnd, alarm: true, alarm_lead_min: 5, updated_at: new Date().toISOString(),
      });
    }
  }
  return out;
}

const DUR_RE = /(\d+(?:[.,]\d+)?)\s*(h|horas?|min|minutos?)\b/i;

/** Interpretador local de pedidos de reprogramação (usado quando não há chave da Anthropic). */
export function localCopilot(text: string, events: CalendarEvent[], _tasks: Task[], now = new Date()): Proposal {
  const t = text.toLowerCase();
  const today = ymd(now);
  const changes: PlanChange[] = [];
  const movedIds = new Set<string>();
  const notes: string[] = [];

  // 1) Adiar/mover compromissos
  if (/adi(e|ar|a|ado)|empurr|remarc|mov(a|er)|transfir/.test(t)) {
    const part = /(?<![a-z])manh[ãa]/.test(t) ? "manha" : /tarde/.test(t) ? "tarde" : /noite/.test(t) ? "noite" : "resto";
    const parsed = parseCommand(text, now);
    const destDate = /depois de amanh[ãa]/.test(t) ? ymd(addDays(now, 2)) : parsed.hasDate && parsed.date !== today ? parsed.date : ymd(addDays(now, 1));
    const after = text.match(/ap[óo]s\s+(?:as|às)?\s*(\d{1,2})\s*(?:h|:)?\s*(\d{2})?/i);
    const afterMin = after ? +after[1] * 60 + (after[2] ? +after[2] : 0) : null;
    const nm = nowMin();
    const targets = events
      .filter((e) => e.date === today && e.kind !== "focus" && e.kind !== "break")
      .filter((e) => {
        const s = toMin(e.start_time);
        if (part === "manha") return s < 12 * 60;
        if (part === "tarde") return s >= 12 * 60 && s < 18 * 60;
        if (part === "noite") return s >= 18 * 60;
        return s >= nm;
      })
      .sort((a, b) => toMin(a.start_time) - toMin(b.start_time));
    const busy: Slot[] = events.filter((e) => e.date === destDate).map((e) => ({ date: e.date, start: e.start_time, end: e.end_time }));
    let cursor = afterMin !== null ? afterMin + 30 : null;
    for (const e of targets) {
      const dur = durMin(e.start_time, e.end_time) || 30;
      const startAt = cursor ?? toMin(e.start_time);
      const slot = findFreeSlot(busy, destDate, startAt, dur);
      busy.push(slot);
      cursor = toMin(slot.end) + 15;
      movedIds.add(e.id);
      changes.push({ id: uid(), kind: "move", refId: e.id, title: e.title, category: e.area, from: { date: e.date, start: e.start_time, end: e.end_time }, to: slot, durationMin: dur });
    }
    if (!targets.length) notes.push("Não encontrei compromissos de hoje nesse período para adiar.");
  }

  // 2) Reservar bloco de foco/estudo (analisa só a oração que começa no verbo, para não confundir com o "amanhã" do adiamento)
  const verb = t.search(/reserv|bloque|agend|marc(a|ar)|cri(e|ar)/);
  if (verb >= 0 && /foco|estud|leitura|ler\b|revis|treino|deep|trabalho profundo/.test(t.slice(verb))) {
    const clause = text.slice(verb).replace(/ap[óo]s\s+(?:as|às)?\s*\d{1,2}\s*(?:h|:)?\s*\d{0,2}/i, " ");
    const ct = clause.toLowerCase();
    const d = clause.match(DUR_RE);
    let dur = 60;
    if (d) { const v = parseFloat(d[1].replace(",", ".")); dur = /^h/i.test(d[2]) ? Math.round(v * 60) : Math.round(v); }
    const parsed = parseCommand(clause.replace(DUR_RE, " "), now);
    const day = /amanh[ãa]/.test(ct) ? ymd(addDays(now, 1)) : today;
    let start: number;
    if (parsed.time && /(?:^|\s)(?:[àa]s?\s+)?\d{1,2}\s*(?:h|:)/i.test(clause.replace(DUR_RE, " "))) start = toMin(parsed.time);
    else start = Math.ceil((nowMin() + 1) / 15) * 15;
    const busy: Slot[] = events.filter((e) => !movedIds.has(e.id) && e.date === day).map((e) => ({ date: e.date, start: e.start_time, end: e.end_time }));
    const slot = findFreeSlot(busy, day, start, dur);
    const cat: Category = /estud|leitura|revis/.test(ct) ? "Estudos" : /treino/.test(ct) ? "Saúde" : "Trabalho";
    const label = /estud/.test(ct) ? "Foco Profundo: Estudo" : /treino/.test(ct) ? "Treino" : "Foco Profundo";
    changes.push({ id: uid(), kind: "create", title: label, category: cat, to: slot, durationMin: dur, focus: true, dnd: true });
    if (slot.start !== fromMin(start)) notes.push(`Ajustei o bloco para ${slot.start} porque o horário pedido estava ocupado.`);
  }

  if (!changes.length) {
    return {
      source: "local", conflicts: 0, changes: [],
      message: notes[0] ?? 'Posso adiar compromissos e reservar blocos de foco. Tente: "Adie as reuniões da tarde para amanhã após as 14h e bloqueie 2h de estudo agora".',
    };
  }
  const after = applyToEvents(events, changes, "tmp");
  const moved = changes.filter((c) => c.kind === "move").length;
  const created = changes.filter((c) => c.kind === "create");
  const parts: string[] = [];
  if (moved) parts.push(`${moved} compromisso${moved > 1 ? "s" : ""} reprogramado${moved > 1 ? "s" : ""}`);
  if (created.length) parts.push(`${created.length} bloco de foco de ${fmtDur(created[0].durationMin)} reservado`);
  return {
    source: "local",
    conflicts: countConflicts(after),
    changes,
    message: `Entendido! Analisei sua grade horária e estruturei a otimização ideal: ${parts.join(" e ")}.${notes.length ? " " + notes.join(" ") : ""}`,
  };
}

export const SLOT_LABEL = (s: Slot) => {
  const t = ymd(new Date());
  const tm = ymd(addDays(new Date(), 1));
  const d = s.date === t ? "Hoje" : s.date === tm ? "Amanhã" : s.date.slice(8) + "/" + s.date.slice(5, 7);
  return `${d}, ${s.start}`;
};
export { pad };
