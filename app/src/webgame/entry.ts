/* Tela do jogo dentro do app (celular): o motor roda aqui, numa WebView, desenhando
   num canvas do navegador do Android/iPhone (rápido). As telas são do React Native
   e conversam com este lado por mensagens. */
import { createGame } from '../engine/game';
import { makePlatform, wakeAudio, sleepAudio, SKEY } from '../platform/make.web';

const W: any = window;
const post = (o: any) => { try { W.ReactNativeWebView.postMessage(JSON.stringify(o)); } catch (e) { } };
const init = W.__TURBO_INIT || {};

let shareN = 0; const shareWait: { [k: number]: (r: any) => void } = {};
const base = makePlatform();
const pf: any = {
  ...base, isTouch: true, query: '',
  storage: {
    load: () => { if (init.save) return init.save; try { return localStorage.getItem(SKEY); } catch (e) { return null; } },
    save: (s: string) => { try { localStorage.setItem(SKEY, s); } catch (e) { } post({ t: 'save', s }); },
  },
  share: (text: string) => new Promise<any>(res => {
    const id = ++shareN; shareWait[id] = res; post({ t: 'share', id, text });
    setTimeout(() => { if (shareWait[id]) { delete shareWait[id]; res('fail'); } }, 60000);
  }),
};

function start() {
  const g: any = createGame(pf);
  const cv = document.createElement('canvas');
  document.body.appendChild(cv);
  let ins = init.ins || { t: 0, r: 0, b: 0, l: 0 };
  const layout = () => {
    const w = innerWidth, h = innerHeight, dpr = Math.min(2, devicePixelRatio || 1);
    cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); cv.style.width = w + 'px'; cv.style.height = h + 'px';
    g.setLayout(w, h, dpr, ins);
  };
  addEventListener('resize', layout); layout();
  const ctx = cv.getContext('2d')!;
  const E = (ev: any) => ({ id: ev.pointerId, x: ev.clientX, y: ev.clientY, type: ev.pointerType === 'mouse' ? 'mouse' : 'touch', button: ev.button });
  cv.addEventListener('pointerdown', (ev: any) => { wakeAudio(); if (g.input.ptrDown(E(ev))) { try { cv.setPointerCapture(ev.pointerId); } catch (e) { } } });
  cv.addEventListener('pointermove', (ev: any) => g.input.ptrMove(E(ev)));
  cv.addEventListener('pointerup', (ev: any) => g.input.ptrUp(E(ev)));
  cv.addEventListener('pointercancel', (ev: any) => g.input.ptrUp(E(ev)));
  cv.addEventListener('contextmenu', (ev) => ev.preventDefault());
  /* estado das telas para o React Native (só quando muda) */
  let last = '';
  const send = () => {
    const S = g.ui.show;
    const info: any = { menu: g.info.menu(), room: g.info.room() };
    if (S.champ) info.champ = g.info.champ();
    if (S.garage) info.garage = g.info.garage();
    if (S.online) info.online = g.info.online();
    if (S.res) info.res = g.info.res();
    const msg = JSON.stringify({ t: 'snap', ui: { show: S, toast: g.ui.toast }, info });
    if (msg !== last) { last = msg; post(JSON.parse(msg)); }
  };
  g.subscribe(send);
  const onMsg = (ev: any) => {
    let m: any; try { m = typeof ev.data === 'string' ? JSON.parse(ev.data) : ev.data; } catch (e) { return; }
    if (!m) return;
    if (m.t === 'act') { wakeAudio(); const f = g.act[m.k]; if (typeof f === 'function') f(...(m.a || [])); }
    else if (m.t === 'layout') { ins = m.ins || ins; layout(); }
    else if (m.t === 'shareRes') { const f = shareWait[m.id]; if (f) { delete shareWait[m.id]; f(m.r); } }
    else if (m.t === 'hide') { g.act.onHide(); sleepAudio(); }
    else if (m.t === 'show') { wakeAudio(); }
  };
  W.addEventListener('message', onMsg); document.addEventListener('message', onMsg as any);
  const frame = (now: number) => { g.tick(now); g.draw(ctx); requestAnimationFrame(frame); };
  requestAnimationFrame(frame);
  send();
  post({ t: 'ready' });
}
start();
