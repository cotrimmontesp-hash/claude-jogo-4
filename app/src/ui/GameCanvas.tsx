/* A tela do jogo no celular: o motor em TypeScript (src/webgame) desenha num canvas
   do navegador do Android, que é rápido. As telas do React Native ficam por cima. */
import React, { useEffect, useMemo, useRef } from 'react';
import { StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';
import { GAME_HTML } from '../webgame/html';
import type { Game } from '../engine/game';

export function GameCanvas({ game }: { game: Game; W: number; H: number; rot?: boolean }) {
  const ref = useRef<any>(null);
  const g: any = game;
  useEffect(() => { g.__attach((o: any) => { try { ref.current && ref.current.postMessage(JSON.stringify(o)); } catch (e) { } }); }, [game]);
  const inject = useMemo(() => 'window.__TITA_INIT=' + JSON.stringify(g.__init()) + ';true;', [game]);
  return (
    <WebView
      ref={ref}
      style={[StyleSheet.absoluteFill, { backgroundColor: '#2d1d70' }]}
      originWhitelist={['*']}
      source={{ html: GAME_HTML, baseUrl: 'https://localhost/' }}
      injectedJavaScriptBeforeContentLoaded={inject}
      onMessage={e => g.__onMessage(e.nativeEvent.data)}
      javaScriptEnabled
      domStorageEnabled
      mediaPlaybackRequiresUserAction={false}
      allowsInlineMediaPlayback
      scrollEnabled={false}
      overScrollMode="never"
      bounces={false}
      setSupportMultipleWindows={false}
      androidLayerType="hardware"
      textZoom={100}
    />
  );
}
