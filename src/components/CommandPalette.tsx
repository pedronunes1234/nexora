"use client";
import { CalendarDays, FileText, Hourglass, ListChecks, Plus, Search, Settings, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useApp } from "@/store/app";
import { useTimer } from "@/store/timer";
import { useUI } from "@/store/ui";
import { cn, dateLabel } from "@/lib/utils";

interface Cmd { id: string; label: string; hint?: string; icon: React.ReactNode; run: () => void }

export default function CommandPalette() {
  const open = useApp((s) => s.paletteOpen);
  const setOpen = useApp((s) => s.setPalette);
  const tasks = useApp((s) => s.tasks);
  const events = useApp((s) => s.events);
  const notes = useApp((s) => s.notes);
  const openAdd = useUI((s) => s.openAdd);
  const router = useRouter();
  const [q, setQ] = useState("");
  const [sel, setSel] = useState(0);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => { if (open) { setQ(""); setSel(0); setTimeout(() => input.current?.focus(), 30); } }, [open]);

  const items = useMemo<Cmd[]>(() => {
    const go = (href: string) => () => { router.push(href); setOpen(false); };
    const base: Cmd[] = [
      { id: "add", label: "Novo item", hint: "N", icon: <Plus size={16} />, run: () => { setOpen(false); openAdd(); } },
      { id: "focus", label: "Iniciar sessão de foco", icon: <Hourglass size={16} />, run: () => { go("/foco")(); useTimer.getState().start(); } },
      { id: "p1", label: "Ir para Meu Dia", icon: <ListChecks size={16} />, run: go("/") },
      { id: "p2", label: "Ir para Agenda", icon: <CalendarDays size={16} />, run: go("/agenda") },
      { id: "p3", label: "Ir para Copilot de IA", icon: <Sparkles size={16} />, run: go("/ia") },
      { id: "p4", label: "Ir para Espaços e Notas", icon: <FileText size={16} />, run: go("/espacos") },
      { id: "p5", label: "Ir para Ajustes", icon: <Settings size={16} />, run: go("/perfil") },
    ];
    const needle = q.trim().toLowerCase();
    if (!needle) return base;
    const found: Cmd[] = [
      ...tasks.filter((t) => t.title.toLowerCase().includes(needle)).slice(0, 5).map((t) => ({ id: "t" + t.id, label: t.title, hint: t.due_date ? dateLabel(t.due_date) : "Tarefa", icon: <ListChecks size={16} />, run: go("/") })),
      ...events.filter((e) => e.title.toLowerCase().includes(needle)).slice(0, 5).map((e) => ({ id: "e" + e.id, label: e.title, hint: `${dateLabel(e.date)} ${e.start_time}`, icon: <CalendarDays size={16} />, run: go("/agenda") })),
      ...notes.filter((n) => (n.title + n.body).toLowerCase().includes(needle)).slice(0, 5).map((n) => ({ id: "n" + n.id, label: n.title, hint: "Nota", icon: <FileText size={16} />, run: go("/espacos") })),
    ];
    return [...found, ...base.filter((b) => b.label.toLowerCase().includes(needle))];
  }, [q, tasks, events, notes, router, setOpen, openAdd]);

  if (!open) return null;
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setSel((s) => Math.min(items.length - 1, s + 1)); }
    if (e.key === "ArrowUp") { e.preventDefault(); setSel((s) => Math.max(0, s - 1)); }
    if (e.key === "Enter") { e.preventDefault(); items[sel]?.run(); }
    if (e.key === "Escape") setOpen(false);
  };
  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center bg-black/60 px-4 pt-[12vh] backdrop-blur-sm animate-rise" onMouseDown={(e) => e.target === e.currentTarget && setOpen(false)}>
      <div role="dialog" aria-label="Paleta de comandos" className="w-full max-w-xl overflow-hidden rounded-xl bg-surface-2/95 shadow-l3 backdrop-blur-xl">
        <div className="flex items-center gap-3 border-b border-stroke px-4">
          <Search size={18} className="text-ink-mute" />
          <input ref={input} value={q} onChange={(e) => { setQ(e.target.value); setSel(0); }} onKeyDown={onKey} placeholder="Buscar tarefas, notas ou comandos…" aria-label="Buscar" className="h-14 flex-1 bg-transparent text-lg tracking-tight outline-none placeholder:text-ink-mute" />
          <span className="kbd">esc</span>
        </div>
        <ul className="max-h-[50vh] overflow-y-auto p-2">
          {items.length === 0 && <li className="px-3 py-6 text-center text-sm text-ink-mute">Nada encontrado para “{q}”.</li>}
          {items.map((it, i) => (
            <li key={it.id}>
              <button onMouseEnter={() => setSel(i)} onClick={it.run} className={cn("flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm", i === sel ? "bg-surface-3 text-white" : "text-ink-dim")}>
                <span className={i === sel ? "text-primary-soft" : ""}>{it.icon}</span>
                <span className="flex-1 truncate font-medium">{it.label}</span>
                {it.hint && <span className="mono text-[11px] text-ink-mute">{it.hint}</span>}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
