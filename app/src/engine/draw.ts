/* Desenho pixelado: fonte de bitmap 5x7, carros vistos de trás, cenário da beira da estrada.
   Tudo é pintado pixel a pixel em canvas pequenos e depois ampliado sem suavizar. */
import type { Ctx2D, OffCanvas } from './types';

/* ---------- cores ---------- */
export function hexRgb(h: string): [number, number, number] { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
export function rgbHex(r: number, g: number, b: number) { const c = (v: number) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0'); return '#' + c(r) + c(g) + c(b); }
/** clareia (+) ou escurece (-) */
export function sh(h: string, k: number) { const [r, g, b] = hexRgb(h); return k >= 0 ? rgbHex(r + (255 - r) * k, g + (255 - g) * k, b + (255 - b) * k) : rgbHex(r * (1 + k), g * (1 + k), b * (1 + k)); }
export function mix(a: string, b: string, t: number) { const A = hexRgb(a), B = hexRgb(b); return rgbHex(A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t); }

/* ---------- fonte 5x7 ---------- */
const GL: { [c: string]: number[] } = {
  A: [14, 17, 17, 31, 17, 17, 17], B: [30, 17, 17, 30, 17, 17, 30], C: [14, 17, 16, 16, 16, 17, 14], D: [30, 17, 17, 17, 17, 17, 30],
  E: [31, 16, 16, 30, 16, 16, 31], F: [31, 16, 16, 30, 16, 16, 16], G: [14, 17, 16, 23, 17, 17, 15], H: [17, 17, 17, 31, 17, 17, 17],
  I: [14, 4, 4, 4, 4, 4, 14], J: [7, 2, 2, 2, 2, 18, 12], K: [17, 18, 20, 24, 20, 18, 17], L: [16, 16, 16, 16, 16, 16, 31],
  M: [17, 27, 21, 21, 17, 17, 17], N: [17, 17, 25, 21, 19, 17, 17], O: [14, 17, 17, 17, 17, 17, 14], P: [30, 17, 17, 30, 16, 16, 16],
  Q: [14, 17, 17, 17, 21, 18, 13], R: [30, 17, 17, 30, 20, 18, 17], S: [15, 16, 16, 14, 1, 1, 30], T: [31, 4, 4, 4, 4, 4, 4],
  U: [17, 17, 17, 17, 17, 17, 14], V: [17, 17, 17, 17, 17, 10, 4], W: [17, 17, 17, 21, 21, 21, 10], X: [17, 17, 10, 4, 10, 17, 17],
  Y: [17, 17, 10, 4, 4, 4, 4], Z: [31, 1, 2, 4, 8, 16, 31],
  '0': [14, 17, 19, 21, 25, 17, 14], '1': [4, 12, 4, 4, 4, 4, 14], '2': [14, 17, 1, 2, 4, 8, 31], '3': [31, 2, 4, 2, 1, 17, 14],
  '4': [2, 6, 10, 18, 31, 2, 2], '5': [31, 16, 30, 1, 1, 17, 14], '6': [6, 8, 16, 30, 17, 17, 14], '7': [31, 1, 2, 4, 8, 8, 8],
  '8': [14, 17, 17, 14, 17, 17, 14], '9': [14, 17, 17, 15, 1, 2, 12],
  '.': [0, 0, 0, 0, 0, 12, 12], ',': [0, 0, 0, 0, 12, 4, 8], ':': [0, 12, 12, 0, 12, 12, 0], '!': [4, 4, 4, 4, 4, 0, 4],
  '?': [14, 17, 1, 2, 4, 0, 4], '-': [0, 0, 0, 31, 0, 0, 0], '+': [0, 4, 4, 31, 4, 4, 0], '/': [1, 1, 2, 4, 8, 16, 16],
  "'": [4, 4, 8, 0, 0, 0, 0], '%': [24, 25, 2, 4, 8, 19, 3], '(': [2, 4, 8, 8, 8, 4, 2], ')': [8, 4, 2, 2, 2, 4, 8],
  '>': [8, 4, 2, 1, 2, 4, 8], '<': [2, 4, 8, 16, 8, 4, 2], '=': [0, 0, 31, 0, 31, 0, 0], '#': [10, 10, 31, 10, 31, 10, 10],
  '*': [0, 4, 21, 14, 21, 4, 0], ' ': [0, 0, 0, 0, 0, 0, 0], '$': [4, 15, 20, 14, 5, 30, 4],
  /* ícones: ♥ (corações), ► (seta), ▲, ⚑ (bandeira), ● */
  '♥': [0, 10, 31, 31, 14, 4, 0], '►': [8, 12, 14, 15, 14, 12, 8], '◄': [2, 6, 14, 30, 14, 6, 2], '▼': [0, 0, 31, 14, 4, 0, 0], '▲': [0, 4, 14, 31, 0, 0, 0], '⚑': [16, 30, 31, 30, 16, 16, 16], '●': [0, 14, 31, 31, 31, 14, 0],
};
const ACC: { [c: string]: [string, string] } = {
  'Á': ['A', 'a'], 'À': ['A', 'g'], 'Â': ['A', 'c'], 'Ã': ['A', 't'], 'É': ['E', 'a'], 'Ê': ['E', 'c'], 'Í': ['I', 'a'],
  'Ó': ['O', 'a'], 'Ô': ['O', 'c'], 'Õ': ['O', 't'], 'Ú': ['U', 'a'], 'Ç': ['C', 'z'],
};
export const CHW = 6;
export function textW(s: string, k = 1) { return Math.max(0, s.length * CHW * k - k); }
/** escreve texto pixelado (maiúsculas). align: 0 esquerda, .5 centro, 1 direita */
export function ptext(g: Ctx2D, s: string, x: number, y: number, col: string, k = 1, align = 0, shadow?: string) {
  s = String(s).toUpperCase();
  if (shadow) ptext(g, s, x + k, y + k, shadow, k, align);
  let cx = Math.round(x - textW(s, k) * align); y = Math.round(y);
  g.fillStyle = col;
  for (const ch0 of s) {
    let ch = ch0, acc = '';
    if (ACC[ch]) { acc = ACC[ch][1]; ch = ACC[ch][0]; }
    const rows = GL[ch] || GL['?'];
    for (let r = 0; r < 7; r++) { const b = rows[r]; if (!b) continue; for (let c = 0; c < 5; c++) if (b & (16 >> c)) g.fillRect(cx + c * k, y + r * k, k, k); }
    if (acc === 'a') { g.fillRect(cx + 3 * k, y - 2 * k, k, k); g.fillRect(cx + 2 * k, y - k, k, k); }
    else if (acc === 'g') { g.fillRect(cx + 1 * k, y - 2 * k, k, k); g.fillRect(cx + 2 * k, y - k, k, k); }
    else if (acc === 'c') { g.fillRect(cx + 2 * k, y - 2 * k, k, k); g.fillRect(cx + 1 * k, y - k, k, k); g.fillRect(cx + 3 * k, y - k, k, k); }
    else if (acc === 't') { g.fillRect(cx + 1 * k, y - 2 * k, k, k); g.fillRect(cx + 2 * k, y - k, k, k); g.fillRect(cx + 3 * k, y - 2 * k, k, k); g.fillRect(cx, y - k, k, k); g.fillRect(cx + 4 * k, y - 2 * k, k, k); }
    else if (acc === 'z') { g.fillRect(cx + 2 * k, y + 7 * k, k, k); g.fillRect(cx + 1 * k, y + 8 * k, k, k); }
    cx += CHW * k;
  }
}

/* ---------- sprites ---------- */
type MkCanvas = (w: number, h: number) => OffCanvas;
let mk: MkCanvas = null as any;
export function setCanvasMaker(f: MkCanvas) { mk = f; }

function canvas(w: number, h: number) { const c = mk(w, h); const g = c.getContext('2d'); return { c, g }; }
const R = (g: Ctx2D, x: number, y: number, w: number, h: number, c: string) => { g.fillStyle = c; g.fillRect(x, y, w, h); };

/** carro visto de trás: 32x20. shape: 0..4 = carros do jogador, 5 caminhão, 6 van. turn: -1, 0, 1 */
export const CAR_W = 32, CAR_H = 20;
export function paintCar(g: Ctx2D, ox: number, oy: number, shape: number, col: string, turn: number, lights = 0) {
  const P = (x: number, y: number, w: number, h: number, c: string) => R(g, ox + x, oy + y, w, h, c);
  const hi = sh(col, .35), lo = sh(col, -.35), lo2 = sh(col, -.55), tyre = '#18141c', glass = '#2a3a6c', glassHi = '#5878b8';
  const tail = lights ? '#ff3030' : '#c01818', tailHi = lights ? '#ffd0d0' : '#f04040';
  const t = turn, cx = t * 2;
  if (shape === 5) { /* caminhão-baú */
    P(2, 16, 6, 4, tyre); P(24, 16, 6, 4, tyre);
    P(3, 0, 26, 15, col); P(3, 0, 26, 1, hi); P(3, 14, 26, 2, lo2); P(4, 2, 24, 1, lo); P(15, 1, 2, 13, lo);
    P(4, 15, 24, 2, '#303034'); P(4, 12, 3, 2, tail); P(25, 12, 3, 2, tail); P(13, 16, 6, 2, '#e8e8e8');
    if (t) P(t > 0 ? 0 : 29, 4, 3, 10, lo2);
    return;
  }
  if (shape === 6) { /* van */
    P(3, 15, 6, 5, tyre); P(23, 15, 6, 5, tyre);
    P(3, 3, 26, 13, col); P(4, 2, 24, 1, hi); P(5 + cx, 4, 22, 5, glass); P(6 + cx, 4, 8, 1, glassHi); P(3, 13, 26, 3, lo); P(15, 9, 2, 5, lo);
    P(3, 10, 3, 3, tail); P(26, 10, 3, 3, tail); P(13, 13, 6, 2, '#e8e8e8');
    if (t) P(t > 0 ? 0 : 29, 6, 3, 9, lo2);
    return;
  }
  /* rodas */
  const wy = shape === 2 ? 13 : shape === 4 ? 12 : 14, wh = shape === 2 ? 7 : shape === 4 ? 8 : 6;
  if (shape === 4) { P(0, wy, 7, wh, tyre); P(25, wy, 7, wh, tyre); P(1, wy + 1, 1, wh - 2, '#3a3440'); P(30, wy + 1, 1, wh - 2, '#3a3440'); }
  else { P(2, wy, 6, wh, tyre); P(24, wy, 6, wh, tyre); }
  if (shape === 0) { /* Faísca: hatch */
    P(6 + cx, 2, 20, 6, col); P(7 + cx, 2, 18, 1, hi); P(8 + cx, 3, 16, 4, glass); P(9 + cx, 3, 5, 1, glassHi);
    P(2, 8, 28, 8, col); P(2, 8, 28, 1, hi); P(2, 14, 28, 2, lo); P(3, 9, 4, 3, tail); P(25, 9, 4, 3, tail); P(3, 9, 1, 1, tailHi); P(28, 9, 1, 1, tailHi);
    P(12, 12, 8, 3, '#f0f0e8'); P(13, 13, 6, 1, '#8c8c9c'); P(4, 16, 2, 1, '#505058');
  } else if (shape === 1) { /* Trovão: muscle */
    P(8 + cx, 4, 16, 5, col); P(8 + cx, 4, 16, 1, hi); P(9 + cx, 5, 14, 3, glass); P(10 + cx, 5, 4, 1, glassHi);
    P(1, 9, 30, 7, col); P(1, 9, 30, 1, hi); P(13, 4, 2, 12, '#f8f8f8'); P(17, 4, 2, 12, '#f8f8f8'); P(1, 14, 30, 2, lo);
    P(2, 10, 6, 2, tail); P(24, 10, 6, 2, tail); P(2, 10, 2, 1, tailHi); P(28, 10, 2, 1, tailHi);
    P(11, 13, 10, 2, '#f0f0e8'); P(4, 16, 3, 2, '#8c8c94'); P(25, 16, 3, 2, '#8c8c94');
  } else if (shape === 2) { /* Pé-de-Boi: jipe */
    P(4, 0, 24, 1, '#3c3c40'); P(5, 0, 1, 2, '#3c3c40'); P(26, 0, 1, 2, '#3c3c40');
    P(5 + cx, 2, 22, 6, col); P(5 + cx, 2, 22, 1, hi); P(7 + cx, 3, 18, 4, glass); P(8 + cx, 3, 5, 1, glassHi);
    P(3, 8, 26, 7, col); P(3, 8, 26, 1, hi); P(3, 13, 26, 2, lo2);
    P(11, 7, 10, 8, tyre); P(13, 9, 6, 4, '#5c5c64'); P(15, 10, 2, 2, '#8c8c94');
    P(4, 9, 3, 4, tail); P(25, 9, 3, 4, tail); P(4, 9, 1, 1, tailHi); P(27, 9, 1, 1, tailHi); P(4, 15, 24, 1, '#28282c');
  } else if (shape === 3) { /* Cometa: esportivo */
    P(2, 4, 28, 2, lo2); P(1, 3, 2, 3, lo2); P(29, 3, 2, 3, lo2); P(2, 3, 28, 1, sh(col, -.2));
    P(9 + cx, 6, 14, 4, col); P(10 + cx, 6, 12, 3, glass); P(11 + cx, 6, 3, 1, glassHi);
    P(2, 9, 28, 7, col); P(2, 9, 28, 1, hi); P(2, 14, 28, 2, lo);
    P(3, 10, 8, 2, tail); P(21, 10, 8, 2, tail); P(4, 10, 2, 1, tailHi); P(26, 10, 2, 1, tailHi);
    P(13, 12, 6, 2, '#f0f0e8'); P(10, 16, 3, 1, '#8c8c94'); P(19, 16, 3, 1, '#8c8c94');
  } else { /* Furacão: protótipo de corrida */
    P(1, 1, 30, 3, col); P(1, 1, 30, 1, hi); P(1, 3, 30, 1, lo2); P(4, 4, 2, 6, lo2); P(26, 4, 2, 6, lo2);
    P(11 + cx, 5, 10, 5, col); P(12 + cx, 6, 8, 3, '#202030'); P(14 + cx, 5, 4, 1, '#f8c818');
    P(7, 10, 18, 6, col); P(7, 10, 18, 1, hi); P(7, 14, 18, 2, lo);
    P(8, 11, 4, 2, tail); P(20, 11, 4, 2, tail); P(14, 12, 4, 3, '#38383c'); P(15, 13, 2, 1, '#f87818');
  }
  if (t) { const sx = t > 0 ? 0 : 29; P(sx, shape === 2 ? 8 : 9, 3, 6, lo2); }
}

export interface SpriteSet { [k: string]: OffCanvas }
const carCache: SpriteSet = {};
/** sprite de carro em cache: (forma, cor, curva, luz de freio) */
export function carSprite(shape: number, col: string, turn: number, brake = 0): OffCanvas {
  const k = shape + col + turn + brake;
  let c = carCache[k];
  if (!c) { const o = canvas(CAR_W, CAR_H); paintCar(o.g, 0, 0, shape, col, turn, brake); c = carCache[k] = o.c; }
  return c;
}

/* cenário: cada tipo em 3 tons (claro, fim de tarde, noite) */
export type Prop = 'cacto' | 'pedra' | 'palmeira' | 'pinheiro' | 'pinheiroN' | 'predio' | 'predio2' | 'poste' | 'placa' | 'boneco' | 'arbusto' | 'outdoor' | 'casa' | 'farol';
export const PROP_SIZE: { [k: string]: [number, number, number] } = { /* largura, altura (px), tamanho no mundo */
  cacto: [12, 24, 1], pedra: [16, 10, .9], palmeira: [22, 34, 1.5], pinheiro: [16, 30, 1.3], pinheiroN: [16, 30, 1.3], predio: [26, 48, 3.2], predio2: [22, 40, 2.8],
  poste: [8, 32, 1.4], placa: [14, 18, .9], boneco: [12, 16, .8], arbusto: [16, 9, .8], outdoor: [32, 22, 2.2], casa: [28, 22, 2.2], farol: [12, 40, 1.6],
};
function paintProp(g: Ctx2D, p: string, night: number) {
  const d = (c: string) => night >= 2 ? sh(c, -.72) : night === 1 ? sh(c, -.35) : c;
  const P = (x: number, y: number, w: number, h: number, c: string) => R(g, x, y, w, h, d(c));
  const L = (x: number, y: number, w: number, h: number, c: string) => R(g, x, y, w, h, c); /* luz: não escurece */
  if (p === 'cacto') { P(5, 2, 3, 22, '#2c8c3c'); P(5, 2, 1, 22, '#5cbc5c'); P(1, 8, 2, 7, '#2c8c3c'); P(1, 14, 4, 2, '#2c8c3c'); P(10, 5, 2, 8, '#2c8c3c'); P(8, 12, 3, 2, '#2c8c3c'); P(6, 0, 1, 2, '#2c8c3c'); }
  else if (p === 'pedra') { P(2, 3, 12, 7, '#9c7c5c'); P(4, 1, 7, 3, '#ac8c6c'); P(3, 3, 5, 2, '#c4a484'); P(2, 8, 12, 2, '#6c543c'); }
  else if (p === 'palmeira') { P(10, 10, 3, 24, '#8c5c2c'); for (let i = 0; i < 6; i++) P(10, 12 + i * 4, 3, 1, '#6c4420'); P(2, 6, 9, 3, '#2c9c3c'); P(12, 6, 9, 3, '#2c9c3c'); P(0, 9, 4, 3, '#2c9c3c'); P(18, 9, 4, 3, '#2c9c3c'); P(7, 2, 9, 4, '#3cbc4c'); P(9, 8, 5, 3, '#7c4c1c'); }
  else if (p === 'pinheiro' || p === 'pinheiroN') { const c = '#1c7c3c', c2 = '#2c9c4c'; P(7, 25, 2, 5, '#6c4420'); P(1, 18, 14, 7, c); P(3, 11, 10, 8, c); P(5, 4, 6, 8, c); P(7, 0, 2, 5, c); P(3, 18, 4, 2, c2); P(5, 11, 3, 2, c2);
    if (p === 'pinheiroN') { P(1, 18, 14, 2, '#f4f8fc'); P(3, 11, 10, 2, '#f4f8fc'); P(5, 4, 6, 2, '#f4f8fc'); P(7, 0, 2, 2, '#f4f8fc'); } }
  else if (p === 'predio' || p === 'predio2') { const w = p === 'predio' ? 26 : 22, h = p === 'predio' ? 48 : 40, base = p === 'predio' ? '#5c5c7c' : '#7c5c4c';
    P(0, 0, w, h, base); P(0, 0, w, 2, sh(base, .3)); P(w - 3, 0, 3, h, sh(base, -.3));
    for (let y = 4; y < h - 6; y += 5) for (let x = 3; x < w - 4; x += 5) { const on = night >= 1 && ((x * 7 + y * 13) % 5 < 3); if (on) L(x, y, 3, 3, '#fce468'); else P(x, y, 3, 3, '#2c3c5c'); }
    P(w / 2 - 3, h - 6, 6, 6, '#2c2c34'); }
  else if (p === 'poste') { P(3, 4, 2, 28, '#6c6c74'); P(3, 2, 5, 2, '#6c6c74'); if (night >= 1) { L(5, 4, 3, 2, '#fcf8c8'); } else P(5, 4, 3, 2, '#c8c8c8'); }
  else if (p === 'placa') { P(6, 10, 2, 8, '#6c6c74'); P(0, 0, 14, 10, '#f8c818'); P(0, 0, 14, 1, '#fce468'); P(4, 3, 6, 1, '#202020'); P(7, 2, 2, 5, '#202020'); P(6, 2, 1, 1, '#202020'); }
  else if (p === 'boneco') { P(2, 7, 8, 8, '#f4f8fc'); P(3, 2, 6, 6, '#f4f8fc'); P(4, 4, 1, 1, '#202020'); P(7, 4, 1, 1, '#202020'); P(5, 5, 2, 1, '#f87818'); P(3, 0, 6, 2, '#202020'); P(1, 7, 10, 1, '#d82818'); }
  else if (p === 'arbusto') { P(1, 3, 14, 6, '#3c8c2c'); P(3, 1, 9, 3, '#4cac3c'); P(4, 2, 4, 1, '#7ccc5c'); }
  else if (p === 'outdoor') { P(4, 14, 2, 8, '#6c6c74'); P(26, 14, 2, 8, '#6c6c74'); P(0, 0, 32, 14, '#f8f8f8'); P(1, 1, 30, 12, '#2a6cf0');
    const ink = night >= 1 ? '#fce468' : '#f8c818'; for (const [x, y] of [[4, 4], [5, 4], [6, 4], [5, 5], [5, 6], [5, 7], [5, 8], [9, 4], [9, 5], [9, 6], [9, 7], [10, 8], [11, 8], [12, 4], [12, 5], [12, 6], [12, 7], [15, 4], [16, 4], [15, 5], [17, 5], [15, 6], [16, 6], [15, 7], [17, 8], [15, 8], [20, 4], [21, 4], [20, 5], [22, 5], [20, 6], [21, 6], [20, 7], [22, 7], [20, 8], [21, 8], [25, 4], [26, 4], [24, 5], [27, 5], [24, 6], [27, 6], [24, 7], [27, 7], [25, 8], [26, 8]]) L(x, y, 1, 1, ink); }
  else if (p === 'casa') { P(2, 8, 24, 14, '#e8d8b8'); P(0, 6, 28, 3, '#c04828'); P(4, 2, 20, 4, '#c04828'); P(11, 13, 6, 9, '#7c4c2c'); const w = night >= 1 ? '#fce468' : '#5c8cc8'; L(4, 12, 5, 4, w); L(19, 12, 5, 4, w); }
  else if (p === 'farol') { P(3, 8, 6, 32, '#f8f8f8'); for (let y = 12; y < 40; y += 8) P(3, y, 6, 4, '#d82818'); P(2, 4, 8, 4, '#3c3c44'); if (night >= 1) L(3, 5, 6, 2, '#fcf8a8'); else P(3, 5, 6, 2, '#c8e8f8'); P(5, 0, 2, 4, '#3c3c44'); }
}
const propCache: SpriteSet = {};
export function propSprite(p: string, night: number): OffCanvas {
  const k = p + night; let c = propCache[k];
  if (!c) { const [w, h] = PROP_SIZE[p]; const o = canvas(w, h); paintProp(o.g, p, night); c = propCache[k] = o.c; }
  return c;
}

/* ---------- imagens para as telas (garagem, início): PNG ampliado ---------- */
export function carImage(shape: number, col: string, scale = 6): string {
  const o = canvas(CAR_W * scale, CAR_H * scale);
  const s = carSprite(shape, col, 0, 0);
  o.g.imageSmoothingEnabled = false;
  o.g.drawImage(s as any, 0, 0, CAR_W, CAR_H, 0, 0, CAR_W * scale, CAR_H * scale);
  try { return o.c.toDataURL ? o.c.toDataURL('image/png') : ''; } catch (e) { return ''; }
}

/* versão "na neblina" de um sprite: só os pixels pintados ficam da cor da neblina */
const fogged = new WeakMap<any, { [k: string]: OffCanvas }>();
let foggedN = 0;
export function fogSprite(spr: OffCanvas, fog: string, lvl: number): OffCanvas {
  let m = fogged.get(spr); if (!m) { m = {}; fogged.set(spr, m); }
  const k = fog + lvl; let c = m[k];
  if (!c) {
    if (foggedN > 6000) return spr;
    const o = canvas(spr.width, spr.height); o.g.drawImage(spr as any, 0, 0);
    (o.g as any).globalCompositeOperation = 'source-atop'; o.g.globalAlpha = lvl; o.g.fillStyle = fog; o.g.fillRect(0, 0, spr.width, spr.height);
    c = m[k] = o.c; foggedN++;
  }
  return c;
}
