import React from 'react';
import { StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import GameView from './src/GameView';
import { GAME_HTML } from './src/game/gameHtml';

export default function App(): React.JSX.Element {
  return (
    <View style={styles.root}>
      <StatusBar hidden />
      <GameView html={GAME_HTML} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#2d1d70' },
});
