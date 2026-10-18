// Catalogue de lancement : docs/decisions/0005-prix-et-economie-v0.md (hypothèses à tester).
// Les prix sont des tiers Store ; le prix affiché réel vient du Store (IapPort.getProducts).
import type { Product } from '@jam/shell';

export type ProductId = 'noads' | 'starter' | 'coins_s' | 'coins_m' | 'coins_l' | 'coins_xl' | 'piggy';

export interface ProductDef {
  id: ProductId;
  type: Product['type'];
  /** Prix du tier, en unité monétaire (USD ou EUR selon le Store). */
  tier: number;
  coins?: number;
  badge?: 'best' | 'once';
}

export const PRODUCTS: ProductDef[] = [
  { id: 'starter', type: 'nonConsumable', tier: 1.99, coins: 500, badge: 'once' },
  { id: 'noads', type: 'nonConsumable', tier: 3.99 },
  { id: 'piggy', type: 'consumable', tier: 2.99 },
  { id: 'coins_s', type: 'consumable', tier: 0.99, coins: 400 },
  { id: 'coins_m', type: 'consumable', tier: 2.99, coins: 1300 },
  { id: 'coins_l', type: 'consumable', tier: 4.99, coins: 2300 },
  { id: 'coins_xl', type: 'consumable', tier: 9.99, coins: 5000, badge: 'best' },
];

export const STARTER_BOOSTERS = { undo: 1, addToolboxSlot: 1, clearToolbox: 1 } as const;

/** Prix d'affichage du mock (le vrai Store renvoie un prix localisé). */
export function mockPrice(tier: number, locale: 'fr' | 'en'): string {
  return new Intl.NumberFormat(locale === 'fr' ? 'fr-FR' : 'en-US', {
    style: 'currency',
    currency: locale === 'fr' ? 'EUR' : 'USD',
  }).format(tier);
}

export function mockCatalog(locale: 'fr' | 'en'): Product[] {
  return PRODUCTS.map((p) => ({ id: p.id, type: p.type, displayPrice: mockPrice(p.tier, locale) }));
}
