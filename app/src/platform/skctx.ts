/* Adaptador: o "contexto 2D do canvas" que o jogo usa, desenhado com o Skia
   (só no celular). Os caminhos são guardados já transformados (coordenadas da tela),
   os arcos viram curvas de Bézier, e textos/imagens usam a matriz atual. */
import { Skia, PaintStyle, StrokeCap, StrokeJoin, BlendMode, TileMode, ClipOp } from '@shopify/react-native-skia';
import type { Ctx2D, OffCanvas } from '../engine/types';

type Mx = number[]; // [a,b,c,d,e,f]
const ID: Mx = [1, 0, 0, 1, 0, 0];
const mul = (m: Mx, n: Mx): Mx => [
  m[0] * n[0] + m[2] * n[1], m[1] * n[0] + m[3] * n[1],
  m[0] * n[2] + m[2] * n[3], m[1] * n[2] + m[3] * n[3],
  m[0] * n[4] + m[2] * n[5] + m[4], m[1] * n[4] + m[3] * n[5] + m[5],
];

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
export function setTypefaces(display: any, body: any) { TF = { display, body }; FC.clear(); }
const FC = new Map<string, any>();
function skFont(spec: string) {
  let f = FC.get(spec);
  if (f) return f;
  const m = /(\d+(?:\.\d+)?)px/.exec(spec);
  const size = m ? Math.round(parseFloat(m[1]) * 2) / 2 : 12;
  const display = /lilita/i.test(spec);
  const key = (display ? 'd' : 'b') + size;
  f = FC.get(key);
  if (!f) {
    const tf = display ? TF.display : TF.body;
    try { f = tf ? Skia.Font(tf, size) : Skia.Font(undefined as any, size); } catch (e) { f = Skia.Font(undefined as any, size); }
    FC.set(key, f);
  }
  FC.set(spec, f);
  return f;
}

/* ---------- gradientes ---------- */
class Grad {
  st: [number, string][] = [];
  constructor(public k: 'l' | 'r', public a: number[]) { }
  addColorStop(o: number, c: string) { this.st.push([o, c]); }
}

interface St {
  fill: any; stroke: any; alpha: number; comp: string; lw: number; cap: string; join: string;
  font: string; align: string; base: string; dash: number[]; m: Mx;
}

const KAPPA = (d: number) => 4 / 3 * Math.tan(d / 4);

export class SkCtx implements Ctx2D {
  c: any; base: Mx; private s: St; private stack: St[] = []; private p: any; private cur = false;
  private fp: any; private sp: any; private onDraw: (() => void) | null;
  constructor(canvas: any, base: Mx = ID, onDraw: (() => void) | null = null) {
    this.c = canvas; this.base = base; this.onDraw = onDraw;
    this.s = { fill: '#000', stroke: '#000', alpha: 1, comp: 'source-over', lw: 1, cap: 'butt', join: 'miter', font: '10px sans-serif', align: 'start', base: 'alphabetic', dash: [], m: base.slice() };
    this.p = Skia.Path.Make();
    this.fp = Skia.Paint(); this.fp.setAntiAlias(true);
    this.sp = Skia.Paint(); this.sp.setAntiAlias(true); this.sp.setStyle(PaintStyle.Stroke);
  }
  /** começa um quadro novo num canvas novo (gravação do Skia) */
  reset(canvas: any, base: Mx = ID) {
    this.c = canvas; this.base = base; this.stack = [];
    this.s = { fill: '#000', stroke: '#000', alpha: 1, comp: 'source-over', lw: 1, cap: 'butt', join: 'miter', font: '10px sans-serif', align: 'start', base: 'alphabetic', dash: [], m: base.slice() };
    this.p = Skia.Path.Make(); this.cur = false;
  }
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

  save() { this.stack.push({ ...this.s, dash: this.s.dash.slice(), m: this.s.m.slice() }); this.c.save(); }
  restore() { const s = this.stack.pop(); if (!s) return; this.s = s; this.c.restore(); }
  setTransform(a: number, b: number, c: number, d: number, e: number, f: number) { this.s.m = mul(this.base, [a, b, c, d, e, f]); }
  translate(x: number, y: number) { this.s.m = mul(this.s.m, [1, 0, 0, 1, x, y]); }
  rotate(a: number) { const c = Math.cos(a), s = Math.sin(a); this.s.m = mul(this.s.m, [c, s, -s, c, 0, 0]); }
  scale(x: number, y: number) { this.s.m = mul(this.s.m, [x, 0, 0, y, 0, 0]); }

