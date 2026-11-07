/* Peças das telas no estilo pixelado: texto com a fonte Press Start 2P, botões
   quadrados com sombra dura, painéis com borda grossa. */
import React, { createContext, useContext, useRef, useState, useSyncExternalStore } from 'react';
import { Image, Platform, Pressable, StyleSheet, Text, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import type { Game } from '../engine/game';

export const C = {
  bg: '#0b0b1e', panel: '#16163a', panel2: '#22224e', line: '#000000', gold: '#f8c818', orange: '#f87818', red: '#e4202c', green: '#18b048',
  blue: '#2a6cf0', cyan: '#18c8d8', white: '#f8f8f8', gray: '#8c8cb0', dim: '#5c5c84', pink: '#f058a8',
};
/* no celular a fonte vai embutida no app (nome = nome do arquivo); na web vem do expo-font */
export const PIX = Platform.OS === 'web' ? 'PressStart2P' : 'PressStart2P_400Regular';

export interface Lay { W: number; H: number; ins: { t: number; r: number; b: number; l: number }; narrow: boolean; short: boolean }
export const GameCtx = createContext<Game>(null as any);
export const LayCtx = createContext<Lay>({ W: 800, H: 400, ins: { t: 0, r: 0, b: 0, l: 0 }, narrow: false, short: true });
export const useGame = () => useContext(GameCtx);
export const useLay = () => useContext(LayCtx);

/** lê um pedaço do estado do jogo e só redesenha quando ele muda */
export function useInfo<T>(get: () => T): T {
  const game = useGame();
  const getRef = useRef(get); getRef.current = get;
  const cache = useRef<{ s: string; val: T } | null>(null);
  const snap = () => {
    const val = getRef.current(); const s = JSON.stringify(val);
    if (!cache.current || cache.current.s !== s) cache.current = { s, val };
    return cache.current.s;
  };
  useSyncExternalStore(game.subscribe, snap, snap);
  return cache.current!.val;
}

/** texto pixelado com sombra dura embaixo */
export function T({ children, size = 10, color = C.white, shadow = true, style, lines, center }: { children: any; size?: number; color?: string; shadow?: boolean | string; style?: StyleProp<TextStyle>; lines?: number; center?: boolean }) {
  const base: TextStyle = { fontFamily: PIX, fontSize: size, lineHeight: Math.round(size * 1.5), color, textAlign: center ? 'center' : 'left' };
  if (!shadow) return <Text numberOfLines={lines} style={[base, style]}>{children}</Text>;
  const d = Math.max(1, Math.round(size / 8));
  return (
    <View>
      <Text numberOfLines={lines} aria-hidden style={[base, style, { color: typeof shadow === 'string' ? shadow : '#000', position: 'absolute', left: d, top: d, right: -d }]}>{children}</Text>
      <Text numberOfLines={lines} style={[base, style]}>{children}</Text>
    </View>
  );
}

/* ---------- botão ---------- */
export function Btn({ label, onPress, color = C.gold, text = '#000', size = 11, disabled, style, padH = 14, padV = 10, sound = 'click', sub, children, a11y }: {
  label?: string; onPress?: () => void; color?: string; text?: string; size?: number; disabled?: boolean; style?: StyleProp<ViewStyle>;
  padH?: number; padV?: number; sound?: string | null; sub?: string; children?: any; a11y?: string;
}) {
  const game = useGame();
  const [down, setDown] = useState(false);
  const bg = disabled ? C.dim : color;
  return (
    <View style={[{ marginRight: 4, marginBottom: 4 }, style]}>
      <View style={[StyleSheet.absoluteFill, { backgroundColor: '#000', left: 4, top: 4, right: -4, bottom: -4 }]} />
      <Pressable accessibilityRole="button" accessibilityLabel={a11y || label} disabled={disabled}
        onPressIn={() => setDown(true)} onPressOut={() => setDown(false)}
        onPress={() => { if (sound) game.act.btnSound(sound); onPress && onPress(); }}
        style={{ backgroundColor: bg, borderWidth: 3, borderColor: '#000', paddingHorizontal: padH, paddingVertical: padV, alignItems: 'center', justifyContent: 'center', transform: [{ translateX: down ? 3 : 0 }, { translateY: down ? 3 : 0 }] }}>
        <View style={[StyleSheet.absoluteFill, { borderTopWidth: 2, borderLeftWidth: 2, borderColor: 'rgba(255,255,255,.35)' }]} pointerEvents="none" />
        {children || <>
          <T size={size} color={text} shadow={false} center>{label}</T>
          {sub ? <T size={Math.max(6, size - 4)} color={text} shadow={false} center style={{ marginTop: 4, opacity: .75 }}>{sub}</T> : null}
        </>}
      </Pressable>
    </View>
  );
}

/** painel com borda grossa */
export function Panel({ children, style, color = C.panel }: { children: any; style?: StyleProp<ViewStyle>; color?: string }) {
  return (
    <View style={[{ backgroundColor: color, borderWidth: 3, borderColor: '#000', padding: 10 }, style]}>
      <View style={[StyleSheet.absoluteFill, { borderWidth: 2, borderColor: 'rgba(255,255,255,.12)' }]} pointerEvents="none" />
      {children}
    </View>
  );
}

/** moedas */
export function Coins({ n }: { n: number }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#000', borderWidth: 2, borderColor: C.gold, paddingHorizontal: 8, paddingVertical: 5, gap: 6 }}>
      <View style={{ width: 12, height: 12, backgroundColor: C.gold, borderWidth: 2, borderColor: '#a87808' }} />
      <T size={10} color={C.gold}>{String(n)}</T>
    </View>
  );
}

/** estrelas ★ desenhadas com quadradinhos */
export function Stars({ n, of = 3, size = 10 }: { n: number; of?: number; size?: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 3 }}>
      {Array.from({ length: of }, (_, i) => <T key={i} size={size} color={i < n ? C.gold : '#44446c'} shadow={i < n}>★</T>)}
    </View>
  );
}

/** imagem pixelada (sem borrar na web) */
export function Pix({ uri, w, h, style }: { uri: string; w: number; h: number; style?: any }) {
  if (!uri) return <View style={{ width: w, height: h }} />;
  return <Image source={{ uri }} style={[{ width: w, height: h }, Platform.OS === 'web' ? ({ imageRendering: 'pixelated' } as any) : null, style]} resizeMode="contain" />;
}

/** camada escura por cima do jogo */
export function Ov({ children, dim = .55, center = true, style }: { children: any; dim?: number; center?: boolean; style?: StyleProp<ViewStyle> }) {
  const lay = useLay();
  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: `rgba(6,6,20,${dim})` }]}>
      <View style={[StyleSheet.absoluteFill, center && { alignItems: 'center', justifyContent: 'center' },
        { paddingTop: 10 + lay.ins.t, paddingBottom: 10 + lay.ins.b, paddingLeft: 14 + lay.ins.l, paddingRight: 14 + lay.ins.r }, style]}>
        {children}
      </View>
    </View>
  );
}
