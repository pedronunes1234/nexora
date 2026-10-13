"use client";
import { Bell, BarChart3, CalendarDays, Hourglass, Inbox, LayoutGrid, Plus, Search, Settings, Sparkles, Sun, X, Zap } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useApp } from "@/store/app";
import { useTimer } from "@/store/timer";
import { useUI } from "@/store/ui";
import { cn, fmtClock } from "@/lib/utils";
import { Avatar } from "./ui";
import CommandPalette from "./CommandPalette";
import NewItemSheet from "./NewItemSheet";

const MAIN = [
  { href: "/", label: "Meu Dia", short: "Hoje", icon: Sun },
  { href: "/agenda", label: "Calendário & Agenda", short: "Agenda", icon: CalendarDays },
  { href: "/lembretes", label: "Lembretes", short: "Lembretes", icon: Bell },
  { href: "/espacos", label: "Espaços & Notas", short: "Espaços", icon: LayoutGrid },
  { href: "/ia", label: "Copilot Nexora", short: "IA", icon: Sparkles },
];
const EXTRA = [
  { href: "/foco", label: "Flow State Timer", icon: Hourglass },
  { href: "/estatisticas", label: "Estatísticas", icon: BarChart3 },
  { href: "/notificacoes", label: "Notificações", icon: Inbox },
  { href: "/perfil", label: "Ajustes", icon: Settings },
];

const isActive = (path: string, href: string) => (href === "/" ? path === "/" : path.startsWith(href));

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const path = usePathname();
  const router = useRouter();
  const ready = useApp((s) => s.ready);
  const onboarded = useApp((s) => s.settings.onboarded);
  const profile = useApp((s) => s.profile);
  const unread = useApp((s) => s.notifications.filter((n) => !n.read).length);
  const hasDueAlarm = useApp((s) => s.events.some((e) => e.alarm && !e.alarm_fired));
  const toasts = useApp((s) => s.toasts);
  const dismiss = useApp((s) => s.dismissToast);
  const ringing = useApp((s) => s.ringing);
  const setPalette = useApp((s) => s.setPalette);
  const timerStatus = useTimer((s) => s.status);
  const left = useTimer((s) => s.leftSec);
  const openAdd = useUI((s) => s.openAdd);

  useEffect(() => {
    setMounted(true);
    void useApp.getState().hydrate();
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);

  useEffect(() => {
    if (!ready) return;
    useApp.getState().tick();
    const a = setInterval(() => useApp.getState().tick(), 10000);
    const b = setInterval(() => useTimer.getState().tick(), 500);
    return () => { clearInterval(a); clearInterval(b); };
  }, [ready]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setPalette(true); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [setPalette]);

  useEffect(() => {
    if (ready && !onboarded && path !== "/onboarding") router.replace("/onboarding");
  }, [ready, onboarded, path, router]);

  if (!mounted || !ready) {
    return <div className="grid min-h-dvh place-items-center"><div className="flex items-center gap-3 text-ink-dim"><span className="grid h-9 w-9 place-items-center rounded-lg bg-primary/20 text-primary-soft"><Zap size={18} /></span><span className="text-sm font-semibold tracking-wide">NEXORA</span></div></div>;
  }
  if (path === "/onboarding") return <>{children}<Toasts toasts={toasts} dismiss={dismiss} /></>;

  const running = timerStatus !== "idle";
  const hideFab = path === "/ia" || path === "/foco";
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[240px_minmax(0,1fr)]">
      {/* Dock lateral (desktop) */}
      <aside className="sticky top-0 hidden h-dvh flex-col gap-6 border-r border-stroke bg-surface-1/80 p-4 backdrop-blur lg:flex">
        <Link href="/" className="flex items-center gap-2.5 px-2 pt-1">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-periwinkle to-primary-container text-white"><Zap size={17} /></span>
          <span className="text-[17px] font-extrabold tracking-[.04em]">NEXORA</span>
        </Link>
        <nav aria-label="Principal" className="flex flex-col gap-5 overflow-y-auto">
          <div>
            <div className="eyebrow mb-2 px-2">Visão Geral</div>
            <div className="flex flex-col gap-0.5">{MAIN.map((n) => <SideLink key={n.href} {...n} active={isActive(path, n.href)} badge={n.href === "/lembretes" && hasDueAlarm} />)}</div>
          </div>
          <div>
            <div className="eyebrow mb-2 px-2">Ferramentas</div>
            <div className="flex flex-col gap-0.5">{EXTRA.map((n) => <SideLink key={n.href} {...n} active={isActive(path, n.href)} badge={n.href === "/notificacoes" && unread > 0} />)}</div>
          </div>
        </nav>
        <Link href="/perfil" className="mt-auto flex items-center gap-3 rounded-lg border border-stroke bg-surface-2 p-2.5 hover:border-primary/40">
          <Avatar name={profile.name} color={profile.avatar_color} url={profile.avatar_url} size={34} />
          <div className="min-w-0"><div className="truncate text-sm font-semibold">{profile.name}</div><div className="text-[11px] text-ink-mute">Local-first · gratuito</div></div>
        </Link>
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-30 flex items-center gap-2 border-b border-stroke/60 bg-canvas/80 px-4 py-3 pt-[calc(0.75rem+env(safe-area-inset-top))] backdrop-blur-xl lg:px-8">
          <Link href="/" className="flex items-center gap-2 lg:hidden">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-periwinkle to-primary-container text-white"><Zap size={16} /></span>
            <span className="text-[15px] font-extrabold tracking-[.04em]">NEXORA</span>
          </Link>
          <div className="ml-auto flex items-center gap-2">
            <button onClick={() => setPalette(true)} className="flex h-9 items-center gap-2 rounded-lg border border-stroke bg-surface-1 px-3 text-sm text-ink-mute hover:border-primary/40" aria-label="Buscar">
              <Search size={15} /><span className="hidden sm:inline">Buscar…</span><span className="kbd">⌘K</span>
            </button>
            <Link href="/foco" className={cn("hidden h-9 items-center gap-2 rounded-lg border px-3 text-sm sm:flex", running ? "border-primary/50 bg-primary/15 text-primary-soft" : "border-stroke bg-surface-1 text-ink-dim")} aria-label="Timer de foco">
              <Hourglass size={14} /><span className="mono font-semibold">{fmtClock(running ? left : useTimer.getState().totalSec)}</span><span className="text-xs">Flow</span>
            </Link>
            <Link href="/notificacoes" aria-label="Notificações" className="relative grid h-9 w-9 place-items-center rounded-lg border border-stroke bg-surface-1 text-ink-dim hover:border-primary/40">
              <Bell size={16} />{unread > 0 && <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-coral px-1 text-[10px] font-bold text-white">{unread}</span>}
            </Link>
            <Link href="/perfil" aria-label="Perfil" className="relative lg:hidden">
              <Avatar name={profile.name} color={profile.avatar_color} url={profile.avatar_url} size={36} />
              <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-canvas bg-emerald" />
            </Link>
          </div>
        </header>

        {ringing && (
          <div className="mx-4 mt-3 flex items-center gap-3 rounded-lg border border-primary/50 bg-primary/15 px-4 py-3 lg:mx-8" role="alert">
            <Bell className="animate-pulse text-primary-soft" size={18} />
            <div className="min-w-0 flex-1"><div className="truncate text-sm font-semibold">{ringing.title}</div><div className="text-xs text-ink-dim">Alarme tocando até você dispensar</div></div>
            <button className="btn-ghost btn-sm" onClick={() => useApp.getState().snooze(ringing.key, 10)}>+10m</button>
            <button className="btn-primary btn-sm" onClick={() => useApp.getState().stopRinging()}>Dispensar</button>
          </div>
        )}

        <main className="mx-auto w-full max-w-[1400px] px-4 pb-32 pt-5 lg:px-8 lg:pb-12 lg:pt-7">{children}</main>
      </div>

      {/* Dock flutuante (mobile) */}
      <nav aria-label="Navegação" className="fixed inset-x-3 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-40 grid grid-cols-5 rounded-xl border border-stroke bg-surface-1/90 px-1 py-1.5 shadow-dock backdrop-blur-2xl lg:hidden">
        {MAIN.map((n) => {
          const on = isActive(path, n.href);
          const Icon = n.icon;
          return (
            <Link key={n.href} href={n.href} aria-current={on ? "page" : undefined} className={cn("relative flex flex-col items-center gap-0.5 rounded-lg py-1.5 text-[11px] font-medium", on ? "text-primary-soft" : "text-ink-mute")}>
              <Icon size={20} />{n.short}
              {n.href === "/lembretes" && hasDueAlarm && <span className="absolute right-[28%] top-1 h-2 w-2 rounded-full bg-amber" />}
            </Link>
          );
        })}
      </nav>
      {!hideFab && (
        <button onClick={() => openAdd()} aria-label="Novo item" className="fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom))] right-4 z-40 grid h-14 w-14 place-items-center rounded-full bg-primary text-white shadow-glow active:scale-95 lg:hidden"><Plus size={26} /></button>
      )}
      <CommandPalette />
      <NewItemSheet />
      <Toasts toasts={toasts} dismiss={dismiss} />
    </div>
  );
}

