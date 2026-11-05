# Tita e o Coral Brilhante

Aventura com modo história, Modo Ondas e online até 5 jogadores.

O jogo é todo em **React Native com Expo e TypeScript** (pasta `app/`):

- `app/src/engine/` — o motor do jogo em TypeScript: fases, robôs, tiros, armas, ondas, online (`game.ts`), dados (`data.ts`), receitas dos sons (`sfxDefs.ts`).
- `app/src/ui/` — as telas em React Native: início, personagens, armas, personalizar, online, amigos, sala de espera, diálogos, pausa e resultado.
- `app/src/platform/` — o que muda entre celular e web: desenho com **React Native Skia** no celular (`skctx.ts`) e canvas na web; sons com `expo-av` (arquivos em `assets/sfx`, gerados por `npm run sounds`) e WebAudio na web; progresso salvo no AsyncStorage / localStorage.
- `app/src/net/peer.ts` — conexão direta entre aparelhos (WebRTC; `react-native-webrtc` no celular).

Do mesmo código saem:

- **Site/PWA na Vercel:** `npm run build:web` (gera `app/dist`). https://claude-jogo-4.vercel.app
- **APK do Android:** o GitHub Actions faz `expo prebuild` + Gradle a cada push na `main`, testa no emulador e publica em **Releases**.
- **Lojas (quando quiser):** `eas build -p android --profile production` (AAB) e `eas build -p ios` (IPA), com conta Expo.

A pasta `site/` é a versão antiga do site em HTML, guardada como reserva.
