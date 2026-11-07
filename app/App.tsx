/* Turbo Estrada — app em React Native + Expo + TypeScript.
   Do mesmo código saem o site/PWA (React Native Web, na Vercel) e os apps (EAS: APK/AAB e IPA). */
import React, { useEffect, useState } from 'react';
import { Platform, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import { PressStart2P_400Regular } from '@expo-google-fonts/press-start-2p';
import type { Game } from './src/engine/game';
import { makeGame } from './src/makeGame';
import { preload } from './src/platform/preload';
import { GameRoot } from './src/ui/GameRoot';
import { KeepAwake, Orientation } from './src/ui/device';

export default function App() {
  const [fontsLoaded, fontErr] = useFonts({ PressStart2P: PressStart2P_400Regular });
  const [ready, setReady] = useState(false);
  const [late, setLate] = useState(false);
  const [game, setGame] = useState<Game | null>(null);
  useEffect(() => { const t = setTimeout(() => setLate(true), 12000); return () => clearTimeout(t); }, []);
  useEffect(() => { preload().finally(() => setReady(true)); }, []);
  const fontsOk = Platform.OS !== 'web' || fontsLoaded || !!fontErr || late;
  useEffect(() => { if (ready && fontsOk && !game) setGame(makeGame()); }, [ready, fontsOk, game]);
  return (
    <SafeAreaProvider>
      <StatusBar hidden />
      <KeepAwake />
      <Orientation />
      {game ? <GameRoot game={game} /> : <View style={{ flex: 1, backgroundColor: '#0b0b1e' }} />}
    </SafeAreaProvider>
  );
}
