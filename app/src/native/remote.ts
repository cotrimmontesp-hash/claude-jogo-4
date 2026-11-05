/* No celular, o motor roda na WebView da tela do jogo (src/webgame).
   Este "jogo remoto" tem a mesma cara do motor para as telas em React Native:
   guarda o último estado que a WebView mandou e repassa os botões para ela. */
import { AppState, Share } from 'react-native';
import { paintMenuScene, paintMenuBg, paintSkin, paintPortrait, paintHeroCard, paintWeapon, dressCh } from '../engine/draw';
import { CH } from '../engine/data';
import type { Game } from '../engine/game';
import { getSaved, storeSave } from '../platform/make';

export function createRemoteGame(): Game {
  const subs = new Set<() => void>();
  const ui: any = {
    v: 0,
    show: { shop: false, missions: false, menu: true, lobby: false, mapUI: false, dlg: false, res: false, pause: false, friends: false, heroes: false, skin: false, waitUI: false, arsenal: false, pauseBtn: false, inviteCard: false },
    toast: null, dlg: { name: '', text: '', title: null }, res: { title: '', sub: '', l1: '', l2: '', lose: false }, pause: { tip: '', quit: 'Sair' }, invite: { txt: '' },
  };
  let info: any = {
    menu: { lvl: 1, name: 'Jogador', xp: 0, xpT: '', arms: 'Armas', wins: 0, kills: 0, gears: 0, wave: 0, hero: CH[0].full, role: CH[0].role, friends: false, friendsLabel: 'Amigos', sfx: true, mus: true, hint: '' },
    mini: { ch: CH[0], sel: 0, spk: 'tita' }, state: 'menu',
  };
  let lay: any = { W: 800, H: 400, INS: { t: 0, r: 0, b: 0, l: 0 } };
  let sendRaw: ((o: any) => void) | null = null;
  const queue: any[] = [];
  let ready = false;
  const post = (o: any) => { if (ready && sendRaw) sendRaw(o); else queue.push(o); };
  const emit = () => { ui.v++; subs.forEach(f => { try { f(); } catch (e) { } }); };
  const t0 = performance.now(), clk = () => (performance.now() - t0) / 1000;

  /* personagem girando no início: tudo aqui mesmo, sem esperar a WebView */
  const HOME: any = { face: .35, drag: null, hop: 0, vel: 0 };

  const cleanFid = (v: any) => String(v || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
  const optimistic: { [k: string]: (...a: any[]) => void } = {
    lobbyName: (v: string) => { if (info.lobby) info.lobby.name = String(v).slice(0, 12); },
    lobbyCode: (v: string) => { if (info.lobby) info.lobby.code = String(v).slice(0, 4); },
    setFidIn: (v: string) => { if (info.friends) info.friends.input = cleanFid(v); },
  };
  const back = () => {
    const S = ui.show;
    if (S.inviteCard || S.pause || S.res || S.arsenal || S.heroes || S.friends || S.skin || S.lobby || S.shop || S.missions || S.dlg || S.waitUI || S.mapUI || info.state === 'play') { post({ t: 'act', k: 'back', a: [] }); return true; }
    return false;
  };
  const act: any = new Proxy({}, {
    get: (_t, k: string) => {
      if (k === 'back') return back;
      return (...a: any[]) => { const o = optimistic[k]; if (o) { o(...a); emit(); } post({ t: 'act', k, a }); };
    },
  });
  AppState.addEventListener('change', st => { post({ t: st === 'active' ? 'show' : 'hide' }); });

  const game: any = {
    ui,
    subscribe(f: () => void) { subs.add(f); return () => { subs.delete(f); }; },
    setLayout(W: number, H: number, _dpr: number, ins: any) { lay = { W, H, INS: ins }; post({ t: 'layout', ins }); },
    tick() { }, draw() { },
    input: {
      keyDown: () => false, keyUp() { }, ptrDown: () => false, ptrMove() { }, ptrUp() { },
      homeDown(x: number, y: number) { HOME.drag = { x, y, f: HOME.face, t: clk() }; },
      homeMove(x: number, _y: number) { if (!HOME.drag) return; const nf = HOME.drag.f + (x - HOME.drag.x) * .02; HOME.vel = nf - HOME.face; HOME.face = nf; },
      homeUp() { if (HOME.drag && clk() - HOME.drag.t < .25 && Math.abs(HOME.face - HOME.drag.f) < .05) HOME.hop = .5; HOME.drag = null; },
      homeCancel() { HOME.drag = null; },
    },
    paint: {
      weapon: (g: any, id: string, wi: number, lock: boolean) => paintWeapon(g, id, wi, lock),
      outfit: (g: any, id: string, sk: string) => paintSkin(g, clk(), dressCh(id, sk)),
      menuScene: (g: any) => paintMenuScene(g, HOME, clk(), info.mini.ch),
      menuBg: (g: any, w: number, h: number) => paintMenuBg(g, w, h),
      skin: (g: any) => paintSkin(g, clk(), info.mini.ch),
      portrait: (g: any) => paintPortrait(g, info.mini.spk, clk(), info.mini.ch),
      heroCard: (g: any, i: number) => paintHeroCard(g, i, info.mini.sel, clk()),
    },
    info: {
      menu: () => info.menu, skin: () => info.skin, wait: () => info.wait, arsenal: () => info.arsenal, friends: () => info.friends,
      heroes: () => info.heroes, lobby: () => info.lobby, map: () => info.map, shop: () => info.shop, missions: () => info.missions, mini: () => info.mini, state: () => info.state,
      layout: () => ({ W: lay.W, H: lay.H, INS: lay.INS, ROT: false, narrow: lay.W < 700, xnarrow: lay.W < 520, short: lay.H < 460 }),
      isTouch: () => true,
    },
    act,
    /* ligação com a WebView (usado pela tela do jogo) */
    __init: () => ({ save: getSaved(), ins: lay.INS }),
    __attach(fn: (o: any) => void) { sendRaw = fn; },
    __onMessage(data: string) {
      let m: any; try { m = JSON.parse(data); } catch (e) { return; }
      if (m.t === 'ready') { ready = true; const q = queue.splice(0); for (const o of q) sendRaw && sendRaw(o); }
      else if (m.t === 'snap') {
        const u = m.ui || {};
        Object.assign(ui, { show: u.show || ui.show, toast: u.toast || null, dlg: u.dlg || ui.dlg, res: u.res || ui.res, pause: u.pause || ui.pause, invite: u.invite || ui.invite });
        info = { ...info, ...(m.info || {}) };
        emit();
      }
      else if (m.t === 'save') storeSave(String(m.s || ''));
      else if (m.t === 'share') {
        Share.share({ message: String(m.text || '') }).then(() => post({ t: 'shareRes', id: m.id, r: 'shared' }), () => post({ t: 'shareRes', id: m.id, r: 'fail' }));
      }
    },
  };
  return game as Game;
}
