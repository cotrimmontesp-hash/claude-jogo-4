/* Plataforma da web (navegador, PWA e a WebView do app): canvas, WebAudio, localStorage. */
import type { Platform } from '../engine/types';
import { SFX, SONGS, songStep, type ToneOpt, type NoiseOpt } from '../engine/sfx';

export const SKEY = 'turbo-estrada-v1';
const W: any = typeof window !== 'undefined' ? window : {};

/* ---------- som com WebAudio, gerado na hora ---------- */
const AU: any = { ctx: null, sfxG: null, musG: null, noise: null, sfx: true, mus: true, eng: null };
function auInit() {
  if (AU.ctx) return;
  try {
    const C = W.AudioContext || W.webkitAudioContext; if (!C) return;
    const c = AU.ctx = new C(); const m = c.createGain(); m.gain.value = .9; m.connect(c.destination);
    AU.sfxG = c.createGain(); AU.sfxG.gain.value = AU.sfx ? .6 : 0; AU.sfxG.connect(m);
    AU.musG = c.createGain(); AU.musG.gain.value = AU.mus ? .5 : 0; AU.musG.connect(m);
    const b = c.createBuffer(1, c.sampleRate, c.sampleRate), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; AU.noise = b;
  } catch (e) { AU.ctx = null; }
}
if (typeof document !== 'undefined') {
  const wake = () => { auInit(); try { if (AU.ctx && AU.ctx.state === 'suspended') AU.ctx.resume(); } catch (e) { } };
  document.addEventListener('pointerdown', wake, true);
  document.addEventListener('keydown', wake, true);
}
const aok = () => AU.ctx && AU.ctx.state === 'running';
export function wakeAudio() { auInit(); try { if (AU.ctx && AU.ctx.state === 'suspended') AU.ctx.resume(); } catch (e) { } }
export function sleepAudio() { try { if (AU.ctx && AU.ctx.state === 'running') AU.ctx.suspend(); } catch (e) { } }
function tone(o: ToneOpt, dest?: any) {
  if (!aok()) return; const c = AU.ctx, t0 = c.currentTime + (o.dl || 0);
  const osc = c.createOscillator(), g = c.createGain(); osc.type = o.type || 'square';
  osc.frequency.setValueAtTime(o.f, t0); if (o.f2) osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.f2), t0 + o.t);
  g.gain.setValueAtTime(.0001, t0); g.gain.exponentialRampToValueAtTime(Math.max(.0002, o.v || .3), t0 + (o.a || .006)); g.gain.exponentialRampToValueAtTime(.0001, t0 + o.t);
  osc.connect(g); g.connect(dest || AU.sfxG); osc.start(t0); osc.stop(t0 + o.t + .05);
}
function noise(o: NoiseOpt, dest?: any) {
  if (!aok() || !AU.noise) return; const c = AU.ctx, t0 = c.currentTime + (o.dl || 0);
  const src = c.createBufferSource(); src.buffer = AU.noise; const f = c.createBiquadFilter(); f.type = o.type || 'lowpass'; f.frequency.setValueAtTime(o.fq || 1000, t0);
  if (o.f2) f.frequency.exponentialRampToValueAtTime(Math.max(30, o.f2), t0 + o.t); f.Q.value = o.q || .8;
  const g = c.createGain(); g.gain.setValueAtTime(.0001, t0); g.gain.exponentialRampToValueAtTime(Math.max(.0002, o.v || .3), t0 + (o.a || .004)); g.gain.exponentialRampToValueAtTime(.0001, t0 + o.t);
  src.connect(f); f.connect(g); g.connect(dest || AU.sfxG); src.start(t0, Math.random() * .5); src.stop(t0 + o.t + .05);
}
const MUS = { next: 0, step: 0, mode: '' };
function musTick(mode: string | null) {
  if (!aok() || !mode || !SONGS[mode]) { MUS.mode = mode || ''; return; }
  const c = AU.ctx; if (mode !== MUS.mode) { MUS.mode = mode; MUS.step = 0; MUS.next = Math.max(MUS.next, c.currentTime + .05); }
  const sp = 60 / SONGS[mode].bpm / 2;
  if (MUS.next < c.currentTime - .5) MUS.next = c.currentTime + .05;
  while (MUS.next < c.currentTime + .2) {
    songStep(mode, MUS.step, (o) => tone(o, AU.musG), (o) => noise(o, AU.musG), MUS.next - c.currentTime);
    MUS.next += sp; MUS.step++;
  }
}
/* motor: dois osciladores (quadrada + serra) passando por um filtro, a frequência segue o giro */
function engine(rpm: number, load: number) {
  if (!aok()) return;
  const c = AU.ctx;
  if (rpm < 0) { if (AU.eng) { AU.eng.g.gain.setTargetAtTime(0, c.currentTime, .05); } return; }
  if (!AU.eng) {
    const o1 = c.createOscillator(), o2 = c.createOscillator(), f = c.createBiquadFilter(), g = c.createGain();
    o1.type = 'square'; o2.type = 'sawtooth'; f.type = 'lowpass'; f.frequency.value = 600; g.gain.value = 0;
    o1.connect(f); o2.connect(f); f.connect(g); g.connect(AU.sfxG); o1.start(); o2.start();
    AU.eng = { o1, o2, f, g };
  }
  const E = AU.eng, t = c.currentTime, hz = 38 + rpm * 120;
  E.o1.frequency.setTargetAtTime(hz, t, .04); E.o2.frequency.setTargetAtTime(hz * 1.01 * 2, t, .04);
  E.f.frequency.setTargetAtTime(380 + rpm * 900 + load * 400, t, .05);
  E.g.gain.setTargetAtTime(.045 + load * .035, t, .05);
}

export function makePlatform(): Platform {
  const isTouch = ('ontouchstart' in W) || (typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0);
  const query = (() => { try { const t = W.top.location.search; if (t) return t; } catch (e) { } try { return W.location.search || ''; } catch (e) { return ''; } })();
  return {
    isTouch, query,
    now: () => performance.now(),
    storage: {
      load: () => { try { return localStorage.getItem(SKEY); } catch (e) { return null; } },
      save: (s) => { try { localStorage.setItem(SKEY, s); } catch (e) { } },
    },
    createCanvas: (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c as any; },
    audio: {
      play: (name, v = 1) => { const d = SFX[name]; if (d && aok()) d({ tone: (o) => tone(o), noise: (o) => noise(o) }, v); },
      music: musTick,
      engine,
      setVolumes: (s, m) => { AU.sfx = s; AU.mus = m; if (AU.sfxG) AU.sfxG.gain.value = s ? .6 : 0; if (AU.musG) AU.musG.gain.value = m ? .5 : 0; },
    },
    share: async (text) => {
      const nav: any = typeof navigator !== 'undefined' ? navigator : null;
      if (nav && nav.share) { try { await nav.share({ text }); } catch (e) { } return 'shared'; }
      try { await nav.clipboard.writeText(text); return 'copied'; } catch (e) { return 'fail'; }
    },
    vibrate: (ms) => { try { const nav: any = navigator; nav.vibrate && nav.vibrate(ms); } catch (e) { } },
  };
}
