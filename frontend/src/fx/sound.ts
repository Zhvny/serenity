// Suara chiptune kecil (WebAudio, tanpa berkas aset). Default MATI; dinyalakan pengguna lewat tombol di header.
// Aman dipanggil di mana saja: no-op bila AudioContext tak ada (jsdom/SSR) atau suara mati.
export type SoundName = "ding" | "pop" | "meow" | "click" | "bell";

const KEY = "serenity-sound";
const EVENT = "serenity:sound";

function readStored(): boolean {
  try {
    return typeof window !== "undefined" && window.localStorage.getItem(KEY) === "on";
  } catch {
    return false;
  }
}

let on = readStored();
let ctx: AudioContext | null = null;

export function isSoundOn(): boolean {
  return on;
}

export function setSoundOn(next: boolean): void {
  on = next;
  try {
    window.localStorage.setItem(KEY, next ? "on" : "off");
  } catch {
    // abaikan (mode privat)
  }
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent(EVENT));
  if (next) playSound("click");
}

export const SOUND_EVENT = EVENT;

function audio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (AC === undefined) return null;
  try {
    ctx ??= new AC();
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

// Satu nada: frekuensi bisa meluncur (slide) dari f0 ke f1; envelope pendek agar lembut.
function tone(c: AudioContext, t0: number, f0: number, f1: number, dur: number, type: OscillatorType, vol: number): void {
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(f0, t0);
  if (f1 !== f0) osc.frequency.exponentialRampToValueAtTime(f1, t0 + dur);
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(gain).connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

export function playSound(name: SoundName): void {
  if (!on) return;
  const c = audio();
  if (c === null) return;
  const t = c.currentTime;
  switch (name) {
    case "ding": // dua nada naik, seperti lonceng kasir
      tone(c, t, 988, 988, 0.12, "square", 0.04);
      tone(c, t + 0.09, 1319, 1319, 0.22, "square", 0.04);
      break;
    case "pop":
      tone(c, t, 560, 220, 0.11, "triangle", 0.09);
      break;
    case "meow":
      tone(c, t, 620, 880, 0.12, "triangle", 0.07);
      tone(c, t + 0.1, 880, 480, 0.2, "triangle", 0.07);
      break;
    case "click":
      tone(c, t, 720, 720, 0.05, "square", 0.03);
      break;
    case "bell": // lonceng pintu toko
      tone(c, t, 1568, 1568, 0.5, "sine", 0.06);
      tone(c, t, 2093, 2093, 0.35, "sine", 0.04);
      break;
  }
}
