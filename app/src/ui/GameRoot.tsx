/* Junta tudo: tela do jogo (canvas) + telas em React Native por cima. */
import React, { useEffect, useMemo } from 'react';
import { Platform as RNP, View } from 'react-native';
import type { Game } from '../engine/game';
import { GameCtx, LayCtx } from './kit';
import { GameCanvas } from './GameCanvas';
import { Screens } from './screens';
import { useLayout } from './useLayout';

export function GameRoot({ game }: { game: Game }) {
  const L = useLayout();
  useEffect(() => { game.setLayout(L.W, L.H, L.dpr, L.ins, L.rot); }, [game, L.W, L.H, L.dpr, L.rot, L.ins.t, L.ins.r, L.ins.b, L.ins.l]);
  const lay = useMemo(() => ({ W: L.W, H: L.H, ins: L.ins, narrow: L.W < 700, xnarrow: L.W < 520, short: L.H < 460 }), [L.W, L.H, L.ins.t, L.ins.r, L.ins.b, L.ins.l]);
  /* na web, com o celular em pé, gira tudo 90° em volta do centro */
  const rotStyle: any = L.rot
    ? { position: 'absolute', left: (L.iw - L.W) / 2, top: (L.ih - L.H) / 2, width: L.W, height: L.H, transform: [{ rotate: '90deg' }] }
    : { position: 'absolute', left: 0, top: 0, width: L.W, height: L.H };
  return (
    <GameCtx.Provider value={game}>
      <LayCtx.Provider value={lay}>
        <View style={{ flex: 1, backgroundColor: '#2d1d70', overflow: 'hidden' }}>
          <View style={[rotStyle, { overflow: 'hidden' }]}>
            <GameCanvas game={game} W={L.W} H={L.H} rot={L.rot} />
            <Screens />
          </View>
        </View>
      </LayCtx.Provider>
    </GameCtx.Provider>
  );
}
void RNP;
