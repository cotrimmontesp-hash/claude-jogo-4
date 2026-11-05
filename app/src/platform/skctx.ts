/* Adaptador: o "contexto 2D do canvas" que o jogo usa, desenhado com o Skia
   (só no celular).
   Para ficar rápido, quase tudo é feito em JavaScript e o Skia recebe o mínimo
   de chamadas: cada forma vira um caminho SVG já transformado (1 chamada),
   os pincéis são reaproveitados, e texto/imagem sem rotação vão direto. */
import { Skia, PaintStyle, StrokeCap, StrokeJoin, BlendMode, TileMode, ClipOp } from '@shopify/react-native-skia';
import type { Ctx2D, OffCanvas } from '../engine/types';

type Mx = number[]; // [a,b,c,d,e,f]
const ID: Mx = [1, 0, 0, 1, 0, 0];
const mul = (m: Mx, n: Mx): Mx => [
  m[0] * n[0] + m[2] * n[1], m[1] * n[0] + m[3] * n[1],
  m[0] * n[2] + m[2] * n[3], m[1] * n[2] + m[3] * n[3],
  m[0] * n[4] + m[2] * n[5] + m[4], m[1] * n[4] + m[3] * n[5] + m[5],
];
const R = (v: number) => Math.round(v * 100) / 100;

/* ---------- cores ---------- */
const CC = new Map<string, Float32Array>();
const NAMED: { [k: string]: number[] } = { black: [0, 0, 0, 1], white: [255, 255, 255, 1], transparent: [0, 0, 0, 0], red: [255, 0, 0, 1] };
export function color(s: string): Float32Array {
  let c = CC.get(s);
  if (c) return c;
  let r = 0, g = 0, b = 0, a = 1;
  const t = String(s).trim().toLowerCase();
  if (t[0] === '#') {
    let h = t.slice(1);
    if (h.length === 3 || h.length === 4) h = h.split('').map(x => x + x).join('');
    r = parseInt(h.slice(0, 2), 16); g = parseInt(h.slice(2, 4), 16); b = parseInt(h.slice(4, 6), 16);
    if (h.length === 8) a = parseInt(h.slice(6, 8), 16) / 255;
  } else if (t.startsWith('rgb')) {
    const p = t.slice(t.indexOf('(') + 1, t.lastIndexOf(')')).split(/[\s,/]+/).filter(Boolean).map(x => parseFloat(x));
    r = p[0] || 0; g = p[1] || 0; b = p[2] || 0; a = p.length > 3 && !isNaN(p[3]) ? p[3] : 1;
  } else if (NAMED[t]) { [r, g, b, a] = NAMED[t]; }
  else { try { c = Skia.Color(s) as any; CC.set(s, c!); return c!; } catch (e) { } }
  c = Float32Array.of(r / 255, g / 255, b / 255, Math.max(0, Math.min(1, a)));
  CC.set(s, c);
  return c;
}

