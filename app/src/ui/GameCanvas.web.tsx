/* A tela do jogo na web: canvas do navegador, mouse, teclado e toques. */
import React, { useEffect, useRef } from 'react';
import type { Game } from '../engine/game';

export function GameCanvas({ game, W, H, rot }: { game: Game; W: number; H: number; rot?: boolean }) {
  const ref = useRef<any>(null);
  const rotRef = useRef(!!rot); rotRef.current = !!rot;
  useEffect(() => {
    const cv = ref.current; if (!cv) return;
    const DPR = Math.min(2, window.devicePixelRatio || 1);
    cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
    const g = cv.getContext('2d');
    let alive = true, raf = 0;
    const frame = (now: number) => { if (!alive) return; game.tick(now); game.draw(g); raf = requestAnimationFrame(frame); };
    raf = requestAnimationFrame(frame);
    return () => { alive = false; cancelAnimationFrame(raf); };
  }, [game, W, H]);
  useEffect(() => {
    const cv = ref.current; if (!cv) return;
    const L = (ev: any) => rotRef.current ? { x: ev.clientY, y: window.innerWidth - ev.clientX } : { x: ev.clientX, y: ev.clientY };
    const E = (ev: any) => { const p = L(ev); return { id: ev.pointerId, x: p.x, y: p.y, type: ev.pointerType === 'mouse' ? 'mouse' : 'touch', button: ev.button } as any; };
    const down = (ev: any) => { if (game.input.ptrDown(E(ev))) { try { cv.setPointerCapture(ev.pointerId); } catch (e) { } } };
    const move = (ev: any) => game.input.ptrMove(E(ev));
    const up = (ev: any) => game.input.ptrUp(E(ev), ev.type === 'pointercancel');
    const ctxm = (ev: any) => ev.preventDefault();
    cv.addEventListener('pointerdown', down); cv.addEventListener('pointermove', move);
    cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up); cv.addEventListener('contextmenu', ctxm);
    const kd = (ev: any) => { if (ev.target && ev.target.tagName === 'INPUT') return; if (game.input.keyDown(ev.code)) ev.preventDefault(); };
    const ku = (ev: any) => game.input.keyUp(ev.code);
    window.addEventListener('keydown', kd); window.addEventListener('keyup', ku);
    const vis = () => { if (document.hidden) game.act.onHide(); };
    const hide = () => game.act.persist();
    document.addEventListener('visibilitychange', vis); window.addEventListener('pagehide', hide);
    /* no celular, tela cheia e deitada no primeiro toque */
    let fsTried = false;
    const fs = () => {
      const touch = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
      if (fsTried || !touch) return; fsTried = true;
      try {
        const TW: any = window.top, d = TW.document.documentElement;
        const lock = () => { try { const o = TW.screen.orientation; if (o && o.lock) o.lock('landscape').catch(() => { }); } catch (e) { } };
        if (!TW.document.fullscreenElement && d.requestFullscreen) d.requestFullscreen({ navigationUI: 'hide' }).then(lock, lock); else lock();
      } catch (e) { }
    };
    document.addEventListener('pointerdown', fs, true);
    return () => {
      cv.removeEventListener('pointerdown', down); cv.removeEventListener('pointermove', move);
      cv.removeEventListener('pointerup', up); cv.removeEventListener('pointercancel', up); cv.removeEventListener('contextmenu', ctxm);
      window.removeEventListener('keydown', kd); window.removeEventListener('keyup', ku);
      document.removeEventListener('visibilitychange', vis); window.removeEventListener('pagehide', hide);
      document.removeEventListener('pointerdown', fs, true);
    };
  }, [game]);
  return React.createElement('canvas', { ref, style: { position: 'absolute', left: 0, top: 0, width: W, height: H, display: 'block', touchAction: 'none' } });
}
