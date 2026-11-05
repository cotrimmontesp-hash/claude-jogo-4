/* Plataforma da web (navegador / PWA): canvas de verdade, WebAudio, localStorage. */
import type { Platform } from '../engine/types';
import { SFX_DEFS, SONGS, songStep, type ToneOpt, type NoiseOpt } from '../engine/sfxDefs';

const SKEY = 'tita-coral-v2';
const W: any = typeof window !== 'undefined' ? window : {};

/* ---------- som com WebAudio, gerado na hora ---------- */
const AU: any = { ctx: null, sfxG: null, musG: null, noise: null, sfx: true, mus: true };
function auInit() {
  if (AU.ctx) return;
  try {
    const C = W.AudioContext || W.webkitAudioContext; if (!C) return;
    const c = AU.ctx = new C(); const m = c.createGain(); m.gain.value = .9; m.connect(c.destination);
    AU.sfxG = c.createGain(); AU.sfxG.gain.value = AU.sfx ? .6 : 0; AU.sfxG.connect(m);
    AU.musG = c.createGain(); AU.musG.gain.value = AU.mus ? .16 : 0; AU.musG.connect(m);
    const b = c.createBuffer(1, c.sampleRate, c.sampleRate), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; AU.noise = b;
  } catch (e) { AU.ctx = null; }
}
if (typeof document !== 'undefined') {
  const wake = () => { auInit(); try { if (AU.ctx && AU.ctx.state === 'suspended') AU.ctx.resume(); } catch (e) { } };
  document.addEventListener('pointerdown', wake, true);
  document.addEventListener('keydown', wake, true);
}
const aok = () => AU.ctx && AU.ctx.state === 'running';
function tone(o: ToneOpt) {
  if (!aok()) return; const c = AU.ctx, t0 = c.currentTime + (o.dl || 0);
  const osc = c.createOscillator(), g = c.createGain(); osc.type = o.type || 'square';
  osc.frequency.setValueAtTime(o.f, t0); if (o.f2) osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.f2), t0 + o.t);
  g.gain.setValueAtTime(.0001, t0); g.gain.exponentialRampToValueAtTime(Math.max(.0002, o.v || .3), t0 + (o.a || .006)); g.gain.exponentialRampToValueAtTime(.0001, t0 + o.t);
  osc.connect(g); g.connect(o.dest || AU.sfxG); osc.start(t0); osc.stop(t0 + o.t + .05);
}
function noise(o: NoiseOpt) {
  if (!aok() || !AU.noise) return; const c = AU.ctx, t0 = c.currentTime + (o.dl || 0);
  const src = c.createBufferSource(); src.buffer = AU.noise; const f = c.createBiquadFilter(); f.type = o.type || 'lowpass'; f.frequency.setValueAtTime(o.fq || 1000, t0);
  if (o.f2) f.frequency.exponentialRampToValueAtTime(Math.max(30, o.f2), t0 + o.t); f.Q.value = o.q || .8;
  const g = c.createGain(); g.gain.setValueAtTime(.0001, t0); g.gain.exponentialRampToValueAtTime(Math.max(.0002, o.v || .3), t0 + (o.a || .004)); g.gain.exponentialRampToValueAtTime(.0001, t0 + o.t);
  src.connect(f); f.connect(g); g.connect(AU.sfxG); src.start(t0, Math.random() * .5); src.stop(t0 + o.t + .05);
}
const MUS = { next: 0, step: 0, mode: '' };
function musTick(mode: string | null) {
  if (!aok() || !mode || !SONGS[mode]) { MUS.mode = mode || ''; return; }
  const c = AU.ctx; if (mode !== MUS.mode) { MUS.mode = mode; MUS.step = 0; MUS.next = Math.max(MUS.next, c.currentTime + .05); }
  const sp = 60 / SONGS[mode].bpm / 2;
  if (MUS.next < c.currentTime - .5) MUS.next = c.currentTime + .05;
  while (MUS.next < c.currentTime + .2) {
    songStep(mode, MUS.step, (o) => tone({ ...o, dest: AU.musG }), MUS.next - c.currentTime, AU.musG);
    MUS.next += sp; MUS.step++;
  }
}

export function makePlatform(): Platform {
  const isTouch = ('ontouchstart' in W) || (typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0);
  const query = (() => { try { const t = W.top.location.search; if (t) return t; } catch (e) { } try { return W.location.search || ''; } catch (e) { return ''; } })();
  return {
    isTouch, query,
    now: () => performance.now(),
    storage: {
      load: () => { try { return localStorage.getItem(SKEY) || localStorage.getItem('tita-coral-v1'); } catch (e) { return null; } },
      save: (s) => { try { localStorage.setItem(SKEY, s); } catch (e) { } },
    },
    createCanvas: (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c as any; },
    font: (size, kind) => kind === 'body' ? size + 'px Nunito,system-ui,sans-serif' : size + 'px "Lilita One","Arial Black",sans-serif',
    audio: {
      play: (name, v) => { const d = SFX_DEFS[name]; if (d && aok()) d({ tone, noise }, v); },
      music: musTick,
      setVolumes: (s, m) => { AU.sfx = s; AU.mus = m; if (AU.sfxG) AU.sfxG.gain.value = s ? .6 : 0; if (AU.musG) AU.musG.gain.value = m ? .16 : 0; },
    },
    share: async (text) => {
      const nav: any = typeof navigator !== 'undefined' ? navigator : null;
      if (nav && nav.share) { try { await nav.share({ text }); } catch (e) { } return 'shared'; }
      try { await nav.clipboard.writeText(text); return 'copied'; } catch (e) { return 'fail'; }
    },
  };
}
