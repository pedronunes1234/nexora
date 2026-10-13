"use client";
import { ArrowLeft, ArrowRight, Briefcase, Check, GraduationCap, Layers, Play, Sparkles, Sprout, Zap } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Field, Switch } from "@/components/ui";
import { playTimbre } from "@/lib/audio";
import { starterData, type Persona } from "@/lib/seed";
import { cn } from "@/lib/utils";
import { useApp } from "@/store/app";
import type { Timbre } from "@/types/database";

const PERSONAS: { id: Persona; icon: React.ReactNode; title: string; sub: string }[] = [
  { id: "estudos", icon: <GraduationCap size={22} />, title: "Estudos & Concursos", sub: "Ciclos de revisão, matérias e prazos" },
  { id: "projetos", icon: <Briefcase size={22} />, title: "Projetos & Negócios", sub: "Sprints, Kanban e reuniões" },
  { id: "criativo", icon: <Zap size={22} />, title: "Criativo & Deep Work", sub: "Pomodoros longos e anotações" },
  { id: "rotina", icon: <Sprout size={22} />, title: "Rotina & Hábitos", sub: "Equilíbrio, saúde e bem-estar" },
];
const PEAKS = [
  { id: "manha", label: "Manhã", range: "06h - 12h", start: "06:00", end: "12:00" },
  { id: "tarde", label: "Tarde", range: "13h - 18h", start: "13:00", end: "18:00" },
  { id: "noite", label: "Noite", range: "18h - 00h", start: "18:00", end: "23:00" },
];
const STEPS = ["Boas-vindas", "Arquitetura da Rotina", "Metas & Foco", "Tudo pronto"];

