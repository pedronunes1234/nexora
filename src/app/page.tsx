"use client";
import { Brain, CalendarPlus, Droplets, Dumbbell, Flame, Headphones, Lightbulb, BookOpen, Play, Timer, Wind } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import QuickCommand from "@/components/QuickCommand";
import { EventCard, TaskRow } from "@/components/Cards";
import { Bar, Ring, SectionHeader, Empty } from "@/components/ui";
import { activeDates, dayStats, eventsOn, HABIT_GOAL, habitValue, streak, tasksOn } from "@/lib/derive";
import { fmtFocus, greeting, longDate, nowMin, toMin, todayStr, cn } from "@/lib/utils";
import { useApp } from "@/store/app";
import { useTimer } from "@/store/timer";
import { useUI } from "@/store/ui";

export default function MeuDia() {
  const { tasks, events, sessions, habits, profile, settings, setHabit, toast } = useApp();
  const openAdd = useUI((s) => s.openAdd);
  const T = todayStr();
  const st = useMemo(() => dayStats(tasks, sessions, settings.dailyGoalMin), [tasks, sessions, settings.dailyGoalMin]);
  const days = useMemo(() => streak(activeDates(tasks, sessions, habits)), [tasks, sessions, habits]);
  const evs = eventsOn(events, T);
  const todays = tasksOn(tasks, T).sort((a, b) => Number(a.completed) - Number(b.completed) || (a.priority === "high" ? -1 : 1));
  const upcoming = tasks.filter((t) => !t.completed && t.due_date && t.due_date > T).sort((a, b) => ((a.due_date ?? "") < (b.due_date ?? "") ? -1 : 1)).slice(0, 3);
  const pending = todays.filter((t) => !t.completed).length;
  const nm = nowMin();
  const peakS = toMin(profile.circadian_peak_start), peakE = toMin(profile.circadian_peak_end);
  const inPeak = nm >= peakS && nm < peakE;
  const water = habitValue(habits, "water"), reading = habitValue(habits, "reading"), workout = habitValue(habits, "workout"), mind = habitValue(habits, "mind");
  const hits = [water >= HABIT_GOAL.water, reading >= HABIT_GOAL.reading, workout >= 1, mind >= HABIT_GOAL.mind].filter(Boolean).length;
  const goalSec = settings.dailyGoalMin * 60;
  const timer = useTimer();

  const startFlow = (beat: "alpha" | "gamma") => { timer.setBeat(beat); timer.start(); toast(`Flow iniciado com ondas ${beat === "alpha" ? "Alfa 10 Hz" : "Gama 40 Hz"}. Use fones de ouvido.`); };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="eyebrow mb-1">{longDate()}</div>
          <h1 className="text-[28px] leading-[34px] sm:text-4xl sm:leading-[42px] font-bold tracking-[-0.03em]">{greeting()}, {profile.name.split(" ")[0]}</h1>
        </div>
        <span className="chip !px-3 !py-1 !text-xs"><span className="h-1.5 w-1.5 rounded-full bg-emerald shadow-[0_0_6px_#10b981]" /><span className="tabular">{st.pct}%</span> Foco Alinhado</span>
      </div>

      <div className={cn("flex items-center gap-3 rounded-lg border px-4 py-3", inPeak ? "border-primary/40 bg-primary/10" : "border-stroke bg-surface-2")}>
        <Brain size={20} className={inPeak ? "text-primary-soft" : "text-ink-mute"} />
        <div className="min-w-0 text-sm">
          <div className="font-semibold">{inPeak ? "Pico de foco cognitivo ativado" : "Fora da janela de pico"}</div>
          <div className="text-xs text-ink-dim">Janela: {profile.circadian_peak_start} às {profile.circadian_peak_end} · {inPeak ? "Ritmo circadiano ótimo" : "Planeje tarefas leves agora"}</div>
        </div>
        <Link href="/foco" className="btn-ghost btn-sm ml-auto hidden sm:inline-flex">Entrar em Flow</Link>
      </div>

      <QuickCommand />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="card flex items-center gap-3 p-4">
          <Ring value={st.total ? st.done / st.total : 0} size={52}>{st.done}/{st.total}</Ring>
          <div><div className="text-sm font-semibold">Tarefas do Dia</div><div className="text-xs text-ink-mute">{st.total ? `${Math.round((st.done / st.total) * 100)}% concluído` : "Sem tarefas"}</div></div>
        </div>
        <Link href="/foco" className="card card-hover p-4">
          <div className="flex items-center justify-between text-xs text-ink-dim">Tempo de Foco Real<Timer size={15} className="text-emerald" /></div>
          <div className="mono mt-1 text-2xl font-bold tracking-tight">{fmtFocus(st.focus)}</div>
          <Bar value={st.focus / goalSec} color="bg-primary" className="mt-2" />
          <div className="mt-1 text-[11px] text-ink-mute">Meta diária: {fmtFocus(goalSec)}</div>
        </Link>
        {!profile.hide_streaks && (
          <div className="card p-4">
            <div className="flex items-center justify-between text-xs text-ink-dim">Sequência<Flame size={15} className="text-amber" /></div>
            <div className="mt-1 text-2xl font-bold tracking-tight tabular">{days} {days === 1 ? "dia" : "dias"}</div>
            <div className="mt-2 text-[11px] text-ink-mute">{days ? "Continue hoje para manter o ritmo" : "Conclua algo hoje para começar"}</div>
          </div>
        )}
        <div className="card p-4">
          <div className="flex items-center justify-between text-xs text-ink-dim">Hábitos hoje<Wind size={15} className="text-primary-soft" /></div>
          <div className="mt-1 text-2xl font-bold tracking-tight tabular">{hits}/4</div>
          <Bar value={hits / 4} color="bg-emerald" className="mt-2" />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Coluna 1: grade horária */}
        <section className="lg:col-span-4">
          <SectionHeader title="Agenda do Dia" right={`${evs.length} ${evs.length === 1 ? "bloco" : "blocos"}`} />
          <div className="flex flex-col gap-3">
            {evs.length ? evs.map((e) => <EventCard key={e.id} ev={e} compact />) : <Empty>Nenhum compromisso hoje. Use o comando rápido para criar um.</Empty>}
            <button onClick={() => openAdd(T, "event")} className="btn-ghost w-full"><CalendarPlus size={16} />Adicionar bloco à agenda</button>
            <div className="flex gap-3 rounded-lg border border-stroke bg-surface-2 p-3 text-xs text-ink-dim"><Lightbulb size={16} className="mt-0.5 shrink-0 text-amber" /><span>Dica cognitiva: faça um intervalo de 5 min a cada bloco de foco para manter a energia estável.</span></div>
          </div>
        </section>

        {/* Coluna 2: tarefas */}
        <section className="lg:col-span-4">
          <SectionHeader title="Tarefas Prioritárias" right={`${pending} ${pending === 1 ? "pendência" : "pendências"}`} />
          <div className="flex flex-col gap-2">
            {todays.length ? todays.map((t) => <TaskRow key={t.id} task={t} />) : <Empty>Sem tarefas para hoje.</Empty>}
            {upcoming.length > 0 && <div className="eyebrow mt-3">Próximas</div>}
            {upcoming.map((t) => <TaskRow key={t.id} task={t} showDate />)}
          </div>
        </section>

        {/* Coluna 3: hábitos + flow */}
        <section className="flex flex-col gap-6 lg:col-span-4">
          <div>
            <SectionHeader title="Biohacking & Hábitos" right={`Meta ${hits}/4`} />
            <div className="grid grid-cols-2 gap-3">
              <Habit icon={<Droplets size={16} />} color="text-sky-300" title={`${(water / 1000).toFixed(water % 1000 ? 2 : 1).replace(/0$/, "")}L Água`} sub={water >= HABIT_GOAL.water ? "Concluído" : "+250 ml"} value={water / HABIT_GOAL.water} done={water >= HABIT_GOAL.water} onClick={() => setHabit("water", water >= HABIT_GOAL.water ? 0 : Math.min(HABIT_GOAL.water, water + 250))} />
              <Habit icon={<BookOpen size={16} />} color="text-primary-soft" title="Leitura Técnica" sub={reading >= HABIT_GOAL.reading ? "Concluído" : `${reading}/${HABIT_GOAL.reading} min`} value={reading / HABIT_GOAL.reading} done={reading >= HABIT_GOAL.reading} onClick={() => setHabit("reading", reading >= HABIT_GOAL.reading ? 0 : reading + 5)} />
              <Habit icon={<Dumbbell size={16} />} color="text-amber" title="Musculação & Cardio" sub={workout ? "Concluído" : "Marcar"} value={workout} done={!!workout} onClick={() => setHabit("workout", workout ? 0 : 1)} />
              <Habit icon={<Wind size={16} />} color="text-emerald-soft" title="10 min Foco Mental" sub={mind >= 10 ? "Concluído" : "Marcar"} value={mind / 10} done={mind >= 10} onClick={() => setHabit("mind", mind >= 10 ? 0 : 10)} />
            </div>
          </div>
          <div className="relative overflow-hidden rounded-xl border border-primary/30 bg-gradient-to-br from-primary/20 via-surface-2 to-surface-2 p-5">
            <div className="eyebrow !text-primary-soft">Flow State Session</div>
            <div className="mono mt-1 text-4xl font-bold tracking-tight">{timer.status === "idle" ? "45:00" : `${String(Math.floor(timer.leftSec / 60)).padStart(2, "0")}:${String(timer.leftSec % 60).padStart(2, "0")}`}</div>
            <p className="mt-2 text-xs text-ink-dim">Isolamento total com frequências binaurais e bloqueio de notificações.</p>
            <div className="mt-4 flex flex-col gap-2">
              {timer.status === "idle" ? (
                <button className="btn-primary" onClick={() => { timer.setMinutes(45); startFlow("alpha"); }}><Play size={15} />Iniciar Timer (45m)</button>
              ) : <Link href="/foco" className="btn-primary"><Play size={15} />Voltar ao Flow</Link>}
              <button className="btn-ghost" onClick={() => startFlow("gamma")}><Headphones size={15} />Ativar Ondas Gama (40Hz)</button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function Habit({ icon, color, title, sub, value, done, onClick }: { icon: React.ReactNode; color: string; title: string; sub: string; value: number; done: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className="card card-hover flex flex-col gap-2 p-3 text-left" aria-pressed={done}>
      <span className={color}>{icon}</span>
      <span className="text-sm font-semibold leading-tight">{title}</span>
      <Bar value={value} color={done ? "bg-emerald" : "bg-primary"} />
      <span className={cn("text-[11px]", done ? "font-semibold text-emerald-soft" : "text-ink-mute")}>{sub}</span>
    </button>
  );
}
