/* Plataforma do celular: Skia para desenhar, expo-av para os sons,
   AsyncStorage para salvar o progresso. */
import { AppState, Share } from 'react-native';
import { Audio } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Platform } from '../engine/types';
import { SkOffCanvas } from './skctx';
import { SOUND_FILES, SOUND_GAIN } from './sounds';

const SKEY = 'tita-coral-v2';
let saved: string | null = null;

/** lê o progresso salvo antes do jogo começar */
export async function preload() {
  try { saved = (await AsyncStorage.getItem(SKEY)) || null; } catch (e) { saved = null; }
  try {
    await Audio.setAudioModeAsync({ playsInSilentModeIOS: true, staysActiveInBackground: false, shouldDuckAndroid: true });
  } catch (e) { }
}

/* ---------- sons ---------- */
const POOL_N: { [k: string]: number } = { rivet: 4, snipe: 3, lob: 3, rocket: 3, hit: 3, eshot: 3, coin: 3, splash: 3, boom: 3, reload: 2, blip: 2, hurt: 2, click: 2 };
const pools: { [k: string]: { list: any[]; i: number; loading: boolean } } = {};
let sfxOn = true, musOn = true;
async function loadPool(name: string) {
  const p = pools[name];
  const n = POOL_N[name] || 1;
  for (let k = 0; k < n; k++) {
    try { const { sound } = await Audio.Sound.createAsync(SOUND_FILES[name], { shouldPlay: false, volume: 1 }); p.list.push(sound); } catch (e) { }
  }
}
function playSfx(name: string, v: number) {
  if (!sfxOn || !SOUND_FILES[name]) return;
  let p = pools[name];
  if (!p) { p = pools[name] = { list: [], i: 0, loading: true }; loadPool(name).then(() => { p.loading = false; playSfx(name, v); }); return; }
  if (!p.list.length) return;
  const s = p.list[p.i++ % p.list.length];
  const vol = Math.max(0, Math.min(1, v / (SOUND_GAIN[name] || 1)));
  s.setStatusAsync({ volume: vol, positionMillis: 0, shouldPlay: true }).catch(() => { });
}
const music: { [k: string]: any } = {};
let curMode: string | null = null, appActive = true, switching = false;
async function musicSound(mode: string) {
  if (music[mode]) return music[mode];
  const key = 'music_' + mode;
  if (!SOUND_FILES[key]) return null;
  const { sound } = await Audio.Sound.createAsync(SOUND_FILES[key], { shouldPlay: false, isLooping: true, volume: Math.min(1, 1 / (SOUND_GAIN[key] || 1)) });
  music[mode] = sound;
  return sound;
}
async function switchMusic(mode: string | null) {
  if (switching) return; switching = true;
  try {
    const want = musOn && appActive ? mode : null;
    if (want === curMode) return;
    if (curMode && music[curMode]) { try { await music[curMode].stopAsync(); } catch (e) { } }
    curMode = want;
    if (want) { const s = await musicSound(want); if (s && curMode === want) await s.replayAsync({ isLooping: true }); }
  } catch (e) { }
  finally { switching = false; }
}
let lastMode: string | null = null;
AppState.addEventListener('change', (st) => { appActive = st === 'active'; switchMusic(lastMode); });

export function makePlatform(): Platform {
  return {
    isTouch: true,
    query: '',
    now: () => performance.now(),
    storage: {
      load: () => saved,
      save: (s) => { saved = s; AsyncStorage.setItem(SKEY, s).catch(() => { }); },
    },
    createCanvas: (w, h) => new SkOffCanvas(w, h),
    font: (size, kind) => kind === 'body' ? size + 'px Nunito' : size + 'px "Lilita One"',
    audio: {
      play: playSfx,
      music: (mode) => { lastMode = mode; if ((musOn && appActive ? mode : null) !== curMode) switchMusic(mode); },
      setVolumes: (s, m) => { sfxOn = s; musOn = m; switchMusic(lastMode); },
    },
    share: async (text) => {
      try { await Share.share({ message: text }); return 'shared'; } catch (e) { return 'fail'; }
    },
  };
}
