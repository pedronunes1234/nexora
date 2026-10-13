"use client";
import { ChevronLeft, ChevronRight, Plus, Sparkles } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { EventCard, TaskRow } from "@/components/Cards";
import { Empty, PageHeader } from "@/components/ui";
import { eventsOn, tasksOn } from "@/lib/derive";
import { addDays, catStyle, cn, dateLabel, fromMin, nowMin, parseYmd, toMin, todayStr, wdShort, ymd, durMin } from "@/lib/utils";
import { useApp } from "@/store/app";
import { useUI } from "@/store/ui";
import type { Category } from "@/types/database";

type View = "dia" | "semana" | "mes" | "linha";
const VIEWS: { id: View; label: string }[] = [{ id: "dia", label: "Dia" }, { id: "semana", label: "Semana" }, { id: "mes", label: "Mês" }, { id: "linha", label: "Linha do Tempo" }];
const CATS: Category[] = ["Trabalho", "Estudos", "Saúde", "Pessoal"];

export default function Agenda() {
  const events = useApp((s) => s.events);
  const tasks = useApp((s) => s.tasks);
  const openAdd = useUI((s) => s.openAdd);
  const [view, setView] = useState<View>("dia");
  const [day, setDay] = useState(todayStr());
  const [filter, setFilter] = useState<Category | null>(null);
  const T = todayStr();

  const fe = (d: string) => eventsOn(events, d).filter((e) => !filter || e.area === filter);
  const ft = (d: string) => tasksOn(tasks, d).filter((t) => !filter || t.category === filter);
  const total = events.length + tasks.filter((t) => t.due_date).length;

  const sel = parseYmd(day);
  const dow = (sel.getDay() + 6) % 7;
  const weekStart = addDays(sel, -dow);
  const week = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const shift = (n: number) => setDay(ymd(addDays(sel, view === "mes" ? n * 30 : view === "dia" ? n : n * 7)));

  return (
    <div className="flex flex-col gap-5">
      <PageHeader eyebrow={sel.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })} title="Agenda Inteligente"
        right={<button className="btn-primary hidden sm:inline-flex" onClick={() => openAdd(day)}><Plus size={16} />Novo bloco</button>} />

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex rounded-lg border border-stroke bg-surface-1 p-1" role="tablist" aria-label="Visualização">
          {VIEWS.map((v) => (
            <button key={v.id} role="tab" aria-selected={view === v.id} onClick={() => setView(v.id)} className={cn("h-8 rounded-md px-3 text-sm font-semibold", view === v.id ? "bg-surface-3 text-white" : "text-ink-dim")}>{v.label}</button>
          ))}
        </div>
        <div className="ml-auto flex gap-1.5">
          <button className="btn-ghost btn-sm !px-2" onClick={() => shift(-1)} aria-label="Anterior"><ChevronLeft size={16} /></button>
          <button className="btn-ghost btn-sm" onClick={() => setDay(T)}>Hoje</button>
          <button className="btn-ghost btn-sm !px-2" onClick={() => shift(1)} aria-label="Próximo"><ChevronRight size={16} /></button>
        </div>
      </div>

      {view !== "mes" && view !== "linha" && (
        <div className="grid grid-cols-7 gap-1.5 rounded-xl border border-stroke bg-surface-1 p-2">
          {week.map((d) => {
            const k = ymd(d), n = fe(k).length + ft(k).length, on = k === day;
            return (
              <button key={k} onClick={() => setDay(k)} aria-pressed={on} className={cn("flex flex-col items-center gap-0.5 rounded-lg py-2 transition", on ? "bg-primary/20 ring-1 ring-primary/60" : "hover:bg-surface-2", k === T && !on && "ring-1 ring-stroke")}>
                <span className="text-[11px] text-ink-mute">{wdShort(d)}</span>
                <span className={cn("text-lg font-bold tabular", on && "text-primary-soft")}>{d.getDate()}</span>
                <span className="flex h-1.5 gap-0.5">{Array.from({ length: Math.min(3, n) }).map((_, i) => <i key={i} className={cn("h-1.5 w-1.5 rounded-full", i === 0 ? "bg-primary" : i === 1 ? "bg-emerald" : "bg-amber")} />)}</span>
              </button>
            );
          })}
        </div>
      )}

      <div className="flex gap-2 overflow-x-auto pb-1">
        <button onClick={() => setFilter(null)} className={cn("chip !px-3 !py-1.5 whitespace-nowrap", !filter && "!border-primary/60 !bg-primary/20 !text-primary-soft")}>Todos <span className="mono">{total}</span></button>
        {CATS.map((c) => (
          <button key={c} onClick={() => setFilter(filter === c ? null : c)} className={cn("chip !px-3 !py-1.5 whitespace-nowrap", filter === c && "!border-primary/60 !bg-primary/20 !text-white")}>
            <span className={cn("h-2 w-2 rounded-full", catStyle(c).dot)} />{c}
          </button>
        ))}
      </div>

      {view === "dia" && <DayView day={day} events={fe(day)} tasks={ft(day)} />}
      {view === "semana" && (
        <div className="grid gap-4 lg:grid-cols-7">
          {week.map((d) => {
            const k = ymd(d);
            return (
              <section key={k} className={cn("rounded-lg border p-3", k === T ? "border-primary/40 bg-primary/5" : "border-stroke bg-surface-1/60")}>
                <button onClick={() => { setDay(k); setView("dia"); }} className="mb-2 flex w-full items-baseline justify-between"><span className="text-sm font-bold capitalize">{dateLabel(k)}</span><span className="text-[11px] text-ink-mute">{fe(k).length + ft(k).length}</span></button>
                <div className="flex flex-col gap-2">
                  {fe(k).map((e) => <MiniEvent key={e.id} title={e.title} time={`${e.start_time}`} area={e.area} />)}
                  {ft(k).map((t) => <MiniEvent key={t.id} title={t.title} time={t.due_time ?? "•"} area={t.category} done={t.completed} />)}
                  {!fe(k).length && !ft(k).length && <div className="text-xs text-ink-mute">Livre</div>}
                </div>
              </section>
            );
          })}
        </div>
      )}
      {view === "mes" && <MonthView day={day} setDay={(d) => { setDay(d); setView("dia"); }} count={(k) => fe(k).length + ft(k).length} />}
      {view === "linha" && <TimelineView events={events.filter((e) => e.date >= T && (!filter || e.area === filter))} tasks={tasks.filter((t) => !t.completed && t.due_date && t.due_date >= T && (!filter || t.category === filter))} />}

      <Link href="/ia" className="card card-hover flex items-center gap-3 p-4">
        <span className="grid h-10 w-10 place-items-center rounded-lg bg-primary/15 text-primary-soft"><Sparkles size={18} /></span>
        <div className="min-w-0 flex-1"><div className="text-sm font-semibold">Otimização de Foco</div><div className="truncate text-xs text-ink-mute">Peça ao Copilot para reorganizar a agenda com 1 clique.</div></div>
        <ChevronRight size={18} className="text-ink-mute" />
      </Link>
    </div>
  );
}

