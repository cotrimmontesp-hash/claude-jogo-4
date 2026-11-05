/* Web: o motor roda direto na página. */
import { createGame } from './engine/game';
import { makePlatform } from './platform/make.web';
export function makeGame() { return createGame(makePlatform()); }
