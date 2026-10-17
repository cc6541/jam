// Forme de la config distante statique (docs/MONETIZATION.md, docs/ZERO-INFRA.md).
// L'app embarque une copie complète ; la version distante ne fait que la remplacer si elle est valide.

export interface RemoteConfig {
  schemaVersion: 1;
  lives: { max: number; regenMinutes: number };
  revive: { nearMissMaxRemaining: number; offerSeconds: number; coinPrices: number[] };
  ads: {
    interstitialFromLevel: number;
    interstitialMinSeconds: number;
    maxInterstitialsPerSession: number;
  };
  rewards: { coinsPerWin: number; winStreakMax: number; chestEveryLevels: number; dailyRewards: number[] };
  offers: Offer[];
  events: LiveEvent[];
  crossPromo: CrossPromoCard[];
  /** Variantes d'A/B test : nom du test → liste de variantes (tirage par hash de l'install ID). */
  experiments: Record<string, string[]>;
}

export interface Offer {
  id: string;
  productId: string;
  trigger: { fromLevel: number; toLevel: number };
  durationHours: number;
}

export interface LiveEvent {
  id: string;
  kind: 'coinMultiplier' | 'weeklyChallenge';
  startsAt: string; // ISO 8601
  endsAt: string;
  value: number;
}

export interface CrossPromoCard {
  bundleId: string;
  title: string;
  imageUrl: string;
  storeUrl: { ios: string; android: string };
  /** Nombre maximal d'affichages par jour. */
  dailyCap: number;
}
