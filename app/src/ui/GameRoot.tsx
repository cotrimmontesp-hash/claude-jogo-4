/* Junta tudo: a estrada (canvas) por baixo e as telas em React Native por cima. */
import React, { useEffect, useMemo } from 'react';
import { BackHandler, View } from 'react-native';
import type { Game } from '../engine/game';
import { GameCtx, LayCtx } from './kit';
import { GameCanvas } from './GameCanvas';
import { Screens } from './screens';
import { onRootLayout, useLayout } from './useLayout';

export function GameRoot({ game }: { game: Game }) {
  const L = useLayout();
  useEffect(() => { const sub = BackHandler.addEventListener('hardwareBackPress', () => game.act.back()); return () => sub.remove(); }, [game]);
  useEffect(() => { game.setLayout(L.W, L.H, L.dpr, L.ins); }, [game, L.W, L.H, L.dpr, L.ins.t, L.ins.r, L.ins.b, L.ins.l]);
  const lay = useMemo(() => ({ W: L.W, H: L.H, ins: L.ins, narrow: L.W < 700, short: L.H < 430 }), [L.W, L.H, L.ins.t, L.ins.r, L.ins.b, L.ins.l]);
  /* na web, com o celular em pé, gira tudo 90° (o jogo é sempre deitado) */
  const rotStyle: any = L.rot
    ? { position: 'absolute', left: (L.iw - L.W) / 2, top: (L.ih - L.H) / 2, width: L.W, height: L.H, transform: [{ rotate: '90deg' }] }
    : { position: 'absolute', left: 0, top: 0, width: L.W, height: L.H };
  return (
    <GameCtx.Provider value={game}>
      <LayCtx.Provider value={lay}>
        <View style={{ flex: 1, backgroundColor: '#0b0b1e', overflow: 'hidden' }} onLayout={e => onRootLayout(e.nativeEvent.layout.width, e.nativeEvent.layout.height)}>
          <View style={[rotStyle, { overflow: 'hidden' }]}>
            <GameCanvas game={game} W={L.W} H={L.H} rot={L.rot} />
            <Screens />
          </View>
        </View>
      </LayCtx.Provider>
    </GameCtx.Provider>
  );
}
