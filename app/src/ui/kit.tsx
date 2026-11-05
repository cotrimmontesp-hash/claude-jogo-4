/* Peças visuais das telas (botão, cartão, texto com contorno), no mesmo
   estilo cartoon do jogo antigo em HTML. */
import React, { createContext, useContext, useRef, useState, useSyncExternalStore } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import type { Game } from '../engine/game';

export const C = {
  ink: '#1d1436', night: '#2d1d70', night2: '#4b2fb3', gold: '#ffcc2e', coral: '#ff5d73', teal: '#22c7c7', paper: '#fff8ea',
  sub: '#6a5aa0', sub2: '#7a6aa8', hint: '#ddd5ff', gray: '#9a90c4',
};
/* no celular as fontes vão embutidas no app (nome = nome do arquivo); na web vêm do expo-font */
export const FONT = Platform.OS === 'web'
  ? { display: 'Lilita One', body: 'Nunito', black: 'Nunito-Black', bold: 'Nunito-Bold' }
  : { display: 'LilitaOne_400Regular', body: 'Nunito_800ExtraBold', black: 'Nunito_900Black', bold: 'Nunito_700Bold' };

/* ---------- jogo e layout disponíveis para todas as telas ---------- */
export interface Lay { W: number; H: number; ins: { t: number; r: number; b: number; l: number }; narrow: boolean; xnarrow: boolean; short: boolean }
export const GameCtx = createContext<Game>(null as any);
export const LayCtx = createContext<Lay>({ W: 800, H: 400, ins: { t: 0, r: 0, b: 0, l: 0 }, narrow: false, xnarrow: false, short: true });
export const useGame = () => useContext(GameCtx);
export const useLay = () => useContext(LayCtx);

/** lê um pedaço do estado do jogo e só redesenha a tela quando ele muda */
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

/* ---------- texto com contorno (o "text-stroke" do CSS) ---------- */
export function OText({ children, style, stroke = 4, ink = C.ink, drop = 0, lines }: { children: any; style?: StyleProp<TextStyle>; stroke?: number; ink?: string; drop?: number; lines?: number }) {
  const d = stroke / 2, k = d * .72;
  const offs = [[d, 0], [-d, 0], [0, d], [0, -d], [k, k], [-k, k], [k, -k], [-k, -k]];
  if (drop) offs.push([0, drop], [d, drop], [-d, drop]);
  return (
    <View style={{ position: 'relative' }}>
      {offs.map(([x, y], i) => (
        <Text key={i} numberOfLines={lines} style={[style, { color: ink, position: 'absolute', left: x, top: y, right: -x }]} aria-hidden>{children}</Text>
      ))}
      <Text numberOfLines={lines} style={style}>{children}</Text>
    </View>
  );
}

/* ---------- botão ---------- */
type Kind = 'gold' | 'alt' | 'red' | 'play';
const BG: { [k: string]: string } = { gold: C.gold, alt: C.teal, red: C.coral, play: '#ffc21a' };
export function Btn({ label, onPress, kind = 'gold', size = 'md', disabled, style, fontSize, start, padH, padV, children, a11y }: {
  label?: string; onPress?: () => void; kind?: Kind; size?: 'sm' | 'md' | 'big'; disabled?: boolean; style?: StyleProp<ViewStyle>;
  fontSize?: number; start?: boolean; padH?: number; padV?: number; children?: any; a11y?: string;
}) {
  const game = useGame();
  const [down, setDown] = useState(false);
  const fs = fontSize || (size === 'sm' ? 17 : size === 'big' ? 28 : 22);
  const sh = size === 'sm' ? 4 : 5;
  const ph = padH != null ? padH : size === 'sm' ? 14 : size === 'big' ? 34 : 24;
  const pv = padV != null ? padV : size === 'sm' ? 6 : size === 'big' ? 10 : 9;
  const bg = disabled ? C.gray : BG[kind];
  return (
    <View style={[{ marginBottom: sh }, style]}>
      <View style={[st.btnShadow, { top: sh, borderRadius: 14 }]} />
      <Pressable
        accessibilityRole="button" accessibilityLabel={a11y || label} disabled={disabled}
        onPressIn={() => setDown(true)} onPressOut={() => setDown(false)}
        onPress={() => { game.act.btnSound(start ? 'start' : 'click'); onPress && onPress(); }}
        style={[st.btn, { backgroundColor: bg, paddingHorizontal: ph, paddingVertical: pv, transform: [{ translateY: down && !disabled ? sh - 1 : 0 }] }]}>
        {children || <OText stroke={size === 'sm' ? 3.5 : 4} style={[st.btnTxt, { fontSize: fs, lineHeight: fs * 1.2 }]}>{label}</OText>}
      </Pressable>
    </View>
  );
}

