"use client";
import { BellRing, CalendarDays, CheckCheck, Cloud, Droplets, Hourglass, Sparkles, SlidersHorizontal, Volume2 } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Switch, PageHeader, Empty } from "@/components/ui";
import { cn, relTime } from "@/lib/utils";
import { useApp } from "@/store/app";
import type { NotificationItem } from "@/types/database";

const TABS = [{ id: "all", label: "Todas" }, { id: "alarm", label: "Alertas Sonoros" }, { id: "copilot", label: "IA Copilot" }, { id: "other", label: "Sistema & Foco" }] as const;
const ICON: Record<NotificationItem["kind"], React.ReactNode> = {
  alarm: <Volume2 size={18} />, copilot: <Sparkles size={18} />, habit: <Droplets size={18} />, system: <Cloud size={18} />, focus: <Hourglass size={18} />,
};
const TONE: Record<NotificationItem["kind"], string> = { alarm: "bg-primary/20 text-primary-soft", copilot: "bg-periwinkle/25 text-primary-soft", habit: "bg-emerald/15 text-emerald-soft", system: "bg-surface-3 text-ink-dim", focus: "bg-amber/15 text-amber" };
const BAR: Record<NotificationItem["kind"], string> = { alarm: "bg-primary", copilot: "bg-periwinkle", habit: "bg-emerald", system: "bg-stroke", focus: "bg-amber" };

export default function Notificacoes() {
  const { notifications, markAllRead, updateNotification, clearOld, settings, setSettings } = useApp();
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("all");
  const unread = notifications.filter((n) => !n.read).length;
  const list = useMemo(() => notifications.filter((n) => !n.dismissed).filter((n) => tab === "all" || (tab === "other" ? n.kind === "system" || n.kind === "focus" || n.kind === "habit" : n.kind === tab)), [notifications, tab]);
  const groups = useMemo(() => {
    const today = new Date().toDateString(), y = new Date(Date.now() - 86400000).toDateString();
    const g: Record<string, NotificationItem[]> = { Hoje: [], Ontem: [], Anteriores: [] };
    list.forEach((n) => { const d = new Date(n.created_at).toDateString(); (d === today ? g.Hoje : d === y ? g.Ontem : g.Anteriores).push(n); });
    return g;
  }, [list]);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
      <PageHeader eyebrow="Central" title="Notificações & Alertas" right={
        <div className="flex items-center gap-2">
          <span className="chip !px-3 !py-1.5">{unread} {unread === 1 ? "não lida" : "não lidas"}</span>
          <button className="btn-ghost btn-sm" onClick={markAllRead}><CheckCheck size={14} />Marcar lidas</button>
        </div>
      } />
      <div className="flex gap-2 overflow-x-auto pb-1" role="tablist">
        {TABS.map((t) => <button key={t.id} role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)} className={cn("chip !px-3.5 !py-1.5 !text-xs whitespace-nowrap", tab === t.id && "!border-primary/60 !bg-primary/20 !text-primary-soft")}>{t.label}</button>)}
      </div>
      {!list.length && <Empty>Nenhuma notificação por aqui. Alarmes, sugestões do Copilot e conquistas aparecem nesta central.</Empty>}
      {Object.entries(groups).map(([name, items]) => items.length > 0 && (
        <section key={name} className="flex flex-col gap-3">
          <div className="flex items-center justify-between"><span className="eyebrow">{name}</span><span className="text-xs text-ink-mute">{items.length} {items.length === 1 ? "evento" : "eventos"}</span></div>
          {items.map((n) => (
            <article key={n.id} className="card relative overflow-hidden p-4 pl-5" onMouseEnter={() => !n.read && updateNotification(n.id, { read: true })}>
              <span className={cn("absolute bottom-0 left-0 top-0 w-1", BAR[n.kind])} />
              <div className="flex items-start gap-3">
                <span className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-lg", TONE[n.kind])}>{ICON[n.kind]}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2"><h3 className="text-[15px] font-semibold leading-snug">{n.title}</h3>{!n.read && <span className="h-2 w-2 rounded-full bg-primary" aria-label="Não lida" />}{n.priority === "high" && <span className="chip !border-emerald/25 !bg-emerald/15 !text-emerald-soft">ALTA PRIORIDADE</span>}</div>
                  <div className="mono text-xs text-ink-mute">{new Date(n.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })} · {relTime(n.created_at)}</div>
                  <p className="mt-2 text-sm leading-relaxed text-ink-dim">{n.body}</p>
                  {n.action && (
                    <div className="mt-3 flex gap-2">
                      <Link href={n.action.type === "open" ? n.action.href : "/ia"} className={n.kind === "copilot" ? "btn bg-periwinkle text-white h-9 text-xs" : "btn-soft h-9 text-xs"} onClick={() => updateNotification(n.id, { read: true, dismissed: true })}>
                        {n.kind === "copilot" ? <Sparkles size={14} /> : <CalendarDays size={14} />}{n.action.label}
                      </Link>
                      <button className="btn-ghost btn-sm h-9" onClick={() => updateNotification(n.id, { dismissed: true, read: true })}>{n.kind === "copilot" ? "Ignorar" : "Dispensar"}</button>
                    </div>
                  )}
                </div>
              </div>
            </article>
          ))}
        </section>
      ))}

      <section className="card p-4">
        <div className="mb-3 flex items-center justify-between"><h2 className="flex items-center gap-2 text-sm font-semibold"><SlidersHorizontal size={15} className="text-primary-soft" />Preferências Rápidas</h2><button className="text-xs font-semibold text-coral-soft" onClick={clearOld}>Limpar 7+ dias</button></div>
        <div className="flex items-center gap-4"><div className="flex-1"><div className="text-sm font-semibold">Silenciar não críticas no sono</div><div className="text-xs text-ink-mute">Bloqueia avisos rotineiros entre 22:00 e 07:00.</div></div><Switch on={settings.quietNight} onChange={(v) => setSettings({ quietNight: v })} label="Silenciar não críticas no sono" /></div>
        <div className="mt-3 flex items-start gap-2 rounded-lg bg-surface-1 p-3 text-xs text-ink-dim"><BellRing size={14} className="mt-0.5 shrink-0 text-emerald-soft" />Alertas de foco e tarefas de alta prioridade furam o modo silencioso.</div>
      </section>
    </div>
  );
}
