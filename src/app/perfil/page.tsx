"use client";
import { Camera, Check, CloudUpload, Database, Download, FileJson, LogOut, Pencil, Play, RefreshCw, Trash2, Volume2 } from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";
import { Avatar, Field, PageHeader, Sheet, Switch } from "@/components/ui";
import { playTimbre, TIMBRES } from "@/lib/audio";
import { activeDates, streak } from "@/lib/derive";
import { supabase, supabaseEnabled } from "@/lib/supabase";
import { cn, relTime } from "@/lib/utils";
import { useApp } from "@/store/app";

const COLORS = ["#8b5cf6", "#6366f1", "#10b981", "#0ea5e9", "#f59e0b", "#ef4444", "#ec4899"];

export default function Perfil() {
  const { profile, setProfile, settings, setSettings, tasks, sessions, habits, loadDemo, clearAll, exportJson, toast, userId, setUserId, sync, syncing, lastSync } = useApp();
  const [edit, setEdit] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const days = streak(activeDates(tasks, sessions, habits));
  const cloud = supabaseEnabled();

  const download = async () => {
    const url = URL.createObjectURL(new Blob([await exportJson()], { type: "application/json" }));
    const a = document.createElement("a"); a.href = url; a.download = "nexora-backup.json"; a.click(); URL.revokeObjectURL(url);
    toast("Backup exportado (JSON)");
  };
  const signOut = async () => { await supabase()?.auth.signOut(); setUserId(null); toast("Sessão encerrada"); };

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <PageHeader eyebrow="Configurações" title="Perfil & Ajustes" />

      <section className="card flex flex-wrap items-center gap-4 p-5">
        <div className="relative"><Avatar name={profile.name} color={profile.avatar_color} url={profile.avatar_url} size={72} /><span className="absolute bottom-0 right-0 h-4 w-4 rounded-full border-2 border-surface-2 bg-emerald" /></div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2"><h2 className="truncate text-xl font-bold tracking-tight">{profile.name}</h2><span className="chip !text-emerald-soft">Gratuito</span></div>
          {profile.bio && <div className="text-sm text-ink-dim">{profile.bio}</div>}
          {profile.email && <div className="text-xs text-ink-mute">{profile.email}</div>}
        </div>
        <button className="btn-ghost" onClick={() => setEdit(true)}><Pencil size={15} />Editar perfil</button>
        <div className="grid w-full grid-cols-3 gap-3 text-center">
          <div className="rounded-lg bg-surface-1 p-3"><div className="text-xl font-bold tabular">{sessions.length}</div><div className="text-[11px] text-ink-mute">Sessões de foco</div></div>
          <div className="rounded-lg bg-surface-1 p-3"><div className="text-xl font-bold tabular">{days}d</div><div className="text-[11px] text-ink-mute">Ofensiva</div></div>
          <div className="rounded-lg bg-surface-1 p-3"><div className="text-xl font-bold tabular">{tasks.filter((t) => t.completed).length}</div><div className="text-[11px] text-ink-mute">Tarefas feitas</div></div>
        </div>
      </section>

      <section className="card p-5">
        <h2 className="mb-1 font-semibold">NEXORA gratuito</h2>
        <p className="text-sm text-ink-dim">Todos os recursos estão liberados: IA do Copilot, alertas ilimitados, notas e armazenamento local. Sem assinatura e sem paywall.</p>
      </section>

      <section className="card p-5">
        <h2 className="mb-3 font-semibold">Engine de Produtividade</h2>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Início do pico"><input type="time" className="input" value={profile.circadian_peak_start} onChange={(e) => setProfile({ circadian_peak_start: e.target.value })} /></Field>
          <Field label="Fim do pico"><input type="time" className="input" value={profile.circadian_peak_end} onChange={(e) => setProfile({ circadian_peak_end: e.target.value })} /></Field>
        </div>
        <div className="eyebrow mb-2 mt-4">Duração padrão do Pomodoro</div>
        <div className="grid grid-cols-4 gap-2">{([25, 45, 60, 90] as const).map((m) => <button key={m} onClick={() => setSettings({ pomodoroMin: m })} aria-pressed={settings.pomodoroMin === m} className={cn("h-10 rounded-lg border text-sm font-semibold", settings.pomodoroMin === m ? "border-primary bg-primary/20 text-primary-soft" : "border-stroke text-ink-dim")}>{m} min</button>)}</div>
        <div className="mt-4 grid grid-cols-[1fr_auto] items-center gap-3"><Field label="Meta diária de foco (minutos)"><input type="number" min={30} max={720} step={15} className="input" value={settings.dailyGoalMin} onChange={(e) => setSettings({ dailyGoalMin: Math.min(720, Math.max(30, +e.target.value || 30)) })} /></Field></div>
        <Toggle title="Ocultar contadores de streak" desc="Reduz a pressão psicológica e a ansiedade de dias perdidos." on={profile.hide_streaks} set={(v) => setProfile({ hide_streaks: v })} />
        <Toggle title="Pausas suaves com Zen Gong" desc="Transição sonora gradual sem alarmes estridentes." on={settings.softBreaks} set={(v) => setSettings({ softBreaks: v })} />
      </section>

      <section className="card p-5">
        <h2 className="mb-3 font-semibold">Áudio & Notificações</h2>
        <div className="eyebrow mb-2">Timbre de transição</div>
        <div className="flex flex-wrap gap-2">{TIMBRES.map((t) => <button key={t.id} onClick={() => { setSettings({ timbre: t.id }); playTimbre(t.id, settings.volume / 100); }} aria-pressed={settings.timbre === t.id} className={cn("chip !px-3 !py-1.5 !text-xs", settings.timbre === t.id && "!border-primary/60 !bg-primary/20 !text-white")}>{t.name}</button>)}</div>
        <div className="mt-4 flex items-center gap-3 text-sm"><Volume2 size={16} className="text-ink-mute" /><input type="range" min={10} max={100} value={settings.volume} onChange={(e) => setSettings({ volume: +e.target.value })} aria-label="Volume" className="h-1.5 flex-1 accent-primary" /><span className="mono w-10 text-right">{settings.volume}%</span>
          <button className="btn-ghost btn-sm" onClick={() => playTimbre(settings.timbre, settings.volume / 100)}><Play size={13} />Testar</button></div>
        <p className="mt-3 text-xs text-ink-mute">Mais opções de alarme em <Link href="/lembretes" className="text-primary-soft underline">Lembretes</Link>.</p>
      </section>

      <section className="card p-5">
        <h2 className="mb-1 flex items-center gap-2 font-semibold"><Database size={16} className="text-primary-soft" />Dados & Nuvem</h2>
        <p className="text-sm text-ink-dim">Seus dados ficam neste dispositivo (IndexedDB) e funcionam offline. {cloud ? "O Supabase está configurado para sincronizar entre dispositivos." : "Para sincronizar entre dispositivos, configure o Supabase (veja o README)."}</p>
        <div className="mt-4 flex flex-col gap-2">
          {cloud && (userId ? (
            <>
              <button className="btn-soft" onClick={() => void sync()} disabled={syncing}><RefreshCw size={15} className={syncing ? "animate-spin" : ""} />{syncing ? "Sincronizando…" : "Forçar sincronização"}</button>
              <div className="text-xs text-ink-mute">{lastSync ? `Última sincronização ${relTime(lastSync)}` : "Ainda não sincronizado"}</div>
              <button className="btn-ghost" onClick={signOut}><LogOut size={15} />Sair da conta</button>
            </>
          ) : <Link href="/entrar" className="btn-soft"><CloudUpload size={15} />Entrar para sincronizar</Link>)}
          <button className="btn-ghost" onClick={download}><Download size={15} />Exportar backup (JSON)</button>
          <button className="btn-ghost" onClick={async () => { await loadDemo(); toast("Dados de exemplo carregados"); }}><FileJson size={15} />Carregar dados de exemplo</button>
          <button className="btn-ghost !border-coral/30 !text-coral-soft hover:!bg-coral/10" onClick={() => setConfirm(true)}><Trash2 size={15} />Apagar todos os dados locais</button>
        </div>
      </section>

      <div className="text-center text-xs text-ink-mute">NEXORA v0.1 · Kinetic Obsidian · Local-first</div>

      <Sheet open={edit} onClose={() => setEdit(false)} title="Editar perfil">
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-4"><Avatar name={profile.name} color={profile.avatar_color} url={profile.avatar_url} size={64} /><AvatarPicker /></div>
          <Field label="Nome"><input className="input" value={profile.name} onChange={(e) => setProfile({ name: e.target.value })} maxLength={40} /></Field>
          <Field label="Bio"><input className="input" value={profile.bio ?? ""} onChange={(e) => setProfile({ bio: e.target.value })} maxLength={90} placeholder="Estudante e pesquisador…" /></Field>
          <Field label="E-mail (opcional)"><input className="input" type="email" value={profile.email ?? ""} onChange={(e) => setProfile({ email: e.target.value })} /></Field>
          <div><div className="mb-2 text-xs font-semibold text-ink-dim">Cor do avatar</div><div className="flex gap-2">{COLORS.map((c) => <button key={c} aria-label={`Cor ${c}`} onClick={() => setProfile({ avatar_color: c })} className="grid h-8 w-8 place-items-center rounded-full" style={{ background: c }}>{profile.avatar_color === c && <Check size={14} className="text-white" />}</button>)}</div></div>
          <button className="btn-primary" onClick={() => setEdit(false)}>Salvar</button>
        </div>
      </Sheet>

      <Sheet open={confirm} onClose={() => setConfirm(false)} title="Apagar tudo?">
        <p className="mb-4 text-sm text-ink-dim">Isso remove tarefas, agenda, notas, sessões e notificações deste dispositivo. Faça um backup antes se precisar. Esta ação não pode ser desfeita.</p>
        <div className="flex gap-2"><button className="btn-ghost flex-1" onClick={() => setConfirm(false)}>Cancelar</button><button className="btn flex-1 bg-coral text-white" onClick={async () => { await clearAll(); setConfirm(false); toast("Dados apagados"); }}>Apagar</button></div>
      </Sheet>
    </div>
  );
}

