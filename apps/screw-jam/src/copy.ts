import type { Locale } from '@jam/ui';
import type { ProductId } from './products';

export const productCopy: Record<Locale, Record<ProductId, { title: string; detail?: string; badge?: string }>> = {
  fr: {
    starter: { title: 'Pack de démarrage', detail: '500 pièces + 3 boosters', badge: 'Une fois' },
    noads: { title: 'Sans pub', detail: 'Plus de pubs plein écran (les bonus restent optionnels)' },
    piggy: { title: 'Tirelire' },
    coins_s: { title: 'Pièces', detail: '400 pièces' },
    coins_m: { title: 'Sac de pièces', detail: '1 300 pièces' },
    coins_l: { title: 'Coffre de pièces', detail: '2 300 pièces', badge: 'Top' },
    coins_xl: { title: 'Trésor', detail: '5 000 pièces' },
  },
  en: {
    starter: { title: 'Starter pack', detail: '500 coins + 3 boosters', badge: 'Once' },
    noads: { title: 'No ads', detail: 'No more full-screen ads (bonus ads stay optional)' },
    piggy: { title: 'Piggy bank' },
    coins_s: { title: 'Coins', detail: '400 coins' },
    coins_m: { title: 'Coin bag', detail: '1,300 coins' },
    coins_l: { title: 'Coin chest', detail: '2,300 coins', badge: 'Best' },
    coins_xl: { title: 'Treasure', detail: '5,000 coins' },
  },
};

export const colorNames: Record<Locale, Record<string, string>> = {
  fr: { red: 'Rouge à points', blue: 'Bleu à rayures', yellow: 'Jaune à croix', green: 'Vert à vagues', purple: 'Violet à grille', orange: 'Orange à anneau' },
  en: { red: 'Red dots', blue: 'Blue stripes', yellow: 'Yellow cross', green: 'Green waves', purple: 'Purple grid', orange: 'Orange ring' },
};

export const boosterNames: Record<Locale, Record<'undo' | 'addToolboxSlot' | 'clearToolbox', string>> = {
  fr: { undo: 'Annuler', addToolboxSlot: '+1 case', clearToolbox: 'Vider' },
  en: { undo: 'Undo', addToolboxSlot: '+1 slot', clearToolbox: 'Clear' },
};
