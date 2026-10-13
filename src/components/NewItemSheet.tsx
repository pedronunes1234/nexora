"use client";
import { useEffect, useState } from "react";
import type { Category, Priority } from "@/types/database";
import { useApp } from "@/store/app";
import { useUI } from "@/store/ui";
import { fromMin, nowMin, todayStr, toMin } from "@/lib/utils";
import { Field, Sheet, Switch } from "./ui";

const CATS: Category[] = ["Trabalho", "Estudos", "Saúde", "Pessoal"];

export default function NewItemSheet() {
  const { addOpen, addDate, addKind, closeAdd } = useUI();
  const addTask = useApp((s) => s.addTask);
  const addEvent = useApp((s) => s.addEvent);
  const toast = useApp((s) => s.toast);
  const lead = useApp((s) => s.settings.leadMin);
  const [kind, setKind] = useState<"task" | "event">("task");
  const [title, setTitle] = useState("");
  const [cat, setCat] = useState<Category>("Trabalho");
  const [date, setDate] = useState(todayStr());
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [prio, setPrio] = useState<Priority>("medium");
  const [alarm, setAlarm] = useState(false);
  const [meet, setMeet] = useState("");

  useEffect(() => {
    if (!addOpen) return;
    setKind(addKind ?? "task"); setTitle(""); setDate(addDate ?? todayStr()); setStart(""); setEnd(""); setPrio("medium"); setAlarm(false); setMeet("");
    const t = setTimeout(() => document.getElementById("ni-title")?.focus(), 60);
    return () => clearTimeout(t);
  }, [addOpen, addDate, addKind]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    if (kind === "event") {
      const s = start || fromMin(Math.ceil((nowMin() + 1) / 30) * 30);
      const en = end && toMin(end) > toMin(s) ? end : fromMin(toMin(s) + 60);
      addEvent({ title: title.trim(), date, start_time: s, end_time: en, area: cat, alarm, alarm_lead_min: lead, meet_url: meet.trim() || undefined });
    } else {
      addTask({ title: title.trim(), category: cat, due_date: date, due_time: start || undefined, priority: prio, alarm: alarm && !!start, alarm_lead_min: lead });
      if (alarm && !start) toast("Tarefa criada. Informe um horário para ativar o alarme.", "warn");
    }
    toast(`${kind === "event" ? "Compromisso" : "Tarefa"} criado: ${title.trim()}`);
    closeAdd();
  };

  return (
    <Sheet open={addOpen} onClose={closeAdd} title="Novo item">
      <form onSubmit={submit} className="grid grid-cols-2 gap-3">
        <div className="col-span-2 grid grid-cols-2 gap-1 rounded-lg bg-surface-1 p-1 border border-stroke">
          {(["task", "event"] as const).map((k) => (
            <button type="button" key={k} onClick={() => setKind(k)} className={`h-8 rounded-md text-sm font-semibold ${kind === k ? "bg-primary text-white" : "text-ink-dim"}`}>{k === "task" ? "Tarefa" : "Compromisso"}</button>
          ))}
        </div>
        <div className="col-span-2"><Field label="Título"><input id="ni-title" className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="O que precisa acontecer?" maxLength={140} required /></Field></div>
        <Field label="Espaço"><select className="input" value={cat} onChange={(e) => setCat(e.target.value as Category)}>{CATS.map((c) => <option key={c}>{c}</option>)}</select></Field>
        <Field label="Data"><input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} required /></Field>
        <Field label={kind === "event" ? "Início" : "Horário"}><input className="input" type="time" value={start} onChange={(e) => setStart(e.target.value)} /></Field>
        {kind === "event" ? (
          <Field label="Fim"><input className="input" type="time" value={end} onChange={(e) => setEnd(e.target.value)} /></Field>
        ) : (
          <Field label="Prioridade"><select className="input" value={prio} onChange={(e) => setPrio(e.target.value as Priority)}><option value="high">Alta</option><option value="medium">Média</option><option value="low">Baixa</option></select></Field>
        )}
        {kind === "event" && <div className="col-span-2"><Field label="Link da reunião (opcional)"><input className="input" type="url" value={meet} onChange={(e) => setMeet(e.target.value)} placeholder="https://" /></Field></div>}
        <div className="col-span-2 flex items-center justify-between rounded-lg border border-stroke bg-surface-1 px-3 py-2.5">
          <div><div className="text-sm font-semibold">Alarme sonoro</div><div className="text-xs text-ink-mute">Toca {lead} min antes (precisa de horário)</div></div>
          <Switch on={alarm} onChange={setAlarm} label="Alarme sonoro" />
        </div>
        <button className="btn-primary col-span-2 h-11" type="submit">Criar</button>
      </form>
    </Sheet>
  );
}
