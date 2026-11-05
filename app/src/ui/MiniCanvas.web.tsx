/* Canvas pequeno das telas — web, com canvas do navegador. */
import React, { useEffect, useRef } from 'react';
import { View } from 'react-native';
import type { MiniProps } from './MiniCanvas';

export function MiniCanvas(p: MiniProps) {
  const height = p.height != null ? p.height : p.width * p.h / p.w;
  const ref = useRef<any>(null);
  const drawRef = useRef(p.draw); drawRef.current = p.draw;
  useEffect(() => {
    const cv = ref.current; if (!cv) return;
    const g = cv.getContext('2d');
    let alive = true, raf = 0;
    const frame = () => { if (!alive) return; try { drawRef.current(g); } catch (e) { console.error(e); } if (p.animate !== false) raf = requestAnimationFrame(frame); };
    frame();
    return () => { alive = false; cancelAnimationFrame(raf); };
  }, [p.w, p.h, p.animate]);
  const down = (ev: any) => { if (!p.onDown) return; try { ev.currentTarget.setPointerCapture(ev.pointerId); } catch (e) { } p.onDown(ev.clientX, ev.clientY); };
  return (
    <View style={[{ width: p.width, height }, p.style]}>
      {React.createElement('canvas', {
        ref, width: p.w, height: p.h,
        style: { width: p.width, height, display: 'block', touchAction: 'none', cursor: p.onDown ? 'grab' : undefined },
        onPointerDown: down,
        onPointerMove: p.onMove ? (ev: any) => p.onMove!(ev.clientX, ev.clientY) : undefined,
        onPointerUp: p.onUp ? () => p.onUp!() : undefined,
        onPointerCancel: p.onCancel ? () => p.onCancel!() : undefined,
      })}
    </View>
  );
}
