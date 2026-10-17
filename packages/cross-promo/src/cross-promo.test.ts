import { describe, expect, it } from 'vitest';
import { EMPTY_CONFIG, parseCrossPromo, type CrossPromoConfig, type PromoApp } from './config';
import { localized, storeLink } from './links';
import { newPromoState, pickPromo, recordShown, type PromoContext } from './picker';

const bolt: PromoApp = {
  id: 'bolt-jam',
  bundleId: 'com.jamfactory.boltjam',
  name: { en: 'Bolt Jam', fr: 'Bolt Jam FR' },
  tagline: { en: 'Sort the bolts' },
  iosAppId: '123456789',
  live: true,
};
const self: PromoApp = { ...bolt, id: 'screw-jam', bundleId: 'com.jamfactory.screwjam' };
const config: CrossPromoConfig = { ...EMPTY_CONFIG, apps: [self, bolt] };
const ctx: PromoContext = { selfBundleId: self.bundleId, platform: 'ios', levelsCompleted: 10, nowMs: Date.UTC(2026, 9, 17, 12) };

describe('liens Store traçables', () => {
  it('iOS : campagne dans ct ; Android : referrer UTM encodé', () => {
    const campaign = { source: 'screw-jam', placement: 'level_end' };
    expect(storeLink(bolt, 'ios', campaign)).toBe('https://apps.apple.com/app/id123456789?ct=xpromo_screw-jam_level_end');
    const android = storeLink(bolt, 'android', campaign) ?? '';
    expect(android.startsWith('https://play.google.com/store/apps/details?id=com.jamfactory.boltjam&referrer=')).toBe(true);
    expect(decodeURIComponent(android.split('referrer=')[1] ?? '')).toBe(
      'utm_source=screw-jam&utm_medium=crosspromo&utm_campaign=xpromo_screw-jam_level_end',
    );
  });

  it('aucun lien tant que l’app n’est pas publiée', () => {
    expect(storeLink({ ...bolt, live: false }, 'android', { source: 'a', placement: 'b' })).toBeUndefined();
    const { iosAppId: _unused, ...noIos } = bolt;
    expect(storeLink(noIos, 'ios', { source: 'a', placement: 'b' })).toBeUndefined();
  });

  it('textes localisés avec repli sur l’anglais', () => {
    expect(localized(bolt.name, 'fr-FR')).toBe('Bolt Jam FR');
    expect(localized(bolt.tagline, 'fr')).toBe('Sort the bolts');
  });
});

describe('plafond de fréquence', () => {
  it('ne promeut jamais l’app courante et choisit une autre app', () => {
    expect(pickPromo(config, newPromoState(), ctx)?.id).toBe('bolt-jam');
    expect(pickPromo({ ...config, apps: [self] }, newPromoState(), ctx)).toBeUndefined();
  });

  it('attend le niveau minimum et respecte « sans pub »', () => {
    expect(pickPromo(config, newPromoState(), { ...ctx, levelsCompleted: 7 })).toBeUndefined();
    expect(pickPromo(config, newPromoState(), { ...ctx, noAds: true })).toBeUndefined();
  });

  it('espace les cartes (24 h) et plafonne par jour et par app', () => {
    let state = recordShown(newPromoState(), 'bolt-jam', ctx.nowMs);
    expect(pickPromo(config, state, { ...ctx, nowMs: ctx.nowMs + 3_600_000 })).toBeUndefined();
    expect(pickPromo(config, state, { ...ctx, nowMs: ctx.nowMs + 25 * 3_600_000 })?.id).toBe('bolt-jam');
    state = recordShown(recordShown(state, 'bolt-jam', ctx.nowMs + 25 * 3_600_000), 'bolt-jam', ctx.nowMs + 50 * 3_600_000);
    expect(state.perApp['bolt-jam']).toBe(3);
    expect(pickPromo(config, state, { ...ctx, nowMs: ctx.nowMs + 80 * 3_600_000 })).toBeUndefined();
    const sameDay = recordShown(newPromoState(), 'x', ctx.nowMs);
    expect(sameDay.day).toEqual({ date: '2026-10-17', count: 1 });
    const loose: CrossPromoConfig = { ...config, cap: { ...config.cap, minHoursBetween: 0 } };
    expect(pickPromo(loose, sameDay, { ...ctx, nowMs: ctx.nowMs + 1000 })).toBeUndefined();
    expect(pickPromo(loose, sameDay, { ...ctx, nowMs: ctx.nowMs + 13 * 3_600_000 })?.id).toBe('bolt-jam');
  });

  it('refuse une horloge revenue en arrière', () => {
    const state = recordShown(newPromoState(), 'bolt-jam', ctx.nowMs);
    expect(pickPromo(config, state, { ...ctx, nowMs: ctx.nowMs - 1000 })).toBeUndefined();
  });

  it('privilégie l’app la moins montrée', () => {
    const other = { ...bolt, id: 'nut-jam', bundleId: 'com.jamfactory.nutjam', iosAppId: '987654321' };
    const cfg = { ...config, apps: [self, bolt, other] };
    const state = { ...newPromoState(), perApp: { 'bolt-jam': 2 } };
    expect(pickPromo(cfg, state, ctx)?.id).toBe('nut-jam');
  });
});

describe('parseCrossPromo', () => {
  const json = {
    schemaVersion: 1,
    cap: EMPTY_CONFIG.cap,
    apps: [{ ...bolt, extra: 'ignoré' }],
  };

  it('valide, ignore les champs inconnus', () => {
    const parsed = parseCrossPromo(json);
    expect(parsed?.apps[0]).toEqual(bolt);
  });

  it('rejette un contenu invalide', () => {
    expect(parseCrossPromo(null)).toBeUndefined();
    expect(parseCrossPromo({ ...json, schemaVersion: 2 })).toBeUndefined();
    expect(parseCrossPromo({ ...json, cap: { ...EMPTY_CONFIG.cap, maxPerDay: -1 } })).toBeUndefined();
    expect(parseCrossPromo({ ...json, apps: [{ ...bolt, name: { fr: 'sans en' } }] })).toBeUndefined();
    expect(parseCrossPromo({ ...json, apps: [{ ...bolt, iosAppId: 'abc' }] })?.apps[0]?.iosAppId).toBeUndefined();
  });
});