/* ---------- cartão branco ---------- */
export function Card({ children, style, maxW = 480, scroll = true }: { children: any; style?: StyleProp<ViewStyle>; maxW?: number; scroll?: boolean }) {
  const lay = useLay();
  const maxH = lay.H - 24 - lay.ins.t - lay.ins.b - 8;
  return (
    <View style={{ width: '100%', maxWidth: maxW, maxHeight: maxH }}>
      <View style={[st.cardShadow]} />
      <View style={[st.card, { maxHeight: maxH }]}>
        {scroll ? (
          <ScrollView style={{ flexGrow: 0, flexShrink: 1 }} contentContainerStyle={[st.cardIn, style]} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>{children}</ScrollView>
        ) : <View style={[st.cardIn, style]}>{children}</View>}
      </View>
    </View>
  );
}

export function H3({ children }: { children: any }) { return <OText stroke={5} style={st.h3}>{children}</OText>; }
export function H2({ children, lose }: { children: any; lose?: boolean }) {
  const lay = useLay(); const fs = Math.max(34, Math.min(52, lay.W * .07));
  return <OText stroke={7} drop={5} style={[st.h2, { fontSize: fs, lineHeight: fs * 1.05, color: lose ? C.coral : C.gold }]}>{children}</OText>;
}
export function P({ children, style }: { children: any; style?: StyleProp<TextStyle> }) { return <Text style={[st.p, style]}>{children}</Text>; }
export function Lab({ children, style }: { children: any; style?: StyleProp<TextStyle> }) { return <Text style={[st.lab, style]}>{children}</Text>; }
export function Row({ children, style }: { children: any; style?: StyleProp<ViewStyle> }) { return <View style={[st.row, style]}>{children}</View>; }

/* barra de XP verde */
export function XpBar({ pct, style, dark = true }: { pct: number; style?: StyleProp<ViewStyle>; dark?: boolean }) {
  return (
    <View style={[st.xp, { backgroundColor: dark ? '#2a1b5e' : '#2a1b5e' }, style]}>
      <View style={{ width: Math.max(0, Math.min(100, pct)) + '%' as any, height: '100%', backgroundColor: '#7fe85a' }} />
    </View>
  );
}

/* camada que cobre a tela (.ov) */
export function Ov({ children, dim, bg, z = 5, center = true }: { children: any; dim?: boolean; bg?: any; z?: number; center?: boolean }) {
  const lay = useLay();
  return (
    <View style={[StyleSheet.absoluteFill, { zIndex: z }, dim && { backgroundColor: 'rgba(25,12,60,.55)' }]}>
      {bg}
      <View style={[StyleSheet.absoluteFill, center && { alignItems: 'center', justifyContent: 'center' },
        { paddingTop: 12 + lay.ins.t, paddingBottom: 12 + lay.ins.b, paddingLeft: 16 + lay.ins.l, paddingRight: 16 + lay.ins.r }]}>
        {children}
      </View>
    </View>
  );
}

export const st = StyleSheet.create({
  btn: { borderWidth: 3, borderColor: C.ink, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  btnShadow: { position: 'absolute', left: 0, right: 0, height: '100%', backgroundColor: C.ink },
  btnTxt: { fontFamily: FONT.display, color: '#fff', textAlign: 'center', letterSpacing: .4 },
  card: { backgroundColor: '#fff', borderWidth: 4, borderColor: C.ink, borderRadius: 22, overflow: 'hidden' },
  cardShadow: { position: 'absolute', left: 0, right: 0, top: 8, bottom: -8, backgroundColor: C.ink, borderRadius: 22 },
  cardIn: { paddingTop: 18, paddingHorizontal: 20, paddingBottom: 20, alignItems: 'center', gap: 10 },
  h3: { fontFamily: FONT.display, fontSize: 26, color: C.teal, textAlign: 'center' },
  h2: { fontFamily: FONT.display, textAlign: 'center' },
  p: { fontFamily: FONT.body, fontSize: 15, lineHeight: 21, color: C.ink, textAlign: 'center', maxWidth: 420 },
  lab: { fontFamily: FONT.black, fontSize: 12, letterSpacing: 1, textTransform: 'uppercase', color: C.sub, textAlign: 'left' },
  row: { flexDirection: 'row', gap: 10, flexWrap: 'wrap', justifyContent: 'center' },
  xp: { height: 12, borderWidth: 2, borderColor: C.ink, borderRadius: 6, overflow: 'hidden' },
  input: { fontFamily: FONT.display, fontSize: 20, borderWidth: 3, borderColor: C.ink, borderRadius: 12, paddingVertical: 6, paddingHorizontal: 10, color: C.ink, backgroundColor: C.paper, width: '100%' },
  pill: { fontFamily: FONT.display, fontSize: 17, color: '#fff' },
});
