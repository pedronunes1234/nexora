import type { BinauralPreset, Timbre } from "@/types/database";

// Síntese procedural 100% em Web Audio API: ondas binaurais, ruídos ambientes e timbres de alerta.
let ctx: AudioContext | null = null;
export function audioCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  ctx = ctx ?? new AC();
  if (ctx.state !== "running") void ctx.resume();
  return ctx;
}

// Celulares (iOS/Android) criam o áudio "suspenso" e só liberam após um toque. Destrava no 1º toque.
export function unlockAudio() {
  const c = audioCtx();
  if (!c) return;
  try { const b = c.createBuffer(1, 1, 22050), s = c.createBufferSource(); s.buffer = b; s.connect(c.destination); s.start(0); } catch {}
}
if (typeof window !== "undefined") {
  const once = () => { unlockAudio(); window.removeEventListener("pointerdown", once); window.removeEventListener("touchend", once); window.removeEventListener("keydown", once); };
  window.addEventListener("pointerdown", once, { passive: true });
  window.addEventListener("touchend", once, { passive: true });
  window.addEventListener("keydown", once);
}

export type Ambient = "none" | "rain" | "cafe" | "brown";
export type Beat = "alpha" | "gamma" | "theta" | "off";
export const BEAT_HZ: Record<Exclude<Beat, "off">, number> = { theta: 6, alpha: 10, gamma: 40 };
export const PRESET_FOR: Record<Beat, BinauralPreset | undefined> = { alpha: "alpha_10hz", gamma: "gamma_40hz", theta: undefined, off: undefined };

function noiseBuffer(c: AudioContext, kind: "white" | "brown" | "pink") {
  const len = c.sampleRate * 4;
  const buf = c.createBuffer(1, len, c.sampleRate);
  const d = buf.getChannelData(0);
  let last = 0, b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
  for (let i = 0; i < len; i++) {
    const w = Math.random() * 2 - 1;
    if (kind === "white") d[i] = w;
    else if (kind === "brown") { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; }
    else {
      b0 = 0.99886 * b0 + w * 0.0555179; b1 = 0.99332 * b1 + w * 0.0750759; b2 = 0.969 * b2 + w * 0.153852;
      b3 = 0.8665 * b3 + w * 0.3104856; b4 = 0.55 * b4 + w * 0.5329522; b5 = -0.7616 * b5 - w * 0.016898;
      d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11; b6 = w * 0.115926;
    }
  }
  return buf;
}

export class FlowAudio {
  private c: AudioContext;
  private master: GainNode;
  private stops: (() => void)[] = [];
  private beatGain: GainNode | null = null;
  private ambGain: GainNode | null = null;
  running = false;
  constructor(c: AudioContext) {
    this.c = c;
    this.master = c.createGain();
    this.master.gain.value = 0;
    this.master.connect(c.destination);
  }
  start(opts: { beat: Beat; ambient: Ambient; volume: number }) {
    this.stop(true);
    const c = this.c;
    // Onda binaural: canal esquerdo e direito com diferença de frequência = batida percebida (ex.: 200 Hz / 210 Hz = Alfa 10 Hz)
    if (opts.beat !== "off") {
      const base = 200, hz = BEAT_HZ[opts.beat];
      const merger = c.createChannelMerger(2);
      const g = c.createGain();
      g.gain.value = 0.35;
      [base, base + hz].forEach((f, ch) => {
        const o = c.createOscillator();
        o.type = "sine"; o.frequency.value = f;
        o.connect(merger, 0, ch); o.start();
        this.stops.push(() => { try { o.stop(); } catch { /* já parado */ } });
      });
      merger.connect(g); g.connect(this.master);
      this.beatGain = g;
    }
    if (opts.ambient !== "none") this.addAmbient(opts.ambient);
    this.master.gain.cancelScheduledValues(c.currentTime);
    this.master.gain.setTargetAtTime(opts.volume, c.currentTime, 0.4);
    this.running = true;
  }
  private addAmbient(kind: Exclude<Ambient, "none">) {
    const c = this.c;
    const g = c.createGain();
    g.connect(this.master);
    const src = (k: "white" | "brown" | "pink") => {
      const s = c.createBufferSource();
      s.buffer = noiseBuffer(c, k); s.loop = true; s.start();
      this.stops.push(() => { try { s.stop(); } catch { /* já parado */ } });
      return s;
    };
    if (kind === "brown") {
      const s = src("brown"); g.gain.value = 0.55; s.connect(g);
    } else if (kind === "rain") {
      const s = src("white");
      const hp = c.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 900;
      const lp = c.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 9000;
      g.gain.value = 0.18; s.connect(hp); hp.connect(lp); lp.connect(g);
      const lfo = c.createOscillator(), lg = c.createGain();
      lfo.frequency.value = 0.18; lg.gain.value = 0.05; lfo.connect(lg); lg.connect(g.gain); lfo.start();
      this.stops.push(() => { try { lfo.stop(); } catch { /* já parado */ } });
    } else {
      const s = src("pink");
      const lp = c.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 900;
      const bp = c.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 500; bp.Q.value = 0.6;
      g.gain.value = 0.5; s.connect(lp); lp.connect(bp); bp.connect(g);
      const lfo = c.createOscillator(), lg = c.createGain();
      lfo.frequency.value = 0.35; lg.gain.value = 0.15; lfo.connect(lg); lg.connect(g.gain); lfo.start();
      this.stops.push(() => { try { lfo.stop(); } catch { /* já parado */ } });
    }
    this.ambGain = g;
  }
  setVolume(v: number) { this.master.gain.setTargetAtTime(v, this.c.currentTime, 0.1); }
  stop(immediate = false) {
    const c = this.c;
    if (!this.running && !this.stops.length) return;
    const fns = this.stops; this.stops = [];
    this.master.gain.setTargetAtTime(0, c.currentTime, immediate ? 0.01 : 0.2);
    setTimeout(() => fns.forEach((f) => f()), immediate ? 30 : 700);
    this.running = false;
  }
}

