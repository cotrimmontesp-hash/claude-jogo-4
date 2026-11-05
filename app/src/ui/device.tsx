/* Celular: tela sempre ligada e sempre deitada. */
import { useEffect } from 'react';
import { useKeepAwake } from 'expo-keep-awake';
import * as ScreenOrientation from 'expo-screen-orientation';
import * as NavigationBar from 'expo-navigation-bar';
import { AppState } from 'react-native';

export function KeepAwake() { useKeepAwake(); return null; }
export function Orientation() {
  useEffect(() => {
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE).catch(() => { });
    /* esconde a barra de navegação do Android (volta deslizando da borda) */
    const hide = () => { NavigationBar.setBehaviorAsync('overlay-swipe').catch(() => { }); NavigationBar.setVisibilityAsync('hidden').catch(() => { }); };
    hide();
    const sub = AppState.addEventListener('change', s => { if (s === 'active') hide(); });
    return () => sub.remove();
  }, []);
  return null;
}
