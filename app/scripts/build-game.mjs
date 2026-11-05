// Gera src/game/gameHtml.ts a partir de src/game/game.html (o jogo em si).
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const src = join(here, '..', 'src', 'game', 'game.html');
const out = join(here, '..', 'src', 'game', 'gameHtml.ts');
const html = readFileSync(src, 'utf8');
writeFileSync(out, '// Arquivo gerado por scripts/build-game.mjs. Edite src/game/game.html.\nexport const GAME_HTML: string = ' + JSON.stringify(html) + ';\n');
console.log('gameHtml.ts gerado:', html.length, 'caracteres');
