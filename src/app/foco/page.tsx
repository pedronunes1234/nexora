"use client";
import { ArrowUpRight, Check, Headphones, Pause, Play, Plus, RotateCcw, Trash2, Volume2, Waves, Zap } from "lucide-react";
import { useMemo, useState } from "react";
import { Bar, PageHeader } from "@/components/ui";
import { BEAT_HZ, type Ambient, type Beat } from "@/lib/audio";
import { dayStats } from "@/lib/derive";
import { cn, fmtClock, fmtFocus, todayStr } from "@/lib/utils";
import { useApp } from "@/store/app";
import { useTimer } from "@/store/timer";

const DURATIONS = [{ m: 25, l: "25 min", s: "Pomodoro" }, { m: 45, l: "45 min", s: "Foco profundo" }, { m: 90, l: "90 min", s: "Ultradiano" }];
const BEATS: { id: Beat; label: string; sub: string }[] = [
  { id: "alpha", label: "Alfa 10 Hz", sub: "200 Hz / 210 Hz · calma alerta" },
  { id: "gamma", label: "Gama 40 Hz", sub: "200 Hz / 240 Hz · concentração" },
  { id: "theta", label: "Teta 6 Hz", sub: "200 Hz / 206 Hz · criatividade" },
  { id: "off", label: "Sem binaural", sub: "apenas som ambiente" },
];
const AMBIENTS: { id: Ambient; label: string }[] = [{ id: "rain", label: "Chuva Suave" }, { id: "cafe", label: "Café Noturno" }, { id: "brown", label: "Ruído Marrom" }, { id: "none", label: "Silêncio" }];

