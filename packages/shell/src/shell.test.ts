import { describe, expect, it } from 'vitest';
import { createMockPorts, MemoryStorage } from './mocks';
import { namespacedStorage } from './storage';

describe('namespacedStorage', () => {
  it('isole les sauvegardes de deux apps sur le même stockage', async () => {
    const base = new MemoryStorage();
    const wood = namespacedStorage(base, 'com.studio.woodjam');
    const metal = namespacedStorage(base, 'com.studio.metaljam');
    await wood.set('coins', '100');
    await metal.set('coins', '5');
    expect(await wood.get('coins')).toBe('100');
    expect(await metal.get('coins')).toBe('5');
    expect(await wood.keys()).toEqual(['coins']);
    await wood.remove('coins');
    expect(await metal.get('coins')).toBe('5');
  });

  it('refuse un bundleId invalide', () => {
    expect(() => namespacedStorage(new MemoryStorage(), 'pas un bundle')).toThrow();
  });
});

describe('mocks des ports', () => {
  it('sont utilisables ensemble', async () => {
    const ports = createMockPorts();
    ports.clock.advance(1000);
    expect(ports.clock.monotonic()).toBe(1000);
    expect(await ports.ads.showRewarded('revive')).toBe('completed');
    expect(await ports.iap.purchase('no_ads')).toEqual({ status: 'purchased', productId: 'no_ads' });
    expect(await ports.iap.owned()).toEqual(['no_ads']);
    ports.analytics.event('level_end', { result: 'won' });
    ports.feedback.haptic('success');
    expect(ports.feedback.log).toEqual(['haptic:success']);
    expect(await ports.remoteConfig.fetch()).toBeNull();
  });

  it('simulent les échecs (pub indisponible, achat annulé)', async () => {
    const ports = createMockPorts();
    ports.ads.result = 'unavailable';
    ports.iap.result = 'cancelled';
    expect(ports.ads.isReady('rewarded')).toBe(false);
    expect(await ports.iap.purchase('coins_s')).toEqual({ status: 'cancelled' });
  });
});
