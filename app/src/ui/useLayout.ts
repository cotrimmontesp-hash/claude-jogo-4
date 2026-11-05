/* Tamanho da tela no celular (sempre deitado) e áreas seguras (entalhe da câmera). */
import { useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export function useLayout() {
  const d = useWindowDimensions();
  const i = useSafeAreaInsets();
  const W = Math.max(d.width, d.height), H = Math.min(d.width, d.height);
  return { W, H, rot: false, iw: W, ih: H, dpr: 1, ins: { t: i.top, r: i.right, b: i.bottom, l: i.left } };
}
