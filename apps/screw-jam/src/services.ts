import { parseCrossPromo, EMPTY_CONFIG, type CrossPromoConfig, type Platform } from '@jam/cross-promo';
import type { LevelDef } from '@jam/engine-screw';
import {
  JsonDoc,
  loadRemoteConfig,
  MockAds,
  MockIap,
  MonotonicClock,
  NamespacedStorage,
  parseRemoteConfig,
  type RemoteConfig,
} from '@jam/shell';
import { createT, pickLocale, type Locale } from '@jam/ui';
import appConfig from '../app.config.json';
import embeddedCrossPromo from '../config/cross-promo.json';
import embeddedRemote from '../config/remote-config.json';
import { detectPlatform, FetchRemoteConfig, LocalStorageAdapter, systemClock } from './platform';
import { mockCatalog } from './products';
import { newProfile, PROFILE_VERSION, type Profile } from './profile';

export interface Services {
  bundleId: string;
  locale: Locale;
  t: ReturnType<typeof createT>;
  platform: Platform;
  storage: NamespacedStorage;
  clock: MonotonicClock;
  config: RemoteConfig;
  promoConfig: CrossPromoConfig;
  levels: LevelDef[];
  ads: MockAds;
  iap: MockIap;
  profileDoc: JsonDoc<Profile>;
  /** Vrai tant que pubs et achats sont des simulations. */
  mock: boolean;
}

const levelFiles = import.meta.glob<LevelDef>('../levels/*.json', { eager: true, import: 'default' });

export async function createServices(): Promise<Services> {
  const storage = new NamespacedStorage(new LocalStorageAdapter(), appConfig.bundleId);
  const clock = await MonotonicClock.create(systemClock, storage);
  const embedded = parseRemoteConfig(embeddedRemote);
  if (!embedded) throw new Error('config/remote-config.json invalide');

  const [{ config }, promoConfig] = await Promise.all([
    loadRemoteConfig(new FetchRemoteConfig('./config/remote-config.json'), storage, embedded),
    new FetchRemoteConfig('./config/cross-promo.json')
      .fetch()
      .then((json) => parseCrossPromo(json))
      .catch(() => undefined),
  ]);

  const locale = pickLocale(navigator.language);
  const levels = Object.keys(levelFiles)
    .sort()
    .map((k) => levelFiles[k] as LevelDef);
  const profileDoc = new JsonDoc<Profile>(storage, 'profile', PROFILE_VERSION, () => newProfile(config.economy));

  return {
    bundleId: appConfig.bundleId,
    locale,
    t: createT(locale),
    platform: detectPlatform(),
    storage,
    clock,
    config,
    promoConfig: promoConfig ?? parseCrossPromo(embeddedCrossPromo) ?? EMPTY_CONFIG,
    levels,
    ads: new MockAds(),
    iap: new MockIap(mockCatalog(locale)),
    profileDoc,
    mock: true,
  };
}