/* ---------- fontes ---------- */
let TF: { display: any; body: any } = { display: null, body: null };
export function setTypefaces(display: any, body: any) { TF = { display, body }; FC.clear(); MC.clear(); }
const FC = new Map<string, any>();
const MC = new Map<string, { asc: number; desc: number }>();
const SPEC = new Map<string, [boolean, number]>();
function parseFont(spec: string): [boolean, number] {
  let r = SPEC.get(spec);
  if (!r) { const m = /(\d+(?:\.\d+)?)px/.exec(spec); r = [/lilita/i.test(spec), m ? parseFloat(m[1]) : 12]; SPEC.set(spec, r); }
  return r;
}
function fontOf(display: boolean, size: number) {
  size = Math.max(1, Math.round(size * 2) / 2);
  const key = (display ? 'd' : 'b') + size;
  let f = FC.get(key);
  if (!f) {
    const tf = display ? TF.display : TF.body;
    try { f = tf ? Skia.Font(tf, size) : Skia.Font(undefined as any, size); } catch (e) { f = Skia.Font(undefined as any, size); }
    if (FC.size > 300) FC.clear();
    FC.set(key, f);
  }
  return f;
}
function metrics(display: boolean, size: number) {
  const key = (display ? 'd' : 'b') + Math.round(size * 2) / 2;
  let m = MC.get(key);
  if (!m) { m = { asc: -size * .8, desc: size * .2 }; try { const mt = fontOf(display, size).getMetrics(); m = { asc: mt.ascent, desc: mt.descent }; } catch (e) { } MC.set(key, m); }
  return m;
}
/* largura de texto guardada (medir custa uma chamada ao Skia) */
const WC = new Map<string, number>();
function textW(display: boolean, size: number, s: string) {
  const key = (display ? 'd' : 'b') + size + '|' + s;
  let w = WC.get(key);
  if (w == null) {
    const f = fontOf(display, size);
    try { w = f.getTextWidth ? f.getTextWidth(s) : f.measureText(s).width; } catch (e) { w = s.length * size * .5; }
    if (WC.size > 2000) WC.clear();
    WC.set(key, w!);
  }
  return w!;
}

/* ---------- gradientes ---------- */
class Grad {
  st: [number, string][] = [];
  constructor(public k: 'l' | 'r', public a: number[]) { }
  addColorStop(o: number, c: string) { this.st.push([o, c]); }
}

interface St {
  fill: any; stroke: any; alpha: number; comp: string; lw: number; cap: string; join: string;
  font: string; align: string; base: string; dash: number[]; m: Mx; cs: boolean;
}
const fresh = (m: Mx): St => ({ fill: '#000', stroke: '#000', alpha: 1, comp: 'source-over', lw: 1, cap: 'butt', join: 'miter', font: '10px sans-serif', align: 'start', base: 'alphabetic', dash: [], m: m.slice(), cs: false });

/* pincéis reaproveitados entre quadros (cada combinação de cor/estilo vira um pincel) */
const PC = new Map<string, any>();
function cachedPaint(key: string, make: () => any) {
  let p = PC.get(key);
  if (!p) { if (PC.size > 600) PC.clear(); p = make(); PC.set(key, p); }
  return p;
}
let CLEAR: any = null;

const KAPPA = (d: number) => 4 / 3 * Math.tan(d / 4);


export class SkCtx implements Ctx2D {
  c: any; base: Mx; private s: St; private stack: St[] = [];
  private d = ''; private cur = false; private onDraw: (() => void) | null;
  constructor(canvas: any, base: Mx = ID, onDraw: (() => void) | null = null) {
    this.c = canvas; this.base = base; this.onDraw = onDraw; this.s = fresh(base);
  }
  /** começa um quadro novo num canvas novo (gravação do Skia) */
  reset(canvas: any, base: Mx = ID) { this.c = canvas; this.base = base; this.stack = []; this.s = fresh(base); this.d = ''; this.cur = false; }
  // propriedades no estilo do canvas
  get fillStyle() { return this.s.fill; } set fillStyle(v: any) { this.s.fill = v; }
  get strokeStyle() { return this.s.stroke; } set strokeStyle(v: any) { this.s.stroke = v; }
  get globalAlpha() { return this.s.alpha; } set globalAlpha(v: number) { if (isFinite(v)) this.s.alpha = Math.max(0, Math.min(1, v)); }
  get globalCompositeOperation() { return this.s.comp; } set globalCompositeOperation(v: string) { this.s.comp = v; }
  get lineWidth() { return this.s.lw; } set lineWidth(v: number) { if (isFinite(v) && v > 0) this.s.lw = v; }
  get lineCap() { return this.s.cap; } set lineCap(v: string) { this.s.cap = v; }
  get lineJoin() { return this.s.join; } set lineJoin(v: string) { this.s.join = v; }
  get font() { return this.s.font; } set font(v: string) { this.s.font = v; }
  get textAlign() { return this.s.align; } set textAlign(v: string) { this.s.align = v; }
  get textBaseline() { return this.s.base; } set textBaseline(v: string) { this.s.base = v; }

