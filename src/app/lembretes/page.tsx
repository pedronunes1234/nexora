"use client";
import { AlarmClock, BellRing, Check, Moon, Play, ShieldAlert, Smartphone, Timer, Volume2, Waves } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { PageHeader, Switch, Empty } from "@/components/ui";
import { playTimbre, TIMBRES } from "@/lib/audio";
import { cn, dateLabel, nowMin, toMin, todayStr } from "@/lib/utils";
import { useApp } from "@/store/app";
import type { Timbre } from "@/types/database";

interface Item { key: string; kind: "event" | "task"; id: string; title: string; sub: string; at: number; time: string; lead: number; timbre: Timbre; high: boolean }

export default function Lembretes() {
  const { events, tasks, settings, setSettings, updateEvent, updateTask, toggleTask, snooze, toast, notify } = useApp();
  const [perm, setPerm] = useState<string>("default");
  const [sw, setSw] = useState(false);
  const T = todayStr();
  useEffect(() => {
    setPerm(typeof Notification === "undefined" ? "unsupported" : Notification.permission);
    navigator.serviceWorker?.getRegistration().then((r) => setSw(!!r)).catch(() => {});
  }, []);

  const queue = useMemo<Item[]>(() => {
    const out: Item[] = [];
    events.forEach((e) => e.alarm && !e.alarm_fired && e.date === T && out.push({ key: `event:${e.id}`, kind: "event", id: e.id, title: e.title, sub: e.description ?? e.area, at: toMin(e.start_time), time: e.start_time, lead: e.alarm_lead_min, timbre: e.timbre ?? settings.timbre, high: false }));
    tasks.forEach((t) => t.alarm && !t.completed && !t.alarm_fired && t.due_date === T && t.due_time && out.push({ key: `task:${t.id}`, kind: "task", id: t.id, title: t.title, sub: t.priority === "high" ? "Crítico · Alta prioridade" : t.category, at: toMin(t.due_time), time: t.due_time, lead: t.alarm_lead_min, timbre: t.timbre ?? (t.priority === "high" ? "urgent_alarm" : settings.timbre), high: t.priority === "high" }));
    return out.sort((a, b) => a.at - b.at);
  }, [events, tasks, settings.timbre, T]);
  const next = queue[0];
  const nm = nowMin();
  const eta = next ? Math.max(0, next.at - next.lead - nm) : 0;

  const askPerm = async () => {
    if (typeof Notification === "undefined") return toast("Este navegador não suporta notificações do sistema", "warn");
    const r = await Notification.requestPermission();
    setPerm(r);
    toast(r === "granted" ? "Notificações do sistema ativadas" : "Permissão negada. Os alertas continuam dentro do app.", r === "granted" ? "ok" : "warn");
  };
  const test = async () => {
    const t0 = performance.now();
    if (settings.sound) playTimbre(settings.timbre, settings.volume / 100);
    if (settings.haptics && "vibrate" in navigator && navigator.userActivation?.hasBeenActive) navigator.vibrate?.([150, 80, 150]);
    toast("Teste: alerta sonoro disparado", "alarm");
    try {
      if (typeof Notification !== "undefined" && Notification.permission === "granted") {
        const reg = await navigator.serviceWorker?.getRegistration();
        if (reg) await reg.showNotification("NEXORA", { body: "Teste de notificação e som", icon: "/icon.svg" }); else new Notification("NEXORA", { body: "Teste de notificação e som" });
      }
    } catch { /* ignorado */ }
    notify({ kind: "system", title: "Teste de alerta", body: `Som e notificação disparados em ${Math.round(performance.now() - t0)} ms.` });
  };

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <PageHeader eyebrow="Alertas" title="Lembretes & Alertas Sonoros" />

      <section className="rounded-xl border border-stroke bg-gradient-to-br from-primary/15 to-surface-2 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-lg bg-emerald/15 text-emerald-soft"><BellRing size={20} /></span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2"><h2 className="font-semibold">Motor de Alerta</h2><span className="chip !border-emerald/30 !bg-emerald/15 !text-emerald-soft">ATIVO</span></div>
            <div className="text-xs text-ink-dim">Verificação a cada 10 s com o app aberto{sw ? " · Service Worker instalado" : " · Service Worker ativo na versão de produção"}</div>
          </div>
        </div>
        <p className="mt-3 text-sm text-ink-dim">Os alarmes disparam som por síntese de áudio no dispositivo e, com permissão, notificação do sistema.</p>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <button className="btn-soft flex-1 h-11" onClick={test}><BellRing size={17} />Testar Notificação e Som Agora</button>
          {perm !== "granted" && perm !== "unsupported" && <button className="btn-ghost h-11" onClick={askPerm}>Ativar notificações do sistema</button>}
        </div>
        <div className="mt-2 text-[11px] text-ink-mute">Notificações do sistema: {perm === "granted" ? "permitidas" : perm === "denied" ? "bloqueadas no navegador" : perm === "unsupported" ? "não suportadas" : "ainda não permitidas"}</div>
      </section>

      <section className="card p-4">
        <div className="mb-3 flex items-center justify-between"><h2 className="flex items-center gap-2 text-sm font-semibold"><Waves size={16} className="text-primary-soft" />Biblioteca de Timbres Sonoros</h2><span className="eyebrow">{TIMBRES.length} disponíveis</span></div>
        <ul className="flex flex-col gap-1">
          {TIMBRES.map((t) => (
            <li key={t.id} className="flex items-center gap-3 rounded-lg p-2 hover:bg-surface-3">
              <button aria-label={`Ouvir ${t.name}`} onClick={() => playTimbre(t.id, settings.volume / 100)} className="grid h-10 w-10 place-items-center rounded-full bg-primary/20 text-primary-soft hover:bg-primary/30"><Play size={16} /></button>
              <button className="min-w-0 flex-1 text-left" onClick={() => setSettings({ timbre: t.id })}>
                <div className="flex items-center gap-2 text-sm font-semibold">{t.name}<span className="rounded bg-surface-3 px-1.5 py-px text-[10px] font-bold tracking-wide text-primary-soft">{t.badge}</span></div>
                <div className="truncate text-xs text-ink-mute">{t.desc}</div>
              </button>
              <button role="radio" aria-checked={settings.timbre === t.id} aria-label={`Usar ${t.name} como padrão`} onClick={() => setSettings({ timbre: t.id })} className={cn("grid h-5 w-5 place-items-center rounded-full border-2", settings.timbre === t.id ? "border-primary" : "border-stroke")}>{settings.timbre === t.id && <span className="h-2.5 w-2.5 rounded-full bg-primary" />}</button>
            </li>
          ))}
        </ul>
        <div className="mt-3 flex items-center gap-3 border-t border-stroke pt-3 text-xs text-ink-dim"><Volume2 size={15} /><span className="shrink-0">Volume do alerta</span>
          <input type="range" min={10} max={100} value={settings.volume} onChange={(e) => setSettings({ volume: +e.target.value })} onPointerUp={() => playTimbre(settings.timbre, settings.volume / 100)} aria-label="Volume do alerta" className="h-1.5 flex-1 accent-primary" />
          <span className="mono w-10 text-right text-ink">{settings.volume}%</span></div>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between"><h2 className="flex items-center gap-2 text-sm font-semibold"><AlarmClock size={16} className="text-primary-soft" />Próximos Alarmes de Hoje</h2><span className="text-xs font-bold text-emerald-soft">{queue.length} NA FILA</span></div>
        {!next && <Empty>Nenhum alarme pendente hoje. Crie um com “com lembrete” no comando rápido.</Empty>}
        {next && (
          <div className="card border-primary/30 p-4">
            <div className="flex items-start justify-between gap-3">
              <span className="chip !bg-surface-3 !text-primary-soft"><span className="h-1.5 w-1.5 rounded-full bg-primary" />{eta <= 0 ? "IMINENTE" : `EM ${eta >= 60 ? `${Math.floor(eta / 60)}h${eta % 60 ? ` ${eta % 60}` : ""}` : eta} ${eta >= 60 ? "" : "MIN"}`}</span>
              <span className="mono text-2xl font-bold">{next.time}</span>
            </div>
            <div className="mt-2 text-xl font-bold tracking-tight">{next.title}</div>
            <div className="text-sm text-ink-dim">{next.sub}</div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <label className="rounded-lg bg-surface-1 p-3 text-xs text-ink-mute"><span className="flex items-center gap-1"><Timer size={12} />AVISO PRÉVIO</span>
                <select value={next.lead} onChange={(e) => { const v = +e.target.value; next.kind === "event" ? updateEvent(next.id, { alarm_lead_min: v }) : updateTask(next.id, { alarm_lead_min: v }); }} className="mt-1 w-full bg-transparent text-sm font-semibold text-ink outline-none">
                  {[0, 5, 10, 15, 30].map((m) => <option key={m} value={m} className="bg-surface-2">{m ? `${m} min antes` : "No horário"}</option>)}
                </select></label>
              <label className="rounded-lg bg-surface-1 p-3 text-xs text-ink-mute"><span className="flex items-center gap-1"><Volume2 size={12} />TIMBRE</span>
                <select value={next.timbre} onChange={(e) => { const v = e.target.value as Timbre; next.kind === "event" ? updateEvent(next.id, { timbre: v }) : updateTask(next.id, { timbre: v }); playTimbre(v, settings.volume / 100); }} className="mt-1 w-full bg-transparent text-sm font-semibold text-ink outline-none">
                  {TIMBRES.map((t) => <option key={t.id} value={t.id} className="bg-surface-2">{t.name}</option>)}
                </select></label>
            </div>
            <div className="mt-3 flex gap-2">
              <button className="btn-ghost flex-1" onClick={() => snooze(next.key, 10)}><AlarmClock size={15} />+10m</button>
              <button className="btn flex-[1.4] bg-emerald text-white hover:brightness-110" onClick={() => { next.kind === "task" ? toggleTask(next.id) : updateEvent(next.id, { alarm: false }); toast("Concluído"); }}><Check size={16} />Concluir</button>
            </div>
          </div>
        )}
        {queue.slice(1).length > 0 && (
          <ul className="mt-3 flex flex-col gap-2">
            {queue.slice(1).map((q) => (
              <li key={q.key} className="card flex items-center gap-3 p-3">
                <div className="mono rounded-md bg-surface-3 px-2 py-1 text-center text-sm font-bold">{q.time}<div className="text-[9px] font-semibold text-ink-mute">{dateLabel(todayStr()).toUpperCase()}</div></div>
                <div className="min-w-0 flex-1"><div className={cn("truncate text-sm font-semibold", q.high && "text-coral-soft")}>{q.title}</div><div className="truncate text-xs text-ink-mute">{q.sub} · {q.lead ? `${q.lead} min antes` : "no horário"}</div></div>
                <button aria-label="Ouvir timbre" onClick={() => playTimbre(q.timbre, settings.volume / 100)} className="text-ink-mute hover:text-primary-soft"><Volume2 size={16} /></button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card p-4">
        <h2 className="mb-2 text-sm font-semibold">Comportamento do Alarme</h2>
        <Row title="Repetir som até desligar" desc="O áudio toca continuamente até você dispensar ou adiar." on={settings.repeatUntilOff} set={(v) => setSettings({ repeatUntilOff: v })} />
        <Row title="Alertas para tarefas atrasadas" desc="Repete o aviso de 15 em 15 minutos até a resolução." on={settings.overdueAlerts} set={(v) => setSettings({ overdueAlerts: v })} />
        <Row title="Vibração háptica" desc="Usa a Vibration API em smartphones compatíveis." on={settings.haptics} set={(v) => setSettings({ haptics: v })} />
        <Row title="Som ativo" desc="Desligue para receber só avisos visuais." on={settings.sound} set={(v) => setSettings({ sound: v })} />
        <Row title="Silenciar não críticos no sono" desc="Entre 22:00 e 07:00 só tocam foco e tarefas de alta prioridade." on={settings.quietNight} set={(v) => setSettings({ quietNight: v })} icon={<Moon size={14} />} />
      </section>

      <section className="card p-4">
        <h2 className="mb-1 flex items-center gap-2 text-sm font-semibold"><ShieldAlert size={16} className="text-amber" />Alarmes com a tela bloqueada</h2>
        <p className="text-xs text-ink-dim">Navegadores pausam abas em segundo plano. Para o NEXORA soar com o aparelho em repouso:</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <div className="rounded-lg bg-surface-1 p-3 text-xs text-ink-dim"><div className="mb-1 flex items-center gap-1.5 font-semibold text-ink"><Smartphone size={14} />No iPhone (iOS)</div>Adicione à Tela de Início pelo Safari e permita notificações imediatas.</div>
          <div className="rounded-lg bg-surface-1 p-3 text-xs text-ink-dim"><div className="mb-1 flex items-center gap-1.5 font-semibold text-ink"><Smartphone size={14} />No Android</div>Instale o app (PWA) e desative a “Otimização de Bateria” para o navegador.</div>
        </div>
      </section>
    </div>
  );
}

function Row({ title, desc, on, set, icon }: { title: string; desc: string; on: boolean; set: (v: boolean) => void; icon?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-4 border-t border-stroke py-3 first:border-0">
      <div className="min-w-0 flex-1"><div className="flex items-center gap-1.5 text-sm font-semibold">{icon}{title}</div><div className="text-xs text-ink-mute">{desc}</div></div>
      <Switch on={on} onChange={set} label={title} />
    </div>
  );
}
