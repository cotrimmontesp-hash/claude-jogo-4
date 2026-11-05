/* No celular, o WebRTC vem do react-native-webrtc: registra RTCPeerConnection etc. como globais. */
import { registerGlobals } from 'react-native-webrtc';
try { registerGlobals(); } catch (e) { }
export {};
