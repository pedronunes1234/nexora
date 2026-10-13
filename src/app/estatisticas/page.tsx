"use client";
import { CheckCircle2, Download, Flame, Lightbulb, Sparkles, Timer } from "lucide-react";
import { useMemo, useState } from "react";
import { Bar, PageHeader, Ring, Switch } from "@/components/ui";
import { activeDates, focusSecByDate, streak, HABIT_GOAL } from "@/lib/derive";
import { addDays, cn, fmtFocus, todayStr, wdShort, ymd } from "@/lib/utils";
import { useApp } from "@/store/app";
import { useRouter } from "next/navigation";

type Range = "week" | "month" | "quarter";
const DAYS: Record<Range, number> = { week: 7, month: 30, quarter: 90 };

export default function Estatisticas() {
  const { tasks, sessions, habits, settings, profile, setProfile, toast } = useApp();
  const router = useRouter();
  const [range, setRange] = useState<Range>("week");
  const n = DAYS[range];
  const from = addDays(new Date(), -(n - 1));
  const fromIso = ymd(from);

  const data = useMemo(() => {
    const inRange = sessions.filter((s) => ymd(new Date(s.completed_at)) >= fromIso);
    const totalMin = inRange.reduce((a, s) => a + s.duration_minutes, 0);
    const byDay = focusSecByDate(inRange);
    const buckets = { manha: 0, tarde: 0, noite: 0 };
    inRange.forEach((s) => { const h = new Date(s.completed_at).getHours(); buckets[h < 12 ? "manha" : h < 18 ? "tarde" : "noite"] += s.duration_minutes; });
    const maxBucket = Math.max(1, buckets.manha, buckets.tarde, buckets.noite);
    const peak = Object.entries(buckets).sort((a, b) => b[1] - a[1])[0];
    const cats: Record<string, number> = {};
    inRange.forEach((s) => { const t = tasks.find((x) => x.title === s.task_title); const c = t?.category ?? "Sem categoria"; cats[c] = (cats[c] ?? 0) + s.duration_minutes; });
    const doneTasks = tasks.filter((t) => t.completed && t.completed_at && ymd(new Date(t.completed_at)) >= fromIso).length;
    const dueTasks = tasks.filter((t) => (t.due_date ?? "") >= fromIso && (t.due_date ?? "") <= todayStr()).length;
    const act = activeDates(tasks, sessions, habits);
    let activeDays = 0;
    for (let i = 0; i < n; i++) if (act.has(ymd(addDays(new Date(), -i)))) activeDays++;
    const consistency = Math.round((activeDays / n) * 100);
    const avgPerDay = totalMin / n;
    const flowIndex = Math.min(100, Math.round(Math.min(1, avgPerDay / (settings.dailyGoalMin * 0.8)) * 55 + (consistency / 100) * 30 + (dueTasks ? Math.min(1, doneTasks / dueTasks) * 15 : 0)));
    const longest = inRange.filter((s) => s.duration_minutes >= 40).length;
    return { totalMin, byDay, buckets, maxBucket, peak, cats, doneTasks, dueTasks, consistency, flowIndex, count: inRange.length, longest, st: streak(act), act };
  }, [sessions, tasks, habits, fromIso, n, settings.dailyGoalMin]);

  const week = Array.from({ length: 7 }, (_, i) => addDays(new Date(), i - 6));
  const catTotal = Object.values(data.cats).reduce((a, b) => a + b, 0);
  const palette = ["#d0bcff", "#a078ff", "#10b981", "#64748b"];
  const maxDay = Math.max(1, ...Object.values(data.byDay));
  const bestLabel = data.peak && data.peak[1] > 0 ? ({ manha: "manhã (06h–12h)", tarde: "tarde (12h–18h)", noite: "noite (18h–00h)" } as Record<string, string>)[data.peak[0]] : null;

  const exportReport = () => {
    const rows = [["Métrica", "Valor"], ["Período (dias)", String(n)], ["Foco total (min)", String(data.totalMin)], ["Sessões", String(data.count)], ["Tarefas concluídas", String(data.doneTasks)], ["Consistência (%)", String(data.consistency)], ["Flow Index", String(data.flowIndex)]];
    const csv = rows.map((r) => r.join(";")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a"); a.href = url; a.download = `nexora-relatorio-${todayStr()}.csv`; a.click(); URL.revokeObjectURL(url);
    toast("Relatório exportado (CSV)");
  };

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <PageHeader eyebrow="Bio-ritmo ativo" title="Métricas de Produtividade" right={
        <div className="flex rounded-lg border border-stroke bg-surface-1 p-1" role="tablist">
          {([["week", "Esta Semana"], ["month", "Mês"], ["quarter", "Trimestre"]] as const).map(([id, l]) => <button key={id} role="tab" aria-selected={range === id} onClick={() => setRange(id)} className={cn("h-8 rounded-md px-3 text-sm font-semibold", range === id ? "bg-surface-3 text-white" : "text-ink-dim")}>{l}</button>)}
        </div>
      } />

      {!sessions.length && <div className="rounded-lg border border-dashed border-stroke p-4 text-sm text-ink-dim">Ainda não há sessões de foco. Inicie um bloco em <b>Flow State Timer</b> ou carregue dados de exemplo em Ajustes para ver os gráficos.</div>}

      <section className="grid gap-4 rounded-xl border border-stroke bg-gradient-to-br from-primary/15 to-surface-2 p-5 md:grid-cols-[1fr_auto]">
        <div>
          <span className="chip !border-emerald/30 !bg-emerald/10 !text-emerald-soft">{data.flowIndex >= 70 ? "Estado de hiperfoco sustentável" : data.flowIndex >= 40 ? "Ritmo em construção" : "Comece com blocos curtos"}</span>
          <div className="eyebrow mt-4">Flow Index</div>
          <div className="flex items-baseline gap-1"><span className="text-6xl font-bold tracking-[-0.04em] tabular">{data.flowIndex}</span><span className="text-xl text-ink-mute">/100</span></div>
          <p className="mt-1 max-w-sm text-sm text-ink-dim">Combina tempo de foco, consistência diária e conclusão de tarefas no período.</p>
        </div>
        <div className="self-center justify-self-center"><Ring value={data.flowIndex / 100} size={120} stroke={10} color="#8b5cf6"><span className="text-lg">∞</span></Ring></div>
        <div className="grid grid-cols-3 gap-3 md:col-span-2">
          <Kpi label="Foco profundo" value={fmtFocus(data.totalMin * 60)} sub={`${data.count} sessões`} />
          <Kpi label="Tarefas concluídas" value={String(data.doneTasks)} sub={data.dueTasks ? `de ${data.dueTasks} no período` : "no período"} />
          <Kpi label="Consistência" value={`${data.consistency}%`} sub={data.consistency >= 80 ? "Alta regularidade" : "Em evolução"} />
        </div>
      </section>

      <div className="grid gap-6 md:grid-cols-2">
        <section className="card p-5">
          <h2 className="mb-1 text-lg font-semibold tracking-tight">Mapa Circadiano de Foco</h2>
          <div className="mb-4 flex items-center gap-2 rounded-lg bg-primary/10 px-3 py-2 text-sm"><Sparkles size={15} className="text-primary-soft" />{bestLabel ? <span>Seu melhor rendimento recente: <b>{bestLabel}</b>.</span> : <span>Registre sessões para descobrir seu pico biológico.</span>}</div>
          {([["manha", "Manhã (06h–12h)"], ["tarde", "Tarde (12h–18h)"], ["noite", "Noite (18h–00h)"]] as const).map(([k, l]) => (
            <div key={k} className="mb-3 last:mb-0"><div className="mb-1 flex justify-between text-sm"><span>{l}</span><span className="mono text-ink-dim">{fmtFocus(data.buckets[k] * 60)}</span></div><Bar value={data.buckets[k] / data.maxBucket} color={k === "tarde" ? "bg-gradient-to-r from-primary to-emerald" : "bg-periwinkle"} className="!h-2.5" /></div>
          ))}
          <div className="mt-4 text-xs text-ink-mute">Sua janela de pico configurada: {profile.circadian_peak_start}–{profile.circadian_peak_end}</div>
        </section>

        <section className="card p-5">
          <h2 className="mb-4 text-lg font-semibold tracking-tight">Categorias de Investimento</h2>
          {catTotal ? (
            <>
              <div className="flex h-3 overflow-hidden rounded-full bg-surface-3">{Object.entries(data.cats).map(([c, m], i) => <div key={c} style={{ width: `${(m / catTotal) * 100}%`, background: palette[i % 4] }} title={c} />)}</div>
              <ul className="mt-4 flex flex-col gap-2">{Object.entries(data.cats).sort((a, b) => b[1] - a[1]).map(([c, m]) => <li key={c} className="flex items-center gap-2 text-sm"><span className="h-2.5 w-2.5 rounded-full" style={{ background: palette[Object.keys(data.cats).indexOf(c) % 4] }} />{c}<span className="mono ml-auto text-ink-dim">{fmtFocus(m * 60)}</span><span className="mono w-10 text-right font-semibold">{Math.round((m / catTotal) * 100)}%</span></li>)}</ul>
            </>
          ) : <p className="text-sm text-ink-mute">As categorias aparecem quando você inicia o foco a partir de uma tarefa da sua lista.</p>}
        </section>
      </div>

      <section className="card p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2"><h2 className="text-lg font-semibold tracking-tight">Foco por dia</h2><span className="text-xs text-ink-mute">Últimos 7 dias</span></div>
        <div className="flex h-40 items-end gap-2" role="img" aria-label="Minutos de foco por dia">
          {week.map((d) => { const s = data.byDay[ymd(d)] ?? 0; const isT = ymd(d) === todayStr(); return (
            <div key={ymd(d)} className="flex h-full flex-1 flex-col items-center justify-end gap-1.5">
              <span className="mono text-[10px] text-ink-mute">{s ? fmtFocus(s) : ""}</span>
              <div className={cn("w-full rounded-t-md", isT ? "bg-primary" : "bg-primary/45")} style={{ height: Math.max(4, Math.round((s / maxDay) * 100)) }} />
              <span className="text-[11px] text-ink-mute">{wdShort(d)}</span>
            </div>); })}
        </div>
      </section>

      <section className="card p-5">
        <div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-semibold tracking-tight">Consistência de Hábitos</h2><span className="chip !text-emerald-soft">{data.consistency}% taxa</span></div>
        <div className="grid grid-cols-7 gap-2">
          {week.map((d) => { const k = ymd(d); const ok = data.act.has(k); const isT = k === todayStr(); return (
            <div key={k} className="flex flex-col items-center gap-1.5"><span className="text-[11px] text-ink-mute">{wdShort(d)}</span>
              <span className={cn("grid h-10 w-10 place-items-center rounded-lg", ok ? "bg-emerald text-white" : isT ? "ring-2 ring-primary" : "bg-surface-3")}>{ok && <CheckCircle2 size={18} />}</span></div>); })}
        </div>
        {!profile.hide_streaks && <div className="mt-4 flex items-center gap-2 text-sm"><Flame size={16} className="text-amber" /><b>{data.st} {data.st === 1 ? "dia consecutivo" : "dias consecutivos"}</b> com atividade registrada.</div>}
        <div className="mt-4 grid grid-cols-2 gap-3">
          <Kpi label="Blocos Pomodoro" value={`${data.count} sessões`} sub={`${data.longest} de 40 min ou mais`} icon={<Timer size={14} />} />
          <Kpi label="Meta de hábitos" value={`${Object.keys(HABIT_GOAL).length} metas`} sub="água, leitura, treino, mente" icon={<CheckCircle2 size={14} />} />
        </div>
      </section>

      <section className="rounded-xl border border-primary/30 bg-primary/10 p-5">
        <div className="eyebrow !text-primary-soft flex items-center gap-1.5"><Lightbulb size={13} />Insight do Copilot · IA preditiva</div>
        <p className="mt-2 text-sm leading-relaxed">{data.count >= 3 && bestLabel ? `Seu pico de foco está na ${bestLabel}. Reserve nessa janela os blocos mais exigentes e use o restante do dia para tarefas leves.` : "Com poucos dados ainda, comece com 2 blocos de 25 minutos por dia no mesmo horário. A regularidade melhora o ritmo circadiano."}</p>
        <button className="btn-soft mt-3 w-full" onClick={() => router.push("/ia?q=Reserve+1h+de+foco+profundo+agora")}><Sparkles size={15} />Aplicar ajuste na agenda</button>
      </section>

      <div className="grid gap-3 sm:grid-cols-2">
        <button onClick={exportReport} className="card card-hover flex items-center gap-3 p-4 text-left"><Download size={18} className="text-primary-soft" /><div className="flex-1"><div className="text-sm font-semibold">Exportar relatório</div><div className="text-xs text-ink-mute">Formato CSV com os indicadores do período</div></div></button>
        <div className="card flex items-center gap-3 p-4"><div className="flex-1"><div className="text-sm font-semibold">Ocultar Streaks</div><div className="text-xs text-ink-mute">Modo Zen: sem contadores de ansiedade</div></div><Switch on={profile.hide_streaks} onChange={(v) => setProfile({ hide_streaks: v })} label="Ocultar streaks" /></div>
      </div>
    </div>
  );
}

function Kpi({ label, value, sub, icon }: { label: string; value: string; sub: string; icon?: React.ReactNode }) {
  return <div className="rounded-lg bg-surface-1/80 p-3"><div className="flex items-center gap-1 text-[11px] text-ink-mute">{icon}{label}</div><div className="mono mt-1 text-xl font-bold tracking-tight">{value}</div><div className="text-[11px] text-emerald-soft">{sub}</div></div>;
}
