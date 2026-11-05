/* Celular: o motor roda na WebView da tela do jogo; aqui fica o "jogo remoto". */
import { createRemoteGame } from './native/remote';
export function makeGame() { return createRemoteGame(); }
