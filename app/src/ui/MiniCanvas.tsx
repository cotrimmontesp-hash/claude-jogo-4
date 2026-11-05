/* Canvas pequeno das telas (personagem girando, retratos, prévias) — celular, com Skia. */
import React, { useEffect, useRef, useState } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { Canvas, Picture } from '@shopify/react-native-skia';
import { SkCtx, record } from '../platform/skctx';
import type { Ctx2D } from '../engine/types';

export interface MiniProps {
  /** tamanho do desenho (coordenadas usadas pelo jogo) */
  w: number; h: number;
  /** tamanho na tela */
  width: number; height?: number;
  draw: (g: Ctx2D) => void;
  animate?: boolean;
  style?: StyleProp<ViewStyle>;
  onDown?: (x: number, y: number) => void; onMove?: (x: number, y: number) => void; onUp?: () => void; onCancel?: () => void;
}

export function MiniCanvas(p: MiniProps) {
  const height = p.height != null ? p.height : p.width * p.h / p.w;
  const [pic, setPic] = useState<any>(null);
  const drawRef = useRef(p.draw); drawRef.current = p.draw;
  useEffect(() => {
    let alive = true, raf = 0;
    const ctx = new SkCtx(null);
    const base = [p.width / p.w, 0, 0, height / p.h, 0, 0];
    const frame = () => {
      if (!alive) return;
      setPic(record(p.width, height, ctx, base, g => drawRef.current(g)));
      if (p.animate !== false) raf = requestAnimationFrame(frame);
    };
    frame();
    return () => { alive = false; cancelAnimationFrame(raf); };
  }, [p.w, p.h, p.width, height, p.animate]);
  const touch = !!(p.onDown || p.onMove);
  return (
    <View style={[{ width: p.width, height }, p.style]}
      onTouchStart={touch ? (e) => { const t = e.nativeEvent; p.onDown && p.onDown(t.pageX, t.pageY); } : undefined}
      onTouchMove={touch ? (e) => { const t = e.nativeEvent; p.onMove && p.onMove(t.pageX, t.pageY); } : undefined}
      onTouchEnd={touch ? () => { p.onUp && p.onUp(); } : undefined}
      onTouchCancel={touch ? () => { p.onCancel && p.onCancel(); } : undefined}>
      <Canvas style={{ width: p.width, height }} pointerEvents="none">
        {pic ? <Picture picture={pic} /> : null}
      </Canvas>
    </View>
  );
}
