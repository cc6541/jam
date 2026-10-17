import { describe, expect, it } from 'vitest';
import { DEFAULT_RULES, engine, type GameState, type LevelDef, type StepResult } from '@jam/engine-screw';
import { DEFAULT_UI_THEME } from '@jam/ui';
import { GameSession, type BoardPort } from './game-session';
import { grantPurchase, isAvailable, isOwned, newProfile, completeLevel } from './profile';
import { mockCatalog, mockPrice, PRODUCTS } from './products';
import type { RemoteConfig } from '@jam/shell';
import remote from '../config/remote-config.json';
import appConfig from '../app.config.json';
import aso from '../ASO.json';
import crossPromo from '../config/cross-promo.json';
import { parseCrossPromo } from '@jam/cross-promo';
import { parseRemoteConfig } from '@jam/shell';

const square = [
  { x: 0, y: 0 },
  { x: 100, y: 0 },
  { x: 100, y: 100 },
  { x: 0, y: 100 },
];
const screw = (id: string, color: 'red' | 'blue') => ({
  id,
  color,
  kind: { type: 'standard' as const },
  at: { x: 50, y: 50 },
  pins: ['base'],
});
const level: LevelDef = {
  schemaVersion: 1,
  id: 'l',
  seed: 1,
  board: { width: 100, height: 100 },
  plates: [{ id: 'base', z: 0, polygon: square }],
  screws: ['r1', 'r2', 'r3'].map((id) => screw(id, 'red')).concat(['b1', 'b2', 'b3'].map((id) => screw(id, 'blue'))),
  boxQueue: ['red', 'blue'],
  rules: { ...DEFAULT_RULES, activeBoxes: 1 },
};

const config = parseRemoteConfig(remote) as RemoteConfig;

class FakeBoard implements BoardPort {
  loads: GameState[] = [];
  applies: StepResult[] = [];
  load(state: GameState) {
    this.loads.push(state);
  }
  apply(result: StepResult) {
    this.applies.push(result);
  }
}

describe('GameSession', () => {
  const make = () => {
    const board = new FakeBoard();
    return { board, session: new GameSession(level, board, () => ({ width: 390, height: 844 })) };
  };

  it('charge la vue, joue un coup et anime son résultat', () => {
    const { board, session } = make();
    expect(board.loads).toHaveLength(1);
    session.tap('r1');
    expect(session.state.moves).toBe(1);
    expect(board.applies).toHaveLength(1);
  });

  it('undo rejoue l’historique moins le dernier coup et recharge la vue', () => {
    const { board, session } = make();
    expect(session.undo()).toBe(false);
    session.tap('r1');
    session.tap('r2');
    expect(session.undo()).toBe(true);
    expect(session.state).toEqual(engine.replay(level, [{ type: 'tap', screwId: 'r1' }]));
    expect(board.loads).toHaveLength(2);
  });

  it('un tap refusé n’entre pas dans l’historique', () => {
    const { session } = make();
    session.tap('nope');
    expect(session.canUndo).toBe(false);
  });

  it('boosters : case en plus et vidage de la toolbox', () => {
    const { session } = make();
    session.tap('b1');
    expect(session.clearToolbox().state.holding).toEqual(['b1']);
    expect(session.addToolboxSlot().state.toolboxSlots).toBe(6);
  });
});

describe('profil et achats', () => {
  const fresh = () => newProfile(config.economy);

  it('démarre avec les pièces de départ et gagne la récompense (jamais de retour en arrière)', () => {
    const p = completeLevel(fresh(), 1, config, 1);
    expect(p.wallet.coins).toBe(220);
    expect(p.nextLevel).toBe(2);
    expect(completeLevel(p, 1, config, 1).nextLevel).toBe(2);
    expect(completeLevel(fresh(), 3, config, 2).wallet.coins).toBe(240);
  });

  it('achats : pièces, sans pub, pack de démarrage unique, tirelire', () => {
    let p = fresh();
    p = grantPurchase(p, 'coins_m');
    expect(p.wallet.coins).toBe(1500);
    expect(grantPurchase(p, 'noads').noAds).toBe(true);
    const starter = grantPurchase(p, 'starter');
    expect(starter.wallet.coins).toBe(2000);
    expect(starter.wallet.boosters).toEqual({ undo: 1, addToolboxSlot: 1, clearToolbox: 1 });
    expect(grantPurchase(starter, 'starter')).toBe(starter);
    expect(grantPurchase(p, 'piggy')).toBe(p);
    const withPiggy = completeLevel(p, 1, config, 1);
    expect(grantPurchase(withPiggy, 'piggy').wallet).toMatchObject({ coins: withPiggy.wallet.coins + 20, piggy: 0 });
  });

  it('disponibilité : tirelire vide, pack de démarrage après le niveau 8', () => {
    const p = fresh();
    expect(isAvailable(p, 'piggy')).toBe(false);
    expect(isAvailable(p, 'starter')).toBe(false);
    expect(isAvailable({ ...p, nextLevel: 8 }, 'starter')).toBe(true);
    expect(isAvailable({ ...p, nextLevel: 9, starterBought: true }, 'starter')).toBe(false);
    expect(isOwned({ ...p, noAds: true }, 'noads')).toBe(true);
  });

  it('catalogue : prix localisés du mock', () => {
    expect(mockPrice(3.99, 'fr')).toContain('3,99');
    expect(mockPrice(3.99, 'en')).toBe('$3.99');
    expect(mockCatalog('en')).toHaveLength(PRODUCTS.length);
  });
});

describe('fichiers de config de l’app', () => {
  it('remote-config.json et cross-promo.json passent leur schéma', () => {
    expect(parseRemoteConfig(remote)).toBeDefined();
    expect(parseCrossPromo(crossPromo)?.apps[0]?.bundleId).toBe(appConfig.bundleId);
  });

  it('le thème de l’app couvre toutes les variables du thème UI', () => {
    expect(Object.keys(appConfig.theme.ui).sort()).toEqual(
      Object.keys(DEFAULT_UI_THEME).filter((k) => k !== 'fontFamily').sort(),
    );
  });

  it('les clés de stockage seront préfixées par un bundleId valide', () => {
    expect(appConfig.bundleId).toMatch(/^[a-z0-9]+(\.[a-z0-9-]+)+$/);
  });

  it('ASO : limites des Stores respectées en FR et EN', () => {
    for (const lang of ['fr', 'en'] as const) {
      const a = aso[lang];
      expect(a.title.length).toBeLessThanOrEqual(aso.limits.titleMax);
      expect(a.subtitle.length).toBeLessThanOrEqual(aso.limits.subtitleMax);
      expect(a.keywords.length).toBeLessThanOrEqual(aso.limits.keywordsMax);
      expect(a.description.length).toBeLessThanOrEqual(aso.limits.descriptionMax);
    }
  });
});
