/* Fontes do desenho no celular: o Skia precisa carregar os arquivos .ttf. */
import { useEffect } from 'react';
import { useFonts } from '@shopify/react-native-skia';
import { setTypefaces } from '../platform/skctx';

export function useCanvasFonts(): boolean {
  const mgr = useFonts({
    'Lilita One': [require('@expo-google-fonts/lilita-one/LilitaOne_400Regular.ttf')],
    Nunito: [require('@expo-google-fonts/nunito/Nunito_800ExtraBold.ttf')],
  });
  useEffect(() => {
    if (!mgr) return;
    let d: any = null, b: any = null;
    try { d = mgr.matchFamilyStyle('Lilita One', { weight: 400 } as any); } catch (e) { }
    try { b = mgr.matchFamilyStyle('Nunito', { weight: 800 } as any); } catch (e) { }
    setTypefaces(d, b);
  }, [mgr]);
  return !!mgr;
}