function MiniEvent({ title, time, area, done }: { title: string; time: string; area: string; done?: boolean }) {
  const c = catStyle(area);
  return (
    <div className="relative overflow-hidden rounded-md bg-surface-2 py-1.5 pl-3 pr-2">
      <span className={cn("absolute left-0 top-0 bottom-0 w-[3px]", c.bar)} />
      <div className="mono text-[11px] text-ink-mute">{time}</div>
      <div className={cn("text-xs font-semibold leading-snug", done && "line-through text-ink-mute")}>{title}</div>
    </div>
  );
}

function DayView({ day, events, tasks }: { day: string; events: ReturnType<typeof eventsOn>; tasks: ReturnType<typeof tasksOn> }) {
  const openAdd = useUI((s) => s.openAdd);
  const isToday = day === todayStr();
  const nm = nowMin();
  const timed = tasks.filter((t) => t.due_time);
  const untimed = tasks.filter((t) => !t.due_time);
  type Row = { at: number; node: React.ReactNode; key: string };
  const rows: Row[] = [
    ...events.map((e) => ({ at: toMin(e.start_time), key: e.id, node: <EventCard ev={e} onDelete /> })),
    ...timed.map((t) => ({ at: toMin(t.due_time!), key: t.id, node: <TaskRow task={t} onDelete /> })),
  ].sort((a, b) => a.at - b.at);
  const out: React.ReactNode[] = [];
  let nowDone = !isToday;
  rows.forEach((r, i) => {
    if (!nowDone && r.at > nm) { out.push(<NowLine key="now" />); nowDone = true; }
    out.push(
      <div key={r.key} className="grid grid-cols-[48px_minmax(0,1fr)] items-start gap-3 sm:grid-cols-[60px_minmax(0,1fr)]">
        <div className="mono pt-3 text-sm font-semibold text-ink-dim">{fromMin(r.at)}</div>{r.node}
      </div>,
    );
    const next = rows[i + 1];
    const endAt = events.find((e) => e.id === r.key) ? toMin(events.find((e) => e.id === r.key)!.end_time) : r.at + 30;
    if (next && next.at - endAt >= 45) {
      out.push(
        <button key={`gap${i}`} onClick={() => openAdd(day)} className="grid grid-cols-[48px_minmax(0,1fr)] items-center gap-3 text-left sm:grid-cols-[60px_minmax(0,1fr)]">
          <span className="mono text-sm text-ink-mute">{fromMin(endAt)}</span>
          <span className="flex items-center gap-2 rounded-lg border border-dashed border-stroke px-3 py-2 text-xs text-ink-mute hover:border-primary/50 hover:text-ink-dim"><Plus size={14} />Toque para reservar horário livre<span className="ml-auto rounded bg-surface-3 px-2 py-0.5">Livre ({durMin(fromMin(endAt), fromMin(next.at)) >= 60 ? `${Math.floor((next.at - endAt) / 60)}h${(next.at - endAt) % 60 ? String((next.at - endAt) % 60).padStart(2, "0") : ""}` : `${next.at - endAt}m`})</span></span>
        </button>,
      );
    }
  });
  if (!nowDone) out.push(<NowLine key="now" />);
  return (
    <section className="flex flex-col gap-3">
      <div className="text-sm font-semibold capitalize text-ink-dim">{dateLabel(day)} · {parseYmd(day).toLocaleDateString("pt-BR", { day: "numeric", month: "long" })}</div>
      {out.length ? out : <Empty>Dia livre. Toque em “Novo bloco” para planejar algo.</Empty>}
      {untimed.length > 0 && (<><div className="eyebrow mt-2">Sem horário</div><div className="flex flex-col gap-2">{untimed.map((t) => <TaskRow key={t.id} task={t} onDelete />)}</div></>)}
    </section>
  );
}
function NowLine() {
  return (
    <div className="grid grid-cols-[48px_minmax(0,1fr)] items-center gap-3 sm:grid-cols-[60px_minmax(0,1fr)]" aria-label="Agora">
      <span className="mono rounded bg-primary/25 px-1.5 py-0.5 text-center text-xs font-bold text-primary-soft">{fromMin(nowMin())}</span>
      <div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-primary shadow-glow" /><span className="h-px flex-1 bg-primary/60" /><span className="rounded bg-surface-3 px-2 py-0.5 text-[10px] font-bold tracking-wider text-ink-dim">AGORA</span></div>
    </div>
  );
}

