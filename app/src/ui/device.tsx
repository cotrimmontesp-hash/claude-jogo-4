/* Celular: tela sempre ligada e sempre deitada. */
import { useEffect } from 'react';
import { useKeepAwake } from 'expo-keep-awake';
import * as ScreenOrientation from 'expo-screen-orientation';

export function KeepAwake() { useKeepAwake(); return null; }
export function Orientation() {
  useEffect(() => { ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE).catch(() => { }); }, []);
  return null;
}
