import { describe, expect, it } from 'vitest';
import { FakeClock, MemoryStorage, MockAds, MockAnalytics, MockIap, MockRemoteConfig } from './mocks';

describe('mocks des ports', () => {
  it('MemoryStorage stocke, liste et supprime', async () => {
    const s = new MemoryStorage();
    await s.set('com.jam.screw:save', '{}');
    expect(await s.get('com.jam.screw:save')).toBe('{}');
    expect(await s.keys()).toEqual(['com.jam.screw:save']);
    await s.remove('com.jam.screw:save');
    expect(await s.get('com.jam.screw:save')).toBeNull();
  });

  it('FakeClock est piloté par le test', () => {
    const c = new FakeClock(1000);
    c.advance(500);
    expect(c.now()).toBe(1500);
    c.set(0);
    expect(c.now()).toBe(0);
  });

  it('MockAds journalise et renvoie le résultat configuré', async () => {
    const ads = new MockAds({ status: 'skipped' });
    expect(await ads.showRewarded('nearMiss')).toEqual({ status: 'skipped' });
    await ads.showInterstitial('levelEnd');
    expect(ads.shown).toEqual([
      { kind: 'rewarded', placement: 'nearMiss' },
      { kind: 'interstitial', placement: 'levelEnd' },
    ]);
    expect(new MockAds({ status: 'unavailable' }).isRewardedReady('nearMiss')).toBe(false);
  });

  it('MockIap achète, échoue et restaure', async () => {
    const iap = new MockIap([
      { id: 'noads', displayPrice: '3,99 €', type: 'nonConsumable' },
      { id: 'coins', displayPrice: '0,99 €', type: 'consumable' },
    ]);
    expect(await iap.purchase('noads')).toEqual({ status: 'purchased', productId: 'noads', transactionId: 'mock-1' });
    await iap.purchase('coins');
    expect(await iap.restore()).toEqual(['noads']);
    iap.result = { status: 'cancelled' };
    expect(await iap.purchase('coins')).toEqual({ status: 'cancelled' });
  });

  it('MockAnalytics et MockRemoteConfig', async () => {
    const a = new MockAnalytics();
    a.logEvent('level_start', { level: 1 });
    expect(a.events).toEqual([{ name: 'level_start', params: { level: 1 } }]);
    expect(await new MockRemoteConfig({ v: 1 }).fetch()).toEqual({ v: 1 });
    await expect(new MockRemoteConfig(new Error('offline')).fetch()).rejects.toThrow('offline');
  });
});