export default function Foco() {
  const timer = useTimer();
  const { tasks, sessions, captures, addCapture, deleteCapture, settings, toast } = useApp();
  const [cap, setCap] = useState("");
  const st = useMemo(() => dayStats(tasks, sessions, settings.dailyGoalMin), [tasks, sessions, settings.dailyGoalMin]);
  const goalSec = settings.dailyGoalMin * 60;
  const open = tasks.filter((t) => !t.completed && t.due_date === todayStr());
  const running = timer.status === "running";
  const idle = timer.status === "idle";
  const frac = timer.totalSec ? timer.leftSec / timer.totalSec : 0;
  const size = 320, r = 140, circ = 2 * Math.PI * r;
  const activeLabel = timer.beat !== "off" ? `${BEAT_HZ[timer.beat]} Hz Binaural ${running ? "Ativo" : "Pronto"}` : "Sem binaural";

  const submitCap = (e: React.FormEvent) => { e.preventDefault(); if (!cap.trim()) return; addCapture(cap.trim()); setCap(""); };
  const complete = () => {
    const task = open.find((t) => t.title === timer.taskTitle);
    timer.finish(false);
    if (task) { useApp.getState().toggleTask(task.id); toast("Tarefa concluída"); }
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader eyebrow="Flow State" title="Foco imersivo" right={
        <span className="chip !px-3 !py-1.5 !text-xs"><span className="flex gap-1">{[1, 2, 3, 4].map((i) => <i key={i} className={cn("h-1.5 w-1.5 rounded-full", i <= timer.cycle ? "bg-emerald" : "bg-surface-3")} />)}</span>Ciclo {timer.cycle} de 4</span>
      } />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)]">
        <section className="flex flex-col items-center gap-5 rounded-xl border border-stroke bg-surface-1/70 p-5 sm:p-8">
          <div className="w-full max-w-md">
            <label className="eyebrow mb-1.5 block" htmlFor="focus-task">Em que você vai focar?</label>
            <input id="focus-task" list="focus-tasks" className="input" placeholder="Ex.: Revisão sistemática do capítulo 3" value={timer.taskTitle} onChange={(e) => timer.setTitle(e.target.value)} maxLength={100} />
            <datalist id="focus-tasks">{open.map((t) => <option key={t.id} value={t.title} />)}</datalist>
          </div>

          <div className="relative grid place-items-center" style={{ width: "min(80vw, 340px)", aspectRatio: "1" }}>
            <svg viewBox={`0 0 ${size} ${size}`} className="absolute inset-0 -rotate-90" role="img" aria-label={`Faltam ${fmtClock(timer.leftSec)}`}>
              <defs><linearGradient id="tg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#8b5cf6" /><stop offset="1" stopColor="#4edea3" /></linearGradient></defs>
              <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#202632" strokeWidth="10" />
              <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="url(#tg)" strokeWidth="10" strokeLinecap="round" strokeDasharray={`${circ * frac} ${circ}`} style={{ transition: running ? "stroke-dasharray 1s linear" : "stroke-dasharray .4s", filter: "drop-shadow(0 0 8px rgba(139,92,246,.55))" }} />
            </svg>
            <div className="relative text-center">
              <div className="mono text-[64px] font-bold leading-none tracking-tight sm:text-[76px]">{fmtClock(timer.leftSec)}</div>
              <div className="mt-2 flex items-center justify-center gap-2 text-sm text-ink-dim"><span className={cn("h-2 w-2 rounded-full", running ? "bg-emerald animate-pulse" : "bg-ink-mute")} />Bloco de {Math.round(timer.totalSec / 60)} min</div>
            </div>
          </div>

          <div className="flex gap-2" role="group" aria-label="Duração">
            {DURATIONS.map((d) => (
              <button key={d.m} disabled={!idle} onClick={() => timer.setMinutes(d.m)} aria-pressed={timer.totalSec === d.m * 60}
                className={cn("rounded-lg border px-3 py-2 text-left transition disabled:opacity-50", timer.totalSec === d.m * 60 ? "border-primary bg-primary/15" : "border-stroke bg-surface-2 hover:border-primary/40")}>
                <div className="text-sm font-semibold">{d.l}</div><div className="text-[11px] text-ink-mute">{d.s}</div>
              </button>
            ))}
          </div>

          <div className="grid w-full max-w-md grid-cols-[1fr_1.6fr_1fr] gap-3">
            <button className="card card-hover flex flex-col items-center gap-1 py-3 text-sm font-semibold" onClick={() => timer.extend(5)}><Plus size={18} className="text-primary-soft" />+5m<span className="text-[11px] font-normal text-ink-mute">Estender</span></button>
            {running ? (
              <button className="btn-primary h-auto flex-col gap-1 py-3 text-base" onClick={timer.pause}><Pause size={22} />Pausar Foco</button>
            ) : (
              <button className="btn-primary h-auto flex-col gap-1 py-3 text-base" onClick={timer.start}><Play size={22} />{timer.status === "paused" ? "Retomar" : "Iniciar Foco"}</button>
            )}
            <button className="card card-hover flex flex-col items-center gap-1 py-3 text-sm font-semibold disabled:opacity-40" onClick={complete} disabled={idle}><Check size={18} className="text-emerald" />Concluir<span className="text-[11px] font-normal text-ink-mute">Registrar</span></button>
          </div>
          {!idle && <button className="text-xs text-ink-mute underline-offset-4 hover:underline" onClick={timer.reset}><RotateCcw size={11} className="mr-1 inline" />Descartar sessão</button>}
        </section>

        <div className="flex flex-col gap-6">
          <section className="card p-4">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-lg bg-emerald/15 text-emerald-soft"><Waves size={20} /></span>
              <div className="min-w-0"><div className="truncate text-sm font-semibold">{AMBIENTS.find((a) => a.id === timer.ambient)?.label} & {BEATS.find((b) => b.id === timer.beat)?.label}</div><div className="mono text-xs text-emerald-soft">{activeLabel}</div></div>
            </div>
            <div className="mt-4 flex items-center gap-3"><Volume2 size={15} className="text-ink-mute" />
              <input type="range" min={0} max={100} value={Math.round(timer.volume * 100)} onChange={(e) => timer.setVolume(+e.target.value / 100)} aria-label="Volume" className="h-1.5 flex-1 cursor-pointer accent-primary" />
              <span className="mono w-10 text-right text-xs">{Math.round(timer.volume * 100)}%</span>
            </div>
            <div className="eyebrow mb-2 mt-4">Onda binaural</div>
            <div className="grid grid-cols-2 gap-2">
              {BEATS.map((b) => (
                <button key={b.id} onClick={() => timer.setBeat(b.id)} aria-pressed={timer.beat === b.id} className={cn("rounded-lg border p-2.5 text-left transition", timer.beat === b.id ? "border-primary bg-primary/15" : "border-stroke hover:border-primary/40")}>
                  <div className="text-sm font-semibold">{b.label}</div><div className="text-[11px] leading-tight text-ink-mute">{b.sub}</div>
                </button>
              ))}
            </div>
            <div className="eyebrow mb-2 mt-4">Som ambiente</div>
            <div className="flex flex-wrap gap-2">
              {AMBIENTS.map((a) => <button key={a.id} onClick={() => timer.setAmbient(a.id)} aria-pressed={timer.ambient === a.id} className={cn("chip !px-3 !py-1.5 !text-xs", timer.ambient === a.id && "!border-primary/60 !bg-primary/20 !text-white")}>{a.label}</button>)}
            </div>
            <div className="mt-3 flex items-start gap-2 text-[11px] text-ink-mute"><Headphones size={14} className="mt-0.5 shrink-0" />Ondas binaurais só funcionam com fones de ouvido estéreo. O áudio é gerado no seu dispositivo, sem internet.</div>
          </section>

          <section className="card p-4">
            <div className="mb-3 flex items-center justify-between"><h3 className="flex items-center gap-2 text-sm font-semibold"><Zap size={15} className="text-primary-soft" />Captura Rápida</h3><span className="text-xs text-ink-mute">Descarregue sem distrair</span></div>
            <form onSubmit={submitCap} className="flex gap-2">
              <input className="input" value={cap} onChange={(e) => setCap(e.target.value)} placeholder="Ideia relâmpago, pendência ou insight…" aria-label="Captura rápida" maxLength={240} />
              <button className="btn bg-periwinkle text-white" aria-label="Salvar captura"><ArrowUpRight size={18} /></button>
            </form>
            <ul className="mt-3 flex flex-col gap-1.5">
              {captures.slice(0, 5).map((c) => (
                <li key={c.id} className="group flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-surface-3">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" /><span className="min-w-0 flex-1 truncate">{c.text}</span>
                  <span className="mono text-[11px] text-ink-mute">{new Date(c.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span>
                  <button aria-label="Excluir captura" onClick={() => deleteCapture(c.id)} className="text-ink-mute opacity-0 hover:text-coral-soft group-hover:opacity-100 focus:opacity-100"><Trash2 size={13} /></button>
                </li>
              ))}
              {!captures.length && <li className="text-xs text-ink-mute">Nada capturado ainda. Pensamentos intrusivos entram aqui sem tirar você do foco.</li>}
            </ul>
          </section>

          <div className="grid grid-cols-2 gap-3">
            <div className="card p-4"><div className="text-xs text-ink-dim">Tempo Acumulado</div><div className="mono mt-1 text-2xl font-bold">{fmtFocus(st.focus)}</div><div className="text-[11px] text-ink-mute">hoje</div></div>
            <div className="card p-4"><div className="flex justify-between text-xs text-ink-dim">Meta Diária<span className="font-bold text-primary-soft">{Math.round(Math.min(1, st.focus / goalSec) * 100)}%</span></div><div className="mono mt-1 text-2xl font-bold">{fmtFocus(goalSec)}</div><Bar value={st.focus / goalSec} className="mt-2" /></div>
          </div>
        </div>
      </div>
    </div>
  );
}
