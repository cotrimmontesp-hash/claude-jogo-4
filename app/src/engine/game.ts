/* Motor do Turbo Estrada (corrida estilo videogame antigo, visual pixelado).
   Estrada "falso 3D" feita de segmentos projetados na tela, desenhada num canvas
   pequeno (180 px de altura) e ampliada sem suavizar. O mesmo motor roda na web
   e dentro da WebView do app; as telas (menus) são em React Native e leem `ui`/`info`. */
import { CARS, COLORS, COLOR_NAMES, COLOR_PRICE, UPG, UPG_MAX, upgCost, TOD, STAGES, CUPS, ENDLESS_DAY, endlessTarget, ENDLESS_SCENES, ONLINE_TIME, ONLINE_TRACKS, NAMES_RND, SCENE_NAME, type Tod, type Stage } from './data';
import { ptext, sh, mix, carSprite, propSprite, PROP_SIZE, setCanvasMaker, carImage, fogSprite, CAR_W, CAR_H } from './draw';
import { Peer } from '../net/peer';
import type { Platform, Ctx2D, OffCanvas, Insets, PtrEv } from './types';

export type Game = ReturnType<typeof createGame>;

/* ---------- constantes da estrada ---------- */
const SEG = 200, RUMBLE = 3, ROADW = 1600, CAMH = 1000, FOV = 100, CAMD = 1 / Math.tan(FOV / 2 * Math.PI / 180), DRAW = 130, PLAYERZ = CAMH * CAMD;
const MAXS = SEG * 60; /* velocidade de referência (unidades por segundo) */
const CARW = .2; /* largura de um carro, em "metades de pista" */
const HOR = .43; /* altura do horizonte na tela */
const LH = 180;

