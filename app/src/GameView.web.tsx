import React from 'react';
import type { GameViewProps } from './GameView';

// Navegador (React Native Web): o jogo roda num iframe que ocupa a tela toda.
// O iframe tem a mesma origem do site, então o progresso salvo no navegador continua.
export default function GameView({ html }: GameViewProps): React.JSX.Element {
  return React.createElement('iframe', {
    srcDoc: html,
    title: 'Tita e o Coral Brilhante',
    allow: 'fullscreen; autoplay; clipboard-write; web-share',
    allowFullScreen: true,
    style: { border: 0, width: '100%', height: '100%', display: 'block', background: '#2d1d70' },
  });
}
