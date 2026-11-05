/* Receita de cada som do jogo (tons e chiados sintetizados).
   Na web eles são tocados na hora com o WebAudio; para o celular,
   o script scripts/make-sounds.mjs grava cada receita num arquivo .wav. */

export interface ToneOpt { f: number; f2?: number; t: number; type?: string; v?: number; a?: number; dl?: number; dest?: any }
export interface NoiseOpt { t: number; v?: number; fq?: number; f2?: number; type?: string; q?: number; a?: number; dl?: number }
export interface Synth { tone(o: ToneOpt): void; noise(o: NoiseOpt): void }

export const SFX_DEFS: { [name: string]: (s: Synth, v: number) => void } = {
  click: (s) => s.tone({ f: 620, f2: 900, t: .07, type: 'triangle', v: .22 }),
  start: (s) => { [523, 659, 784, 1046].forEach((f, i) => s.tone({ f, t: .2, type: 'square', v: .16, dl: i * .09 })); s.noise({ t: .35, v: .12, fq: 5000, type: 'highpass', dl: .3 }); },
  rivet: (s, v) => { s.noise({ t: .06, v: .35 * v, fq: 3200, type: 'bandpass', q: 1.2 }); s.tone({ f: 950, f2: 320, t: .07, type: 'square', v: .13 * v }); },
  snipe: (s, v) => { s.noise({ t: .28, v: .5 * v, fq: 2400, f2: 300, type: 'lowpass' }); s.tone({ f: 1500, f2: 110, t: .24, type: 'sawtooth', v: .18 * v }); },
  lob: (s, v) => { s.tone({ f: 260, f2: 760, t: .2, type: 'sine', v: .3 * v }); s.noise({ t: .16, v: .12 * v, fq: 900, type: 'bandpass' }); },
  rocket: (s, v) => { s.noise({ t: .45, v: .3 * v, fq: 500, f2: 2600, type: 'bandpass', q: 1.5 }); s.tone({ f: 170, f2: 80, t: .32, type: 'sawtooth', v: .12 * v }); },
  superFire: (s, v) => { s.tone({ f: 180, f2: 1300, t: .42, type: 'sawtooth', v: .2 * v }); s.noise({ t: .55, v: .32 * v, fq: 1600, f2: 200, type: 'lowpass' }); s.tone({ f: 880, t: .3, type: 'triangle', v: .15 * v, dl: .08 }); },
  reload: (s) => { s.noise({ t: .035, v: .28, fq: 2600, type: 'highpass' }); s.noise({ t: .05, v: .34, fq: 1400, type: 'bandpass', q: 2, dl: .08 }); s.tone({ f: 1250, t: .03, type: 'square', v: .07, dl: .08 }); },
  dry: (s) => { s.tone({ f: 230, t: .05, type: 'square', v: .12 }); s.noise({ t: .025, v: .16, fq: 4200, type: 'highpass' }); },
  ready: (s) => { [880, 1175, 1568].forEach((f, i) => s.tone({ f, t: .16, type: 'triangle', v: .2, dl: i * .07 })); },
  hit: (s) => s.tone({ f: 560, f2: 260, t: .05, type: 'square', v: .09 }),
  boom: (s) => { s.noise({ t: .45, v: .45, fq: 1000, f2: 70, type: 'lowpass' }); s.tone({ f: 150, f2: 38, t: .35, type: 'sine', v: .32 }); },
  boom_big: (s) => { s.noise({ t: 1.3, v: .75, fq: 700, f2: 70, type: 'lowpass' }); s.tone({ f: 95, f2: 38, t: .95, type: 'sine', v: .5 }); },
  splash: (s) => { s.noise({ t: .32, v: .35, fq: 1500, f2: 250, type: 'bandpass', q: 1 }); s.tone({ f: 520, f2: 180, t: .15, type: 'sine', v: .12 }); },
  hurt: (s) => { s.tone({ f: 320, f2: 120, t: .2, type: 'sawtooth', v: .22 }); s.noise({ t: .08, v: .18, fq: 800, type: 'lowpass' }); },
  down: (s) => { [440, 330, 247, 165].forEach((f, i) => s.tone({ f, t: .22, type: 'square', v: .15, dl: i * .12 })); },
  coin: (s) => { s.tone({ f: 988, t: .06, type: 'square', v: .11 }); s.tone({ f: 1319, t: .13, type: 'square', v: .11, dl: .06 }); },
  eshot: (s) => s.tone({ f: 430, f2: 190, t: .1, type: 'square', v: .06 }),
  gate: (s) => { s.noise({ t: .7, v: .3, fq: 420, type: 'lowpass' }); [392, 523, 659, 784].forEach((f, i) => s.tone({ f, t: .26, type: 'triangle', v: .17, dl: .18 + i * .1 })); },
  horn: (s) => { s.tone({ f: 330, t: .24, type: 'square', v: .15 }); s.tone({ f: 495, t: .38, type: 'square', v: .15, dl: .22 }); },
  horn_boss: (s) => { for (let i = 0; i < 3; i++) s.tone({ f: 460, f2: 320, t: .36, type: 'sawtooth', v: .2, dl: i * .42 }); },
  waveDone: (s) => { [659, 784, 1046].forEach((f, i) => s.tone({ f, t: .18, type: 'triangle', v: .18, dl: i * .08 })); },
  win: (s) => { [523, 659, 784, 1046, 784, 1046].forEach((f, i) => s.tone({ f, t: .24, type: 'square', v: .15, dl: i * .12 })); },
  lose: (s) => { [392, 349, 311, 262].forEach((f, i) => s.tone({ f, t: .32, type: 'triangle', v: .2, dl: i * .2 })); },
  unlock: (s) => { [659, 784, 988, 1319, 1568].forEach((f, i) => s.tone({ f, t: .2, type: 'triangle', v: .2, dl: i * .07 })); s.noise({ t: .4, v: .1, fq: 6000, type: 'highpass', dl: .3 }); },
  beep: (s) => s.tone({ f: 660, t: .13, type: 'square', v: .17 }),
  beep_hi: (s) => s.tone({ f: 1046, t: .4, type: 'square', v: .17 }),
  blip: (s) => s.tone({ f: 760, t: .03, type: 'triangle', v: .07 }),
};

