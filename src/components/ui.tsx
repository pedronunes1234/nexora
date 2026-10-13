"use client";
import { X } from "lucide-react";
import { useEffect } from "react";
import { cn } from "@/lib/utils";

export function Ring({ value, size = 56, stroke = 5, color = "#10b981", children }: { value: number; size?: number; stroke?: number; color?: string; children?: React.ReactNode }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const p = Math.min(1, Math.max(0, value));
  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90 absolute inset-0">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#202632" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={`${c * p} ${c}`} style={{ transition: "stroke-dasharray .5s" }} />
      </svg>
      <div className="relative text-xs font-bold tabular">{children}</div>
    </div>
  );
}

export function Bar({ value, color = "bg-primary", className }: { value: number; color?: string; className?: string }) {
  return (
    <div className={cn("h-1.5 rounded-full bg-surface-3 overflow-hidden", className)}>
      <div className={cn("h-full rounded-full transition-[width] duration-500", color)} style={{ width: `${Math.min(100, Math.max(0, value * 100))}%` }} />
    </div>
  );
}

export function Switch({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button role="switch" aria-checked={on} aria-label={label} onClick={() => onChange(!on)}
      className={cn("relative h-6 w-11 shrink-0 rounded-full border transition", on ? "bg-primary border-primary" : "bg-surface-3 border-stroke")}>
      <span className={cn("absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white transition-transform", on ? "translate-x-5" : "bg-ink-mute")} />
    </button>
  );
}

export function Sheet({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode; wide?: boolean }) {
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm animate-rise" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-label={title} className={cn("w-full max-h-[92dvh] overflow-y-auto rounded-t-xl sm:rounded-xl bg-surface-2/95 shadow-l3 backdrop-blur-xl p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))]", wide ? "sm:max-w-2xl" : "sm:max-w-md")}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
          <button onClick={onClose} aria-label="Fechar" className="grid h-8 w-8 place-items-center rounded-lg text-ink-dim hover:bg-surface-3"><X size={18} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function SectionHeader({ title, right, icon }: { title: string; right?: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <h3 className="flex items-center gap-2 text-sm font-semibold tracking-tight">{icon}{title}</h3>
      {right && <div className="text-xs text-ink-mute">{right}</div>}
    </div>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <div className="rounded-lg border border-dashed border-stroke px-4 py-6 text-center text-sm text-ink-mute">{children}</div>;
}

export function Avatar({ name, color, url, size = 36 }: { name: string; color?: string; url?: string; size?: number }) {
  const ini = name.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("") || "N";
  // eslint-disable-next-line @next/next/no-img-element
  if (url) return <img src={url} alt={name} width={size} height={size} className="rounded-full object-cover" style={{ width: size, height: size }} />;
  return <div className="grid place-items-center rounded-full font-bold text-white" style={{ width: size, height: size, background: color ?? "#8b5cf6", fontSize: size * 0.38 }}>{ini}</div>;
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="flex flex-col gap-1.5 text-xs font-semibold text-ink-dim">{label}{children}</label>;
}

export function PageHeader({ eyebrow, title, right }: { eyebrow?: string; title: string; right?: React.ReactNode }) {
  return (
    <div className="flex items-end justify-between gap-3 flex-wrap">
      <div>
        {eyebrow && <div className="eyebrow mb-1">{eyebrow}</div>}
        <h1 className="text-[28px] leading-[34px] sm:text-4xl sm:leading-[42px] font-bold tracking-[-0.03em]">{title}</h1>
      </div>
      {right}
    </div>
  );
}