  /* o save do Skia só é feito quando há recorte (clip): o resto é só em JavaScript */
  save() { this.stack.push(this.s); this.s = { ...this.s, dash: this.s.dash, m: this.s.m.slice(), cs: false }; }
  restore() { const s = this.stack.pop(); if (!s) return; if (this.s.cs) this.c.restore(); this.s = s; }
  setTransform(a: number, b: number, c: number, d: number, e: number, f: number) { this.s.m = mul(this.base, [a, b, c, d, e, f]); }
  translate(x: number, y: number) { const m = this.s.m; m[4] += m[0] * x + m[2] * y; m[5] += m[1] * x + m[3] * y; }
  rotate(a: number) { if (!a) return; const c = Math.cos(a), s = Math.sin(a); this.s.m = mul(this.s.m, [c, s, -s, c, 0, 0]); }
  scale(x: number, y: number) { const m = this.s.m; m[0] *= x; m[1] *= x; m[2] *= y; m[3] *= y; }

  /* ---------- caminhos (guardados como texto SVG, já em coordenadas da tela) ---------- */
  private P(x: number, y: number) { const m = this.s.m; return R(m[0] * x + m[2] * y + m[4]) + ' ' + R(m[1] * x + m[3] * y + m[5]); }
  beginPath() { this.d = ''; this.cur = false; }
  closePath() { if (this.cur) this.d += 'Z'; }
  moveTo(x: number, y: number) { this.d += 'M' + this.P(x, y); this.cur = true; }
  lineTo(x: number, y: number) { this.d += (this.cur ? 'L' : 'M') + this.P(x, y); this.cur = true; }
  quadraticCurveTo(cx: number, cy: number, x: number, y: number) {
    if (!this.cur) this.moveTo(cx, cy);
    this.d += 'Q' + this.P(cx, cy) + ' ' + this.P(x, y);
  }
  bezierCurveTo(c1x: number, c1y: number, c2x: number, c2y: number, x: number, y: number) {
    if (!this.cur) this.moveTo(c1x, c1y);
    this.d += 'C' + this.P(c1x, c1y) + ' ' + this.P(c2x, c2y) + ' ' + this.P(x, y);
  }
  private arcLocal(cx: number, cy: number, rx: number, ry: number, rot: number, a0: number, a1: number, ccw: boolean) {
    if (!(rx >= 0) || !(ry >= 0)) return;
    const TAU = Math.PI * 2;
    let sw = a1 - a0;
    if (!ccw) { if (sw >= TAU) sw = TAU; else { sw = sw % TAU; if (sw < 0) sw += TAU; } }
    else { if (sw <= -TAU) sw = -TAU; else { sw = sw % TAU; if (sw > 0) sw -= TAU; } }
    const cr = Math.cos(rot), sr = Math.sin(rot);
    let c0 = Math.cos(a0), s0 = Math.sin(a0);
    this.lineTo(cx + rx * c0 * cr - ry * s0 * sr, cy + rx * c0 * sr + ry * s0 * cr);
    if (sw === 0) return;
    const n = Math.max(1, Math.ceil(Math.abs(sw) / (Math.PI / 2) - 1e-9));
    const dd = sw / n, k = KAPPA(dd);
    let t = a0;
    for (let i = 0; i < n; i++) {
      const t2 = t + dd, c1 = Math.cos(t2), s1 = Math.sin(t2);
      const x0 = cx + rx * c0 * cr - ry * s0 * sr, y0 = cy + rx * c0 * sr + ry * s0 * cr;
      const x1 = cx + rx * c1 * cr - ry * s1 * sr, y1 = cy + rx * c1 * sr + ry * s1 * cr;
      const dx0 = -rx * s0 * cr - ry * c0 * sr, dy0 = -rx * s0 * sr + ry * c0 * cr;
      const dx1 = -rx * s1 * cr - ry * c1 * sr, dy1 = -rx * s1 * sr + ry * c1 * cr;
      this.d += 'C' + this.P(x0 + k * dx0, y0 + k * dy0) + ' ' + this.P(x1 - k * dx1, y1 - k * dy1) + ' ' + this.P(x1, y1);
      t = t2; c0 = c1; s0 = s1;
    }
  }
  arc(x: number, y: number, r: number, a0: number, a1: number, ccw?: boolean) { this.arcLocal(x, y, r, r, 0, a0, a1, !!ccw); }
  ellipse(x: number, y: number, rx: number, ry: number, rot: number, a0: number, a1: number, ccw?: boolean) { this.arcLocal(x, y, rx, ry, rot, a0, a1, !!ccw); }
  rect(x: number, y: number, w: number, h: number) {
    this.d += 'M' + this.P(x, y) + 'L' + this.P(x + w, y) + 'L' + this.P(x + w, y + h) + 'L' + this.P(x, y + h) + 'Z'; this.cur = true;
  }
  roundRect(x: number, y: number, w: number, h: number, r: any) {
    if (w < 0) { x += w; w = -w; } if (h < 0) { y += h; h = -h; }
    let rad = Array.isArray(r) ? (r[0] || 0) : (+r || 0);
    rad = Math.max(0, Math.min(rad, w / 2, h / 2));
    if (rad <= 0) { this.rect(x, y, w, h); return; }
    const H = Math.PI / 2;
    this.moveTo(x + rad, y);
    this.lineTo(x + w - rad, y); this.arcLocal(x + w - rad, y + rad, rad, rad, 0, -H, 0, false);
    this.lineTo(x + w, y + h - rad); this.arcLocal(x + w - rad, y + h - rad, rad, rad, 0, 0, H, false);
    this.lineTo(x + rad, y + h); this.arcLocal(x + rad, y + h - rad, rad, rad, 0, H, Math.PI, false);
    this.lineTo(x, y + rad); this.arcLocal(x + rad, y + rad, rad, rad, 0, Math.PI, Math.PI * 1.5, false);
    this.d += 'Z';
  }
  private path(d: string) { return d ? Skia.Path.MakeFromSVGString(d) : null; }