function rng(seed: number) { let a = seed >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const easeIn = (a: number, b: number, t: number) => a + (b - a) * Math.pow(t, 2);
const easeInOut = (a: number, b: number, t: number) => a + (b - a) * ((-Math.cos(t * Math.PI) / 2) + .5);

interface TCar { z: number; off: number; lane: number; speed: number; base: number; shape: number; col: string; laneT: number; r: () => number; rel: number; seg: number; slowT: number }
interface Prop { p: string; off: number; w: number }
interface Seg { i: number; y1: number; y2: number; curve: number; props: Prop[]; cars: TCar[]; c: number; x1: number; y1s: number; w1: number; s1: number; x2: number; y2s: number; w2: number; s2: number; clip: number; fog: number; n: number }

export function createGame(pf: Platform) {
  setCanvasMaker(pf.createCanvas);
  const isTouch = pf.isTouch;

  /* ---------- tela ---------- */
  let W = 800, H = 400, DPR = 1, INS: Insets = { t: 0, r: 0, b: 0, l: 0 };
  let LW = 390, low: OffCanvas = pf.createCanvas(LW, LH), g: Ctx2D = low.getContext('2d');
  function setLayout(w: number, h: number, dpr: number, ins: Insets) {
    W = w; H = h; DPR = dpr; INS = ins || INS;
    LW = clamp(Math.round(LH * W / Math.max(1, H)), 240, 460);
    if (low.width !== LW) { low = pf.createCanvas(LW, LH); g = low.getContext('2d'); }
    emit();
  }
  const insL = () => Math.ceil(INS.l * LH / H), insR = () => Math.ceil(INS.r * LH / H), insB = () => Math.ceil(INS.b * LH / H), insT = () => Math.ceil(INS.t * LH / H);

  /* ---------- estado das telas (lido pelo React Native) ---------- */
  const ui: any = {
    v: 0,
    show: { menu: true, champ: false, garage: false, online: false, room: false, pause: false, res: false, race: false },
    toast: null as null | { s: string; id: number },
  };
  const subs = new Set<() => void>();
  let emitQ = false;
  function emit() { if (emitQ) return; emitQ = true; Promise.resolve().then(() => { emitQ = false; ui.v++; subs.forEach(f => { try { f(); } catch (e) { } }); }); }
  function only(k: string | null) { for (const s in ui.show) ui.show[s] = false; if (k) ui.show[k] = true; emit(); }
  let toastT: any = null, toastN = 0;
  function toast(s: string) { ui.toast = { s, id: ++toastN }; emit(); clearTimeout(toastT); toastT = setTimeout(() => { ui.toast = null; emit(); }, 2600); }

  /* ---------- progresso salvo ---------- */
  let save: any = { coins: 0, car: 0, owned: [true, false, false, false, false], col: {}, colOwned: [true, true, true, false, false, false, false, false, false, false], upg: {}, stars: [], unl: 1, bestDay: 0, bestKm: 0, name: '', sfx: true, mus: true, auto: true, races: 0, onlineWins: 0 };
  try { const s = JSON.parse(pf.storage.load() || 'null'); if (s && typeof s === 'object') save = Object.assign(save, s); } catch (e) { }
  if (!save.name) save.name = NAMES_RND[Math.floor(Math.random() * NAMES_RND.length)] + Math.floor(10 + Math.random() * 89);
  for (const c of CARS) { if (!save.upg[c.id]) save.upg[c.id] = [0, 0, 0]; if (save.col[c.id] == null) save.col[c.id] = CARS.indexOf(c) % 3; }
  function persist() { try { pf.storage.save(JSON.stringify(save)); } catch (e) { } }
  pf.audio.setVolumes(save.sfx, save.mus);
  const sfx = (n: string, v = 1) => pf.audio.play(n, v);

  /* ---------- pista ---------- */
  let segs: Seg[] = [], trackLen = 1, cars: TCar[] = [];
  let scene = 'praia';
  function buildTrack(seed: number, curvy: number, hilly: number, sc: string, traffic: number, nTarget = 2600) {
    const R = rng(seed);
    segs = []; scene = sc;
    const lastY = () => segs.length ? segs[segs.length - 1].y2 : 0;
    const addSeg = (curve: number, y: number) => {
      const i = segs.length;
      segs.push({ i, y1: lastY(), y2: y, curve, props: [], cars: [], c: Math.floor(i / RUMBLE) % 2, x1: 0, y1s: 0, w1: 0, s1: 0, x2: 0, y2s: 0, w2: 0, s2: 0, clip: 0, fog: 0, n: 0 });
    };
    const addRoad = (en: number, ho: number, le: number, curve: number, y: number) => {
      en = Math.round(en); ho = Math.round(ho); le = Math.round(le);
      const sy = lastY(), ey = sy + y * SEG, tot = en + ho + le;
      for (let n = 0; n < en; n++) addSeg(easeIn(0, curve, n / en), easeInOut(sy, ey, n / tot));
      for (let n = 0; n < ho; n++) addSeg(curve, easeInOut(sy, ey, (en + n) / tot));
      for (let n = 0; n < le; n++) addSeg(easeInOut(curve, 0, n / le), easeInOut(sy, ey, (en + ho + n) / tot));
    };
    const hill = () => { if (R() > .55 * hilly + .1) return 0; let h = (R() * 2 - 1) * 45 * hilly; const cur = lastY() / SEG; if (cur + h > 80) h = -Math.abs(h); if (cur + h < -80) h = Math.abs(h); return h; };
    const curveAt: number[] = [];
    addRoad(25, 40, 25, 0, 0);
    while (segs.length < nTarget) {
      const r = R(), at = segs.length;
      if (r < .26) addRoad(20, 30 + R() * 50, 20, 0, hill());
      else if (r < .72) { const d = R() < .5 ? -1 : 1; curveAt.push(at * (d)); addRoad(15 + R() * 25, 30 + R() * 70, 15 + R() * 25, d * (1.5 + R() * 4.5) * curvy, hill()); }
      else { const d = R() < .5 ? -1 : 1; curveAt.push(at * d); addRoad(20, 30 + R() * 30, 20, d * (2 + R() * 3) * curvy, hill()); curveAt.push(-segs.length * d); addRoad(20, 30 + R() * 30, 20, -d * (2 + R() * 3) * curvy, hill()); }
    }
    addRoad(40, 40, 40, 0, -lastY() / SEG);
    trackLen = segs.length * SEG;
    /* cenário */
    const PR: { [k: string]: string[] } = {
      deserto: ['cacto', 'cacto', 'cacto', 'pedra', 'pedra', 'arbusto', 'outdoor'],
      praia: ['palmeira', 'palmeira', 'palmeira', 'casa', 'arbusto', 'outdoor', 'farol'],
      serra: ['pinheiro', 'pinheiro', 'pinheiro', 'pinheiro', 'pedra', 'casa', 'arbusto'],
      cidade: ['predio', 'predio2', 'predio', 'predio2', 'outdoor', 'casa'],
      neve: ['pinheiroN', 'pinheiroN', 'pinheiroN', 'boneco', 'pedra', 'casa'],
    };
    const dens = sc === 'cidade' ? .5 : sc === 'deserto' ? .22 : .34;
    const list = PR[sc] || PR.serra;
    const add = (s: Seg, p: string, off: number) => s.props.push({ p, off, w: PROP_SIZE[p][2] * .22 });
    for (const s of segs) {
      if (s.i < 8) continue;
      if (sc === 'cidade' && s.i % 10 === 0) { add(s, 'poste', -1.12); add(s, 'poste', 1.12); }
      if (R() < dens) { const side = R() < .5 ? -1 : 1; const p = list[Math.floor(R() * list.length)]; const big = p.startsWith('predio') || p === 'outdoor' || p === 'casa'; add(s, p, side * ((big ? 1.9 : 1.35) + R() * (big ? 1.6 : 2.2))); }
      if (R() < dens * .35) { const side = R() < .5 ? -1 : 1; const p = list[Math.floor(R() * list.length)]; add(s, p, side * (3.2 + R() * 2.5)); }
    }
    /* placas antes das curvas, do lado de fora */
    for (const c of curveAt) { const at = Math.abs(c), d = Math.sign(c) || 1; for (let k = 0; k < 3; k++) { const s = segs[(at + k * 4) % segs.length]; if (s && s.i > 8) add(s, 'placa', -d * 1.2); } }
    /* trânsito */
    cars = [];
    const n = Math.round(segs.length / 48 * traffic);
    for (let i = 0; i < n; i++) {
      const cr = rng(seed * 977 + i * 131);
      let z = (40 + cr() * (segs.length - 60)) * SEG;
      const lane = Math.floor(cr() * 3) - 1;
      const shp = [0, 1, 2, 3, 5, 5, 6, 6, 0, 1][Math.floor(cr() * 10)];
      const col = ['#e4202c', '#2a6cf0', '#f8c818', '#18b048', '#f87818', '#a040e8', '#e8e8e8', '#18c8d8', '#8c5c3c', '#5c6c7c'][Math.floor(cr() * 10)];
      const base = MAXS * (.3 + cr() * .2) * (.94 + traffic * .06);
      const c: TCar = { z, off: lane * .66, lane, speed: base, base, shape: shp, col, laneT: 2 + cr() * 8, r: cr, rel: 0, seg: 0, slowT: 0 };
      c.seg = Math.floor(z / SEG) % segs.length; segs[c.seg].cars.push(c); cars.push(c);
    }
  }
  const segAt = (z: number) => segs[Math.floor(z / SEG) % segs.length];
  const wrapZ = (z: number) => { while (z >= trackLen) z -= trackLen; while (z < 0) z += trackLen; return z; };
  const relZ = (d: number) => { while (d > trackLen / 2) d -= trackLen; while (d < -trackLen / 2) d += trackLen; return d; };

  /* ---------- corrida ---------- */
  type Mode = 'demo' | 'champ' | 'endless' | 'online';
  let mode: Mode = 'demo', state: 'race' | 'count' | 'over' | 'idle' = 'idle', paused = false;
  let position = 0, playerX = 0, speed = 0, latV = 0, crashT = 0, shake = 0, countT = 0, raceT = 0, timeLeft = 0, passed = 0, target = 0, day = 1, dist = 0, coinsRun = 0;
  let stageIdx = 0, stage: Stage = STAGES[0], phases: [string, number][] = [['day', 1]], phaseDur = 60, steerVis = 0, endT = 0;
  let maxSpeed = MAXS * .8, accel = MAXS / 5, grip = 1, offK = 1, shape = 0, color = COLORS[0];
  let skyOff = 0, msgs: { s: string; t: number; c: string; k: number }[] = [], sparks: { x: number; y: number; vx: number; vy: number; t: number; c: string }[] = [];
  const flakes = Array.from({ length: 70 }, () => ({ x: Math.random(), y: Math.random(), v: .4 + Math.random() * .6 }));
  const stars = Array.from({ length: 50 }, () => ({ x: Math.random(), y: Math.random() * .9, b: Math.random() }));
  let clock = 0, dbgBot = false;

  function loadCar() {
    const c = CARS[save.car | 0], up = save.upg[c.id] || [0, 0, 0];
    maxSpeed = MAXS * c.spd * (1 + up[0] * UPG[0].per);
    accel = maxSpeed / 4.6 * c.acc * (1 + up[1] * UPG[1].per);
    grip = c.grip * (1 + up[2] * UPG[2].per);
    offK = c.off; shape = save.car | 0; color = COLORS[save.col[c.id] | 0];
  }
  function resetRun() { position = 0; playerX = 0; speed = 0; latV = 0; crashT = 0; shake = 0; raceT = 0; passed = 0; dist = 0; coinsRun = 0; msgs = []; sparks = []; endT = 0; for (const c of cars) c.rel = relZ(c.z - PLAYERZ); }
  function startRace(m: Mode, idx: number) {
    mode = m; stageIdx = idx; loadCar(); paused = false;
    if (m === 'champ') { stage = STAGES[idx]; phases = stage.phases; phaseDur = stage.time; timeLeft = stage.time; target = stage.target; buildTrack(stage.seed, stage.curvy, stage.hilly, stage.scene, stage.traffic); }
    else if (m === 'endless') { day = 1; phases = ENDLESS_DAY.phases; phaseDur = ENDLESS_DAY.time; timeLeft = ENDLESS_DAY.time; target = endlessTarget(1); buildTrack(9001, 1.1, .9, ENDLESS_SCENES[0], 1.15, 3200); }
    else if (m === 'online') { stage = STAGES[idx]; phases = stage.phases; phaseDur = ONLINE_TIME; timeLeft = ONLINE_TIME; target = 0; buildTrack(stage.seed + 5, stage.curvy, stage.hilly, stage.scene, stage.traffic); }
    resetRun();
    if (m === 'online') { const ix = Math.max(0, NET.players.findIndex((p: any) => p.id === NET.me)); playerX = [-.45, .45, -.15, .15][ix % 4]; }
    state = 'count'; countT = 3.6; lastBeep = 4;
    only('race');
  }
  function startDemo() {
    mode = 'demo'; loadCar(); state = 'race'; paused = false;
    phases = [['sunset', .4], ['night', .3], ['dawn', .3]]; phaseDur = 90; timeLeft = 1e9;
    buildTrack(23, 1, .6, 'praia', 1.1, 1600); resetRun(); speed = maxSpeed * .7;
  }

  /* hora do dia: mistura das cores perto da troca de fase */
  let todCache: { k: string; t: Tod } | null = null;
  function curTod(): Tod {
    const el = mode === 'demo' ? (clock % phaseDur) : (mode === 'endless' ? ENDLESS_DAY.time - timeLeft : phaseDur - timeLeft);
    let acc = 0, i = 0;
    for (; i < phases.length; i++) { const d = phases[i][1] * phaseDur; if (el < acc + d || i === phases.length - 1) break; acc += d; }
    const d = phases[i][1] * phaseDur, into = el - acc, BL = Math.min(5, d * .3);
    const A = TOD[phases[i][0]];
    let nx = phases[(i + 1) % phases.length][0];
    if (i === phases.length - 1 && mode !== 'endless' && mode !== 'demo') nx = phases[i][0];
    const B = TOD[nx];
    const t = A === B ? 0 : clamp((into - (d - BL)) / BL, 0, 1);
    const q = Math.round(t * 24) / 24, k = phases[i][0] + nx + q;
    if (todCache && todCache.k === k) return todCache.t;
    const m = (a: string, b: string) => mix(a, b, q);
    const T: Tod = {
      name: q < .5 ? A.name : B.name, sky: [m(A.sky[0], B.sky[0]), m(A.sky[1], B.sky[1])], grass: [m(A.grass[0], B.grass[0]), m(A.grass[1], B.grass[1])],
      road: [m(A.road[0], B.road[0]), m(A.road[1], B.road[1])], rumble: [m(A.rumble[0], B.rumble[0]), m(A.rumble[1], B.rumble[1])], lane: m(A.lane, B.lane),
      hill: m(A.hill, B.hill), hill2: m(A.hill2, B.hill2), fog: m(A.fog, B.fog), fogD: lerp(A.fogD, B.fogD, q), dark: lerp(A.dark, B.dark, q),
      snow: q < .5 ? A.snow : B.snow, ice: lerp(A.ice || 1, B.ice || 1, q), sun: q < .5 ? A.sun : B.sun, moon: q < .5 ? A.moon : B.moon,
    };
    fogCacheClear();
    todCache = { k, t: T };
    return T;
  }
  let fogCache: { [k: string]: string } = {}, fogN = 0;
  function fogCacheClear() { if (fogN > 4000) { fogCache = {}; fogN = 0; } }
  function fogC(c: string, f: number, fog: string) { const q = Math.round(f * 20); if (q <= 0) return c; const k = c + q + fog; let v = fogCache[k]; if (!v) { v = fogCache[k] = mix(c, fog, q / 20); fogN++; } return v; }

  /* ---------- controles ---------- */
  const keys: { [k: string]: boolean } = {};
  const ptrs = new Map<any, string>();
  function btnRects() {
    const b = LH - 6 - insB(), l = 6 + insL(), r = LW - 6 - insR();
    return {
      L: [l, b - 40, 38, 40], R: [l + 42, b - 40, 38, 40],
      G: save.auto ? null : [r - 44, b - 52, 44, 52], B: save.auto ? [r - 48, b - 40, 48, 40] : [r - 90, b - 34, 40, 34],
      P: [LW - 24 - insR(), 4 + insT(), 20, 18],
    } as { [k: string]: number[] | null };
  }
  function btnAt(x: number, y: number) {
    const B = btnRects();
    for (const k of ['P', 'L', 'R', 'G', 'B']) { const r = B[k]; if (!r) continue; const pad = k === 'P' ? 4 : 6; if (x >= r[0] - pad && x <= r[0] + r[2] + pad && y >= r[1] - pad && y <= r[1] + r[3] + pad) return k; }
    /* metade esquerda da tela = direção (pelo lado), direita = freio quando o acelerador é automático */
    if (y > LH * .45) { if (x < LW * .3) return x < B.L![0] + 40 ? 'L' : 'R'; }
    return '';
  }
  const held = (k: string) => { for (const v of ptrs.values()) if (v === k) return true; return false; };
  let lastInput: 'touch' | 'key' = isTouch ? 'touch' : 'key';
  function ptrDown(ev: PtrEv): boolean {
    if (!ui.show.race || paused) return false;
    const x = ev.x * LW / W, y = ev.y * LH / H; lastInput = ev.type === 'mouse' ? lastInput : 'touch';
    const k = btnAt(x, y);
    if (k === 'P') { setPause(true); return false; }
    if (k) ptrs.set(ev.id, k);
    return true;
  }
  function ptrMove(ev: PtrEv) {
    if (!ptrs.has(ev.id)) return;
    const k0 = ptrs.get(ev.id); if (k0 !== 'L' && k0 !== 'R') return;
    const k = btnAt(ev.x * LW / W, ev.y * LH / H); if (k === 'L' || k === 'R') ptrs.set(ev.id, k);
  }
  function ptrUp(ev: PtrEv) { ptrs.delete(ev.id); }
  const KM: { [c: string]: string } = { ArrowLeft: 'L', KeyA: 'L', ArrowRight: 'R', KeyD: 'R', ArrowUp: 'G', KeyW: 'G', Space: 'G', ArrowDown: 'B', KeyS: 'B' };
  function keyDown(code: string) {
    if (code === 'Escape' || code === 'KeyP') { if (ui.show.race && state !== 'over') setPause(!paused); else back(); return true; }
    const k = KM[code]; if (!k) return false; keys[k] = true; lastInput = 'key'; return true;
  }
  function keyUp(code: string) { const k = KM[code]; if (k) keys[k] = false; }
  const inp = (k: string) => !!keys[k] || held(k);

  /* ---------- atualização ---------- */
  let lastBeep = 4;
  function update(dt: number) {
    if (!segs.length) return;
    const T = curTod();
    if (state === 'count') {
      countT -= dt;
      const n = Math.ceil(countT - .6);
      if (n < lastBeep && n >= 1 && n <= 3) { lastBeep = n; sfx('beep'); }
      if (countT <= .6) { state = 'race'; sfx('go'); msg('VAI!', '#f8c818', 3); }
      updCars(dt * 0, T);
      engineSound();
      return;
    }
    const demo = mode === 'demo';
    const ps = segAt(position + PLAYERZ);
    const sp = speed / MAXS;
    /* direção */
    let steer = 0;
    if (demo || dbgBot) steer = demoSteer();
    else if (state === 'race') steer = (inp('R') ? 1 : 0) - (inp('L') ? 1 : 0);
    steerVis = lerp(steerVis, steer, Math.min(1, dt * 10));
    const ice = T.ice || 1, gk = clamp(grip * ice, .3, 1.6);
    const want = steer * dt * 2.1 * Math.min(1, sp * 1.6 + .15);
    latV = lerp(latV, want, Math.min(1, dt * (4 + gk * 10)));
    playerX += latV;
    playerX -= dt * 2 * sp * sp * ps.curve * .28 * (1.25 - .25 * Math.min(1.3, gk));
    /* acelerar / frear */
    const autoOn = save.auto && lastInput === 'touch';
    const gas = demo || (state === 'race' && (autoOn ? !inp('B') : inp('G')));
    const brake = !demo && state === 'race' && inp('B');
    if (state === 'over') speed = Math.max(0, speed - MAXS * .35 * dt);
    else if (crashT > 0) { crashT -= dt; speed = Math.max(0, speed - MAXS * .25 * dt); }
    else if (brake) speed = Math.max(0, speed - maxSpeed * 1.1 * dt);
    else if (gas) speed = Math.min(maxSpeed, speed + accel * dt * (1 - .55 * speed / maxSpeed));
    else speed = Math.max(0, speed - maxSpeed / 6 * dt);
    /* fora da pista: terra freia (menos no jipe) */
    if (Math.abs(playerX) > 1.02) {
      const lim = maxSpeed * (offK < 1 ? .75 : .38);
      if (speed > lim) speed = Math.max(lim, speed - maxSpeed * 1.2 * offK * dt);
      if (speed > MAXS * .1) shake = Math.max(shake, .6);
      for (const p of ps.props) { if (Math.abs(playerX - p.off) < (CARW + p.w) * .45) { crash(.15); speed = Math.min(speed, maxSpeed * .12); playerX += playerX > p.off ? .12 : -.12; break; } }
    }
    playerX = clamp(playerX, -2.6, 2.6);
    /* bater nos carros */
    if (crashT <= 0) {
      for (let k = 0; k < 2; k++) {
        const s = segs[(ps.i + k) % segs.length];
        for (const c of s.cars) {
          const d = relZ(c.z - (position + PLAYERZ));
          if (d < -SEG * .2 || d > SEG * 1.1) continue;
          if (speed > c.speed && Math.abs(playerX - c.off) < CARW * .92) {
            speed = c.speed * .5; position = wrapZ(c.z - PLAYERZ - SEG * .6); crash(.55);
            playerX += playerX >= c.off ? .1 : -.1; c.slowT = 0; break;
          }
        }
      }
    }
    const adv = dt * speed;
    position = wrapZ(position + adv);
    if (!demo) { dist += adv; raceT += dt; }
    skyOff += ps.curve * sp * dt * .015;
    updCars(dt, T);
    /* contagem de ultrapassagens */
    const me = position + PLAYERZ;
    for (const c of cars) {
      const d = relZ(c.z - me);
      if (Math.abs(d) < trackLen / 4 && !demo && state === 'race') {
        if (c.rel > 0 && d <= 0) { passed++; coinsRun++; sfx('pass', .8); if (mode !== 'online' && passed === target) reachTarget(); }
        else if (c.rel <= 0 && d > 0) { passed--; coinsRun = Math.max(0, coinsRun - 1); sfx('passed', .8); }
      }
      c.rel = d;
    }
    /* relógio */
    if (!demo && state === 'race') {
      timeLeft -= dt;
      if (timeLeft <= 0) timeUp();
    }
    if (state === 'over') { endT += dt; if (endT > 1.6 && !ui.show.res) showResult(); }
    if (shake > 0) shake = Math.max(0, shake - dt * 2.5);
    for (const m of msgs) m.t -= dt; msgs = msgs.filter(m => m.t > 0);
    for (const p of sparks) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 90 * dt; p.t -= dt; } sparks = sparks.filter(p => p.t > 0);
    if (mode === 'online') netRace(dt);
    engineSound();
  }
  function engineSound() {
    if (!ui.show.race && mode !== 'demo') { pf.audio.engine(-1, 0); return; }
    if (mode === 'demo' || paused) { pf.audio.engine(-1, 0); return; }
    const r = speed / Math.max(1, maxSpeed), gr = Math.min(3, Math.floor(r * 4)), loc = r * 4 - gr;
    pf.audio.engine(.22 + loc * .55 + gr * .06, (inp('G') || (save.auto && lastInput === 'touch')) && state === 'race' && !inp('B') ? 1 : .3);
  }
  function crash(k: number) {
    crashT = k; shake = 1.2; sfx(k > .3 ? 'crash' : 'bump'); try { pf.vibrate && pf.vibrate(k > .3 ? 80 : 30); } catch (e) { }
    for (let i = 0; i < 10; i++) sparks.push({ x: LW / 2 + (Math.random() - .5) * 30, y: LH - 34, vx: (Math.random() - .5) * 120, vy: -40 - Math.random() * 60, t: .5 + Math.random() * .3, c: Math.random() < .5 ? '#f8c818' : '#f87818' });
  }
  function msg(s: string, c = '#fff', k = 2, t = 1.6) { msgs.push({ s, t, c, k }); }
  function updCars(dt: number, T: Tod) {
    const me = position + PLAYERZ;
    for (const c of cars) {
      c.laneT -= dt;
      if (c.laneT <= 0) { c.laneT = 3 + c.r() * 7; if (c.r() < .5) c.lane = clamp(c.lane + (c.r() < .5 ? -1 : 1), -1, 1); }
      const d = relZ(c.z - me);
      /* atrás do jogador e mais rápido: desvia */
      if (d < 0 && d > -SEG * 8 && c.speed > speed && Math.abs(c.off - playerX) < .45) { c.lane = playerX > 0 ? -1 : playerX < -.5 ? 1 : (c.off < playerX ? -1 : 1); }
      c.speed = c.slowT > 0 ? c.speed : c.base;
      const tg = c.lane * .66; c.off += clamp(tg - c.off, -dt * .55, dt * .55);
      if (dt <= 0) continue;
      const nz = wrapZ(c.z + dt * c.speed), ns = Math.floor(nz / SEG) % segs.length;
      if (ns !== c.seg) { const a = segs[c.seg].cars, ix = a.indexOf(c); if (ix >= 0) a.splice(ix, 1); segs[ns].cars.push(c); c.seg = ns; }
      c.z = nz;
    }
    void T;
  }
  /* piloto automático do fundo do menu */
  function demoSteer() {
    const me = position + PLAYERZ;
    let danger = 0;
    for (let k = 1; k < 14; k++) { const s = segs[(segAt(me).i + k) % segs.length]; for (const c of s.cars) if (Math.abs(c.off - playerX) < .38) { danger = c.off >= playerX ? -1 : 1; break; } if (danger) break; }
    const tgt = danger ? clamp(playerX + danger * .7, -.75, .75) : (Math.abs(playerX) > .8 ? 0 : playerX);
    return clamp((tgt - playerX) * 4, -1, 1);
  }

  /* ---------- fim de corrida ---------- */
  function reachTarget() {
    if (mode === 'champ') { sfx('flag'); msg('CHEGADA!', '#f8c818', 3, 3); finish(true); }
    else if (mode === 'endless') { sfx('flag'); msg('META DO DIA!', '#5cdc5c', 2, 2.4); }
  }
  function timeUp() {
    if (mode === 'endless') {
      if (passed >= target) {
        day++; coinsRun += 25 + day * 5; save.bestDay = Math.max(save.bestDay | 0, day - 1); persist();
        timeLeft = ENDLESS_DAY.time; passed = 0; target = endlessTarget(day); sfx('day'); msg('DIA ' + day, '#f8c818', 3, 2.8);
        return;
      }
      finish(false); return;
    }
    if (mode === 'online') { finish(true); return; }
    finish(false);
  }
  let result: any = null;
  function finish(win: boolean) {
    if (state === 'over') return;
    state = 'over'; endT = 0; ptrs.clear();
    const km = Math.round(dist / 1000 / 6.5 * 10) / 10;
    if (mode === 'champ') {
      const left = Math.max(0, timeLeft) / stage.time, st = win ? (left > .3 ? 3 : left > .13 ? 2 : 1) : 0;
      const bonus = win ? 30 + stageIdx * 12 + st * 10 : 0;
      const prev = save.stars[stageIdx] | 0;
      if (win) { save.stars[stageIdx] = Math.max(prev, st); save.unl = Math.max(save.unl | 0, Math.min(STAGES.length, stageIdx + 2)); }
      const coins = coinsRun + bonus; save.coins += coins; save.races = (save.races | 0) + 1; persist();
      result = { win, mode, title: win ? 'VITÓRIA!' : 'O TEMPO ACABOU', sub: stage.name, stars: st, coins, lines: [['Carros passados', passed + ' / ' + target], ['Distância', km + ' km'], ['Tempo sobrando', win ? fmtT(timeLeft) : '0:00']], next: win && stageIdx + 1 < STAGES.length, newStage: win && stageIdx + 1 < STAGES.length && prev === 0 };
      setTimeout(() => sfx(win ? 'win' : 'lose'), 300);
    } else if (mode === 'endless') {
      const coins = coinsRun; save.coins += coins; save.bestKm = Math.max(save.bestKm || 0, km); save.bestDay = Math.max(save.bestDay | 0, day - 1); save.races = (save.races | 0) + 1; persist();
      result = { win: false, mode, title: 'FIM DA ESTRADA', sub: 'Você chegou ao dia ' + day, stars: 0, coins, lines: [['Dias completos', String(day - 1)], ['Carros no último dia', passed + ' / ' + target], ['Distância', km + ' km'], ['Recorde', (save.bestDay | 0) + ' dias · ' + save.bestKm + ' km']] };
      setTimeout(() => sfx('lose'), 300);
    } else if (mode === 'online') {
      netFinal();
    }
  }
  function showResult() {
    if (mode === 'online') { netShowResult(); return; }
    only('res'); pf.audio.engine(-1, 0);
  }
  const fmtT = (s: number) => { s = Math.max(0, Math.ceil(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };

  /* ---------- desenho ---------- */
  function draw(G: Ctx2D) {
    try {
      render();
      G.setTransform(1, 0, 0, 1, 0, 0);
      G.imageSmoothingEnabled = false;
      const ox = shake > 0 ? Math.round((Math.random() - .5) * shake * 3) * (W * DPR / LW) : 0, oy = shake > 0 ? Math.round((Math.random() - .5) * shake * 2) * (H * DPR / LH) : 0;
      G.drawImage(low as any, 0, 0, LW, LH, ox, oy, W * DPR, H * DPR);
    } catch (e) { console.error(e); }
  }
  const R = (x: number, y: number, w: number, h: number, c: string) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
  function render() {
    g.setTransform(1, 0, 0, 1, 0, 0); g.imageSmoothingEnabled = false; g.globalAlpha = 1;
    if (!segs.length) { R(0, 0, LW, LH, '#0b0b1e'); return; }
    const T = curTod();
    const cy = Math.round(LH * HOR);
    drawSky(T, cy);
    /* projeção dos segmentos */
    const base = segAt(position), bp = (position % SEG) / SEG;
    const ps = segAt(position + PLAYERZ), pp = ((position + PLAYERZ) % SEG) / SEG;
    const py = lerp(ps.y1, ps.y2, pp);
    let x = 0, dx = -(base.curve * bp), maxy = LH;
    const camY = py + CAMH;
    const halfW = LW / 2, fogD = T.fogD;
    const vis: Seg[] = [];
    for (let n = 0; n < DRAW; n++) {
      const s = segs[(base.i + n) % segs.length];
      const looped = s.i < base.i;
      const cz = position - (looped ? trackLen : 0);
      const camX = playerX * ROADW;
      /* ponto perto */
      let zc = s.i * SEG - cz; let sc = CAMD / Math.max(1, zc);
      s.x1 = halfW + sc * (-(camX - x)) * halfW; s.y1s = cy - sc * (s.y1 - camY) * LH / 2; s.w1 = sc * ROADW * halfW; s.s1 = sc;
      zc = (s.i + 1) * SEG - cz; sc = CAMD / Math.max(1, zc);
      s.x2 = halfW + sc * (-(camX - x - dx)) * halfW; s.y2s = cy - sc * (s.y2 - camY) * LH / 2; s.w2 = sc * ROADW * halfW; s.s2 = sc;
      x += dx; dx += s.curve;
      s.clip = maxy; s.n = n;
      s.fog = 1 - Math.exp(-Math.pow(n / DRAW, 2) * fogD);
      if (s.i * SEG - cz <= CAMD || s.y2s >= s.y1s || s.y2s >= maxy) continue;
      drawSeg(s, T, maxy);
      vis.push(s);
      maxy = s.y2s;
    }
    /* carros e cenário, do fundo para a frente */
    const night = T.dark > .65 ? 2 : T.dark > .25 ? 1 : 0;
    const me = position + PLAYERZ;
    const ghosts = mode === 'online' ? netGhosts() : [];
    for (let n = DRAW - 1; n > 0; n--) {
      const s = segs[(base.i + n) % segs.length];
      if (s.s1 <= 0 || s.n !== n) continue;
      for (const p of s.props) {
        const spr = propSprite(p.p, night), sw = PROP_SIZE[p.p][0], shh = PROP_SIZE[p.p][1];
        const dw = p.w * s.w1, dh = dw * shh / sw;
        const sx = s.x1 + s.w1 * p.off - (p.off < 0 ? dw : 0), sy = s.y1s - dh;
        sprite(spr, sw, shh, sx, sy, dw, dh, s.clip, s.fog, T);
      }
      for (const c of s.cars) {
        const pc = (c.z % SEG) / SEG, sc = lerp(s.s1, s.s2, pc), w = lerp(s.w1, s.w2, pc);
        const cx = lerp(s.x1, s.x2, pc) + w * c.off, cyy = lerp(s.y1s, s.y2s, pc);
        drawCar(c.shape, c.col, cx, cyy, CARW * w, s.clip, s.fog, T, n, relZ(c.z - me) < SEG * 4 && c.speed > speed ? 0 : 0, 0);
        void sc;
      }
      for (const gh of ghosts) if (gh.seg === s.i) {
        const pc = (gh.z % SEG) / SEG, w = lerp(s.w1, s.w2, pc);
        const cx = lerp(s.x1, s.x2, pc) + w * gh.x, cyy = lerp(s.y1s, s.y2s, pc);
        g.globalAlpha = .75; drawCar(gh.shape, gh.col, cx, cyy, CARW * w, s.clip, s.fog, T, n, 0, 0); g.globalAlpha = 1;
        if (n < 60) ptext(g, gh.name.slice(0, 10), Math.round(cx), Math.round(cyy - CARW * w * CAR_H / CAR_W - 9), '#fff', 1, .5, '#000');
      }
    }
    /* farol do jogador à noite */
    if (T.dark > .3) headlights(T, cy);
    drawPlayer(T, ps, pp, cy);
    if (T.snow) drawSnow();
    for (const p of sparks) R(Math.round(p.x), Math.round(p.y), 1, 1, p.c);
    if (mode !== 'demo') drawHUD(T);
  }
  function drawSky(T: Tod, cy: number) {
    /* faixas de cor (degradê "em degraus") */
    const bands = 10, bh = Math.ceil(cy / bands);
    for (let i = 0; i < bands; i++) R(0, i * bh, LW, bh + 1, mix(T.sky[0], T.sky[1], i / (bands - 1)));
    if (T.dark > .5) { for (const s of stars) { if (s.y * cy > cy - 4) continue; R(Math.round(s.x * LW), Math.round(s.y * cy), 1, 1, s.b > .7 ? '#fff' : '#8888b0'); } }
    if (T.moon) { const mx = Math.round(LW * .78), my = Math.round(cy * .3); disc(mx, my, 7, '#f0f0d8'); disc(mx + 3, my - 2, 6, T.sky[0]); }
    else if (T.sun) { const sx = Math.round(LW * .72 - skyOff * 60 % LW), syy = Math.round(cy * (T.dark > .1 ? .72 : .3)); disc(((sx % LW) + LW) % LW, syy, 9, T.sun); }
    /* morros/serras/prédios ao fundo, em duas camadas */
    backLayer(T.hill2, cy, .35, 26, 11);
    backLayer(T.hill, cy, .7, 14, 23);
    if (scene === 'praia') { R(0, cy - 3, LW, 3, mix(T.hill, '#2a6cf0', .6)); R(0, cy - 3, LW, 1, mix(T.sky[1], '#ffffff', .3)); }
  }
  function disc(x: number, y: number, r: number, c: string) { g.fillStyle = c; for (let dy = -r; dy <= r; dy++) { const w = Math.round(Math.sqrt(r * r - dy * dy)); g.fillRect(x - w, y + dy, w * 2 + 1, 1); } }
  function backLayer(col: string, cy: number, par: number, amp: number, seed: number) {
    const off = Math.floor(skyOff * 400 * par);
    g.fillStyle = col;
    for (let x = 0; x < LW; x += 2) {
      const u = x + off;
      let h: number;
      if (scene === 'cidade') { const b = Math.floor(u / 14); const hh = ((b * 37 + seed * 11) % 23); h = (amp * .6 + hh * (amp / 18)) * (((b + seed) % 3) ? 1 : .6); }
      else if (scene === 'deserto') { const P = 170, k = Math.floor(u / P), dm = (((u % P) + P) % P) - P / 2, mw = 26 + (((k * 53 + seed * 7) % 40) + 40) % 40, mh = amp * (.55 + ((((k * 29 + seed) % 10) + 10) % 10) / 14); const m = mh - Math.max(0, Math.abs(dm) - mw / 2) * 1.3; h = Math.max(m, amp * .22 + Math.sin(u * .03 + seed) * 2); }
      else if (scene === 'praia') { h = Math.max(0, Math.sin(u * .01 + seed) * amp * .6 + Math.sin(u * .037) * 3) * .6; }
      else { const v = Math.abs(((u * .02 + seed) % 2) - 1); h = amp * (.5 + v * .9) + Math.sin(u * .05 + seed) * 3; if (scene === 'neve' || scene === 'serra') h *= 1.25; }
      h = Math.max(0, Math.round(h));
      g.fillRect(x, cy - h, 2, h);
      if (scene === 'neve' && h > amp * .9) { g.fillStyle = '#f4f8fc'; g.fillRect(x, cy - h, 2, 3); g.fillStyle = col; }
      if (scene === 'cidade' && h > 6 && ((u >> 2) % 3 === 0)) { g.fillStyle = curTod().dark > .4 ? '#fce468' : sh(col, .15); g.fillRect(x, cy - h + 3 + ((u * 7) % 5), 1, 1); g.fillStyle = col; }
    }
  }
  function drawSeg(s: Seg, T: Tod, maxy: number) {
    const y1 = Math.min(maxy, Math.round(s.y1s)), y2 = Math.max(0, Math.round(s.y2s));
    const f = s.fog, fog = T.fog;
    const grass = fogC(T.grass[s.c], f, fog), road = fogC(T.road[s.c], f, fog), rum = fogC(T.rumble[s.c], f, fog), lane = fogC(T.lane, f, fog);
    const lit = T.dark > .3 && s.n < 22 ? (1 - s.n / 22) * T.dark : 0;
    const roadL = lit ? mix(road, '#a8a090', lit * .55) : road;
    const h = s.y1s - s.y2s;
    for (let y = y2; y < y1; y++) {
      const t = h > 0 ? (s.y1s - y) / h : 0;
      const xx = lerp(s.x1, s.x2, t), w = lerp(s.w1, s.w2, t);
      g.fillStyle = grass; g.fillRect(0, y, LW, 1);
      const rw = Math.max(1, w / 7);
      g.fillStyle = rum; g.fillRect(Math.round(xx - w - rw), y, Math.round(rw), 1); g.fillRect(Math.round(xx + w), y, Math.round(rw), 1);
      g.fillStyle = roadL; g.fillRect(Math.round(xx - w), y, Math.round(w * 2), 1);
      if (s.c === 0) { const lw = Math.max(1, w / 40); g.fillStyle = lane; g.fillRect(Math.round(xx - w / 3 - lw / 2), y, Math.max(1, Math.round(lw)), 1); g.fillRect(Math.round(xx + w / 3 - lw / 2), y, Math.max(1, Math.round(lw)), 1); }
    }
  }
  function sprite(spr: OffCanvas, sw: number, shh: number, dx: number, dy: number, dw: number, dh: number, clipY: number, fog: number, T: Tod) {
    if (dw < .5 || dy > clipY) return;
    const cut = Math.max(0, dy + dh - clipY);
    const vis = dh - cut; if (vis <= 0) return;
    const srcH = shh * vis / dh;
    if (fog > .94) return;
    const lvl = Math.round(fog * 8) / 8;
    const src = lvl > 0 ? fogSprite(spr, T.fog, lvl) : spr;
    g.drawImage(src as any, 0, 0, sw, Math.max(1, srcH), Math.round(dx), Math.round(dy), Math.max(1, Math.round(dw)), Math.max(1, Math.round(vis)));
  }
  function drawCar(shp: number, col: string, cx: number, by: number, dw: number, clip: number, fog: number, T: Tod, n: number, turn: number, brake: number) {
    const dh = dw * CAR_H / CAR_W, dx = cx - dw / 2, dy = by - dh;
    const dark = T.dark;
    if (dark > .65 && n > 16) {
      /* noite: só as lanternas */
      if (dy > clip || fog > .95) return;
      const lw = Math.max(1, Math.round(dw * .16)), lh = Math.max(1, Math.round(dh * .14)), ly = Math.round(dy + dh * .5);
      if (ly > clip) return;
      R(Math.round(dx + dw * .08), ly, lw, lh, '#ff2020'); R(Math.round(dx + dw * .92 - lw), ly, lw, lh, '#ff2020');
      return;
    }
    const spr = carSprite(shp, dark > .65 ? sh(col, -.6) : dark > .25 ? sh(col, -.25) : col, turn, dark > .4 ? 1 : brake);
    sprite(spr, CAR_W, CAR_H, dx, dy, dw, dh, clip, fog, T);
  }
  function headlights(T: Tod, cy: number) {
    void cy;
    g.globalAlpha = .14 * T.dark;
    g.fillStyle = '#fcf0a8';
    const bx = LW / 2, by = LH - 20;
    for (let y = Math.round(LH * .55); y < by; y++) { const t = (y - LH * .55) / (by - LH * .55), w = 18 + t * 70; g.fillRect(Math.round(bx - w), y, Math.round(w * 2), 1); }
    g.globalAlpha = 1;
  }
  function drawPlayer(T: Tod, ps: Seg, pp: number, cy: number) {
    const sc = CAMD / PLAYERZ;
    const dw = Math.round(CARW * ROADW * sc * LW / 2), dh = Math.round(dw * CAR_H / CAR_W);
    const camy = lerp(ps.y1, ps.y2, pp);
    void camy; void cy;
    const bounce = (speed > 0 ? Math.round(Math.random() * (speed / MAXS) * 1.2 * (Math.abs(playerX) > 1 ? 2 : .6)) : 0);
    const x = Math.round(LW / 2 - dw / 2), y = Math.round(LH - 30 - insB() - dh - bounce);
    const turn = steerVis > .3 ? 1 : steerVis < -.3 ? -1 : 0;
    const brk = !!(inp('B') && state === 'race');
    R(x + 2, y + dh - 2, dw - 4, 3, 'rgba(0,0,0,.35)');
    g.drawImage(carSprite(shape, T.dark > .65 ? sh(color, -.35) : color, turn, brk ? 1 : 0) as any, 0, 0, CAR_W, CAR_H, x, y, dw, dh);
  }
  function drawSnow() {
    for (const f of flakes) {
      f.y += f.v * .012 * (1 + speed / MAXS); f.x -= (steerVis * .004 + .002) * f.v;
      if (f.y > 1) { f.y = 0; f.x = Math.random(); } if (f.x < 0) f.x += 1; if (f.x > 1) f.x -= 1;
      R(Math.round(f.x * LW), Math.round(f.y * LH), f.v > .8 ? 2 : 1, f.v > .8 ? 2 : 1, '#ffffff');
    }
  }
  /* painel e textos por cima */
  function drawHUD(T: Tod) {
    const kmh = Math.round(speed / maxSpeed * CARS[save.car | 0].top * (maxSpeed / (MAXS * CARS[save.car | 0].spd)));
    /* painel de baixo, no estilo dos videogames antigos */
    const pw = 132, ph = 24, px = Math.round((LW - pw) / 2), py = LH - ph - 2 - insB();
    R(px - 2, py - 2, pw + 4, ph + 4, '#000'); R(px, py, pw, ph, '#5c2008'); R(px, py, pw, 1, '#a84818');
    R(px + 4, py + 3, 42, 18, '#000'); ptext(g, String(kmh).padStart(3, ' '), px + 6, py + 5, '#f8c818', 1); ptext(g, 'KM/H', px + 6, py + 13, '#c86818', 1);
    R(px + 50, py + 3, 78, 18, '#000');
    if (mode === 'online') {
      ptext(g, 'PASSOU', px + 54, py + 5, '#c86818'); ptext(g, String(Math.max(0, passed)).padStart(3, '0'), px + 106, py + 5, '#f8c818');
      ptext(g, 'TEMPO', px + 54, py + 13, '#c86818'); ptext(g, fmtT(timeLeft), px + 100, py + 13, timeLeft < 15 ? '#ff5050' : '#f8c818');
    } else {
      const left = target - passed;
      if (left <= 0) { for (let i = 0; i < 4; i++) ptext(g, '⚑', px + 56 + i * 10, py + 5, i % 2 ? '#5cdc5c' : '#f8f8f8'); }
      else { ptext(g, '⚑', px + 54, py + 5, '#f8f8f8'); ptext(g, String(left).padStart(3, '0'), px + 64, py + 5, '#f8c818'); ptext(g, 'CARROS', px + 86, py + 5, '#c86818'); }
      ptext(g, mode === 'endless' ? 'DIA ' + day : 'TEMPO', px + 54, py + 13, '#c86818'); ptext(g, fmtT(timeLeft), px + 100, py + 13, timeLeft < 15 ? '#ff5050' : '#f8c818');
    }
    /* topo: nome da etapa / hora do dia */
    const tl = 4 + insL(), tt = 4 + insT();
    ptext(g, mode === 'endless' ? 'ESTRADA SEM FIM' : mode === 'online' ? 'CORRIDA ONLINE' : stage.name, tl, tt, '#fff', 1, 0, '#000');
    ptext(g, T.name, tl, tt + 10, T.dark > .5 ? '#a8b8ff' : '#f8f0a0', 1, 0, '#000');
    if (mode === 'online') netHud(tl, tt + 22);
    /* botão de pausa */
    const B = btnRects(), P = B.P!;
    R(P[0], P[1], P[2], P[3], 'rgba(0,0,0,.5)'); R(P[0] + 6, P[1] + 4, 3, 10, '#fff'); R(P[0] + 11, P[1] + 4, 3, 10, '#fff');
    /* controles de toque */
    if (lastInput === 'touch') {
      const pad = (k: string, lab: string, on: boolean) => { const r = B[k]; if (!r) return; g.globalAlpha = on ? .75 : .42; R(r[0], r[1], r[2], r[3], '#000'); R(r[0] + 1, r[1] + 1, r[2] - 2, r[3] - 2, on ? '#f8c818' : '#3c3c5c'); g.globalAlpha = on ? 1 : .8; ptext(g, lab, r[0] + r[2] / 2, r[1] + r[3] / 2 - 3, on ? '#000' : '#fff', 1, .5); g.globalAlpha = 1; };
      pad('L', '◄', inp('L')); pad('R', '►', inp('R'));
      if (B.G) pad('G', 'ACEL', inp('G'));
      pad('B', 'FREIO', inp('B'));
      if (raceT < 6 && state === 'race' && save.auto) { g.globalAlpha = Math.min(1, (6 - raceT) / 2); ptext(g, 'ACELERA SOZINHO · SEGURE FREIO', LW / 2, LH * .56, '#fff', 1, .5, '#000'); g.globalAlpha = 1; }
    } else if (raceT < 6 && state === 'race') { g.globalAlpha = Math.min(1, (6 - raceT) / 2); ptext(g, '◄ ► DIREÇÃO   ▲ ACELERA   ▼ FREIA', LW / 2, LH * .56, '#fff', 1, .5, '#000'); g.globalAlpha = 1; }
    /* contagem e mensagens */
    if (state === 'count') { const n = Math.ceil(countT - .6); if (n >= 1) ptext(g, String(n), LW / 2, LH * .3, '#f8c818', 5, .5, '#000'); }
    let my = LH * .3;
    for (const m of msgs) { g.globalAlpha = Math.min(1, m.t * 2); ptext(g, m.s, LW / 2, my, m.c, m.k, .5, '#000'); g.globalAlpha = 1; my += 9 * m.k + 4; }
    if (mode !== 'online' && passed >= target && target > 0 && mode === 'endless' && state === 'race') ptext(g, 'META CUMPRIDA! SIGA ATÉ O FIM DO DIA', LW / 2, LH * .2, '#5cdc5c', 1, .5, '#000');
  }

  /* ---------- pausa ---------- */
  function setPause(v: boolean) {
    if (!ui.show.race && !ui.show.pause) return;
    if (state === 'over') return;
    paused = v; ptrs.clear(); for (const k in keys) keys[k] = false;
    if (v) { only('pause'); pf.audio.engine(-1, 0); } else only('race');
  }

  /* ---------- online (salas por código, até 4 pessoas) ---------- */
  const NET: any = { peer: null, host: false, code: '', conns: [] as any[], conn: null, players: [] as any[], me: '', status: '', busy: false, others: {} as any, sendT: 0, track: 0, inRace: false, final: null, input: '' };
  const ROOMP = 'turboestrada-v1-r-';
  const meInfo = () => ({ id: NET.me, name: save.name, shape: save.car | 0, col: COLORS[save.col[CARS[save.car | 0].id] | 0] });
  function netReset() { try { NET.peer && NET.peer.destroy(); } catch (e) { } Object.assign(NET, { peer: null, host: false, code: '', conns: [], conn: null, players: [], me: '', status: '', busy: false, others: {}, inRace: false, final: null }); }
  function hostBroadcast(o: any, skip?: any) { for (const c of NET.conns) { if (c === skip || !c.open) continue; try { c.send(o); } catch (e) { } } }
  function lobbySync() { if (!NET.host) return; hostBroadcast({ t: 'lobby', players: NET.players }); emit(); }
  function createRoom() {
    if (NET.busy) return; netReset(); NET.busy = true; NET.status = 'Criando sala…'; emit();
    const tryCode = (left: number) => {
      const code = String(1000 + Math.floor(Math.random() * 9000));
      const p = new Peer(ROOMP + code); NET.peer = p;
      p.on('open', () => { NET.host = true; NET.code = code; NET.me = 'h'; NET.players = [meInfo()]; NET.busy = false; NET.status = ''; only('room'); });
      p.on('error', (e: any) => {
        if (e && e.type === 'unavailable-id' && left > 0) { tryCode(left - 1); return; }
        if (NET.peer !== p) return;
        NET.busy = false; NET.status = 'Sem conexão. Confira a internet e tente de novo.'; emit();
      });
      p.on('connection', (c: any) => {
        c.on('data', (d: any) => hostData(c, d));
        c.on('close', () => { NET.conns = NET.conns.filter((x: any) => x !== c); NET.players = NET.players.filter((x: any) => x.id !== c.peer); delete NET.others[c.peer]; lobbySync(); });
        c.on('open', () => { if (NET.conns.length >= 3 || NET.inRace) { try { c.send({ t: NET.inRace ? 'busy' : 'full' }); } catch (e) { } setTimeout(() => c.close(), 300); return; } NET.conns.push(c); });
      });
    };
    tryCode(4);
  }
  function hostData(c: any, d: any) {
    if (!d || typeof d !== 'object') return;
    if (d.t === 'hi') {
      const pl = { id: c.peer, name: String(d.name || 'Piloto').slice(0, 12), shape: clamp(d.shape | 0, 0, 4), col: /^#[0-9a-f]{6}$/i.test(d.col) ? d.col : '#e4202c' };
      NET.players = NET.players.filter((x: any) => x.id !== c.peer).concat([pl]);
      try { c.send({ t: 'you', id: c.peer, code: NET.code }); } catch (e) { }
      lobbySync(); sfx('coin');
    } else if (d.t === 'st') { NET.others[c.peer] = { z: +d.z || 0, x: clamp(+d.x || 0, -3, 3), p: d.p | 0, f: !!d.f, at: clock }; }
  }
  function joinRoom(code: string) {
    code = String(code || '').replace(/\D/g, '').slice(0, 4);
    if (code.length !== 4) { toast('O código da sala tem 4 números.'); return; }
    if (NET.busy) return; netReset(); NET.busy = true; NET.status = 'Procurando a sala ' + code + '…'; emit();
    const p = new Peer(); NET.peer = p;
    p.on('open', () => {
      const c = p.connect(ROOMP + code); NET.conn = c;
      c.on('open', () => { NET.code = code; NET.me = p.id; try { c.send({ t: 'hi', name: save.name, shape: save.car | 0, col: meInfo().col }); } catch (e) { } });
      c.on('data', (d: any) => clientData(d));
      c.on('close', () => { if (NET.conn !== c) return; const was = ui.show.room || NET.inRace; netReset(); if (was) { toast('A sala foi fechada.'); if (NET.inRace || ui.show.race || ui.show.pause) goMenu(); else only('online'); } else { NET.status = 'Não deu para entrar na sala.'; emit(); } });
    });
    p.on('error', (e: any) => {
      if (NET.peer !== p) return;
      NET.busy = false;
      NET.status = e && e.type === 'peer-unavailable' ? 'Não achei a sala ' + code + '. Confira o código.' : 'Sem conexão. Confira a internet e tente de novo.';
      try { p.destroy(); } catch (er) { } NET.peer = null; emit();
    });
    setTimeout(() => { if (NET.peer === p && NET.busy) { NET.busy = false; NET.status = 'A sala não respondeu. Confira o código.'; try { p.destroy(); } catch (e) { } NET.peer = null; emit(); } }, 12000);
  }
  function clientData(d: any) {
    if (!d || typeof d !== 'object') return;
    if (d.t === 'you') { NET.me = d.id; NET.busy = false; NET.status = ''; only('room'); sfx('coin'); }
    else if (d.t === 'lobby') { NET.players = Array.isArray(d.players) ? d.players.slice(0, 4) : []; emit(); }
    else if (d.t === 'full' || d.t === 'busy') { const s = d.t === 'full' ? 'A sala está cheia (4 pilotos).' : 'Essa sala já está correndo. Espere acabar.'; netReset(); NET.status = s; only('online'); }
    else if (d.t === 'go') { NET.track = d.track | 0; netGo(); }
    else if (d.t === 'all') { const o: any = {}; for (const r of (d.list || [])) { if (r.id === NET.me) continue; o[r.id] = { z: +r.z || 0, x: +r.x || 0, p: r.p | 0, f: !!r.f, at: clock }; } NET.others = o; }
  }
  function startRoom() {
    if (!NET.host) return;
    if (NET.players.length < 2) { toast('Espere pelo menos mais 1 piloto entrar.'); return; }
    NET.track = ONLINE_TRACKS[Math.floor(Math.random() * ONLINE_TRACKS.length)];
    hostBroadcast({ t: 'go', track: NET.track }); netGo();
  }
  function netGo() { NET.inRace = true; NET.final = null; NET.others = {}; startRace('online', NET.track); }
  function netRace(dt: number) {
    NET.sendT -= dt; if (NET.sendT > 0) return; NET.sendT = .12;
    const st = { t: 'st', z: Math.round(position), x: Math.round(playerX * 100) / 100, p: passed, f: state === 'over' };
    if (NET.host) {
      const list = [{ id: 'h', z: st.z, x: st.x, p: st.p, f: st.f }];
      for (const id in NET.others) { const o = NET.others[id]; list.push({ id, z: o.z, x: o.x, p: o.p, f: o.f }); }
      hostBroadcast({ t: 'all', list });
    } else if (NET.conn && NET.conn.open) { try { NET.conn.send(st); } catch (e) { } }
  }
  function netGhosts() {
    const out: any[] = [];
    for (const id in NET.others) {
      const o = NET.others[id], pl = NET.players.find((p: any) => p.id === id); if (!pl) continue;
      const z = wrapZ(o.z + PLAYERZ);
      out.push({ z, x: o.x, seg: Math.floor(z / SEG) % segs.length, shape: pl.shape, col: pl.col, name: pl.name });
    }
    return out;
  }
  function standings() {
    const L = NET.players.map((p: any) => ({ id: p.id, name: p.name, shape: p.shape, col: p.col, p: p.id === NET.me ? passed : (NET.others[p.id] ? NET.others[p.id].p : 0), me: p.id === NET.me }));
    L.sort((a: any, b: any) => b.p - a.p);
    return L;
  }
  function netHud(x: number, y: number) {
    const L = standings();
    L.forEach((r: any, i: number) => { R(x, y + i * 9, 3, 7, r.col); ptext(g, (i + 1) + ' ' + r.name.slice(0, 9) + ' ' + Math.max(0, r.p), x + 5, y + i * 9, r.me ? '#f8c818' : '#fff', 1, 0, '#000'); });
  }
  function netFinal() { netRace(0); NET.sendT = 0; }
  function netShowResult() {
    NET.inRace = false;
    const L = standings(); const myP = Math.max(0, passed);
    const pos = 1 + L.filter((r: any) => Math.max(0, r.p) > myP).length, tie = L.filter((r: any) => Math.max(0, r.p) === myP).length > 1;
    const coins = Math.max(0, passed) + (pos === 1 ? 60 : pos === 2 ? 30 : 15);
    save.coins += coins; if (pos === 1) save.onlineWins = (save.onlineWins | 0) + 1; save.races = (save.races | 0) + 1; persist();
    result = { win: pos === 1 && !tie, mode: 'online', title: pos === 1 ? (tie ? 'EMPATE!' : 'VOCÊ VENCEU!') : pos + 'º LUGAR', sub: STAGES[NET.track].name, stars: 0, coins, lines: L.map((r: any, i: number) => [(i + 1) + 'º  ' + r.name, Math.max(0, r.p) + ' carros']), rank: L.map((r: any) => ({ name: r.name, p: Math.max(0, r.p), me: r.me, img: carImg(r.shape, r.col) })) };
    sfx(pos === 1 ? 'win' : 'lose');
    only('res'); pf.audio.engine(-1, 0);
  }
  function leaveRoom() { try { if (NET.host) hostBroadcast({ t: 'bye' }); } catch (e) { } netReset(); only('online'); }
  function shareRoom() {
    const url = 'https://claude-jogo-5.vercel.app/?sala=' + NET.code;
    pf.share('Bora correr no Turbo Estrada! Entre na sala ' + NET.code + ' (Online → Entrar) ou abra: ' + url).then(r => { if (r === 'copied') toast('Convite copiado!'); });
  }

  /* ---------- imagens dos carros para as telas ---------- */
  const imgCache: { [k: string]: string } = {};
  function carImg(shp: number, col: string) { const k = shp + col; if (imgCache[k] == null) imgCache[k] = carImage(shp, col, 6); return imgCache[k]; }

  /* ---------- telas ---------- */
  function goMenu() { if (NET.inRace) { leaveRoom(); } paused = false; state = 'idle'; startDemo(); only('menu'); pf.audio.engine(-1, 0); }
  const totalStars = () => (save.stars as number[]).reduce((a, b) => a + (b | 0), 0);
  function menuInfo() {
    const c = CARS[save.car | 0];
    return { coins: save.coins | 0, car: c.name, img: carImg(save.car | 0, COLORS[save.col[c.id] | 0]), stars: totalStars(), maxStars: STAGES.length * 3, bestDay: save.bestDay | 0, bestKm: save.bestKm || 0, name: save.name, sfx: !!save.sfx, mus: !!save.mus, auto: !!save.auto, touch: isTouch };
  }
  function champInfo() {
    return {
      coins: save.coins | 0, stars: totalStars(),
      cups: CUPS.map((cp, ci) => ({ name: cp.name, col: cp.col, stages: STAGES.map((s, i) => ({ s, i })).filter(o => o.s.cup === ci).map(({ s, i }) => ({ i, name: s.name, scene: SCENE_NAME[s.scene], target: s.target, time: s.time, stars: save.stars[i] | 0, locked: i >= (save.unl | 0), tods: s.phases.map(p => TOD[p[0]].name).filter((v, k, a) => a.indexOf(v) === k).join(' → ') })) })),
    };
  }
  let gSel = save.car | 0;
  function garageInfo() {
    const c = CARS[gSel], own = !!save.owned[gSel], up = save.upg[c.id];
    const ci = save.col[c.id] | 0;
    const stat = (v: number, a: number, b: number) => clamp((v - a) / (b - a), .05, 1);
    const top = c.top * (1 + up[0] * UPG[0].per), acc = c.acc * (1 + up[1] * UPG[1].per), gr = c.grip * (1 + up[2] * UPG[2].per);
    return {
      coins: save.coins | 0, sel: gSel, n: CARS.length, name: c.name, desc: c.desc, price: c.price, owned: own, using: (save.car | 0) === gSel,
      img: carImg(gSel, COLORS[ci]),
      stats: [{ k: 'Velocidade', v: stat(top, 150, 300), t: Math.round(top) + ' km/h' }, { k: 'Aceleração', v: stat(acc, .8, 1.9), t: '' }, { k: 'Curvas', v: stat(gr, .8, 1.9), t: '' }, { k: 'Fora da pista', v: c.off < 1 ? 1 : .35, t: c.off < 1 ? 'ótimo' : '' }],
      upg: UPG.map((u, k) => ({ k: u.k, name: u.name, what: u.what, lvl: up[k], max: UPG_MAX, cost: up[k] >= UPG_MAX ? 0 : upgCost(gSel, up[k]) })),
      colors: COLORS.map((cc, i) => ({ c: cc, name: COLOR_NAMES[i], owned: !!save.colOwned[i], sel: i === ci })), colorPrice: COLOR_PRICE,
      thumbs: CARS.map((cc, i) => ({ name: cc.name, owned: !!save.owned[i], img: carImg(i, COLORS[save.col[cc.id] | 0]), sel: i === gSel })),
    };
  }
  function onlineInfo() { return { name: save.name, status: NET.status, busy: !!NET.busy, input: NET.input }; }
  function roomInfo() {
    return { code: NET.code, host: !!NET.host, players: NET.players.map((p: any) => ({ name: p.name, me: p.id === NET.me, host: p.id === 'h', img: carImg(p.shape, p.col), car: CARS[p.shape] ? CARS[p.shape].name : '' })), max: 4 };
  }
  function resInfo() { return result || { title: '', lines: [] }; }

  /* ---------- ações das telas ---------- */
  function btnSound(k?: string) { sfx(k === 'back' ? 'back' : 'click'); }
  const act = {
    btnSound,
    openChamp: () => only('champ'), openGarage: () => { gSel = save.car | 0; only('garage'); }, openOnline: () => { NET.status = ''; only('online'); },
    playStage: (i: number) => { i = i | 0; if (i >= (save.unl | 0)) { sfx('nope'); toast('Vença a etapa anterior para liberar.'); return; } startRace('champ', i); },
    playEndless: () => startRace('endless', 0),
    garagePrev: () => { gSel = (gSel + CARS.length - 1) % CARS.length; emit(); }, garageNext: () => { gSel = (gSel + 1) % CARS.length; emit(); },
    garageSel: (i: number) => { gSel = clamp(i | 0, 0, CARS.length - 1); emit(); },
    garageBuy: () => { const c = CARS[gSel]; if (save.owned[gSel]) return; if (save.coins < c.price) { sfx('nope'); toast('Faltam ' + (c.price - save.coins) + ' moedas.'); return; } save.coins -= c.price; save.owned[gSel] = true; save.car = gSel; persist(); sfx('buy'); toast(c.name + ' é seu!'); emit(); },
    garageUse: () => { if (!save.owned[gSel]) return; save.car = gSel; persist(); sfx('click'); toast(CARS[gSel].name + ' na pista!'); emit(); },
    upgBuy: (k: number) => { const c = CARS[gSel]; if (!save.owned[gSel]) { toast('Compre o carro primeiro.'); return; } const up = save.upg[c.id]; if (up[k] >= UPG_MAX) return; const cost = upgCost(gSel, up[k]); if (save.coins < cost) { sfx('nope'); toast('Faltam ' + (cost - save.coins) + ' moedas.'); return; } save.coins -= cost; up[k]++; persist(); sfx('buy'); emit(); },
    colorPick: (i: number) => { const c = CARS[gSel]; i = clamp(i | 0, 0, COLORS.length - 1); if (!save.colOwned[i]) { if (save.coins < COLOR_PRICE) { sfx('nope'); toast('Essa cor custa ' + COLOR_PRICE + ' moedas.'); return; } save.coins -= COLOR_PRICE; save.colOwned[i] = true; sfx('buy'); } else sfx('click'); save.col[c.id] = i; persist(); emit(); },
    toggleSfx: () => { save.sfx = !save.sfx; pf.audio.setVolumes(save.sfx, save.mus); persist(); emit(); },
    toggleMus: () => { save.mus = !save.mus; pf.audio.setVolumes(save.sfx, save.mus); persist(); emit(); },
    toggleAuto: () => { save.auto = !save.auto; persist(); toast(save.auto ? 'O carro acelera sozinho. Segure FREIO para frear.' : 'Segure ACEL para acelerar.'); emit(); },
    setName: (s: string) => { save.name = String(s || '').replace(/[^\p{L}\p{N} _-]/gu, '').slice(0, 12) || save.name; persist(); emit(); },
    setCodeIn: (s: string) => { NET.input = String(s || '').replace(/\D/g, '').slice(0, 4); emit(); },
    createRoom, joinRoom: (c?: string) => joinRoom(c != null ? c : NET.input), leaveRoom, startRoom, shareRoom,
    pause: () => setPause(true), resume: () => setPause(false),
    restart: () => { if (mode === 'online') return; const m = mode, i = stageIdx; startRace(m, i); },
    quit: () => { if (mode === 'online') { leaveRoom(); goMenu(); return; } goMenu(); },
    resNext: () => { if (mode === 'champ' && stageIdx + 1 < STAGES.length) startRace('champ', stageIdx + 1); else goMenu(); },
    resRetry: () => { if (mode === 'online') { if (NET.peer) { startDemo(); only('room'); } else goMenu(); return; } startRace(mode, stageIdx); },
    resMenu: () => { const m = mode; if (m === 'online' && NET.peer) { leaveRoom(); } goMenu(); if (m === 'champ') only('champ'); },
    goMenu, back, onHide: () => { if (ui.show.race && state !== 'over') setPause(true); pf.audio.engine(-1, 0); persist(); }, persist,
  };
  function back(): boolean {
    const S = ui.show;
    if (S.race) { if (state !== 'over') setPause(true); return true; }
    if (S.pause) { setPause(false); return true; }
    if (S.res) { act.resMenu(); return true; }
    if (S.room) { leaveRoom(); return true; }
    if (S.champ || S.garage || S.online) { sfx('back'); only('menu'); return true; }
    return false;
  }

  /* ---------- laço ---------- */
  let last = pf.now();
  function tick(now: number) {
    const dt = Math.min(.05, Math.max(0, (now - last) / 1000)); last = now; clock += dt;
    try {
      if (!paused) update(dt);
      pf.audio.music(ui.show.race || ui.show.pause ? null : ui.show.garage ? 'garage' : 'menu');
    } catch (e) { console.error(e); }
  }
  startDemo();
  /* abriu por um convite: ?sala=1234 */
  try { const m = /sala=(\d{4})/.exec(pf.query || ''); if (m) { NET.input = m[1]; setTimeout(() => { only('online'); joinRoom(m[1]); }, 600); } } catch (e) { }

  const game = {
    ui,
    subscribe(f: () => void) { subs.add(f); return () => { subs.delete(f); }; },
    setLayout, tick, draw,
    input: { keyDown, keyUp, ptrDown, ptrMove, ptrUp },
    info: { menu: menuInfo, champ: champInfo, garage: garageInfo, online: onlineInfo, room: roomInfo, res: resInfo, isTouch: () => isTouch },
    act,
  };
  (game as any).__dbg = { get speed() { return speed; }, get passed() { return passed; }, get pos() { return position; }, get x() { return playerX; }, set x(v: number) { playerX = v; }, get time() { return timeLeft; }, set time(v: number) { timeLeft = v; }, get cars() { return cars; }, save, startRace, get state() { return state; }, keys, NET, set bot(v: boolean) { dbgBot = v; }, get target() { return target; } };
  return game;
}
