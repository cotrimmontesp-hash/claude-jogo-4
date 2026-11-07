# Turbo Estrada

Corrida retrô pixelada (estilo os jogos de estrada do videogame antigo): passe os carros antes do tempo acabar,
com dia, fim de tarde, noite, neblina e neve.

- **Campeonato**: 12 etapas em 3 copas (Bronze, Prata e Ouro), com estrelas.
- **Estrada sem fim**: cada dia tem uma meta de carros; quantos dias você aguenta?
- **Online**: salas com código de 4 números, até 4 pilotos, corrida de 2 minutos.
- **Garagem**: 5 carros, melhorias (motor, turbo, pneus) e cores, compradas com as moedas das corridas.

## Como é feito
App em **React Native + Expo + TypeScript** (pasta `app/`). Do mesmo código saem:
- o **site/PWA** na Vercel (React Native Web): `npx expo export -p web` → `app/dist`
- os **apps** pelo **EAS**: APK/AAB do Android e IPA do iPhone (`app/eas.json`, workflow "Build EAS")
- e um APK direto no GitHub Actions a cada envio para a `main` (workflow "Gerar APK")

O motor do jogo (`app/src/engine`) desenha num canvas pequeno e amplia sem suavizar. Na web ele roda na página;
no app ele roda numa WebView (`app/src/webgame`, montada por `scripts/build-webgame.mjs`) e as telas em
React Native conversam com ele por mensagens.