  /* ---------- pintura ---------- */
  private scaleF() { const m = this.s.m; return Math.sqrt(Math.abs(m[0] * m[3] - m[1] * m[2])) || 1; }
  private shader(g: Grad) {
    const cols = g.st.map(s => color(s[1])), pos = g.st.map(s => Math.max(0, Math.min(1, s[0])));
    if (!cols.length) return null;
    if (cols.length === 1) { cols.push(cols[0]); pos.push(1); }
    const m = this.s.m, T = (x: number, y: number) => ({ x: m[0] * x + m[2] * y + m[4], y: m[1] * x + m[3] * y + m[5] });
    if (g.k === 'l') return Skia.Shader.MakeLinearGradient(T(g.a[0], g.a[1]), T(g.a[2], g.a[3]), cols, pos, TileMode.Clamp);
    const sf = this.scaleF();
    return Skia.Shader.MakeTwoPointConicalGradient(T(g.a[0], g.a[1]), Math.max(0, g.a[2] * sf), T(g.a[3], g.a[4]), Math.max(0.0001, g.a[5] * sf), cols, pos, TileMode.Clamp);
  }
  /** pincel para preencher (stroke=false) ou contornar; lw = espessura já na tela */
  private paint(stroke: boolean, lw?: number) {
    const st = stroke ? this.s.stroke : this.s.fill, a = this.s.alpha, plus = this.s.comp === 'lighter';
    const dash = stroke && this.s.dash.length > 0;
    const w = lw != null ? lw : this.s.lw * this.scaleF();
    const setStroke = (pt: any) => {
      pt.setStyle(PaintStyle.Stroke); pt.setStrokeWidth(w);
      pt.setStrokeCap(this.s.cap === 'round' ? StrokeCap.Round : this.s.cap === 'square' ? StrokeCap.Square : StrokeCap.Butt);
      pt.setStrokeJoin(this.s.join === 'round' ? StrokeJoin.Round : this.s.join === 'bevel' ? StrokeJoin.Bevel : StrokeJoin.Miter);
    };
    if (st instanceof Grad || dash) {
      const pt = Skia.Paint(); pt.setAntiAlias(true);
      if (plus) pt.setBlendMode(BlendMode.Plus);
      if (st instanceof Grad) { pt.setColor(color('#000')); pt.setAlphaf(a); const sh = this.shader(st); if (sh) pt.setShader(sh); }
      else { const c = color(typeof st === 'string' ? st : '#000'); pt.setColor(c); if (a < 1) pt.setAlphaf(c[3] * a); }
      if (stroke) { setStroke(pt); if (dash) { const sf = this.scaleF(); pt.setPathEffect(Skia.PathEffect.MakeDash(this.s.dash.map(v => v * sf), 0)); } }
      return pt;
    }
    const col = typeof st === 'string' ? st : '#000';
    const qa = Math.round(a * 64);
    const key = (stroke ? 's' + R(w) + this.s.cap[0] + this.s.join[0] : 'f') + (plus ? '+' : '') + qa + col;
    return cachedPaint(key, () => {
      const pt = Skia.Paint(); pt.setAntiAlias(true);
      const c = color(col); pt.setColor(c); if (qa < 64) pt.setAlphaf(c[3] * qa / 64);
      if (plus) pt.setBlendMode(BlendMode.Plus);
      if (stroke) setStroke(pt);
      return pt;
    });
  }
  private dirty() { if (this.onDraw) this.onDraw(); }
  fill() { const p = this.path(this.d); if (p) { this.c.drawPath(p, this.paint(false)); this.dirty(); } }
  stroke() { const p = this.path(this.d); if (p) { this.c.drawPath(p, this.paint(true)); this.dirty(); } }
  clip() {
    const p = this.path(this.d) || Skia.Path.Make();
    if (!this.s.cs) { this.c.save(); this.s.cs = true; }
    this.c.clipPath(p, ClipOp.Intersect, true);
  }
  private rectD(x: number, y: number, w: number, h: number) { return 'M' + this.P(x, y) + 'L' + this.P(x + w, y) + 'L' + this.P(x + w, y + h) + 'L' + this.P(x, y + h) + 'Z'; }
  fillRect(x: number, y: number, w: number, h: number) {
    const m = this.s.m;
    if (m[1] === 0 && m[2] === 0 && !(this.s.fill instanceof Grad)) {
      // retângulo sem rotação: direto, sem caminho
      const x0 = m[0] * x + m[4], y0 = m[3] * y + m[5], x1 = m[0] * (x + w) + m[4], y1 = m[3] * (y + h) + m[5];
      this.c.drawRect({ x: Math.min(x0, x1), y: Math.min(y0, y1), width: Math.abs(x1 - x0), height: Math.abs(y1 - y0) }, this.paint(false));
      this.dirty(); return;
    }
    const p = this.path(this.rectD(x, y, w, h)); if (p) { this.c.drawPath(p, this.paint(false)); this.dirty(); }
  }
  strokeRect(x: number, y: number, w: number, h: number) { const p = this.path(this.rectD(x, y, w, h)); if (p) { this.c.drawPath(p, this.paint(true)); this.dirty(); } }
  clearRect(x: number, y: number, w: number, h: number) {
    if (!CLEAR) { CLEAR = Skia.Paint(); CLEAR.setBlendMode(BlendMode.Clear); }
    const p = this.path(this.rectD(x, y, w, h)); if (p) { this.c.drawPath(p, CLEAR); this.dirty(); }
  }
  setLineDash(d: number[]) { this.s.dash = (d || []).filter(v => v > 0); if (this.s.dash.length % 2) this.s.dash = this.s.dash.concat(this.s.dash); }
  createLinearGradient(x0: number, y0: number, x1: number, y1: number) { return new Grad('l', [x0, y0, x1, y1]); }
  createRadialGradient(x0: number, y0: number, r0: number, x1: number, y1: number, r1: number) { return new Grad('r', [x0, y0, r0, x1, y1, r1]); }

