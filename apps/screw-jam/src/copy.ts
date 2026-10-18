import type { Locale } from '@jam/ui';
import type { ProductId } from './products';

export const productCopy: Record<Locale, Record<ProductId, { title: string; detail?: string; badge?: string }>> = {
  fr: {
    starter: { title: 'Pack de démarrage', detail: '500 écrous + 3 boosters', badge: 'Une fois' },
    noads: { title: 'Sans pub', detail: 'Plus de pubs plein écran (les bonus restent optionnels)' },
    piggy: { title: 'Tirelire' },
    coins_s: { title: 'Écrous', detail: '400 écrous' },
    coins_m: { title: 'Sac d’écrous', detail: '1 300 écrous' },
    coins_l: { title: 'Coffre d’écrous', detail: '2 300 écrous', badge: 'Top' },
    coins_xl: { title: 'Trésor', detail: '5 000 écrous' },
  },
  en: {
    starter: { title: 'Starter pack', detail: '500 nuts + 3 boosters', badge: 'Once' },
    noads: { title: 'No ads', detail: 'No more full-screen ads (bonus ads stay optional)' },
    piggy: { title: 'Piggy bank' },
    coins_s: { title: 'Nuts', detail: '400 nuts' },
    coins_m: { title: 'Nut bag', detail: '1,300 nuts' },
    coins_l: { title: 'Nut chest', detail: '2,300 nuts', badge: 'Best' },
    coins_xl: { title: 'Treasure', detail: '5,000 nuts' },
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
