"use client";
import { ArrowRight, CalendarCheck, Check, Mic, Send, SlidersHorizontal, Sparkles, WandSparkles, Zap } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { applyToEvents, countConflicts, localCopilot, SLOT_LABEL, type PlanChange, type Proposal } from "@/lib/copilot";
import { cn, fmtDur, todayStr } from "@/lib/utils";
import { useApp } from "@/store/app";
import { useChat } from "@/store/chat";

const SUGGESTIONS = [
  { icon: WandSparkles, text: "Otimizar restante da semana", prompt: "Adie as reuniões da tarde para amanhã" },
  { icon: Zap, text: "Reservar 2h de foco agora", prompt: "Reserve 2h de foco profundo agora" },
  { icon: CalendarCheck, text: "Bloquear 1h de estudo amanhã às 9h", prompt: "Bloqueie 1h de estudo amanhã às 9h" },
];

export default function Copilot() {
  const { msgs, busy, push, patch, setBusy } = useChat();
  const events = useApp((s) => s.events);
  const tasks = useApp((s) => s.tasks);
  const applyChanges = useApp((s) => s.applyChanges);
  const toast = useApp((s) => s.toast);
  const [text, setText] = useState("");
  const [adjust, setAdjust] = useState<string | null>(null);
  const end = useRef<HTMLDivElement>(null);
  const fired = useRef(false);
  const T = todayStr();
  const meetings = events.filter((e) => e.date === T && e.kind !== "focus").length;
  const pending = tasks.filter((t) => !t.completed).length;

  const send = useCallback(async (q: string) => {
    q = q.trim();
    if (!q || useChat.getState().busy) return;
    push({ role: "user", text: q });
    setBusy(true);
    const st = useApp.getState();
    let proposal: Proposal | null = null;
    try {
      const r = await fetch("/api/copilot", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text: q, events: st.events, tasks: st.tasks, now: new Date().toISOString() }) });
      const data = await r.json();
      if (data.source === "claude" && Array.isArray(data.changes)) {
        const after = applyToEvents(st.events, data.changes as PlanChange[], "tmp");
        proposal = { source: "claude", message: data.message || "Plano pronto.", changes: data.changes, conflicts: countConflicts(after) };
      }
    } catch { /* offline: usa o interpretador local */ }
    if (!proposal) proposal = localCopilot(q, st.events, st.tasks);
    setBusy(false);
    push({ role: "ai", text: proposal.message, proposal: proposal.changes.length ? proposal : undefined });
  }, [push, setBusy]);

  useEffect(() => {
    if (fired.current) return;
    const q = new URLSearchParams(window.location.search).get("q");
    if (q) { fired.current = true; void send(q); window.history.replaceState(null, "", "/ia"); }
  }, [send]);
  useEffect(() => { end.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [msgs.length, busy]);

  const apply = (id: string, p: Proposal, off: string[]) => {
    const changes = p.changes.filter((c) => !off.includes(c.id));
    if (!changes.length) return toast("Nenhuma mudança selecionada", "warn");
    applyChanges(changes);
    patch(id, { applied: true });
    setAdjust(null);
    toast(`${changes.length} mudança${changes.length > 1 ? "s" : ""} aplicada${changes.length > 1 ? "s" : ""} na agenda`);
  };

  const mic = () => {
    const w = window as unknown as { SpeechRecognition?: new () => { lang: string; onresult: (e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void; onerror: () => void; start: () => void }; webkitSpeechRecognition?: new () => { lang: string; onresult: (e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void; onerror: () => void; start: () => void } };
    const C = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!C) return toast("Ditado por voz indisponível neste navegador", "warn");
    try { const r = new C(); r.lang = "pt-BR"; r.onresult = (e) => setText(e.results[0][0].transcript); r.onerror = () => toast("Não foi possível usar o microfone", "warn"); r.start(); } catch { toast("Ditado por voz indisponível", "warn"); }
  };
  const lastSource = useMemo(() => [...msgs].reverse().find((m) => m.proposal)?.proposal?.source, [msgs]);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 pb-24 lg:pb-0">
      <header className="flex items-center gap-4 rounded-xl border border-stroke bg-gradient-to-br from-primary/20 via-surface-2 to-surface-2 p-4">
        <div className="relative grid h-14 w-14 place-items-center rounded-xl bg-gradient-to-br from-periwinkle to-primary-container text-white"><Sparkles size={26} /><span className="absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full border-2 border-surface-2 bg-emerald" /></div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2"><h1 className="text-xl font-bold tracking-tight">Nexora Copilot</h1><span className="chip !bg-periwinkle/25 !text-primary-soft">Kinetic v2.4</span></div>
          <div className="text-xs text-emerald-soft">Sincronizado com Agenda & Notas{lastSource ? ` · ${lastSource === "claude" ? "Claude" : "interpretador local"}` : ""}</div>
        </div>
        <span className="chip !border-emerald/30 !bg-emerald/15 !text-emerald-soft">ATIVO</span>
      </header>

      <div className="card flex items-center gap-3 px-4 py-3 text-sm">
        <CalendarCheck size={18} className="text-primary-soft" />
        <span><b>{meetings}</b> {meetings === 1 ? "compromisso" : "compromissos"} hoje e <b className="text-emerald-soft">{pending}</b> {pending === 1 ? "tarefa pendente" : "tarefas pendentes"}</span>
      </div>

      <div className="flex flex-col gap-4">
        {!msgs.length && (
          <div className="rounded-lg border border-dashed border-stroke p-5 text-sm text-ink-dim">
            <div className="mb-1 font-semibold text-ink">Peça qualquer reprogramação em linguagem natural</div>
            Exemplo: <i>“Tive um imprevisto, adie minhas reuniões da tarde para amanhã após as 14h e reserve 2h de foco agora.”</i>
          </div>
        )}
        {msgs.map((m) => m.role === "user" ? (
          <div key={m.id} className="self-end max-w-[88%] rounded-xl rounded-br-sm bg-periwinkle/80 px-4 py-3 text-[15px] text-white animate-rise">{m.text}
            <div className="mono mt-1 text-right text-[11px] text-white/70">{new Date(m.at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</div></div>
        ) : (
          <div key={m.id} className="flex flex-col gap-2 animate-rise">
            <div className="flex items-center gap-2 text-xs"><span className="grid h-6 w-6 place-items-center rounded-full bg-primary/25 text-primary-soft"><Sparkles size={12} /></span><b className="text-primary-soft">Nexora AI</b><span className="text-ink-mute">agora</span></div>
            <div className="rounded-xl rounded-tl-sm border border-stroke bg-surface-2 p-4">
              <p className="text-[15px] leading-relaxed">{m.text}</p>
              {m.proposal && <Preview id={m.id} p={m.proposal} off={m.off ?? []} applied={!!m.applied} adjusting={adjust === m.id}
                onToggle={(cid) => patch(m.id, { off: (m.off ?? []).includes(cid) ? (m.off ?? []).filter((x) => x !== cid) : [...(m.off ?? []), cid] })}
                onAdjust={() => setAdjust(adjust === m.id ? null : m.id)} onApply={() => apply(m.id, m.proposal!, m.off ?? [])} />}
            </div>
          </div>
        ))}
        {busy && <div className="flex items-center gap-2 text-sm text-ink-dim"><span className="h-2 w-2 animate-pulse rounded-full bg-primary" />Analisando sua grade horária…</div>}
        <div ref={end} />
      </div>

      <div className="sticky bottom-24 z-10 flex flex-col gap-3 bg-gradient-to-t from-canvas via-canvas to-transparent pt-3 lg:bottom-0">
        <div className="eyebrow">Ações recomendadas</div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {SUGGESTIONS.map((s) => <button key={s.text} onClick={() => void send(s.prompt)} className="chip !px-3 !py-2 !text-xs whitespace-nowrap hover:!border-primary/50"><s.icon size={14} className="text-primary-soft" />{s.text}</button>)}
        </div>
        <form onSubmit={(e) => { e.preventDefault(); const q = text; setText(""); void send(q); }} className="flex items-center gap-2 rounded-xl border border-stroke bg-surface-2 p-1.5 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/25">
          <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Peça qualquer reprogramação…" aria-label="Mensagem para o Copilot" maxLength={400} className="h-11 min-w-0 flex-1 bg-transparent px-3 text-sm outline-none placeholder:text-ink-mute" />
          <button type="button" onClick={mic} aria-label="Ditar por voz" className="grid h-10 w-10 place-items-center rounded-lg text-ink-dim hover:bg-surface-3"><Mic size={18} /></button>
          <button className="btn-soft !h-10 !w-10 !p-0" aria-label="Enviar" disabled={busy}><Send size={17} /></button>
        </form>
      </div>
    </div>
  );
}

function Preview({ p, off, applied, adjusting, onToggle, onAdjust, onApply }: { id: string; p: Proposal; off: string[]; applied: boolean; adjusting: boolean; onToggle: (id: string) => void; onAdjust: () => void; onApply: () => void }) {
  return (
    <div className="mt-4 rounded-lg bg-surface-lowest p-3">
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="eyebrow">Preview de reprogramação</span>
        <span className={cn("flex items-center gap-1 text-xs font-bold", p.conflicts ? "text-amber" : "text-emerald-soft")}><Zap size={13} />{p.conflicts ? `${p.conflicts} conflito${p.conflicts > 1 ? "s" : ""}` : "Otimização Zero Conflitos"}</span>
      </div>
      <div className="flex flex-col gap-2">
        {p.changes.map((c) => {
          const skipped = off.includes(c.id);
          return (
            <div key={c.id} className={cn("rounded-lg border p-3 transition", c.kind === "create" ? "border-primary/30 bg-primary/10" : "border-stroke bg-surface-2", skipped && "opacity-40")}>
              <div className="flex items-start gap-2">
                {adjusting && !applied ? <input type="checkbox" checked={!skipped} onChange={() => onToggle(c.id)} aria-label={`Aplicar ${c.title}`} className="mt-1 h-4 w-4 accent-primary" /> : <Check size={18} className={cn("mt-0.5 shrink-0", c.kind === "create" ? "text-primary-soft" : "text-emerald")} />}
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2"><span className="text-[15px] font-semibold leading-snug">{c.title}</span><span className="mono shrink-0 text-xs text-ink-mute">{fmtDur(c.durationMin)}</span></div>
                  <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs">
                    {c.from && <><span className="mono rounded bg-surface-3 px-1.5 py-0.5 text-ink-mute line-through">{SLOT_LABEL(c.from)}</span><ArrowRight size={12} className="text-ink-mute" /></>}
                    <span className={cn("mono rounded px-1.5 py-0.5 font-semibold", c.kind === "create" ? "bg-primary/30 text-primary-soft" : "bg-emerald/15 text-emerald-soft")}>{SLOT_LABEL(c.to)} → {c.to.end}</span>
                    {c.dnd && <span className="rounded-full bg-surface-3 px-2 py-0.5 text-[10px] font-bold text-ink-dim">DND ATIVO</span>}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-3 flex flex-col gap-2">
        <button className="btn-soft h-12" disabled={applied} onClick={onApply}>{applied ? <><Check size={17} />Mudanças aplicadas</> : <><CalendarCheck size={17} />Aplicar Mudanças na Agenda</>}</button>
        {!applied && <button className="btn-ghost" onClick={onAdjust}><SlidersHorizontal size={16} />{adjusting ? "Concluir ajustes" : "Ajustar Detalhes"}</button>}
      </div>
    </div>
  );
}
