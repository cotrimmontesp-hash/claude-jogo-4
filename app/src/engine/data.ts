/* Dados fixos: carros, cores, melhorias, horas do dia e as etapas do campeonato. */

export interface Car { id: string; name: string; price: number; top: number; spd: number; acc: number; grip: number; off: number; desc: string }
export const CARS: Car[] = [
  { id: 'faisca', name: 'Faísca', price: 0, top: 180, spd: .78, acc: 1.0, grip: 1.0, off: 1, desc: 'Pequeno e esperto. Bom pra começar.' },
  { id: 'trovao', name: 'Trovão', price: 450, top: 205, spd: .84, acc: 1.12, grip: .95, off: 1, desc: 'Motor bravo, sai voando na largada.' },
  { id: 'boi', name: 'Pé-de-Boi', price: 900, top: 195, spd: .82, acc: 1.05, grip: 1.35, off: .35, desc: 'Jipe: não perde velocidade na terra e segura na neve.' },
  { id: 'cometa', name: 'Cometa', price: 1600, top: 230, spd: .9, acc: 1.18, grip: 1.12, off: 1, desc: 'Esportivo baixinho, faz curva no trilho.' },
  { id: 'furacao', name: 'Furacão', price: 3200, top: 260, spd: .97, acc: 1.32, grip: 1.2, off: 1, desc: 'O mais rápido da estrada. Segura firme!' },
];

export const COLORS = ['#e4202c', '#2a6cf0', '#f8c818', '#18b048', '#f87818', '#a040e8', '#f0f0f0', '#303048', '#18c8d8', '#f058a8'];
export const COLOR_NAMES = ['Vermelho', 'Azul', 'Amarelo', 'Verde', 'Laranja', 'Roxo', 'Branco', 'Preto', 'Ciano', 'Rosa'];
export const COLOR_PRICE = 60;

/* melhorias: 5 níveis cada */
export const UPG = [
  { k: 'motor', name: 'Motor', what: 'velocidade máxima', per: .03 },
  { k: 'turbo', name: 'Turbo', what: 'aceleração', per: .08 },
  { k: 'pneus', name: 'Pneus', what: 'curvas e neve', per: .07 },
];
export const UPG_MAX = 5;
export function upgCost(carIdx: number, lvl: number) { return Math.round((70 + carIdx * 35) * (lvl + 1) * (1 + lvl * .25) / 10) * 10; }

/* ---------- horas do dia / clima ---------- */
export interface Tod {
  sky: [string, string]; grass: [string, string]; road: [string, string]; rumble: [string, string]; lane: string;
  hill: string; hill2: string; fog: string; fogD: number; dark: number; snow?: boolean; sun?: string; moon?: boolean; ice?: number; name: string;
}
export const TOD: { [k: string]: Tod } = {
  day: { name: 'Dia', sky: ['#2c8cf8', '#a8dcfc'], grass: ['#5cbc34', '#50ac2c'], road: ['#707074', '#6a6a6e'], rumble: ['#f8f8f8', '#d82818'], lane: '#f8f8f8', hill: '#3c9c48', hill2: '#2c7c38', fog: '#a8dcfc', fogD: 1.2, dark: 0, sun: '#fcf068' },
  sunset: { name: 'Fim de tarde', sky: ['#5c2c7c', '#fc9858'], grass: ['#4c8828', '#447c24'], road: ['#5c5460', '#575060'], rumble: ['#f0e0d0', '#c02020'], lane: '#f0e0d0', hill: '#6c3468', hill2: '#4c2450', fog: '#fca070', fogD: 1.6, dark: .15, sun: '#fc6c3c' },
  night: { name: 'Noite', sky: ['#020212', '#0c0c34'], grass: ['#0a1a0c', '#081608'], road: ['#18181e', '#16161c'], rumble: ['#3c3c44', '#5c1414'], lane: '#5c5c64', hill: '#0c0c2c', hill2: '#08081c', fog: '#04041a', fogD: 2.2, dark: 1, moon: true },
  fog: { name: 'Neblina', sky: ['#8494a4', '#b4c0cc'], grass: ['#7c9484', '#74897b'], road: ['#80848c', '#7c8088'], rumble: ['#e8ecf0', '#a85858'], lane: '#e8ecf0', hill: '#9ca8b4', hill2: '#909ca8', fog: '#b4c0cc', fogD: 9, dark: .1 },
  snow: { name: 'Neve', sky: ['#7cace8', '#e0ecfc'], grass: ['#f4f8fc', '#e4ecf6'], road: ['#8c90a4', '#888ca0'], rumble: ['#f8f8f8', '#2850e0'], lane: '#f8f8f8', hill: '#d4e0f0', hill2: '#b8c8e0', fog: '#e0ecfc', fogD: 2.5, dark: 0, snow: true, ice: .55, sun: '#fcfcf0' },
  dawn: { name: 'Amanhecer', sky: ['#2c3c8c', '#f8b0b8'], grass: ['#3c7c3c', '#367036'], road: ['#5c5c6c', '#585868'], rumble: ['#f0f0f0', '#c02828'], lane: '#e8e8f0', hill: '#4c4c8c', hill2: '#383870', fog: '#f0b8c0', fogD: 1.8, dark: .2, sun: '#fcc8a0' },
};