function SideLink({ href, label, icon: Icon, active, badge }: { href: string; label: string; icon: typeof Sun; active: boolean; badge?: boolean }) {
  return (
    <Link href={href} aria-current={active ? "page" : undefined} className={cn("relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition", active ? "bg-primary/15 text-primary-soft" : "text-ink-dim hover:bg-surface-2 hover:text-ink")}>
      {active && <span className="absolute left-0 top-2 bottom-2 w-0.5 rounded bg-primary" />}
      <Icon size={17} />{label}
      {badge && <span className="ml-auto h-2 w-2 rounded-full bg-amber" />}
    </Link>
  );
}

function Toasts({ toasts, dismiss }: { toasts: { id: string; text: string; tone: string }[]; dismiss: (id: string) => void }) {
  return (
    <div className="pointer-events-none fixed inset-x-4 top-[calc(4.5rem+env(safe-area-inset-top))] z-[70] mx-auto flex max-w-md flex-col gap-2" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={cn("pointer-events-auto flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-semibold shadow-dock animate-rise", t.tone === "alarm" ? "bg-primary text-white" : t.tone === "warn" ? "bg-amber text-black" : "bg-ink text-canvas")}>
          <span className="flex-1">{t.text}</span>
          <button onClick={() => dismiss(t.id)} aria-label="Fechar aviso" className="opacity-70 hover:opacity-100"><X size={15} /></button>
        </div>
      ))}
    </div>
  );
}