/** músicas de fundo: 16 passos em loop */
export const SONGS: { [k: string]: { bpm: number; bass: number[]; lead: number[] } } = {
  menu: { bpm: 100, bass: [48, 0, 48, 0, 53, 0, 53, 0, 55, 0, 55, 0, 52, 0, 52, 0], lead: [72, 0, 76, 0, 79, 0, 76, 0, 77, 0, 81, 0, 79, 0, 76, 74] },
  play: { bpm: 132, bass: [45, 45, 0, 45, 48, 48, 0, 48, 50, 50, 0, 50, 52, 0, 55, 0], lead: [69, 0, 72, 74, 76, 0, 74, 72, 69, 0, 67, 69, 72, 0, 0, 0] },
  boss: { bpm: 150, bass: [40, 40, 40, 40, 43, 43, 41, 41, 40, 40, 40, 40, 46, 46, 45, 45], lead: [64, 0, 67, 0, 70, 0, 69, 67, 64, 0, 63, 0, 64, 0, 0, 0] },
};
export const midiHz = (n: number) => 440 * Math.pow(2, (n - 69) / 12);

/** um passo da música: o que tocar no passo i (para a web e para gravar os loops) */
export function songStep(mode: string, i: number, tone: (o: ToneOpt) => void, dl: number, dest?: any) {
  const S = SONGS[mode], sp = 60 / S.bpm / 2, b = S.bass[i % 16], l = S.lead[i % 16];
  if (b) tone({ f: midiHz(b), t: sp * .9, type: 'square', v: .07, dest, dl });
  if (l) tone({ f: midiHz(l), t: sp * 1.6, type: 'triangle', v: .09, dest, dl });
  if (mode !== 'menu' && i % 4 === 0) tone({ f: 120, f2: 45, t: .12, type: 'sine', v: .12, dest, dl });
}
