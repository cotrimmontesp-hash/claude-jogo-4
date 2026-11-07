/* Celular: o progresso fica salvo no AsyncStorage (o jogo em si roda na WebView, ver src/webgame). */
import AsyncStorage from '@react-native-async-storage/async-storage';

const SKEY = 'turbo-estrada-v1';
let saved: string | null = null;

/** lê o progresso salvo antes do jogo começar */
export async function preload() {
  try { saved = (await AsyncStorage.getItem(SKEY)) || null; } catch (e) { saved = null; }
}
export function getSaved() { return saved; }
export function storeSave(s: string) { saved = s; AsyncStorage.setItem(SKEY, s).catch(() => { }); }
