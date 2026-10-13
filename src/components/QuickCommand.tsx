"use client";
import { ArrowRight, BellRing, CalendarClock, Mic, Sparkles, Tag } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { parseCommand } from "@/lib/nlp";
import { catStyle, cn, dateLabel } from "@/lib/utils";
import { useApp } from "@/store/app";

type SR = { lang: string; interimResults: boolean; onresult: (e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void; onerror: () => void; onend: () => void; start: () => void; stop: () => void };

export default function QuickCommand({ className }: { className?: string }) {
  const [text, setText] = useState("");
  const [listening, setListening] = useState(false);
  const rec = useRef<SR | null>(null);
  const addTask = useApp((s) => s.addTask);
  const addEvent = useApp((s) => s.addEvent);
  const toast = useApp((s) => s.toast);
  const lead = useApp((s) => s.settings.leadMin);
  const parsed = useMemo(() => parseCommand(text), [text]);

  const create = () => {
    if (!text.trim()) return toast("Digite um comando primeiro", "warn");
    const p = parseCommand(text);
    if (!p.title) return toast("Não entendi o título. Descreva a tarefa.", "warn");
    const time = p.time || (p.alarm ? "09:00" : "");
    if (p.kind === "event" && time) addEvent({ title: p.title, date: p.date, start_time: time, end_time: p.endTime ?? time, area: p.category, alarm: p.alarm, alarm_lead_min: lead });
    else addTask({ title: p.title, category: p.category, due_date: p.date, due_time: time || undefined, priority: p.priority, alarm: p.alarm && !!time, alarm_lead_min: lead });
    toast(`Criado: ${p.title} · ${dateLabel(p.date)}${time ? " " + time : ""}`);
    setText("");
  };

  const mic = () => {
    const w = window as unknown as { SpeechRecognition?: new () => SR; webkitSpeechRecognition?: new () => SR };
    const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!Ctor) return toast("Ditado por voz indisponível neste navegador", "warn");
    if (listening) { rec.current?.stop(); return; }
    try {
      const r = new Ctor();
      r.lang = "pt-BR"; r.interimResults = false;
      r.onresult = (e) => setText(e.results[0][0].transcript);
      r.onerror = () => { setListening(false); toast("Não foi possível usar o microfone", "warn"); };
      r.onend = () => setListening(false);
      rec.current = r; r.start(); setListening(true);
    } catch { toast("Ditado por voz indisponível", "warn"); }
  };

  const cs = catStyle(parsed.category);
  return (
    <section className={cn("rounded-xl border border-stroke bg-surface-2/80 p-4 backdrop-blur shadow-[inset_0_1px_0_rgba(255,255,255,.05)]", className)} aria-label="Comando rápido">
      <div className="mb-3 flex items-center gap-2 text-xs text-ink-dim">
        <Sparkles size={14} className="text-primary" /> Comando Rápido Inteligente
        <span className="ml-auto mono rounded bg-surface-3 px-1.5 py-0.5 text-[10px]">NLP v2</span>
      </div>
      <div className="flex items-center gap-2 rounded-lg border border-stroke bg-surface-1 pl-3 pr-1.5 transition focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/25">
        <input id="quick-command" value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && create()}
          placeholder="Estudar biologia amanhã às 19h com lembrete" autoComplete="off" maxLength={200}
          className="h-11 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-ink-mute" />
        <button onClick={mic} aria-label="Ditar por voz" className={cn("grid h-8 w-8 place-items-center rounded-lg transition", listening ? "bg-coral/20 text-coral-soft" : "text-ink-dim hover:bg-surface-3")}><Mic size={16} /></button>
      </div>
      <div className="my-3 flex min-h-[26px] flex-wrap gap-1.5">
        {text.trim() ? (
          <>
            <span className={cn("chip", cs.text)}><Tag size={11} />#{parsed.category}</span>
            <span className="chip"><CalendarClock size={11} />{dateLabel(parsed.date)}{parsed.time ? ` ${parsed.time}` : ""}</span>
            {parsed.kind === "event" && <span className="chip">Compromisso</span>}
            {parsed.alarm && <span className="chip !text-emerald-soft"><BellRing size={11} />Alarme: Ativo</span>}
            {parsed.priority === "high" && <span className="chip !border-coral/25 !bg-coral/12 !text-coral-soft">Alta prioridade</span>}
          </>
        ) : (
          <span className="chip">Experimente: reunião com a Ana sexta às 15h com lembrete</span>
        )}
      </div>
      <button onClick={create} className="btn-soft w-full h-11"><Sparkles size={16} />Criar com IA<ArrowRight size={16} /></button>
    </section>
  );
}
