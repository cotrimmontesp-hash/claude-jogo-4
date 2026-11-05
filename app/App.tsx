/* Tita e o Coral Brilhante — aplicativo em React Native + Expo + TypeScript.
   O mesmo código gera o app de Android (APK) e o site/PWA (React Native Web). */
import './src/net/rtc';
import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import { LilitaOne_400Regular } from '@expo-google-fonts/lilita-one';
import { Nunito_700Bold, Nunito_800ExtraBold, Nunito_900Black } from '@expo-google-fonts/nunito';
import { createGame, type Game } from './src/engine/game';
import { makePlatform } from './src/platform/make';
import { preload } from './src/platform/preload';
import { useCanvasFonts } from './src/ui/useCanvasFonts';
import { GameRoot } from './src/ui/GameRoot';
import { KeepAwake, Orientation } from './src/ui/device';

export default function App() {
  const [fontsOk] = useFonts({ 'Lilita One': LilitaOne_400Regular, Nunito: Nunito_800ExtraBold, 'Nunito-Black': Nunito_900Black, 'Nunito-Bold': Nunito_700Bold });
  const canvasFonts = useCanvasFonts();
  const [ready, setReady] = useState(false);
  const [game, setGame] = useState<Game | null>(null);
  useEffect(() => { preload().finally(() => setReady(true)); }, []);
  useEffect(() => {
    if (!ready || !fontsOk || !canvasFonts || game) return;
    setGame(createGame(makePlatform()));
  }, [ready, fontsOk, canvasFonts, game]);
  return (
    <SafeAreaProvider>
      <StatusBar hidden />
      <KeepAwake />
      <Orientation />
      {game ? <GameRoot game={game} /> : <View style={{ flex: 1, backgroundColor: '#2d1d70' }} />}
    </SafeAreaProvider>
  );
}
