/* Tela do jogo dentro do app (celular): o motor em TypeScript roda aqui, numa
   WebView, desenhando num canvas do navegador do Android (rápido, com aceleração).
   As telas (menus) são do React Native e conversam com este lado por mensagens. */
import { createGame } from '../engine/game';
import { makePlatform, wakeAudio, sleepAudio } from '../platform/make.web';

const SHOW_PERF = false;
const W: any = window;
const post = (o: any) => { try { W.ReactNativeWebView.postMessage(JSON.stringify(o)); } catch (e) { } };
const init = W.__TITA_INIT || {};
const SKEY = 'tita-coral-v2';

let shareN = 0; const shareWait: { [k: number]: (r: any) => void } = {};
const base = makePlatform();
const pf = {
  ...base, isTouch: true, query: '',
  storage: {
    load: () => { if (init.save) return init.save; try { return localStorage.getItem(SKEY) || localStorage.getItem('tita-coral-v1'); } catch (e) { return null; } },
    save: (s: string) => { try { localStorage.setItem(SKEY, s); } catch (e) { } post({ t: 'save', s }); },
  },
  share: (text: string) => new Promise<any>(res => {
    const id = ++shareN; shareWait[id] = res; post({ t: 'share', id, text });
    setTimeout(() => { if (shareWait[id]) { delete shareWait[id]; res('fail'); } }, 60000);
  }),
};

async function start() {
  try { await Promise.all([(document as any).fonts.load('20px "Lilita One"'), (document as any).fonts.load('14px Nunito')]); } catch (e) { }
  const g: any = createGame(pf as any);
  const cv = document.createElement('canvas');
  document.body.appendChild(cv);
  let ins = init.ins || { t: 0, r: 0, b: 0, l: 0 };
  const layout = () => {
    const w = innerWidth, h = innerHeight, dpr = Math.min(2, devicePixelRatio || 1);
    cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); cv.style.width = w + 'px'; cv.style.height = h + 'px';
    g.setLayout(w, h, dpr, ins, false);
  };
  addEventListener('resize', layout); layout();
  const ctx = cv.getContext('2d')!;
  /* toques e mouse */
  const E = (ev: any) => ({ id: ev.pointerId, x: ev.clientX, y: ev.clientY, type: ev.pointerType === 'mouse' ? 'mouse' : 'touch', button: ev.button });
  cv.addEventListener('pointerdown', (ev: any) => { wakeAudio(); if (g.input.ptrDown(E(ev))) { try { cv.setPointerCapture(ev.pointerId); } catch (e) { } } });
  cv.addEventListener('pointermove', (ev: any) => g.input.ptrMove(E(ev)));
  cv.addEventListener('pointerup', (ev: any) => g.input.ptrUp(E(ev)));
  cv.addEventListener('pointercancel', (ev: any) => g.input.ptrUp(E(ev), true));
  cv.addEventListener('contextmenu', (ev) => ev.preventDefault());
  /* estado das telas para o React Native (só quando muda) */
  let last = '';
  const send = () => {
    const S = g.ui.show;
    const info: any = { menu: g.info.menu(), mini: g.info.mini(), state: g.info.state(), modes: g.info.modes() };
    if (S.skin) info.skin = g.info.skin();
    if (S.waitUI) info.wait = g.info.wait();
    if (S.arsenal) info.arsenal = g.info.arsenal();
    if (S.friends) info.friends = g.info.friends();
    if (S.heroes) info.heroes = g.info.heroes();
    if (S.lobby) info.lobby = g.info.lobby();
    if (S.mapUI) info.map = g.info.map();
    if (S.shop) info.shop = g.info.shop();
    if (S.missions) info.missions = g.info.missions();
    const u = g.ui;
    const msg = JSON.stringify({ t: 'snap', ui: { show: S, toast: u.toast, dlg: u.dlg, res: u.res, pause: u.pause, invite: u.invite }, info });
    if (msg !== last) { last = msg; try { W.ReactNativeWebView.postMessage(msg); } catch (e) { } }
  };
  g.subscribe(send);
  /* mensagens do React Native */
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
  /* laço */
  let n = 0, t0 = 0, fps = 0, ms = 0, acc = 0;
  const frame = (now: number) => {
    const a = performance.now();
    g.tick(now); g.draw(ctx);
    if (SHOW_PERF) {
      n++; acc += performance.now() - a;
      if (now - t0 > 1000) { fps = Math.round(n * 1000 / (now - t0)); ms = Math.round(acc / n * 10) / 10; n = 0; acc = 0; t0 = now; }
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = '#000'; ctx.fillRect(0, cv.height - 40, 360, 40); ctx.fillStyle = '#0f0'; ctx.font = '26px monospace'; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'; ctx.globalAlpha = 1; ctx.fillText(fps + ' fps ' + ms + ' ms (webview)', 8, cv.height - 10);
    }
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
  send();
  post({ t: 'ready' });
}
start();
