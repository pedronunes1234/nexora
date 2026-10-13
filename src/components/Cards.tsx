"use client";
import Link from "next/link";
import { BellRing, Check, MoreVertical, Trash2, Video, VolumeX } from "lucide-react";
import type { CalendarEvent, Task } from "@/types/database";
import { useApp } from "@/store/app";
import { catStyle, cn, dateLabel, durMin, fmtDur, todayStr } from "@/lib/utils";

export function Checkbox({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) {
  return (
    <button role="checkbox" aria-checked={checked} aria-label={label} onClick={onChange}
      className={cn("grid h-[18px] w-[18px] shrink-0 place-items-center rounded-[4px] border transition", checked ? "bg-emerald border-emerald animate-flash" : "border-stroke bg-surface-1 hover:border-primary")}>
      {checked && <Check size={13} strokeWidth={3} className="text-white" />}
    </button>
  );
}

export function TaskRow({ task, showDate, onDelete }: { task: Task; showDate?: boolean; onDelete?: boolean }) {
  const toggle = useApp((s) => s.toggleTask);
  const del = useApp((s) => s.deleteTask);
  const c = catStyle(task.category);
  const late = !task.completed && task.due_date && task.due_date < todayStr();
  return (
    <div className={cn("group relative flex items-center gap-3 rounded-lg border border-stroke bg-surface-2 px-3 py-2.5 transition hover:border-primary/30", task.completed && "opacity-70")}>
      <span className="absolute left-0 top-2 bottom-2 w-0.5 rounded bg-primary opacity-0 group-hover:opacity-100 transition" />
      <Checkbox checked={task.completed} onChange={() => toggle(task.id)} label={`Concluir ${task.title}`} />
      <div className="min-w-0 flex-1">
        <div className={cn("truncate text-sm font-semibold", task.completed && "line-through text-ink-mute")}>{task.title}</div>
        <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-ink-mute">
          {task.priority === "high" && !task.completed && <span className="rounded-full border border-coral/25 bg-coral/12 px-2 py-px font-semibold text-coral-soft">Alta Prioridade</span>}
          {task.priority === "medium" && !task.completed && <span className="chip !py-px">Média</span>}
          {task.priority === "low" && !task.completed && <span className="chip !py-px">Baixa</span>}
          {task.alarm && !task.completed && <span className="inline-flex items-center gap-1 text-emerald-soft"><BellRing size={11} /> Som ativo</span>}
          {task.due_time && <span className="mono">{task.due_time}</span>}
          {showDate && task.due_date && <span className={late ? "text-coral-soft" : ""}>{dateLabel(task.due_date)}</span>}
          <span className={cn("rounded px-1.5", c.bg, c.text)}>{task.category}</span>
          {task.note && <span className="truncate">{task.note}</span>}
        </div>
      </div>
      {onDelete && <button aria-label="Excluir tarefa" onClick={() => del(task.id)} className="grid h-8 w-8 place-items-center rounded-lg text-ink-mute hover:bg-coral/10 hover:text-coral-soft"><Trash2 size={15} /></button>}
    </div>
  );
}

export function EventCard({ ev, compact, onDelete }: { ev: CalendarEvent; compact?: boolean; onDelete?: boolean }) {
  const del = useApp((s) => s.deleteEvent);
  const c = catStyle(ev.area);
  const dur = durMin(ev.start_time, ev.end_time);
  return (
    <div className="card card-hover relative flex items-stretch gap-3 overflow-hidden p-3 pl-4">
      <span className={cn("absolute left-0 top-0 bottom-0 w-[3px]", c.bar)} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2 text-xs text-ink-dim">
          <span className="inline-flex items-center gap-1 mono font-semibold text-ink">{ev.start_time} – {ev.end_time}</span>
          <span className={cn("rounded px-1.5 py-px text-[11px] font-semibold", c.bg, c.text)}>{ev.kind === "focus" ? `${ev.area} · Foco` : ev.area}</span>
          <span>{fmtDur(dur)}</span>
          {ev.dnd && <span className="inline-flex items-center gap-1 rounded bg-primary/15 px-1.5 py-px text-[10px] font-bold uppercase tracking-wide text-primary-soft"><VolumeX size={10} />DND</span>}
        </div>
        <div className="mt-1 text-[15px] font-semibold leading-snug tracking-tight">{ev.title}</div>
        {!compact && ev.description && <div className="mt-0.5 text-xs text-ink-mute">{ev.description}</div>}
        {ev.alarm && <div className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-soft"><BellRing size={11} /> Sino ativo · {ev.alarm_lead_min} min antes</div>}
      </div>
      <div className="flex flex-col items-end justify-between gap-2">
        {ev.meet_url && <a href={ev.meet_url} target="_blank" rel="noreferrer" className="btn-soft btn-sm"><Video size={13} />Entrar</a>}
        {ev.kind === "focus" && <Link href="/foco" className="btn-ghost btn-sm">Iniciar foco</Link>}
        {onDelete && <button aria-label="Excluir compromisso" onClick={() => del(ev.id)} className="grid h-8 w-8 place-items-center rounded-lg text-ink-mute hover:bg-coral/10 hover:text-coral-soft"><Trash2 size={15} /></button>}
      </div>
    </div>
  );
}
export { MoreVertical };
