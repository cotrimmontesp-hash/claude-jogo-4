// Monta a tela do jogo para o app (celular): junta o motor num único HTML e grava em
// src/webgame/html.ts (a WebView carrega esse texto). Uso: node scripts/build-webgame.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const here = path.dirname(fileURLToPath(import.meta.url));
const app = path.join(here, '..');
const r = await build({ entryPoints: [path.join(app, 'src/webgame/entry.ts')], bundle: true, write: false, format: 'iife', target: 'es2019', minify: true, legalComments: 'none' });
const js = r.outputFiles[0].text;
const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover">
<style>html,body{margin:0;height:100%;overflow:hidden;background:#0b0b1e;touch-action:none;user-select:none;-webkit-user-select:none;-webkit-tap-highlight-color:transparent}canvas{display:block;position:fixed;left:0;top:0;touch-action:none;image-rendering:pixelated}</style>
</head><body><script>${js.replace(/<\/script/gi, '<\\/script')}</script></body></html>`;
fs.mkdirSync(path.join(app, 'src/webgame'), { recursive: true });
fs.writeFileSync(path.join(app, 'src/webgame/html.ts'), '/* Gerado por scripts/build-webgame.mjs — não edite à mão. */\nexport const GAME_HTML: string = ' + JSON.stringify(html) + ';\n');
console.log('ok', Math.round(html.length / 1024) + ' KB');
