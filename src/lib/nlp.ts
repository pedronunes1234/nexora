import type { Category, Priority } from "@/types/database";
import { addDays, fromMin, pad, toMin, todayStr, ymd } from "./utils";

export interface ParsedCommand {
  title: string;
  category: Category;
  date: string;
  time: string;
  alarm: boolean;
  priority: Priority;
  kind: "task" | "event";
  endTime?: string;
  hasDate: boolean;
}

const EVENT_RE = /reuni[ãa]o|consulta|aula|call|encontro|evento|entrevista|palestra|sess[ãa]o|alinhamento|retrospectiva|apresenta[çc][ãa]o/i;
const CATS: Category[] = ["Trabalho", "Estudos", "Saúde", "Pessoal"];
const strip = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export function guessCategory(s: string): Category {
  if (/estud|biolog|prova|aula|leitura|faculdade|curso|mat[ée]ria|flashcard|revis[ãa]o de/i.test(s)) return "Estudos";
  if (/reuni|trabalho|projeto|cliente|api|sprint|deploy|relat[óo]rio|time\b|equipe|release|alinhamento/i.test(s)) return "Trabalho";
  if (/academia|treino|muscula|corrida|m[ée]dic|consulta|exame|[áa]gua|dieta|sono|medita|cardio/i.test(s)) return "Saúde";
  return "Pessoal";
}

/** Interpreta comandos como "Estudar biologia amanhã às 19h com lembrete #Estudos". */
export function parseCommand(raw: string, now = new Date()): ParsedCommand {
  let s = ` ${raw} `;
  const r: ParsedCommand = { title: "", category: "Pessoal", date: ymd(now), time: "", alarm: false, priority: "medium", kind: "task", hasDate: false };
  let m: RegExpMatchArray | null;
  let cat: Category | null = null;

  m = s.match(/#([\p{L}\d_]+)/u);
  if (m) {
    const tag = strip(m[1]);
    cat = CATS.find((c) => strip(c) === tag) ?? null;
    s = s.replace(m[0], " ");
  }
  const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (/depois de amanh[ãa]/i.test(s)) {
    r.date = ymd(addDays(now, 2)); r.hasDate = true; s = s.replace(/depois de amanh[ãa]/i, " ");
  } else if (/amanh[ãa]/i.test(s)) {
    r.date = ymd(addDays(now, 1)); r.hasDate = true; s = s.replace(/amanh[ãa]/i, " ");
  } else if (/\bhoje\b/i.test(s)) {
    r.hasDate = true; s = s.replace(/\bhoje\b/i, " ");
  } else if ((m = s.match(/(segunda|ter[çc]a|quarta|quinta|sexta|s[áa]bado|domingo)(-feira)?(?![\p{L}])/iu))) {
    const idx: Record<string, number> = { domingo: 0, segunda: 1, terca: 2, quarta: 3, quinta: 4, sexta: 5, sabado: 6 };
    const diff = (idx[strip(m[1])] - now.getDay() + 7) % 7;
    r.date = ymd(addDays(now, diff)); r.hasDate = true; s = s.replace(m[0], " ");
  } else if ((m = s.match(/\bdia\s+(\d{1,2})\b(?!\s*\/)/i))) {
    const dn = +m[1];
    let d = new Date(now.getFullYear(), now.getMonth(), dn);
    if (d < midnight) d = new Date(now.getFullYear(), now.getMonth() + 1, dn);
    r.date = ymd(d); r.hasDate = true; s = s.replace(m[0], " ");
  } else if ((m = s.match(/\b(\d{1,2})\/(\d{1,2})\b/))) {
    let d = new Date(now.getFullYear(), +m[2] - 1, +m[1]);
    if (d < midnight) d = new Date(now.getFullYear() + 1, +m[2] - 1, +m[1]);
    r.date = ymd(d); r.hasDate = true; s = s.replace(m[0], " ");
  }

  let hh: number | null = null;
  let mm = 0;
  m = s.match(/(?:^|\s)(?:[àa]s?\s+)?(\d{1,2})\s*(?:h|:)\s*(\d{2})?(?=\s|$|[.,])/i);
  if (m) { hh = +m[1]; mm = m[2] ? +m[2] : 0; s = s.replace(m[0], " "); }
  else if ((m = s.match(/(?:^|\s)[àa]s\s+(\d{1,2})(?=\s|$|[.,])/i))) { hh = +m[1]; s = s.replace(m[0], " "); }
  if (hh !== null) {
    const p = s.match(/da\s+(manh[ãa]|tarde|noite)/i);
    if (p) { if (/tarde|noite/i.test(p[1]) && hh < 12) hh += 12; s = s.replace(p[0], " "); }
    if (hh < 24 && mm < 60) r.time = `${pad(hh)}:${pad(mm)}`;
  }
  if ((m = s.match(/(?:com\s+|e\s+)?(?:lembrete|alarme|aviso|notifica[çc][ãa]o)/i))) { r.alarm = true; s = s.replace(m[0], " "); }
  if ((m = s.match(/me\s+(?:lembre|avise)(?:\s+de)?|lembrar\s+de/i))) { r.alarm = true; s = s.replace(m[0], " "); }
  if ((m = s.match(/baixa prioridade/i))) { r.priority = "low"; s = s.replace(m[0], " "); }
  else if ((m = s.match(/alta prioridade|urgente|importante/i))) { r.priority = "high"; s = s.replace(m[0], " "); }

  let title = s.replace(/\s+/g, " ").trim();
  for (let i = 0; i < 3; i++) title = title.replace(/\s+(com|para|às|as|e|de|em|a|no|na)$/i, "").replace(/^(com|e)\s+/i, "");
  r.title = title.replace(/^./, (c) => c.toUpperCase());
  r.kind = EVENT_RE.test(raw) ? "event" : "task";
  r.category = cat ?? guessCategory(raw);
  if (r.kind === "event" && r.time) r.endTime = fromMin(toMin(r.time) + 60);
  return r;
}

export { todayStr };
