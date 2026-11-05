/* Contratos entre o motor do jogo e a plataforma (celular ou web). */

/** O pedaço do contexto 2D do canvas que o jogo usa. No navegador é o próprio
 *  CanvasRenderingContext2D; no celular é um adaptador por cima do Skia. */
export interface Gradient2D { addColorStop(offset: number, color: string): void }
export interface Ctx2D {
  fillStyle: string | Gradient2D | any;
  strokeStyle: string | Gradient2D | any;
  globalAlpha: number;
  globalCompositeOperation: string;
  lineWidth: number;
  lineCap: string;
  lineJoin: string;
  font: string;
  textAlign: string;
  textBaseline: string;
  save(): void;
  restore(): void;
  setTransform(a: number, b: number, c: number, d: number, e: number, f: number): void;
  translate(x: number, y: number): void;
  rotate(a: number): void;
  scale(x: number, y: number): void;
  beginPath(): void;
  closePath(): void;
  moveTo(x: number, y: number): void;
  lineTo(x: number, y: number): void;
  quadraticCurveTo(cx: number, cy: number, x: number, y: number): void;
  arc(x: number, y: number, r: number, a0: number, a1: number, ccw?: boolean): void;
  ellipse(x: number, y: number, rx: number, ry: number, rot: number, a0: number, a1: number, ccw?: boolean): void;
  rect(x: number, y: number, w: number, h: number): void;
  roundRect?(x: number, y: number, w: number, h: number, r: number): void;
  fill(): void;
  stroke(): void;
  clip(): void;
  fillRect(x: number, y: number, w: number, h: number): void;
  strokeRect(x: number, y: number, w: number, h: number): void;
  clearRect(x: number, y: number, w: number, h: number): void;
  fillText(s: string, x: number, y: number): void;
  strokeText(s: string, x: number, y: number): void;
  measureText(s: string): { width: number };
  setLineDash(d: number[]): void;
  createLinearGradient(x0: number, y0: number, x1: number, y1: number): Gradient2D;
  createRadialGradient(x0: number, y0: number, r0: number, x1: number, y1: number, r1: number): Gradient2D;
  drawImage(img: any, x: number, y: number): void;
}

/** Canvas fora da tela (chão e paredes pré-desenhados). */
export interface OffCanvas { width: number; height: number; getContext(kind: '2d'): Ctx2D }

export interface Insets { t: number; r: number; b: number; l: number }

/** Toque ou mouse já em coordenadas do jogo (tela deitada). */
export interface PtrEv { id: number | string; x: number; y: number; type: 'touch' | 'mouse' | 'pen'; button?: number }

export interface Platform {
  isTouch: boolean;
  /** "?sala=ABCD" ou "?amigo=XXXXXX" quando aberto por um link (só na web). */
  query: string;
  now(): number;
  storage: { load(): string | null; save(s: string): void };
  createCanvas(w: number, h: number): OffCanvas;
  font(size: number, kind: 'display' | 'body'): string;
  audio: {
    play(name: string, vol: number): void;
    /** chamado a cada quadro com a música que deve estar tocando (null = nenhuma) */
    music(mode: string | null): void;
    setVolumes(sfxOn: boolean, musOn: boolean): void;
  };
  /** compartilhar texto: 'shared' (abriu o compartilhar), 'copied' (copiou) ou 'fail' */
  share(text: string): Promise<'shared' | 'copied' | 'fail'>;
}
