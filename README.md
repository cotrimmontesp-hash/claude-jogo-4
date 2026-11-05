# Tita e o Coral Brilhante

Aventura com modo história, Modo Ondas e online até 5 jogadores.

O jogo é todo em **React Native com Expo e TypeScript** (pasta `app/`):

- `app/src/engine/` — o motor do jogo em TypeScript: fases, robôs, tiros, armas, ondas, online (`game.ts`), dados (`data.ts`), receitas dos sons (`sfxDefs.ts`).
- `app/src/ui/` — as telas em React Native: início, personagens, armas, personalizar, online, amigos, sala de espera, diálogos, pausa e resultado.
- `app/src/webgame/` — no celular, a tela do jogo: o mesmo motor em TypeScript roda num canvas do navegador do Android (WebView), que é bem mais rápido para esse tipo de desenho; `npm run build:webgame` monta esse pedaço. Os menus continuam em React Native e conversam com ele por mensagens (`app/src/native/remote.ts`).
- `app/src/engine/draw.ts` — os desenhos dos personagens, usados pelo jogo e pelas prévias nas telas (no celular, as prévias usam **React Native Skia**, `platform/skctx.ts`).
- `app/src/platform/` — o que muda entre celular e web: sons com WebAudio, progresso salvo no AsyncStorage (celular) / localStorage (web).
- `app/src/net/peer.ts` — conexão direta entre aparelhos (WebRTC).

Do mesmo código saem:

- **Site/PWA na Vercel:** `npm run build:web` (gera `app/dist`). https://claude-jogo-4.vercel.app
- **APK do Android:** o GitHub Actions faz `expo prebuild` + Gradle a cada push na `main`, testa no emulador e publica em **Releases**.
- **Lojas (quando quiser):** `eas build -p android --profile production` (AAB) e `eas build -p ios` (IPA), com conta Expo.

A pasta `site/` é a versão antiga do site em HTML, guardada como reserva.
