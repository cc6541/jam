// Ports du shell : tout ce qui touche à la plateforme passe par ces interfaces.
// Implémentations réelles (Capacitor, SDK) en phase 5 ; mocks dans ./mocks pour le dev et les tests.
// Aucun port ne suppose de serveur (docs/ZERO-INFRA.md).

/** Stockage clé/valeur local. Toujours utilisé via `namespacedStorage` (clés préfixées par le bundleId). */
export interface StoragePort {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  remove(key: string): Promise<void>;
  keys(): Promise<string[]>;
}

/** Horloge. `now` = heure murale (peut être trichée), `monotonic` = temps écoulé fiable depuis le lancement. */
export interface ClockPort {
  now(): number;
  monotonic(): number;
}

export type AdPlacement = 'revive' | 'doubleReward' | 'freeBooster' | 'life' | 'interstitial';
export type AdResult = 'completed' | 'skipped' | 'unavailable';

export interface AdsPort {
  isReady(kind: 'rewarded' | 'interstitial'): boolean;
  /** Une pub récompensée n'accorde la récompense que si le résultat est `completed`. */
  showRewarded(placement: Exclude<AdPlacement, 'interstitial'>): Promise<AdResult>;
  showInterstitial(): Promise<AdResult>;
}

export interface IapProduct {
  id: string;
  /** Prix localisé fourni par le store, à afficher tel quel. */
  displayPrice: string;
}

export type PurchaseResult = { status: 'purchased'; productId: string } | { status: 'cancelled' | 'failed' };

export interface IapPort {
  products(ids: string[]): Promise<IapProduct[]>;
  purchase(productId: string): Promise<PurchaseResult>;
  /** Achats non consommables déjà possédés (ex. « Sans pub »), vérifiés sur l'appareil. */
  owned(): Promise<string[]>;
}

export type AnalyticsValue = string | number | boolean;

export interface AnalyticsPort {
  event(name: string, params?: Record<string, AnalyticsValue>): void;
  setUserProperty(name: string, value: string): void;
}

/** Lit la config distante statique (JSON sur GitHub Pages) ; renvoie `null` si indisponible. */
export interface RemoteConfigPort {
  fetch(): Promise<{ json: unknown; serverDate: number | null } | null>;
}

export type HapticKind =
  | 'selection'
  | 'light'
  | 'medium'
  | 'heavy'
  | 'success'
  | 'warning'
  | 'error';

/** Retours sensoriels (docs/JUICE.md). Les réglages joueur sont appliqués par l'implémentation. */
export interface FeedbackPort {
  haptic(kind: HapticKind): void;
  /** `pitch` : multiplicateur de hauteur (1 = normal). */
  sound(id: string, options?: { pitch?: number; volume?: number }): void;
  music(track: string | null, layers?: string[]): void;
}

/** Notifications locales planifiées sur l'appareil (pas de push serveur). */
export interface NotificationsPort {
  requestPermission(): Promise<boolean>;
  schedule(id: string, at: number, title: string, body: string): Promise<void>;
  cancel(id: string): Promise<void>;
}

export interface Ports {
  storage: StoragePort;
  clock: ClockPort;
  ads: AdsPort;
  iap: IapPort;
  analytics: AnalyticsPort;
  remoteConfig: RemoteConfigPort;
  feedback: FeedbackPort;
  notifications: NotificationsPort;
}
