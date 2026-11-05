# Tita e o Coral Brilhante

Aventura com modo história, Modo Ondas e online até 5 jogadores.

O app é feito em **React Native com Expo e TypeScript** (pasta `app/`):

- `app/App.tsx`: tela do app.
- `app/src/GameView.tsx`: Android/iPhone, o jogo roda numa WebView deitada e em tela cheia.
- `app/src/GameView.web.tsx`: navegador (React Native Web), o jogo roda direto na página.
- `app/src/game/game.html`: o jogo. `npm run build:game` gera `gameHtml.ts` a partir dele.

Do mesmo código saem:

- **Site/PWA na Vercel:** `npm run build:web` (gera `app/dist`). https://claude-jogo-4.vercel.app
- **APK do Android:** o GitHub Actions faz `expo prebuild` + Gradle a cada push. Fica na aba **Releases**.
- **Lojas (quando quiser):** `eas build -p android --profile production` (AAB) e `eas build -p ios` (IPA), com conta Expo.

A pasta `site/` é a versão antiga do site, guardada como reserva.
