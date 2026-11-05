import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';
import * as ScreenOrientation from 'expo-screen-orientation';
import { useKeepAwake } from 'expo-keep-awake';

export type GameViewProps = { html: string };

// Android/iPhone: o jogo roda numa WebView em tela cheia, sempre deitado.
// O endereço base "https://localhost/" é o mesmo do app antigo, então o progresso salvo continua.
export default function GameView({ html }: GameViewProps): React.JSX.Element {
  useKeepAwake();
  useEffect(() => {
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE).catch(() => undefined);
  }, []);
  return (
    <WebView
      source={{ html, baseUrl: 'https://localhost/' }}
      originWhitelist={['*']}
      javaScriptEnabled
      domStorageEnabled
      allowsInlineMediaPlayback
      mediaPlaybackRequiresUserAction={false}
      setSupportMultipleWindows={false}
      overScrollMode="never"
      bounces={false}
      scrollEnabled={false}
      textZoom={100}
      style={styles.web}
    />
  );
}

const styles = StyleSheet.create({
  web: { flex: 1, backgroundColor: '#2d1d70' },
});