export default function Onboarding() {
  const router = useRouter();
  const { profile, setProfile, setSettings, finishOnboarding, settings } = useApp();
  const [step, setStep] = useState(0);
  const [name, setName] = useState(profile.name === "Você" ? "" : profile.name);
  const [persona, setPersona] = useState<Persona>("estudos");
  const [peak, setPeak] = useState("tarde");
  const [timbre, setTimbre] = useState<Timbre>("nexora_pulse");
  const [lead, setLead] = useState(10);
  const [haptics, setHaptics] = useState(true);
  const [goalH, setGoalH] = useState(3.5);
  const [pomo, setPomo] = useState<25 | 45 | 60 | 90>(45);
  const [demo, setDemo] = useState(false);
  const [busy, setBusy] = useState(false);
  const pk = PEAKS.find((p) => p.id === peak)!;
  const preview = useMemo(() => starterData("preview", persona, pk.start).events, [persona, pk.start]);

  const next = () => setStep((s) => Math.min(3, s + 1));
  const finish = async () => {
    setBusy(true);
    setProfile({ name: name.trim() || "Você" });
    setSettings({ dailyGoalMin: Math.round(goalH * 60), pomodoroMin: pomo, haptics });
    await finishOnboarding(persona, { start: pk.start, end: pk.end }, timbre, lead, demo);
    router.replace("/");
  };
  const skip = async () => { setBusy(true); setProfile({ name: name.trim() || "Você" }); setSettings({ onboarded: true }); router.replace("/"); };

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-xl flex-col px-5 pb-8 pt-[calc(1.25rem+env(safe-area-inset-top))]">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2.5"><span className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br from-periwinkle to-primary-container text-white"><Layers size={18} /></span><span className="text-xl font-extrabold tracking-[.04em]">NEXORA</span><span className="chip !text-primary-soft">SETUP</span></div>
        <button onClick={skip} className="text-sm text-ink-mute hover:text-ink">Pular para início</button>
      </header>

      <div className="mt-6" aria-label={`Passo ${step + 1} de 4`}>
        <div className="mb-2 flex justify-between text-sm"><span className="font-semibold text-primary-soft">Passo {step + 1} de 4: {STEPS[step]}</span><span className="mono text-xs text-ink-mute">{(step + 1) * 25}% concluído</span></div>
        <div className="grid grid-cols-4 gap-1.5">{STEPS.map((_, i) => <span key={i} className={cn("h-1 rounded-full", i <= step ? "bg-primary" : "bg-surface-3")} />)}</div>
      </div>

      <div className="mt-8 flex-1">
        {step === 0 && (
          <div className="flex flex-col gap-6 animate-rise">
            <h1 className="text-4xl font-bold leading-[1.1] tracking-[-0.035em]">Domine seu dia com <span className="bg-gradient-to-r from-primary-soft to-periwinkle bg-clip-text text-transparent">IA</span></h1>
            <p className="text-ink-dim">Produtividade circadiana e foco em fluxo contínuo. Tudo funciona offline, é gratuito e fica salvo no seu dispositivo.</p>
            <Field label="Como devemos te chamar?"><input className="input h-12 text-base" value={name} onChange={(e) => setName(e.target.value)} placeholder="Seu nome" maxLength={40} autoFocus /></Field>
            <ul className="grid gap-2 text-sm text-ink-dim">
              {["Comando rápido em linguagem natural", "Timer de foco com ondas binaurais", "Copilot que reorganiza sua agenda", "Alarmes sonoros e notas em Markdown"].map((t) => <li key={t} className="flex items-center gap-2"><Check size={15} className="text-emerald" />{t}</li>)}
            </ul>
          </div>
        )}

        {step === 1 && (
          <div className="flex flex-col gap-7 animate-rise">
            <div>
              <span className="chip !px-3 !py-1 !text-primary-soft"><Zap size={12} />Calibragem inteligente de foco</span>
              <h1 className="mt-3 text-3xl font-bold leading-tight tracking-[-0.03em]">Como você quer que o <span className="text-primary-soft">NEXORA</span> organize o seu dia?</h1>
            </div>
            <section aria-labelledby="s1"><div className="mb-3 flex justify-between"><h2 id="s1" className="eyebrow !text-ink-dim">1. Seu perfil de produtividade</h2></div>
              <div className="grid grid-cols-2 gap-3">
                {PERSONAS.map((p) => (
                  <button key={p.id} role="radio" aria-checked={persona === p.id} onClick={() => setPersona(p.id)} className={cn("relative flex flex-col gap-2 rounded-xl border p-4 text-left transition", persona === p.id ? "border-primary bg-primary/10 shadow-glow" : "border-stroke bg-surface-2 hover:border-primary/40")}>
                    <span className="text-primary-soft">{p.icon}</span><span className="text-sm font-bold">{p.title}</span><span className="text-xs text-ink-mute">{p.sub}</span>
                    <span className={cn("absolute right-3 top-3 grid h-5 w-5 place-items-center rounded-full border", persona === p.id ? "border-primary bg-primary" : "border-stroke")}>{persona === p.id && <Check size={12} className="text-white" />}</span>
                  </button>
                ))}
              </div>
            </section>
            <section aria-labelledby="s2"><div className="mb-3 flex items-center justify-between"><h2 id="s2" className="eyebrow !text-ink-dim">2. Seu horário de máximo foco</h2><span className="mono text-[11px] font-bold text-emerald-soft">PICO CIRCADIANO</span></div>
              <div className="grid grid-cols-3 gap-2">
                {PEAKS.map((p) => <button key={p.id} role="radio" aria-checked={peak === p.id} onClick={() => setPeak(p.id)} className={cn("rounded-lg border px-2 py-3 text-center transition", peak === p.id ? "border-primary bg-primary/15 text-white" : "border-stroke bg-surface-2 text-ink-dim hover:border-primary/40")}><div className="text-sm font-semibold">{p.label}</div><div className="mono text-[11px] text-ink-mute">{p.range}</div></button>)}
              </div>
            </section>
            <section aria-labelledby="s3"><div className="mb-3 flex items-center justify-between"><h2 id="s3" className="eyebrow !text-ink-dim">3. Alertas & despertador inteligente</h2></div>
              <div className="card flex flex-col gap-4 p-4">
                <div><div className="mb-2 flex items-center justify-between text-sm"><span>Timbre padrão</span><button className="flex items-center gap-1 text-xs font-semibold text-primary-soft" onClick={() => playTimbre(timbre, settings.volume / 100)}><Play size={12} />Ouvir teste</button></div>
                  <div className="grid grid-cols-2 gap-2">{([["nexora_pulse", "Nexora Pulse", "PADRÃO"], ["zen_gong", "Zen Gong", "FOCO"]] as const).map(([id, l, b]) => <button key={id} onClick={() => { setTimbre(id); playTimbre(id, settings.volume / 100); }} aria-pressed={timbre === id} className={cn("flex items-center justify-between rounded-lg border px-3 py-2.5 text-sm font-semibold", timbre === id ? "border-primary bg-primary/15" : "border-stroke text-ink-dim")}>{l}<span className="mono text-[10px] text-ink-mute">{b}</span></button>)}</div></div>
                <div className="flex items-center justify-between border-t border-stroke pt-4"><div><div className="text-sm font-semibold">Aviso prévio automático</div><div className="text-xs text-ink-mute">Tocar som antes do compromisso iniciar</div></div>
                  <select className="input !w-auto" value={lead} onChange={(e) => setLead(+e.target.value)} aria-label="Aviso prévio">{[0, 5, 10, 15, 30].map((m) => <option key={m} value={m}>{m ? `${m} min antes` : "No horário"}</option>)}</select></div>
                <div className="flex items-center justify-between rounded-lg bg-surface-1 p-3"><div><div className="text-sm font-semibold">Vibração em alertas</div><div className="text-xs text-ink-mute">Usa a vibração do aparelho quando disponível</div></div><Switch on={haptics} onChange={setHaptics} label="Vibração em alertas" /></div>
              </div>
            </section>
            <div className="rounded-xl border border-primary/30 bg-primary/10 p-4 text-sm"><div className="mb-1 flex items-center gap-2 font-bold"><Sparkles size={15} className="text-primary-soft" />Nexora Copilot<span className="chip">PREVISÃO</span></div>
              Com base no seu perfil, vamos criar automaticamente <b>{preview.length} blocos</b> para amanhã, já com alarme na sua agenda.</div>
          </div>
        )}

        {step === 2 && (
          <div className="flex flex-col gap-6 animate-rise">
            <h1 className="text-3xl font-bold leading-tight tracking-[-0.03em]">Defina sua meta de foco</h1>
            <section className="card p-5">
              <div className="flex items-baseline justify-between"><span className="text-sm text-ink-dim">Meta diária</span><span className="mono text-3xl font-bold">{goalH.toFixed(1).replace(".0", "")}h</span></div>
              <input type="range" min={1} max={8} step={0.5} value={goalH} onChange={(e) => setGoalH(+e.target.value)} aria-label="Meta diária de foco em horas" className="mt-3 w-full accent-primary" />
              <p className="mt-2 text-xs text-ink-mute">Pesquisas sobre trabalho profundo indicam que 3 a 4 horas por dia é um alvo realista para a maioria das pessoas.</p>
            </section>
            <section><div className="eyebrow mb-2 !text-ink-dim">Duração padrão do bloco</div>
              <div className="grid grid-cols-4 gap-2">{([25, 45, 60, 90] as const).map((m) => <button key={m} onClick={() => setPomo(m)} aria-pressed={pomo === m} className={cn("h-12 rounded-lg border text-sm font-semibold", pomo === m ? "border-primary bg-primary/20 text-primary-soft" : "border-stroke text-ink-dim")}>{m} min</button>)}</div>
              <p className="mt-2 text-xs text-ink-mute">90 min segue o ciclo ultradiano. Você pode mudar a qualquer momento em Ajustes.</p></section>
          </div>
        )}

        {step === 3 && (
          <div className="flex flex-col gap-6 animate-rise">
            <h1 className="text-3xl font-bold leading-tight tracking-[-0.03em]">Tudo pronto{name.trim() ? `, ${name.trim().split(" ")[0]}` : ""}!</h1>
            <section className="card p-4">
              <div className="eyebrow mb-3">Blocos que vamos criar para amanhã</div>
              <ul className="flex flex-col gap-2">{preview.map((e) => <li key={e.id} className="flex items-center gap-3 rounded-lg bg-surface-1 px-3 py-2.5 text-sm"><span className="mono text-xs font-semibold text-primary-soft">{e.start_time}–{e.end_time}</span><span className="font-medium">{e.title}</span></li>)}</ul>
            </section>
            <label className="card flex cursor-pointer items-start gap-3 p-4"><input type="checkbox" checked={demo} onChange={(e) => setDemo(e.target.checked)} className="mt-1 h-4 w-4 accent-primary" /><span><span className="block text-sm font-semibold">Carregar dados de exemplo</span><span className="text-xs text-ink-mute">Preenche agenda, estatísticas e Kanban para você explorar. Dá para apagar depois em Ajustes.</span></span></label>
          </div>
        )}
      </div>

      <footer className="mt-8 flex flex-col gap-3">
        {step < 3 ? (
          <button className="btn-primary h-14 w-full !rounded-xl bg-gradient-to-r from-primary to-periwinkle text-base" onClick={next}>{step === 0 ? "Começar" : step === 1 ? "Avançar para Metas & Foco" : "Revisar"}<ArrowRight size={18} /></button>
        ) : (
          <button className="btn-primary h-14 w-full !rounded-xl bg-gradient-to-r from-primary to-periwinkle text-base" onClick={finish} disabled={busy}>{busy ? "Preparando…" : "Entrar no NEXORA"}<Check size={18} /></button>
        )}
        <div className="flex items-center justify-between text-xs text-ink-mute">
          {step > 0 ? <button className="flex items-center gap-1 hover:text-ink" onClick={() => setStep(step - 1)}><ArrowLeft size={13} />Etapa anterior</button> : <span />}
          <span>Você poderá reconfigurar a qualquer momento em Ajustes.</span>
        </div>
      </footer>
    </div>
  );
}