function MonthView({ day, setDay, count }: { day: string; setDay: (d: string) => void; count: (k: string) => number }) {
  const sel = parseYmd(day);
  const first = new Date(sel.getFullYear(), sel.getMonth(), 1);
  const start = addDays(first, -((first.getDay() + 6) % 7));
  const cells = Array.from({ length: 42 }, (_, i) => addDays(start, i));
  const T = todayStr();
  return (
    <div className="rounded-xl border border-stroke bg-surface-1 p-3">
      <div className="mb-2 grid grid-cols-7 text-center text-[11px] font-semibold text-ink-mute">{["seg", "ter", "qua", "qui", "sex", "sáb", "dom"].map((d) => <span key={d}>{d}</span>)}</div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((d) => {
          const k = ymd(d), n = count(k), inMonth = d.getMonth() === sel.getMonth();
          return (
            <button key={k} onClick={() => setDay(k)} className={cn("flex aspect-square flex-col items-center justify-center gap-0.5 rounded-lg text-sm tabular transition hover:bg-surface-3", !inMonth && "opacity-35", k === T && "ring-1 ring-primary", k === day && "bg-primary/20")}>
              <span className="font-semibold">{d.getDate()}</span>
              {n > 0 && <span className="rounded-full bg-primary/25 px-1.5 text-[10px] font-bold text-primary-soft">{n}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function TimelineView({ events, tasks }: { events: ReturnType<typeof eventsOn>; tasks: ReturnType<typeof tasksOn> }) {
  const days = Array.from(new Set([...events.map((e) => e.date), ...tasks.map((t) => t.due_date!)])).sort().slice(0, 14);
  if (!days.length) return <Empty>Nada agendado pela frente.</Empty>;
  return (
    <div className="flex flex-col gap-6">
      {days.map((d) => (
        <section key={d}>
          <div className="eyebrow mb-2 !text-ink-dim capitalize">{dateLabel(d)}</div>
          <div className="flex flex-col gap-2">
            {events.filter((e) => e.date === d).sort((a, b) => (a.start_time < b.start_time ? -1 : 1)).map((e) => <EventCard key={e.id} ev={e} compact onDelete />)}
            {tasks.filter((t) => t.due_date === d).map((t) => <TaskRow key={t.id} task={t} onDelete />)}
          </div>
        </section>
      ))}
    </div>
  );
}