  /* ---------- caminhos ---------- */
  private tx(x: number, y: number) { const m = this.s.m; return [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]]; }
  beginPath() { this.p = Skia.Path.Make(); this.cur = false; }
  closePath() { if (this.cur) this.p.close(); }
  moveTo(x: number, y: number) { const [a, b] = this.tx(x, y); this.p.moveTo(a, b); this.cur = true; }
  lineTo(x: number, y: number) { const [a, b] = this.tx(x, y); if (this.cur) this.p.lineTo(a, b); else this.p.moveTo(a, b); this.cur = true; }
  quadraticCurveTo(cx: number, cy: number, x: number, y: number) {
    if (!this.cur) this.moveTo(cx, cy);
    const [a, b] = this.tx(cx, cy), [c, d] = this.tx(x, y); this.p.quadTo(a, b, c, d);
  }
  bezierCurveTo(c1x: number, c1y: number, c2x: number, c2y: number, x: number, y: number) {
    if (!this.cur) this.moveTo(c1x, c1y);
    const [a, b] = this.tx(c1x, c1y), [c, d] = this.tx(c2x, c2y), [e, f] = this.tx(x, y); this.p.cubicTo(a, b, c, d, e, f);
  }
  private arcLocal(cx: number, cy: number, rx: number, ry: number, rot: number, a0: number, a1: number, ccw: boolean) {
    if (!(rx >= 0) || !(ry >= 0)) return;
    const TAU = Math.PI * 2;
    let sw = a1 - a0;
    if (!ccw) { if (sw >= TAU) sw = TAU; else { sw = sw % TAU; if (sw < 0) sw += TAU; } }
    else { if (sw <= -TAU) sw = -TAU; else { sw = sw % TAU; if (sw > 0) sw -= TAU; } }
    const cr = Math.cos(rot), sr = Math.sin(rot);
    const P = (t: number) => { const c = Math.cos(t), s = Math.sin(t); return [cx + rx * c * cr - ry * s * sr, cy + rx * c * sr + ry * s * cr]; };
    const D = (t: number) => { const c = Math.cos(t), s = Math.sin(t); return [-rx * s * cr - ry * c * sr, -rx * s * sr + ry * c * cr]; };
    const p0 = P(a0);
    this.lineTo(p0[0], p0[1]);
    if (sw === 0) return;
    const n = Math.max(1, Math.ceil(Math.abs(sw) / (Math.PI / 2) - 1e-9));
    const d = sw / n, k = KAPPA(d);
    let t = a0;
    for (let i = 0; i < n; i++) {
      const t2 = t + d, q0 = P(t), q1 = P(t2), d0 = D(t), d1 = D(t2);
      const [ax, ay] = this.tx(q0[0] + k * d0[0], q0[1] + k * d0[1]);
      const [bx, by] = this.tx(q1[0] - k * d1[0], q1[1] - k * d1[1]);
      const [ex, ey] = this.tx(q1[0], q1[1]);
      this.p.cubicTo(ax, ay, bx, by, ex, ey);
      t = t2;
    }
  }
  arc(x: number, y: number, r: number, a0: number, a1: number, ccw?: boolean) { this.arcLocal(x, y, r, r, 0, a0, a1, !!ccw); }
  ellipse(x: number, y: number, rx: number, ry: number, rot: number, a0: number, a1: number, ccw?: boolean) { this.arcLocal(x, y, rx, ry, rot, a0, a1, !!ccw); }
  rect(x: number, y: number, w: number, h: number) {
    this.moveTo(x, y); this.lineTo(x + w, y); this.lineTo(x + w, y + h); this.lineTo(x, y + h); this.closePath(); this.moveTo(x, y);
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
    this.closePath(); this.moveTo(x, y);
  }

  /* ---------- pintura ---------- */
  private scaleF() { const m = this.s.m; return Math.sqrt(Math.abs(m[0] * m[3] - m[1] * m[2])) || 1; }
  private shader(g: Grad) {
    const cols = g.st.map(s => color(s[1])), pos = g.st.map(s => Math.max(0, Math.min(1, s[0])));
    if (!cols.length) return null;
    if (cols.length === 1) { cols.push(cols[0]); pos.push(1); }
    const sf = this.scaleF();
    if (g.k === 'l') {
      const [x0, y0] = this.tx(g.a[0], g.a[1]), [x1, y1] = this.tx(g.a[2], g.a[3]);
      return Skia.Shader.MakeLinearGradient({ x: x0, y: y0 }, { x: x1, y: y1 }, cols, pos, TileMode.Clamp);
    }
    const [x0, y0] = this.tx(g.a[0], g.a[1]), [x1, y1] = this.tx(g.a[3], g.a[4]);
    return Skia.Shader.MakeTwoPointConicalGradient({ x: x0, y: y0 }, Math.max(0, g.a[2] * sf), { x: x1, y: y1 }, Math.max(0.0001, g.a[5] * sf), cols, pos, TileMode.Clamp);
  }
  private paint(stroke: boolean) {
    const st = stroke ? this.s.stroke : this.s.fill, a = this.s.alpha;
    const grad = st instanceof Grad, dash = stroke && this.s.dash.length > 0;
    // pincel simples reaproveitado; com gradiente ou tracejado, um pincel novo
    const pt = grad || dash ? Skia.Paint() : (stroke ? this.sp : this.fp);
    if (grad || dash) { pt.setAntiAlias(true); if (stroke) pt.setStyle(PaintStyle.Stroke); }
    pt.setBlendMode(this.s.comp === 'lighter' ? BlendMode.Plus : BlendMode.SrcOver);
    if (grad) {
      const sh = this.shader(st as Grad);
      pt.setColor(color('#000')); pt.setAlphaf(a);
      if (sh) pt.setShader(sh);
    } else {
      const c = color(typeof st === 'string' ? st : '#000');
      pt.setColor(c); if (a < 1) pt.setAlphaf(c[3] * a);
    }
    if (stroke) {
      const sf = this.scaleF();
      pt.setStrokeWidth(this.s.lw * sf);
      pt.setStrokeCap(this.s.cap === 'round' ? StrokeCap.Round : this.s.cap === 'square' ? StrokeCap.Square : StrokeCap.Butt);
      pt.setStrokeJoin(this.s.join === 'round' ? StrokeJoin.Round : this.s.join === 'bevel' ? StrokeJoin.Bevel : StrokeJoin.Miter);
      if (dash) pt.setPathEffect(Skia.PathEffect.MakeDash(this.s.dash.map(v => v * sf), 0));
    }
    return pt;
  }
  private dirty() { if (this.onDraw) this.onDraw(); }
  fill() { this.c.drawPath(this.p, this.paint(false)); this.dirty(); }
  stroke() { this.c.drawPath(this.p, this.paint(true)); this.dirty(); }
  clip() { this.c.clipPath(this.p, ClipOp.Intersect, true); }
  private rectPath(x: number, y: number, w: number, h: number) {
    const p = Skia.Path.Make();
    const a = this.tx(x, y), b = this.tx(x + w, y), c = this.tx(x + w, y + h), d = this.tx(x, y + h);
    p.moveTo(a[0], a[1]); p.lineTo(b[0], b[1]); p.lineTo(c[0], c[1]); p.lineTo(d[0], d[1]); p.close();
    return p;
  }
  fillRect(x: number, y: number, w: number, h: number) { this.c.drawPath(this.rectPath(x, y, w, h), this.paint(false)); this.dirty(); }
  strokeRect(x: number, y: number, w: number, h: number) { this.c.drawPath(this.rectPath(x, y, w, h), this.paint(true)); this.dirty(); }
  clearRect(x: number, y: number, w: number, h: number) {
    const pt = Skia.Paint(); pt.setBlendMode(BlendMode.Clear);
    this.c.drawPath(this.rectPath(x, y, w, h), pt); this.dirty();
  }
  setLineDash(d: number[]) { this.s.dash = (d || []).filter(v => v > 0); if (this.s.dash.length % 2) this.s.dash = this.s.dash.concat(this.s.dash); }
  createLinearGradient(x0: number, y0: number, x1: number, y1: number) { return new Grad('l', [x0, y0, x1, y1]); }
  createRadialGradient(x0: number, y0: number, r0: number, x1: number, y1: number, r1: number) { return new Grad('r', [x0, y0, r0, x1, y1, r1]); }

  /* matriz atual aplicada ao canvas do Skia, para texto e imagem */
  private pushM() {
    const [a, b, c, d, e, f] = this.s.m;
    const sx = Math.hypot(a, b) || 1e-6, th = Math.atan2(b, a), mm = (a * c + b * d) / sx, sy = (a * d - b * c) / sx;
    this.c.save();
    this.c.translate(e, f);
    if (th) this.c.rotate(th * 180 / Math.PI, 0, 0);
    if (mm && sy) this.c.skew(mm / sy, 0);
    this.c.scale(sx, sy || 1e-6);
  }
  private text(s: string, x: number, y: number, stroke: boolean) {
    s = String(s); if (!s) return;
    const f = skFont(this.s.font);
    let w = 0; try { w = f.getTextWidth ? f.getTextWidth(s) : f.measureText(s).width; } catch (e) { w = s.length * 6; }
    let dx = 0, dy = 0;
    const al = this.s.align;
    if (al === 'center') dx = -w / 2; else if (al === 'right' || al === 'end') dx = -w;
    const bl = this.s.base;
    if (bl !== 'alphabetic') {
      let asc = -8, desc = 2; try { const mt = f.getMetrics(); asc = mt.ascent; desc = mt.descent; } catch (e) { }
      if (bl === 'middle') dy = -(asc + desc) / 2; else if (bl === 'top' || bl === 'hanging') dy = -asc; else if (bl === 'bottom' || bl === 'ideographic') dy = -desc;
    }
    const pt = this.paint(stroke);
    if (stroke) pt.setStrokeWidth(this.s.lw);
    this.pushM();
    this.c.drawText(s, x + dx, y + dy, pt, f);
    this.c.restore();
    this.dirty();
  }
  fillText(s: string, x: number, y: number) { this.text(s, x, y, false); }
  strokeText(s: string, x: number, y: number) { this.text(s, x, y, true); }
  measureText(s: string) {
    const f = skFont(this.s.font);
    try { return { width: f.getTextWidth ? f.getTextWidth(String(s)) : f.measureText(String(s)).width }; } catch (e) { return { width: String(s).length * 6 }; }
  }
  drawImage(img: any, x: number, y: number) {
    const im = img && img.image ? img.image() : null;
    if (!im) return;
    const pt = this.fp; pt.setColor(color('#000')); pt.setAlphaf(this.s.alpha); pt.setBlendMode(BlendMode.SrcOver);
    this.pushM();
    this.c.drawImage(im, x, y, pt);
    this.c.restore();
    this.dirty();
  }
}

/** canvas fora da tela, guardado numa superfície do Skia */
export class SkOffCanvas implements OffCanvas {
  width: number; height: number; private surf: any; private ctx: SkCtx; private snap: any = null;
  constructor(w: number, h: number) {
    this.width = Math.max(1, Math.ceil(w)); this.height = Math.max(1, Math.ceil(h));
    this.surf = Skia.Surface.Make(this.width, this.height);
    this.ctx = new SkCtx(this.surf.getCanvas(), ID, () => { this.snap = null; });
  }
  getContext() { return this.ctx; }
  image() {
    if (!this.snap) { try { this.surf.flush(); } catch (e) { } this.snap = this.surf.makeImageSnapshot(); }
    return this.snap;
  }
}

/** grava um quadro inteiro num SkPicture */
export function record(w: number, h: number, ctx: SkCtx, base: Mx, paint: (g: SkCtx) => void) {
  const rec = Skia.PictureRecorder();
  const canvas = rec.beginRecording(Skia.XYWHRect(0, 0, w, h));
  ctx.reset(canvas, base);
  try { paint(ctx); } catch (e) { console.warn(e); }
  return rec.finishRecordingAsPicture();
}
