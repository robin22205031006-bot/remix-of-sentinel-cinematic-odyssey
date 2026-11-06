/**
 * SCU SFX engine — all sounds are synthesized with the Web Audio API.
 * No audio assets, no network fetches, sub-5ms latency, tiny CPU cost.
 * Every public sound checks the global mute flag (localStorage "scu-muted")
 * before touching the AudioContext, so playback is always silent when muted.
 */

const MUTE_KEY = "scu-muted";
const MUTE_EVENT = "scu-mute-change";

export function isMuted(): boolean {
  try {
    return localStorage.getItem(MUTE_KEY) === "1";
  } catch {
    return false;
  }
}

export function setMuted(muted: boolean): void {
  try {
    localStorage.setItem(MUTE_KEY, muted ? "1" : "0");
  } catch {
    /* storage unavailable — mute simply won't persist */
  }
  window.dispatchEvent(new Event(MUTE_EVENT));
}

export function onMuteChange(handler: () => void): () => void {
  window.addEventListener(MUTE_EVENT, handler);
  return () => window.removeEventListener(MUTE_EVENT, handler);
}

let ctx: AudioContext | null = null;

function ac(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  if (!ctx) ctx = new AC();
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

interface ToneOpts {
  freq: number;
  freqEnd?: number;
  type?: OscillatorType;
  dur?: number;
  vol?: number;
  delay?: number;
  attack?: number;
}

function tone({ freq, freqEnd, type = "sine", dur = 0.08, vol = 0.08, delay = 0, attack = 0.004 }: ToneOpts): void {
  const c = ac();
  if (!c) return;
  const t0 = c.currentTime + delay;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (freqEnd) osc.frequency.exponentialRampToValueAtTime(Math.max(1, freqEnd), t0 + dur);
  gain.gain.setValueAtTime(0, t0);
  gain.gain.linearRampToValueAtTime(vol, t0 + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(gain).connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

interface NoiseOpts {
  dur?: number;
  vol?: number;
  freq?: number;
  q?: number;
  delay?: number;
  type?: BiquadFilterType;
}

function noise({ dur = 0.06, vol = 0.05, freq = 3000, q = 1, delay = 0, type = "bandpass" }: NoiseOpts): void {
  const c = ac();
  if (!c) return;
  const t0 = c.currentTime + delay;
  const len = Math.max(1, Math.floor(c.sampleRate * dur));
  const buf = c.createBuffer(1, len, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = c.createBufferSource();
  src.buffer = buf;
  const filter = c.createBiquadFilter();
  filter.type = type;
  filter.frequency.value = freq;
  filter.Q.value = q;
  const gain = c.createGain();
  gain.gain.setValueAtTime(vol, t0);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(filter).connect(gain).connect(c.destination);
  src.start(t0);
}

function ready(fn: () => void): void {
  if (isMuted()) return;
  try {
    fn();
  } catch {
    /* audio must never break the UI */
  }
}

export const sfx = {
  /** Subtle tactical tick for buttons, tabs, and generic presses. */
  click() {
    ready(() => {
      tone({ freq: 1900, freqEnd: 1400, type: "square", dur: 0.025, vol: 0.025 });
      noise({ dur: 0.015, vol: 0.012, freq: 5000, q: 2 });
    });
  },

  /** Rising confirmation blip for creates/adds. */
  add() {
    ready(() => {
      tone({ freq: 520, freqEnd: 880, type: "triangle", dur: 0.09, vol: 0.06 });
      tone({ freq: 1040, freqEnd: 1560, type: "sine", dur: 0.1, vol: 0.045, delay: 0.06 });
    });
  },

  /** Descending tech hum for deletes/removals. */
  remove() {
    ready(() => {
      tone({ freq: 220, freqEnd: 70, type: "sawtooth", dur: 0.22, vol: 0.045 });
      noise({ dur: 0.12, vol: 0.03, freq: 900, q: 0.8, type: "lowpass" });
    });
  },

  /** Layered digital convergence for entity merges. */
  merge() {
    ready(() => {
      tone({ freq: 300, freqEnd: 1200, type: "sine", dur: 0.28, vol: 0.05 });
      tone({ freq: 450, freqEnd: 1800, type: "triangle", dur: 0.24, vol: 0.035, delay: 0.05 });
      tone({ freq: 900, freqEnd: 300, type: "sine", dur: 0.3, vol: 0.04, delay: 0.12 });
      noise({ dur: 0.2, vol: 0.02, freq: 2400, q: 3, delay: 0.08 });
    });
  },

  /** Soft cinematic HUD boot tone — played once per session on first interaction. */
  welcome() {
    ready(() => {
      tone({ freq: 196, type: "sine", dur: 0.9, vol: 0.05, attack: 0.15 });
      tone({ freq: 294, type: "sine", dur: 0.9, vol: 0.04, attack: 0.2, delay: 0.08 });
      tone({ freq: 392, type: "triangle", dur: 0.7, vol: 0.025, attack: 0.25, delay: 0.16 });
      noise({ dur: 0.5, vol: 0.008, freq: 6000, q: 0.6, delay: 0.1, type: "highpass" });
    });
  },
};
