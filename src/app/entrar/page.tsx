"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { Field, PageHeader } from "@/components/ui";
import { supabase, supabaseEnabled } from "@/lib/supabase";
import { useApp } from "@/store/app";

export default function Entrar() {
  const router = useRouter();
  const setUserId = useApp((s) => s.setUserId);
  const setSettings = useApp((s) => s.setSettings);
  const setProfile = useApp((s) => s.setProfile);
  const toast = useApp((s) => s.toast);
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [mode, setMode] = useState<"in" | "up">("in");
  const [busy, setBusy] = useState(false);
  const sb = supabase();

  if (!supabaseEnabled() || !sb) {
    return (
      <div className="mx-auto max-w-md pt-8">
        <PageHeader title="Sincronização" />
        <p className="mt-4 text-sm text-ink-dim">O Supabase não está configurado. Defina <code className="mono">NEXT_PUBLIC_SUPABASE_URL</code> e <code className="mono">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> no <code className="mono">.env.local</code>. O app continua funcionando 100% local.</p>
        <Link href="/" className="btn-ghost mt-6 inline-flex"><ArrowLeft size={16} />Voltar ao início</Link>
      </div>
    );
  }
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true);
    const r = mode === "in" ? await sb.auth.signInWithPassword({ email, password: pass }) : await sb.auth.signUp({ email, password: pass });
    setBusy(false);
    if (r.error) return toast(r.error.message, "warn");
    if (r.data.user && r.data.session) {
      setUserId(r.data.user.id);
      setSettings({ onboarded: true });
      const userName = r.data.user.user_metadata?.name || r.data.user.user_metadata?.full_name;
      setProfile({
        email: r.data.user.email,
        ...(userName ? { name: userName } : {}),
      });
      toast("Conectado com sucesso!");
      void useApp.getState().sync();
      router.push("/");
    } else {
      toast("Confirme seu e-mail para concluir o cadastro.");
    }
  };
  return (
    <div className="mx-auto flex max-w-md flex-col gap-5 pt-8">
      <div className="flex items-center justify-between">
        <Link href="/onboarding" className="flex items-center gap-1.5 text-xs text-ink-mute hover:text-ink">
          <ArrowLeft size={14} /> Voltar ao Onboarding
        </Link>
        <Link href="/" className="text-xs text-ink-mute hover:text-ink">
          Ir para o app
        </Link>
      </div>
      <PageHeader eyebrow="Nuvem & Sincronização" title={mode === "in" ? "Entrar na sua conta" : "Criar conta"} />
      <form onSubmit={submit} className="card flex flex-col gap-4 p-5">
        <Field label="E-mail"><input className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" /></Field>
        <Field label="Senha"><input className="input" type="password" required minLength={6} value={pass} onChange={(e) => setPass(e.target.value)} autoComplete={mode === "in" ? "current-password" : "new-password"} /></Field>
        <button className="btn-primary" disabled={busy}>{busy ? "Aguarde…" : mode === "in" ? "Entrar" : "Criar conta"}</button>
        <button type="button" className="text-xs text-ink-mute underline text-center" onClick={() => setMode(mode === "in" ? "up" : "in")}>{mode === "in" ? "Não tem conta? Criar agora" : "Já tem conta? Entrar"}</button>
      </form>
    </div>
  );
}
