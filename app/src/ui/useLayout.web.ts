/* Tamanho da tela na web. No celular em pé, o jogo inteiro gira 90° (fica deitado),
   igual ao jogo antigo. As áreas seguras vêm do env(safe-area-inset-*) do CSS. */
import { useEffect, useState } from 'react';

let probe: HTMLDivElement | null = null;
function insets() {
  if (!probe) {
    probe = document.createElement('div');
    probe.style.cssText = 'position:fixed;left:0;top:0;padding:env(safe-area-inset-top,0px) env(safe-area-inset-right,0px) env(safe-area-inset-bottom,0px) env(safe-area-inset-left,0px);visibility:hidden;pointer-events:none';
    document.body.appendChild(probe);
  }
  const s = getComputedStyle(probe);
  return { t: parseFloat(s.paddingTop) || 0, r: parseFloat(s.paddingRight) || 0, b: parseFloat(s.paddingBottom) || 0, l: parseFloat(s.paddingLeft) || 0 };
}
function calc() {
  const iw = window.innerWidth, ih = window.innerHeight;
  const touch = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
  const si = insets();
  const rot = touch && ih > iw;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  if (rot) return { W: ih, H: iw, rot, iw, ih, dpr, ins: { l: si.t, r: si.b, t: si.r, b: si.l } };
  return { W: iw, H: ih, rot, iw, ih, dpr, ins: si };
}
export function useLayout() {
  const [L, setL] = useState(calc);
  useEffect(() => {
    const f = () => setL(calc());
    window.addEventListener('resize', f);
    window.addEventListener('orientationchange', f);
    return () => { window.removeEventListener('resize', f); window.removeEventListener('orientationchange', f); };
  }, []);
  return L;
}

export function onRootLayout(_w: number, _h: number) { }