  /* matriz atual no canvas do Skia (só quando há rotação/inclinação) */
  private pushM() {
    const [a, b, c, d, e, f] = this.s.m;
    const sx = Math.hypot(a, b) || 1e-6, th = Math.atan2(b, a), mm = (a * c + b * d) / sx, sy = (a * d - b * c) / sx;
    this.c.save();
    this.c.translate(e, f);
    if (th) this.c.rotate(th * 180 / Math.PI, 0, 0);
    if (mm && sy) this.c.skew(mm / sy, 0);
    this.c.scale(sx, sy || 1e-6);
  }
  private simple() { const m = this.s.m; return m[1] === 0 && m[2] === 0 && m[0] > 0 && Math.abs(m[0] - m[3]) < 1e-6; }
  private text(s: string, x: number, y: number, stroke: boolean) {
    s = String(s); if (!s) return;
    const [disp, size] = parseFont(this.s.font);
    const simple = this.simple(), k = simple ? this.s.m[0] : 1;
    const fs = size * k;
    const w = textW(disp, Math.round(fs * 2) / 2, s);
    let dx = 0, dy = 0;
    const al = this.s.align;
    if (al === 'center') dx = -w / 2; else if (al === 'right' || al === 'end') dx = -w;
    const bl = this.s.base;
    if (bl !== 'alphabetic') {
      const mt = metrics(disp, fs);
      if (bl === 'middle') dy = -(mt.asc + mt.desc) / 2; else if (bl === 'top' || bl === 'hanging') dy = -mt.asc; else if (bl === 'bottom' || bl === 'ideographic') dy = -mt.desc;
    }
    const f = fontOf(disp, fs);
    if (simple) {
      const m = this.s.m;
      const pt = this.paint(stroke, this.s.lw * k);
      this.c.drawText(s, m[0] * x + m[4] + dx, m[3] * y + m[5] + dy, pt, f);
    } else {
      // com rotação: aplica a matriz no Skia (fonte no tamanho original)
      const pt = this.paint(stroke, this.s.lw);
      const f0 = fontOf(disp, size), w0 = textW(disp, Math.round(size * 2) / 2, s);
      let dx0 = 0, dy0 = 0;
      if (al === 'center') dx0 = -w0 / 2; else if (al === 'right' || al === 'end') dx0 = -w0;
      if (bl !== 'alphabetic') { const mt = metrics(disp, size); if (bl === 'middle') dy0 = -(mt.asc + mt.desc) / 2; else if (bl === 'top' || bl === 'hanging') dy0 = -mt.asc; else dy0 = -mt.desc; }
      this.pushM(); this.c.drawText(s, x + dx0, y + dy0, pt, f0); this.c.restore();
      void f;
    }
    this.dirty();
  }
  fillText(s: string, x: number, y: number) { this.text(s, x, y, false); }
  strokeText(s: string, x: number, y: number) { this.text(s, x, y, true); }
  measureText(s: string) { const [disp, size] = parseFont(this.s.font); return { width: textW(disp, Math.round(size * 2) / 2, String(s)) }; }
  drawImage(img: any, x: number, y: number) {
    this.drawImage0(img, x, y);
  }
  private drawImage0(img: any, x: number, y: number) {
    if (!img || !img.drawTo) return;
    const a = this.s.alpha;
    const pt = cachedPaint('img' + Math.round(a * 64), () => { const p = Skia.Paint(); p.setAlphaf(Math.round(a * 64) / 64); return p; });
    if (this.simple()) {
      const m = this.s.m; img.drawTo(this.c, m[0] * x + m[4], m[3] * y + m[5], m[0], pt);
    } else { this.pushM(); img.drawTo(this.c, x, y, 1, pt); this.c.restore(); }
    this.dirty();
  }
}

