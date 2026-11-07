/* Receita de cada som (chiptune sintetizado na hora, nada de arquivo). */

export interface ToneOpt { f: number; f2?: number; t: number; type?: string; v?: number; a?: number; dl?: number; dest?: any }
export interface NoiseOpt { t: number; v?: number; fq?: number; f2?: number; type?: string; q?: number; a?: number; dl?: number }
export interface Synth { tone(o: ToneOpt): void; noise(o: NoiseOpt): void }

export const SFX: { [name: string]: (s: Synth, v: number) => void } = {
  click: (s) => s.tone({ f: 880, t: .05, type: 'square', v: .12 }),
  back: (s) => s.tone({ f: 520, f2: 330, t: .07, type: 'square', v: .1 }),
  buy: (s) => { [784, 988, 1319].forEach((f, i) => s.tone({ f, t: .09, type: 'square', v: .12, dl: i * .06 })); },
  nope: (s) => { s.tone({ f: 196, t: .12, type: 'square', v: .14 }); s.tone({ f: 147, t: .16, type: 'square', v: .14, dl: .1 }); },
  beep: (s) => s.tone({ f: 523, t: .18, type: 'square', v: .16 }),
  go: (s) => s.tone({ f: 1046, t: .55, type: 'square', v: .16 }),
  pass: (s) => { s.tone({ f: 1318, t: .04, type: 'square', v: .07 }); s.tone({ f: 1760, t: .05, type: 'square', v: .07, dl: .04 }); },
  passed: (s) => s.tone({ f: 330, f2: 220, t: .12, type: 'square', v: .09 }),
  crash: (s) => { s.noise({ t: .45, v: .5, fq: 1800, f2: 120, type: 'lowpass' }); s.tone({ f: 140, f2: 40, t: .35, type: 'sawtooth', v: .25 }); },
  bump: (s) => { s.noise({ t: .12, v: .25, fq: 900, type: 'lowpass' }); },
  skid: (s) => s.noise({ t: .3, v: .12, fq: 3200, type: 'bandpass', q: 3 }),
  day: (s) => { [523, 659, 784, 1046, 1318].forEach((f, i) => s.tone({ f, t: .16, type: 'square', v: .13, dl: i * .08 })); },
  win: (s) => { [523, 659, 784, 1046, 784, 1046, 1318].forEach((f, i) => s.tone({ f, t: .2, type: 'square', v: .14, dl: i * .11 })); },
  lose: (s) => { [392, 349, 311, 262].forEach((f, i) => s.tone({ f, t: .3, type: 'triangle', v: .2, dl: i * .2 })); },
  coin: (s) => { s.tone({ f: 988, t: .05, type: 'square', v: .1 }); s.tone({ f: 1319, t: .1, type: 'square', v: .1, dl: .05 }); },
  flag: (s) => { [784, 988, 1175, 1568].forEach((f, i) => s.tone({ f, t: .12, type: 'square', v: .14, dl: i * .07 })); },
};

/** músicas: 16 passos em loop (baixo + melodia) */
export const SONGS: { [k: string]: { bpm: number; bass: number[]; lead: number[]; drum?: boolean } } = {
  menu: { bpm: 118, bass: [45, 0, 45, 45, 0, 45, 48, 0, 50, 0, 50, 50, 0, 48, 47, 0], lead: [69, 0, 72, 0, 76, 74, 72, 0, 74, 0, 77, 0, 76, 74, 72, 71], drum: true },
  garage: { bpm: 96, bass: [41, 0, 0, 41, 43, 0, 0, 43, 45, 0, 0, 45, 43, 0, 40, 0], lead: [0, 72, 0, 69, 0, 72, 74, 0, 0, 76, 0, 74, 72, 0, 69, 0] },
  race: { bpm: 140, bass: [40, 40, 52, 40, 40, 52, 43, 45, 40, 40, 52, 40, 38, 50, 43, 47], lead: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], drum: true },
};
export const midiHz = (n: number) => 440 * Math.pow(2, (n - 69) / 12);

export function songStep(mode: string, i: number, tone: (o: ToneOpt) => void, noise: (o: NoiseOpt) => void, dl: number) {
  const S = SONGS[mode], sp = 60 / S.bpm / 2, b = S.bass[i % 16], l = S.lead[i % 16];
  if (b) tone({ f: midiHz(b), t: sp * .85, type: 'square', v: .06, dl });
  if (l) tone({ f: midiHz(l), t: sp * 1.5, type: 'square', v: .05, dl });
  if (S.drum) {
    if (i % 4 === 0) tone({ f: 110, f2: 40, t: .12, type: 'sine', v: .16, dl });
    if (i % 4 === 2) noise({ t: .07, v: .07, fq: 6000, type: 'highpass', dl });
  }
}
