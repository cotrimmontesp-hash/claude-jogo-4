/* Tamanho da tela no celular (sempre deitado) e áreas seguras (entalhe da câmera).
   O tamanho vem do onLayout da raiz, que pega a tela inteira (com a barra do Android escondida). */
import { useState } from 'react';
import { useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

let setRootSize: ((w: number, h: number) => void) | null = null;
/** chamado pelo onLayout da raiz */
export function onRootLayout(w: number, h: number) { if (setRootSize) setRootSize(w, h); }

export function useLayout() {
  const d = useWindowDimensions();
  const i = useSafeAreaInsets();
  const [root, setRoot] = useState<{ w: number; h: number } | null>(null);
  setRootSize = (w, h) => { if (!root || Math.abs(root.w - w) > .5 || Math.abs(root.h - h) > .5) setRoot({ w, h }); };
  const w0 = root ? root.w : d.width, h0 = root ? root.h : d.height;
  const W = Math.max(w0, h0), H = Math.min(w0, h0);
  return { W, H, rot: false, iw: W, ih: H, dpr: 1, ins: { t: i.top, r: i.right, b: i.bottom, l: i.left } };
}
