// Grava os sons do jogo em arquivos .wav (para o celular), usando o WebAudio de um
// Chromium sem tela (playwright) com exatamente as mesmas receitas da web.
// Uso: node scripts/make-sounds.mjs   (precisa do playwright instalado)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { chromium } from 'playwright';

const here = path.dirname(fileURLToPath(import.meta.url));
const app = path.join(here, '..');
const src = fs.readFileSync(path.join(app, 'src/engine/sfxDefs.ts'), 'utf8');
const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
const SR = 22050;

const browser = await chromium.launch();
const page = await browser.newPage();
await page.setContent('<html><body></body></html>');
const out = await page.evaluate(async ({ js, SR }) => {
  const exports = {}; eval(js); window.__D = exports;
  const { SFX_DEFS, SONGS, songStep } = window.__D;
  function synth(c, sfxG) {
    const nb = c.createBuffer(1, c.sampleRate, c.sampleRate), d = nb.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return {
      tone(o) { const t0 = (o.dl || 0); const osc = c.createOscillator(), g = c.createGain(); osc.type = o.type || 'square';
        osc.frequency.setValueAtTime(o.f, t0); if (o.f2) osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.f2), t0 + o.t);
        g.gain.setValueAtTime(.0001, t0); g.gain.exponentialRampToValueAtTime(Math.max(.0002, o.v || .3), t0 + (o.a || .006)); g.gain.exponentialRampToValueAtTime(.0001, t0 + o.t);
        osc.connect(g); g.connect(sfxG); osc.start(t0); osc.stop(t0 + o.t + .05); },
      noise(o) { const t0 = (o.dl || 0); const src = c.createBufferSource(); src.buffer = nb; const f = c.createBiquadFilter(); f.type = o.type || 'lowpass'; f.frequency.setValueAtTime(o.fq || 1000, t0);
        if (o.f2) f.frequency.exponentialRampToValueAtTime(Math.max(30, o.f2), t0 + o.t); f.Q.value = o.q || .8;
        const g = c.createGain(); g.gain.setValueAtTime(.0001, t0); g.gain.exponentialRampToValueAtTime(Math.max(.0002, o.v || .3), t0 + (o.a || .004)); g.gain.exponentialRampToValueAtTime(.0001, t0 + o.t);
        src.connect(f); f.connect(g); g.connect(sfxG); src.start(t0, Math.random() * .5); src.stop(t0 + o.t + .05); },
    };
  }
  const res = {};
  for (const name of Object.keys(SFX_DEFS)) {
    let end = 0; SFX_DEFS[name]({ tone: o => end = Math.max(end, (o.dl || 0) + o.t + .06), noise: o => end = Math.max(end, (o.dl || 0) + o.t + .06) }, 1);
    const c = new OfflineAudioContext(1, Math.ceil(SR * end), SR);
    const g = c.createGain(); g.gain.value = .6 * .9; g.connect(c.destination);
    SFX_DEFS[name](synth(c, g), 1);
    const buf = await c.startRendering();
    res[name] = Array.from(buf.getChannelData(0));
  }
  for (const mode of Object.keys(SONGS)) {
    const sp = 60 / SONGS[mode].bpm / 2, L = 16 * sp, n = Math.round(SR * L);
    const c = new OfflineAudioContext(1, n * 3, SR);
    const g = c.createGain(); g.gain.value = .16 * .9; g.connect(c.destination);
    const s = synth(c, g);
    for (let i = 0; i < 48; i++) songStep(mode, i, (o) => s.tone(o), i * sp, g);
    const buf = await c.startRendering();
    res['music_' + mode] = Array.from(buf.getChannelData(0).slice(n, 2 * n));
  }
  return res;
}, { js, SR });
await browser.close();

function wav(samples, gain) {
  const n = samples.length, b = Buffer.alloc(44 + n * 2);
  b.write('RIFF', 0); b.writeUInt32LE(36 + n * 2, 4); b.write('WAVE', 8); b.write('fmt ', 12); b.writeUInt32LE(16, 16);
  b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22); b.writeUInt32LE(SR, 24); b.writeUInt32LE(SR * 2, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34);
  b.write('data', 36); b.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) b.writeInt16LE(Math.max(-32767, Math.min(32767, Math.round(samples[i] * gain * 32767))), 44 + i * 2);
  return b;
}
const dir = path.join(app, 'assets/sfx');
fs.mkdirSync(dir, { recursive: true });
const gains = {};
for (const [name, s] of Object.entries(out)) {
  let peak = 0; for (const v of s) peak = Math.max(peak, Math.abs(v));
  const g = peak > 0 ? Math.min(40, .98 / peak) : 1;
  gains[name] = Math.round(g * 1000) / 1000;
  fs.writeFileSync(path.join(dir, name + '.wav'), wav(s, gains[name]));
}
const names = Object.keys(out);
const ts2 = `/* Gerado por scripts/make-sounds.mjs — não edite à mão. */
/* eslint-disable */
export const SOUND_FILES: { [k: string]: any } = {
${names.map(n => `  ${JSON.stringify(n)}: require('../../assets/sfx/${n}.wav'),`).join('\n')}
};
/** quanto cada arquivo foi amplificado ao gravar (o volume tocado divide por isso) */
export const SOUND_GAIN: { [k: string]: number } = ${JSON.stringify(gains)};
`;
fs.writeFileSync(path.join(app, 'src/platform/sounds.ts'), ts2);
console.log('ok', names.length, 'sons');