let engine: FlowAudio | null = null;
export function flowAudio() {
  const c = audioCtx();
  if (!c) return null;
  engine = engine ?? new FlowAudio(c);
  return engine;
}

// ---------- Timbres de alerta ----------
export const TIMBRES: { id: Timbre; name: string; badge: string; desc: string }[] = [
  { id: "nexora_pulse", name: "Nexora Pulse", badge: "PADRÃO", desc: "Futurista suave, penetração harmônica" },
  { id: "electric_chime", name: "Electric Chime", badge: "ENERGÉTICO", desc: "Toque rápido em arpejo para alta prioridade" },
  { id: "zen_gong", name: "Zen Gong", badge: "FOCO", desc: "Ressonância profunda e gradual para meditação" },
  { id: "urgent_alarm", name: "Urgent Alarm", badge: "CRÍTICO", desc: "Bips insistentes estilo cockpit aeroespacial" },
];

function tone(c: AudioContext, freq: number, t0: number, dur: number, vol: number, type: OscillatorType = "sine") {
  const o = c.createOscillator(), g = c.createGain();
  o.type = type; o.frequency.value = freq;
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(Math.max(vol, 0.0002), t0 + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g); g.connect(c.destination);
  o.start(t0); o.stop(t0 + dur + 0.05);
}

export async function playTimbre(t: Timbre = "nexora_pulse", volume = 0.85) {
  const c = audioCtx();
  if (!c) return;
  // No celular o relógio do áudio fica parado até o resume() terminar; agendar antes deixa o som mudo.
  if (c.state !== "running") { try { await c.resume(); } catch {} }
  const v = Math.min(1, Math.max(0, volume)) * 0.6;
  const n = c.currentTime + 0.05;
  switch (t) {
    case "nexora_pulse":
      tone(c, 659.25, n, 0.7, v); tone(c, 987.77, n + 0.18, 0.9, v * 0.8); tone(c, 1318.5, n + 0.18, 0.9, v * 0.25);
      break;
    case "electric_chime":
      [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(c, f, n + i * 0.08, 0.35, v * 0.8, "triangle"));
      break;
    case "zen_gong":
      tone(c, 196, n, 3.2, v * 1.1); tone(c, 196 * 2.76, n, 2.2, v * 0.35); tone(c, 196 * 5.4, n, 1.2, v * 0.15);
      break;
    case "urgent_alarm":
      for (let i = 0; i < 4; i++) tone(c, i % 2 ? 1200 : 900, n + i * 0.22, 0.16, v * 0.7, "square");
      break;
  }
}
