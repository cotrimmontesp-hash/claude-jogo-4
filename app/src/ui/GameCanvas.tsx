/* A tela do jogo no celular: o motor desenha cada quadro num SkPicture do Skia. */
import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Canvas, Picture } from '@shopify/react-native-skia';
import { SkCtx, record } from '../platform/skctx';
import type { Game } from '../engine/game';

export function GameCanvas({ game, W, H }: { game: Game; W: number; H: number; rot?: boolean }) {
  const [pic, setPic] = useState<any>(null);
  useEffect(() => {
    let alive = true, raf = 0;
    const ctx = new SkCtx(null);
    const frame = () => {
      if (!alive) return;
      game.tick(performance.now());
      setPic(record(W, H, ctx, [1, 0, 0, 1, 0, 0], g => game.draw(g)));
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
        {pic ? <Picture picture={pic} /> : null}
      </Canvas>
    </View>
  );
}
