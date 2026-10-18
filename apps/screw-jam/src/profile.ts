// État persistant du joueur et transitions pures (testables sans React ni Pixi).
import { newPromoState, type PromoState } from '@jam/cross-promo';
import {
  breakPiggy,
  grantBooster,
  newWallet,
  winLevel,
  type EconomyConfig,
  type RemoteConfig,
  type Wallet,
} from '@jam/shell';
import { PRODUCTS, STARTER_BOOSTERS, type ProductId } from './products';

export interface Settings {
  sound: boolean;
  haptics: boolean;
}

export const DEFAULT_SETTINGS: Settings = { sound: true, haptics: true };

export interface Profile {
  wallet: Wallet;
  /** Prochain niveau à jouer (1-based). */
  nextLevel: number;
  noAds: boolean;
  starterBought: boolean;
  promo: PromoState;
  settings: Settings;
}

export const PROFILE_VERSION = 1;

/** Sauvegardes antérieures aux réglages : on complète sans changer de version. */
export function withDefaults(profile: Profile): Profile {
  return { ...profile, settings: { ...DEFAULT_SETTINGS, ...profile.settings } };
}

export const newProfile = (economy: EconomyConfig): Profile => ({
  wallet: newWallet(economy),
  nextLevel: 1,
  noAds: false,
  starterBought: false,
  promo: newPromoState(),
  settings: { ...DEFAULT_SETTINGS },
});

/** Bonus en écrous (ex. récompense multipliée après une pub). */
export function grantCoins(profile: Profile, coins: number): Profile {
  return { ...profile, wallet: { ...profile.wallet, coins: profile.wallet.coins + Math.max(0, Math.round(coins)) } };
}

/** Victoire du niveau `level` : récompense et progression (jamais en arrière). */
export function completeLevel(profile: Profile, level: number, config: RemoteConfig, multiplier: number): Profile {
  return {
    ...profile,
    wallet: winLevel(profile.wallet, config.economy, multiplier),
    nextLevel: Math.max(profile.nextLevel, level + 1),
  };
}

/** Applique un achat réussi (ou restauré). Renvoie le profil inchangé si l'achat n'a pas d'effet. */
export function grantPurchase(profile: Profile, id: ProductId): Profile {
  const def = PRODUCTS.find((p) => p.id === id);
  if (!def) return profile;
  switch (id) {
    case 'noads':
      return { ...profile, noAds: true };
    case 'piggy': {
      const broken = breakPiggy(profile.wallet);
      return broken.ok ? { ...profile, wallet: broken.wallet } : profile;
    }
    case 'starter': {
      if (profile.starterBought) return profile;
      let wallet: Wallet = { ...profile.wallet, coins: profile.wallet.coins + (def.coins ?? 0) };
      for (const [booster, n] of Object.entries(STARTER_BOOSTERS) as [keyof typeof STARTER_BOOSTERS, number][]) {
        wallet = grantBooster(wallet, booster, n);
      }
      return { ...profile, wallet, starterBought: true };
    }
    default:
      return { ...profile, wallet: { ...profile.wallet, coins: profile.wallet.coins + (def.coins ?? 0) } };
  }
}

/** La tirelire ne se vend que si elle contient quelque chose ; le pack de démarrage une seule fois. */
export function isAvailable(profile: Profile, id: ProductId): boolean {
  if (id === 'piggy') return profile.wallet.piggy > 0;
  if (id === 'starter') return !profile.starterBought && profile.nextLevel >= 8;
  return true;
}

export function isOwned(profile: Profile, id: ProductId): boolean {
  return (id === 'noads' && profile.noAds) || (id === 'starter' && profile.starterBought);
}