function Toggle({ title, desc, on, set }: { title: string; desc: string; on: boolean; set: (v: boolean) => void }) {
  return <div className="mt-4 flex items-center gap-4"><div className="flex-1"><div className="text-sm font-semibold">{title}</div><div className="text-xs text-ink-mute">{desc}</div></div><Switch on={on} onChange={set} label={title} /></div>;
}

function AvatarPicker() {
  const setProfile = useApp((s) => s.setProfile);
  const toast = useApp((s) => s.toast);
  const ref = useRef<HTMLInputElement>(null);
  const pick = (f?: File) => {
    if (!f) return;
    if (!f.type.startsWith("image/")) return toast("Escolha um arquivo de imagem", "warn");
    const img = new Image();
    const url = URL.createObjectURL(f);
    img.onload = () => {
      const s = 160, c = document.createElement("canvas"); c.width = c.height = s;
      const ctx = c.getContext("2d")!;
      const m = Math.min(img.width, img.height);
      ctx.drawImage(img, (img.width - m) / 2, (img.height - m) / 2, m, m, 0, 0, s, s);
      setProfile({ avatar_url: c.toDataURL("image/jpeg", 0.85) });
      URL.revokeObjectURL(url);
    };
    img.src = url;
  };
  return (
    <div className="flex flex-col gap-1.5">
      <button className="btn-ghost btn-sm" onClick={() => ref.current?.click()}><Camera size={14} />Enviar foto</button>
      <button className="text-xs text-ink-mute hover:text-ink" onClick={() => setProfile({ avatar_url: undefined })}>Remover foto</button>
      <input ref={ref} type="file" accept="image/*" hidden onChange={(e) => pick(e.target.files?.[0])} />
    </div>
  );
}
