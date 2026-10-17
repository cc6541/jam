// Ports du shell : seule frontière avec les SDK natifs (pubs, achats, analytics) et la plateforme.
// Gelés après la phase 1 : toute modification passe par une note dans docs/decisions/.
// Aucun port n'appelle de serveur à nous (docs/ZERO-INFRA.md).

/** Stockage clé/valeur brut. Le préfixe `bundleId` est ajouté par la couche save, pas par le port. */
export interface StoragePort {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  remove(key: string): Promise<void>;
  keys(): Promise<string[]>;
}

/** Heure murale en millisecondes epoch. Le shell se protège des retours en arrière. */
export interface ClockPort {
  now(): number;
}

export type AdPlacement = string;
export type RewardedResult = { status: 'rewarded' } | { status: 'skipped' } | { status: 'unavailable' };

export interface AdsPort {
  init(): Promise<void>;
  isRewardedReady(placement: AdPlacement): boolean;
  showRewarded(placement: AdPlacement): Promise<RewardedResult>;
  /** Résout quand la pub est fermée, ou immédiatement si aucune n'est disponible. */
  showInterstitial(placement: AdPlacement): Promise<void>;
}

export interface Product {
  id: string;
  /** Prix localisé fourni par le Store, à afficher tel quel. */
  displayPrice: string;
  type: 'consumable' | 'nonConsumable';
}

export type PurchaseResult =
  | { status: 'purchased'; productId: string; transactionId: string }
  | { status: 'cancelled' }
  | { status: 'pending' }
  | { status: 'failed'; error: string };

export interface IapPort {
  getProducts(ids: string[]): Promise<Product[]>;
  purchase(productId: string): Promise<PurchaseResult>;
  /** Ids des achats non consommables à restaurer. */
  restore(): Promise<string[]>;
}

export type AnalyticsValue = string | number | boolean;

export interface AnalyticsPort {
  logEvent(name: string, params?: Record<string, AnalyticsValue>): void;
  setUserProperty(name: string, value: string): void;
}

/** JSON statique (CDN gratuit). Le shell valide le contenu et retombe sur sa copie embarquée. */
export interface RemoteConfigPort {
  fetch(): Promise<unknown>;
}
