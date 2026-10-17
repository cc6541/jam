// Économie pure (pièces, boosters, tirelire). L'état est sauvegardé tel quel via JsonDoc.
import type { EconomyConfig } from './config';

export type BoosterId = 'undo' | 'addToolboxSlot' | 'clearToolbox';

export interface Wallet {
  coins: number;
  boosters: Record<BoosterId, number>;
  /** Tirelire : se remplit à chaque victoire, se casse contre un achat. */
  piggy: number;
}

export type EconomyResult = { ok: true; wallet: Wallet } | { ok: false; reason: 'insufficient' | 'empty' };

export function newWallet(config: EconomyConfig): Wallet {
  return { coins: config.startingCoins, boosters: { undo: 0, addToolboxSlot: 0, clearToolbox: 0 }, piggy: 0 };
}

/** Victoire : récompense (× multiplicateur d'événement) et dépôt dans la tirelire, plafonné. */
export function winLevel(wallet: Wallet, config: EconomyConfig, multiplier = 1): Wallet {
  return {
    ...wallet,
    coins: wallet.coins + Math.round(config.levelReward * multiplier),
    piggy: Math.min(config.piggy.capacity, wallet.piggy + config.piggy.perWin),
  };
}

export function spend(wallet: Wallet, cost: number): EconomyResult {
  if (cost < 0 || wallet.coins < cost) return { ok: false, reason: 'insufficient' };
  return { ok: true, wallet: { ...wallet, coins: wallet.coins - cost } };
}

export function buyBooster(wallet: Wallet, config: EconomyConfig, booster: BoosterId): EconomyResult {
  const paid = spend(wallet, config.boosterPrices[booster]);
  return paid.ok ? { ok: true, wallet: grantBooster(paid.wallet, booster, 1) } : paid;
}

export function grantBooster(wallet: Wallet, booster: BoosterId, count: number): Wallet {
  return { ...wallet, boosters: { ...wallet.boosters, [booster]: wallet.boosters[booster] + count } };
}

/** Consomme un booster possédé ; à défaut, l'achète au prix de la config. */
export function useBooster(wallet: Wallet, config: EconomyConfig, booster: BoosterId): EconomyResult {
  if (wallet.boosters[booster] > 0) return { ok: true, wallet: grantBooster(wallet, booster, -1) };
  return spend(wallet, config.boosterPrices[booster]);
}

/** Après l'achat IAP de la tirelire : son contenu passe en pièces. */
export function breakPiggy(wallet: Wallet): EconomyResult {
  if (wallet.piggy === 0) return { ok: false, reason: 'empty' };
  return { ok: true, wallet: { ...wallet, coins: wallet.coins + wallet.piggy, piggy: 0 } };
}

/** Interstitielle après le niveau `level` (1-based) ? Jamais si « sans pub » est possédé. */
export function shouldShowInterstitial(
  level: number,
  ads: { firstInterstitialLevel: number; interstitialEveryLevels: number },
  noAds: boolean,
): boolean {
  if (noAds || ads.interstitialEveryLevels <= 0 || level < ads.firstInterstitialLevel) return false;
  return (level - ads.firstInterstitialLevel) % ads.interstitialEveryLevels === 0;
}
