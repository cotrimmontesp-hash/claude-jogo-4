/* A tela do jogo no celular: o motor desenha cada quadro num SkPicture do Skia. */
import React, { useEffect } from 'react';
import { useSharedValue } from 'react-native-reanimated';
import { StyleSheet, View } from 'react-native';
import { Canvas, Picture } from '@shopify/react-native-skia';
import { SkCtx, emptyPicture, record } from '../platform/skctx';

/* mostra o tempo de cada quadro no canto (só para testes) */
export const SHOW_PERF = true;
const perf = { n: 0, js: 0, t0: 0, fps: 0, ms: 0 };
import type { Game } from '../engine/game';

export function GameCanvas({ game, W, H }: { game: Game; W: number; H: number; rot?: boolean }) {
  /* o quadro vai direto para o Skia (sem redesenhar o React a cada quadro) */
  const pic = useSharedValue<any>(emptyPicture());
  useEffect(() => {
    let alive = true, raf = 0;
    const ctx = new SkCtx(null);
    const frame = () => {
      if (!alive) return;
      const t0 = performance.now();
      game.tick(t0);
      pic.value = record(W, H, ctx, [1, 0, 0, 1, 0, 0], g => {
        game.draw(g);
        if (SHOW_PERF) {
          perf.n++; perf.js += performance.now() - t0;
          if (t0 - perf.t0 > 1000) { perf.fps = Math.round(perf.n * 1000 / (t0 - perf.t0)); perf.ms = Math.round(perf.js / perf.n * 10) / 10; perf.n = 0; perf.js = 0; perf.t0 = t0; }
          g.setTransform(1, 0, 0, 1, 0, 0); g.font = '14px Nunito'; g.textAlign = 'left'; g.textBaseline = 'top'; g.fillStyle = '#000'; g.fillRect(0, H - 22, 150, 22); g.fillStyle = '#0f0'; g.fillText(perf.fps + ' fps  ' + perf.ms + ' ms', 6, H - 19);
        }
      });
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => { alive = false; cancelAnimationFrame(raf); };
  }, [game, W, H]);
  const each = (e: any, f: (t: any) => void) => { const L = e.nativeEvent.changedTouches || [e.nativeEvent]; for (let i = 0; i < L.length; i++) f(L[i]); };
  return (
    <View style={StyleSheet.absoluteFill}
      onTouchStart={e => each(e, t => game.input.ptrDown({ id: t.identifier, x: t.pageX, y: t.pageY, type: 'touch' }))}
      onTouchMove={e => each(e, t => game.input.ptrMove({ id: t.identifier, x: t.pageX, y: t.pageY, type: 'touch' }))}
      onTouchEnd={e => each(e, t => game.input.ptrUp({ id: t.identifier, x: t.pageX, y: t.pageY, type: 'touch' }))}
      onTouchCancel={e => each(e, t => game.input.ptrUp({ id: t.identifier, x: t.pageX, y: t.pageY, type: 'touch' }, true))}>
      <Canvas style={{ width: W, height: H }} pointerEvents="none">
        <Picture picture={pic} />
      </Canvas>
    </View>
  );
}
