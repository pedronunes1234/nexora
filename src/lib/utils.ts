export const pad = (n: number) => (n < 10 ? "0" : "") + n;
export const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const parseYmd = (s: string) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
};
export const addDays = (d: Date, n: number) => {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() + n);
  return x;
};
export const todayStr = () => ymd(new Date());
export const uid = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36));
export const nowIso = () => new Date().toISOString();
export const toMin = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + (m || 0);
};
export const fromMin = (m: number) => {
  const x = ((m % 1440) + 1440) % 1440;
  return `${pad(Math.floor(x / 60))}:${pad(x % 60)}`;
};
export const nowMin = () => {
  const n = new Date();
  return n.getHours() * 60 + n.getMinutes();
};
export const durMin = (a: string, b: string) => Math.max(0, toMin(b) - toMin(a));
export const fmtDur = (m: number) => (m >= 60 ? `${Math.floor(m / 60)}h${m % 60 ? ` ${pad(m % 60)}m` : ""}` : `${m} min`);
export const fmtFocus = (sec: number) => {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return h ? `${h}h ${pad(m)}m` : `${m}m`;
};
export const fmtClock = (s: number) => `${pad(Math.floor(s / 60))}:${pad(s % 60)}`;

const WDS = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
const WDL = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
const MON = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
export const wdShort = (d: Date) => WDS[d.getDay()];
export const wdLong = (d: Date) => WDL[d.getDay()];
export function dateLabel(s: string) {
  if (s === todayStr()) return "Hoje";
  if (s === ymd(addDays(new Date(), 1))) return "Amanhã";
  if (s === ymd(addDays(new Date(), -1))) return "Ontem";
  const d = parseYmd(s);
  return `${WDS[d.getDay()]}, ${d.getDate()} ${MON[d.getMonth()]}`;
}
export function longDate(d = new Date()) {
  return d.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });
}
export function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite";
}
export function relTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.round(diff / 60000);
  if (m < 1) return "agora";
  if (m < 60) return `há ${m} min`;
  const h = Math.round(m / 60);
  if (h < 24) return `há ${h}h`;
  return `há ${Math.round(h / 24)} d`;
}
export const cn = (...a: (string | false | null | undefined)[]) => a.filter(Boolean).join(" ");

export const CATEGORY_STYLE: Record<string, { text: string; bg: string; bar: string; dot: string }> = {
  Trabalho: { text: "text-primary-soft", bg: "bg-primary/15", bar: "bg-primary", dot: "bg-primary" },
  Estudos: { text: "text-emerald-soft", bg: "bg-emerald/15", bar: "bg-emerald", dot: "bg-emerald" },
  Saúde: { text: "text-sky-300", bg: "bg-sky-400/15", bar: "bg-sky-400", dot: "bg-sky-400" },
  Pessoal: { text: "text-amber", bg: "bg-amber/15", bar: "bg-amber", dot: "bg-amber" },
};
export const catStyle = (c: string) => CATEGORY_STYLE[c] ?? CATEGORY_STYLE.Pessoal;