/* ---------- cenários (o que aparece na beira da estrada) ---------- */
export type Scene = 'deserto' | 'praia' | 'serra' | 'cidade' | 'neve';
export const SCENE_NAME: { [k: string]: string } = { deserto: 'Deserto', praia: 'Praia', serra: 'Serra', cidade: 'Cidade', neve: 'Neve' };

/* ---------- campeonato ---------- */
export interface Stage { name: string; scene: Scene; phases: [string, number][]; target: number; time: number; curvy: number; hilly: number; traffic: number; seed: number; cup: number }
export const CUPS = [{ name: 'Copa Bronze', col: '#d08848' }, { name: 'Copa Prata', col: '#b8c4d8' }, { name: 'Copa Ouro', col: '#f8c818' }];
export const STAGES: Stage[] = [
  { cup: 0, name: 'Rota do Sol', scene: 'deserto', phases: [['day', 1]], target: 16, time: 75, curvy: .7, hilly: .3, traffic: 1, seed: 11 },
  { cup: 0, name: 'Beira-Mar', scene: 'praia', phases: [['day', .6], ['sunset', .4]], target: 20, time: 85, curvy: .9, hilly: .3, traffic: 1, seed: 23 },
  { cup: 0, name: 'Serra Verde', scene: 'serra', phases: [['day', .55], ['fog', .45]], target: 24, time: 90, curvy: 1.1, hilly: .9, traffic: 1.05, seed: 37 },
  { cup: 0, name: 'Noite na Cidade', scene: 'cidade', phases: [['sunset', .35], ['night', .65]], target: 26, time: 95, curvy: .8, hilly: .4, traffic: 1.1, seed: 41 },
  { cup: 1, name: 'Vale Gelado', scene: 'neve', phases: [['snow', 1]], target: 28, time: 100, curvy: 1.0, hilly: .6, traffic: 1.1, seed: 53 },
  { cup: 1, name: 'Cânion', scene: 'deserto', phases: [['sunset', .5], ['night', .5]], target: 36, time: 105, curvy: 1.2, hilly: 1.1, traffic: 1.15, seed: 67 },
  { cup: 1, name: 'Neblina da Serra', scene: 'serra', phases: [['fog', 1]], target: 34, time: 110, curvy: 1.3, hilly: 1.0, traffic: 1.15, seed: 71 },
  { cup: 1, name: 'Litoral Noturno', scene: 'praia', phases: [['night', .75], ['dawn', .25]], target: 38, time: 115, curvy: 1.1, hilly: .5, traffic: 1.2, seed: 83 },
  { cup: 2, name: 'Avenida Neon', scene: 'cidade', phases: [['night', 1]], target: 40, time: 120, curvy: 1.2, hilly: .6, traffic: 1.3, seed: 97 },
  { cup: 2, name: 'Tempestade Branca', scene: 'neve', phases: [['snow', .5], ['fog', .5]], target: 42, time: 125, curvy: 1.3, hilly: .9, traffic: 1.3, seed: 101 },
  { cup: 2, name: 'Deserto Sem Fim', scene: 'deserto', phases: [['day', .4], ['sunset', .25], ['night', .35]], target: 52, time: 135, curvy: 1.3, hilly: 1.2, traffic: 1.35, seed: 113 },
  { cup: 2, name: 'Grande Final', scene: 'serra', phases: [['day', .2], ['sunset', .12], ['night', .24], ['fog', .16], ['snow', .16], ['dawn', .12]], target: 75, time: 170, curvy: 1.4, hilly: 1.2, traffic: 1.4, seed: 127 },
];

/* modo sem fim: cada "dia" passa por todas as horas, como no videogame antigo */
export const ENDLESS_DAY = { time: 150, phases: [['day', .26], ['sunset', .1], ['night', .24], ['fog', .14], ['dawn', .08], ['snow', .18]] as [string, number][] };
export function endlessTarget(day: number) { return Math.min(95, 40 + (day - 1) * 8); }
export const ENDLESS_SCENES: Scene[] = ['deserto', 'praia', 'serra', 'cidade', 'neve'];

/* online: pistas da corrida (sorteia uma) */
export const ONLINE_TIME = 120;
export const ONLINE_TRACKS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

export const NAMES_RND = ['Piloto', 'Corredor', 'Turbinho', 'Ás', 'Faro', 'Raio', 'Pé-Pesado', 'Zigue'];
