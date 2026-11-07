/* No celular o motor roda na WebView da tela do jogo (src/webgame).
   Este "jogo remoto" tem a mesma cara do motor para as telas em React Native:
   guarda o último estado que a WebView mandou e repassa os botões para ela. */
import { AppState, Share } from 'react-native';
import type { Game } from '../engine/game';
import { getSaved, storeSave } from '../platform/make';

export function createRemoteGame(): Game {
  const subs = new Set<() => void>();
  const ui: any = { v: 0, show: { menu: true, champ: false, garage: false, online: false, room: false, pause: false, res: false, race: false }, toast: null };
  let info: any = {
    menu: { coins: 0, car: '', img: '', stars: 0, maxStars: 36, bestDay: 0, bestKm: 0, name: '', sfx: true, mus: true, auto: true, touch: true },
    champ: { coins: 0, stars: 0, cups: [] }, garage: null, online: { name: '', status: '', busy: false, input: '' }, room: { code: '', host: false, players: [], max: 4 }, res: { title: '', lines: [] },
  };
  let sendRaw: ((o: any) => void) | null = null;
  const queue: any[] = [];
  let ready = false;
  const post = (o: any) => { if (ready && sendRaw) sendRaw(o); else queue.push(o); };
  const emit = () => { ui.v++; subs.forEach(f => { try { f(); } catch (e) { } }); };
  /* respostas imediatas (o campo de texto não pode esperar a volta da WebView) */
  const optimistic: { [k: string]: (...a: any[]) => void } = {
    setCodeIn: (v: string) => { info.online = { ...info.online, input: String(v || '').replace(/\D/g, '').slice(0, 4) }; },
  };
  const back = () => {
    const S = ui.show;
    if (S.race || S.pause || S.res || S.room || S.champ || S.garage || S.online) { post({ t: 'act', k: 'back', a: [] }); return true; }
    return false;
  };
  const act: any = new Proxy({}, {
    get: (_t, k: string) => {
      if (k === 'back') return back;
      return (...a: any[]) => { const o = optimistic[k]; if (o) { o(...a); emit(); } post({ t: 'act', k, a }); };
    },
  });
  AppState.addEventListener('change', st => { post({ t: st === 'active' ? 'show' : 'hide' }); });
  let lay: any = { ins: { t: 0, r: 0, b: 0, l: 0 } };
  const game: any = {
    ui,
    subscribe(f: () => void) { subs.add(f); return () => { subs.delete(f); }; },
    setLayout(_W: number, _H: number, _dpr: number, ins: any) { lay = { ins }; post({ t: 'layout', ins }); },
    tick() { }, draw() { },
    input: { keyDown: () => false, keyUp() { }, ptrDown: () => false, ptrMove() { }, ptrUp() { } },
    info: {
      menu: () => info.menu, champ: () => info.champ, garage: () => info.garage || { coins: 0, sel: 0, n: 5, name: '', desc: '', price: 0, owned: true, using: true, img: '', stats: [], upg: [], colors: [], colorPrice: 0, thumbs: [] },
      online: () => info.online, room: () => info.room, res: () => info.res, isTouch: () => true,
    },
    act,
    /* ligação com a WebView (usado pela tela do jogo) */
    __init: () => ({ save: getSaved(), ins: lay.ins }),
    __attach(fn: (o: any) => void) { sendRaw = fn; },
    __onMessage(data: string) {
      let m: any; try { m = JSON.parse(data); } catch (e) { return; }
      if (m.t === 'ready') { ready = true; const q = queue.splice(0); for (const o of q) sendRaw && sendRaw(o); }
      else if (m.t === 'snap') {
        const u = m.ui || {};
        ui.show = u.show || ui.show; ui.toast = u.toast || null;
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