/* ---------- canvas fora da tela ----------
   Guardado em pedaços de até 1024 px de largura: imagens muito largas
   (como o chão do mapa inteiro) ficam lentas ou nem cabem na placa de vídeo do celular. */
const TILE = 1024;
class FanCanvas {
  constructor(private cs: any[]) { }
  save() { for (const c of this.cs) c.save(); }
  restore() { for (const c of this.cs) c.restore(); }
  translate(x: number, y: number) { for (const c of this.cs) c.translate(x, y); }
  rotate(d: number, x: number, y: number) { for (const c of this.cs) c.rotate(d, x, y); }
  skew(x: number, y: number) { for (const c of this.cs) c.skew(x, y); }
  scale(x: number, y: number) { for (const c of this.cs) c.scale(x, y); }
  clipPath(p: any, op: any, aa: boolean) { for (const c of this.cs) c.clipPath(p, op, aa); }
  drawPath(p: any, pt: any) { for (const c of this.cs) c.drawPath(p, pt); }
  drawRect(r: any, pt: any) { for (const c of this.cs) c.drawRect(r, pt); }
  drawText(s: string, x: number, y: number, pt: any, f: any) { for (const c of this.cs) c.drawText(s, x, y, pt, f); }
  drawImageRect(i: any, a: any, b: any, pt: any) { for (const c of this.cs) c.drawImageRect(i, a, b, pt); }
}
export class SkOffCanvas implements OffCanvas {
  width: number; height: number; private tiles: { x0: number; w: number; surf: any; snap: any }[] = []; private ctx: SkCtx;
  constructor(w: number, h: number) {
    this.width = Math.max(1, Math.ceil(w)); this.height = Math.max(1, Math.ceil(h));
    const cs: any[] = [];
    for (let x0 = 0; x0 < this.width; x0 += TILE) {
      const tw = Math.min(TILE, this.width - x0);
      const surf = Skia.Surface.Make(tw, this.height);
      const c = surf.getCanvas(); c.translate(-x0, 0);
      this.tiles.push({ x0, w: tw, surf, snap: null }); cs.push(c);
    }
    const canvas = cs.length === 1 ? cs[0] : new FanCanvas(cs);
    this.ctx = new SkCtx(canvas, ID, () => { for (const t of this.tiles) t.snap = null; });
  }
  getContext() { return this.ctx; }
  /** desenha os pedaços no canvas c, na posição (x,y), com escala k */
  drawTo(c: any, x: number, y: number, k: number, pt: any) {
    for (const t of this.tiles) {
      if (!t.snap) { try { t.surf.flush(); } catch (e) { } t.snap = t.surf.makeImageSnapshot(); }
      c.drawImageRect(t.snap, { x: 0, y: 0, width: t.w, height: this.height }, { x: x + t.x0 * k, y, width: t.w * k, height: this.height * k }, pt);
    }
  }
}

/** grava um quadro inteiro num SkPicture */
export function record(w: number, h: number, ctx: SkCtx, base: Mx, paint: (g: SkCtx) => void) {
  const rec = Skia.PictureRecorder();
  const canvas = rec.beginRecording({ x: 0, y: 0, width: w, height: h });
  ctx.reset(canvas, base);
  try { paint(ctx); } catch (e) { console.warn(e); }
  return rec.finishRecordingAsPicture();
}

/** quadro vazio (antes do primeiro desenho) */
export function emptyPicture() { const rec = Skia.PictureRecorder(); rec.beginRecording({ x: 0, y: 0, width: 1, height: 1 }); return rec.finishRecordingAsPicture(); }
