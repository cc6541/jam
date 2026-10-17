import { describe, expect, it } from 'vitest';
import { MonotonicClock } from './clock';
import { coinMultiplier, loadRemoteConfig, parseRemoteConfig, type RemoteConfig } from './config';
import { breakPiggy, buyBooster, newWallet, shouldShowInterstitial, spend, useBooster, winLevel } from './economy';
import { FakeClock, MemoryStorage, MockRemoteConfig } from './mocks';
import { JsonDoc, NamespacedStorage } from './storage';

const EMBEDDED: RemoteConfig = {
  schemaVersion: 1,
  economy: {
    startingCoins: 100,
    levelReward: 10,
    continueCost: 90,
    boosterPrices: { undo: 50, addToolboxSlot: 80, clearToolbox: 120 },
    piggy: { perWin: 25, capacity: 60 },
  },
  ads: { firstInterstitialLevel: 5, interstitialEveryLevels: 3 },
  events: [],
};

describe('stockage namespacé (invariant 2)', () => {
  it('isole les clés de deux apps sur le même stockage', async () => {
    const device = new MemoryStorage();
    const screw = new NamespacedStorage(device, 'com.jamfactory.screwjam');
    const other = new NamespacedStorage(device, 'com.jamfactory.boltjam');
    await screw.set('save', 'A');
    await other.set('save', 'B');
    expect(await screw.get('save')).toBe('A');
    expect(await other.get('save')).toBe('B');
    expect(await screw.keys()).toEqual(['save']);
    expect([...device.data.keys()].sort()).toEqual(['com.jamfactory.boltjam:save', 'com.jamfactory.screwjam:save']);
    await screw.remove('save');
    expect(await other.get('save')).toBe('B');
  });

  it('refuse un bundleId invalide', () => {
    expect(() => new NamespacedStorage(new MemoryStorage(), '')).toThrow();
    expect(() => new NamespacedStorage(new MemoryStorage(), 'a:b')).toThrow();
  });

  it('JsonDoc : défauts si absent, corrompu ou d’une version inconnue ; migration sinon', async () => {
    const s = new NamespacedStorage(new MemoryStorage(), 'com.jamfactory.screwjam');
    const doc = new JsonDoc(s, 'progress', 2, () => ({ level: 1 }), (data, v) =>
      v === 1 ? { level: (data as { lvl: number }).lvl } : undefined,
    );
    expect(await doc.load()).toEqual({ level: 1 });
    await doc.save({ level: 7 });
    expect(await doc.load()).toEqual({ level: 7 });
    await s.set('progress', '{oops');
    expect(await doc.load()).toEqual({ level: 1 });
    await s.set('progress', JSON.stringify({ v: 1, data: { lvl: 4 } }));
    expect(await doc.load()).toEqual({ level: 4 });
    await s.set('progress', JSON.stringify({ v: 0, data: {} }));
    expect(await doc.load()).toEqual({ level: 1 });
  });
});

describe('horloge monotone', () => {
  it('refuse les retours en arrière et le signale', async () => {
    const source = new FakeClock(1_000);
    const clock = await MonotonicClock.create(source, new MemoryStorage());
    expect(clock.now()).toBe(1_000);
    source.set(500);
    expect(clock.now()).toBe(1_000);
    expect(clock.rewound).toBe(true);
    source.set(2_000);
    expect(clock.now()).toBe(2_000);
  });

  it('se souvient de la dernière heure entre deux sessions', async () => {
    const storage = new MemoryStorage();
    const first = await MonotonicClock.create(new FakeClock(5_000), storage);
    first.now();
    await first.flush();
    const second = await MonotonicClock.create(new FakeClock(3_000), storage);
    expect(second.now()).toBe(5_000);
    expect(second.rewound).toBe(true);
  });

  it('se recale sur une heure de référence au-delà de la tolérance', async () => {
    const source = new FakeClock(1_000_000);
    const clock = await MonotonicClock.create(source, new MemoryStorage());
    clock.observeReference(1_000_000 + 60_000);
    expect(clock.now()).toBe(1_000_000);
    clock.observeReference(1_000_000 + 3_600_000);
    expect(clock.now()).toBe(1_000_000 + 3_600_000);
  });
});

