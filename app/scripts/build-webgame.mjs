// Monta a tela do jogo para o app (celular): junta o motor em TypeScript num
// único HTML (com as fontes dentro) e grava em src/webgame/html.ts.
// Uso: node scripts/build-webgame.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const here = path.dirname(fileURLToPath(import.meta.url));
const app = path.join(here, '..');
const r = await build({ entryPoints: [path.join(app, 'src/webgame/entry.ts')], bundle: true, write: false, format: 'iife', target: 'es2019', minify: true, legalComments: 'none' });
const js = r.outputFiles[0].text;
const font = (p) => fs.readFileSync(path.join(app, 'node_modules', p)).toString('base64');
const lilita = font('@expo-google-fonts/lilita-one/LilitaOne_400Regular.ttf');
const nunito = font('@expo-google-fonts/nunito/Nunito_800ExtraBold.ttf');
const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover">
<style>@font-face{font-family:'Lilita One';src:url(data:font/ttf;base64,${lilita}) format('truetype')}@font-face{font-family:'Nunito';src:url(data:font/ttf;base64,${nunito}) format('truetype')}
html,body{margin:0;height:100%;overflow:hidden;background:#2d1d70;touch-action:none;user-select:none;-webkit-user-select:none;-webkit-tap-highlight-color:transparent}canvas{display:block;position:fixed;left:0;top:0;touch-action:none}</style>
</head><body><script>${js.replace(/<\/script/gi, '<\\/script')}</script></body></html>`;
fs.writeFileSync(path.join(app, 'src/webgame/html.ts'), '/* Gerado por scripts/build-webgame.mjs — não edite à mão. */\nexport const GAME_HTML: string = ' + JSON.stringify(html) + ';\n');
console.log('ok', Math.round(html.length / 1024) + ' KB');