describe('remote config statique', () => {
  const storage = () => new NamespacedStorage(new MemoryStorage(), 'com.jamfactory.screwjam');
  const remote = { ...EMBEDDED, economy: { ...EMBEDDED.economy, levelReward: 20 }, futureField: true };

  it('utilise le JSON distant valide, en ignorant les champs inconnus, et le met en cache', async () => {
    const s = storage();
    const r = await loadRemoteConfig(new MockRemoteConfig(remote), s, EMBEDDED);
    expect(r.source).toBe('remote');
    expect(r.config.economy.levelReward).toBe(20);
    expect(r.config).not.toHaveProperty('futureField');
    const offline = await loadRemoteConfig(new MockRemoteConfig(new Error('offline')), s, EMBEDDED);
    expect(offline).toEqual({ config: r.config, source: 'cache' });
  });

  it('retombe sur la copie embarquée si le JSON est absent ou invalide', async () => {
    for (const bad of [new Error('404'), null, { schemaVersion: 2 }, { ...EMBEDDED, economy: { levelReward: -1 } }]) {
      expect(await loadRemoteConfig(new MockRemoteConfig(bad), storage(), EMBEDDED)).toEqual({
        config: EMBEDDED,
        source: 'embedded',
      });
    }
  });

  it('ignore un cache corrompu', async () => {
    const s = storage();
    await s.set('remote-config', '{oops');
    expect((await loadRemoteConfig(new MockRemoteConfig(new Error('x')), s, EMBEDDED)).source).toBe('embedded');
  });

  it('valide les événements datés et calcule le multiplicateur côté client', () => {
    const event = { id: 'weekend', start: '2026-10-17T00:00:00Z', end: '2026-10-19T00:00:00Z', coinMultiplier: 2 };
    const config = parseRemoteConfig({ ...EMBEDDED, events: [event] });
    expect(config?.events).toEqual([event]);
    expect(coinMultiplier(config!, Date.parse('2026-10-18T12:00:00Z'))).toBe(2);
    expect(coinMultiplier(config!, Date.parse('2026-10-19T00:00:00Z'))).toBe(1);
    expect(parseRemoteConfig({ ...EMBEDDED, events: [{ ...event, start: 'demain' }] })).toBeUndefined();
    expect(parseRemoteConfig({ ...EMBEDDED, events: [{ ...event, coinMultiplier: 0 }] })).toBeUndefined();
  });
});

describe('économie', () => {
  const eco = EMBEDDED.economy;

  it('victoire : récompense × multiplicateur et tirelire plafonnée', () => {
    let w = newWallet(eco);
    w = winLevel(w, eco);
    w = winLevel(w, eco, 2);
    w = winLevel(w, eco);
    expect(w.coins).toBe(100 + 10 + 20 + 10);
    expect(w.piggy).toBe(60);
  });

  it('dépense et boosters : refus si solde insuffisant, booster possédé consommé avant les pièces', () => {
    const w = newWallet(eco);
    expect(spend(w, 101)).toEqual({ ok: false, reason: 'insufficient' });
    expect(spend(w, -5)).toEqual({ ok: false, reason: 'insufficient' });
    const bought = buyBooster(w, eco, 'undo');
    expect(bought.ok && bought.wallet).toMatchObject({ coins: 50, boosters: { undo: 1 } });
    if (!bought.ok) return;
    const used = useBooster(bought.wallet, eco, 'undo');
    expect(used.ok && used.wallet).toMatchObject({ coins: 50, boosters: { undo: 0 } });
    expect(useBooster(newWallet(eco), eco, 'clearToolbox')).toEqual({ ok: false, reason: 'insufficient' });
    expect(buyBooster(newWallet(eco), eco, 'clearToolbox').ok).toBe(false);
  });

  it('casser la tirelire', () => {
    expect(breakPiggy(newWallet(eco))).toEqual({ ok: false, reason: 'empty' });
    const r = breakPiggy(winLevel(newWallet(eco), eco));
    expect(r.ok && r.wallet).toMatchObject({ coins: 135, piggy: 0 });
  });

  it('plafond de fréquence des interstitielles', () => {
    const shown = Array.from({ length: 12 }, (_, i) => i + 1).filter((l) => shouldShowInterstitial(l, EMBEDDED.ads, false));
    expect(shown).toEqual([5, 8, 11]);
    expect(shouldShowInterstitial(5, EMBEDDED.ads, true)).toBe(false);
    expect(shouldShowInterstitial(5, { firstInterstitialLevel: 1, interstitialEveryLevels: 0 }, false)).toBe(false);
  });
});
