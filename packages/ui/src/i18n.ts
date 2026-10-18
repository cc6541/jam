export type Locale = 'fr' | 'en';

const fr = {
  play: 'Jouer',
  level: 'Niveau',
  shop: 'Boutique',
  close: 'Fermer',
  coins: 'Écrous',
  buy: 'Acheter',
  free: 'Gratuit',
  owned: 'Acquis',
  restore: 'Restaurer mes achats',
  retry: 'Rejouer',
  next: 'Niveau suivant',
  home: 'Accueil',
  victory: 'Bravo !',
  defeat: 'Plus de place !',
  reward: 'Récompense',
  nearMissTitle: 'Presque !',
  nearMissBody: 'Il ne reste que {n} vis. Une place en plus et c’est gagné.',
  nearMissAd: 'Regarder une pub',
  nearMissCoins: 'Utiliser {n} écrous',
  nearMissGiveUp: 'Abandonner',
  nearMissTimeLeft: 'Offre : {n} s',
  undo: 'Annuler',
  addSlot: '+1 case',
  clearToolbox: 'Vider',
  toolbox: 'Toolbox',
  promoTitle: 'À essayer aussi',
  promoInstall: 'Découvrir',
  promoLater: 'Plus tard',
  howTo: 'Dévisse les vis libres et range-les dans la boîte de leur couleur. Chaque couleur a aussi un motif.',
  mockBadge: 'Mode démo : achats et pubs simulés',
};

type Strings = typeof fr;

const en: Strings = {
  play: 'Play',
  level: 'Level',
  shop: 'Shop',
  close: 'Close',
  coins: 'Nuts',
  buy: 'Buy',
  free: 'Free',
  owned: 'Owned',
  restore: 'Restore purchases',
  retry: 'Retry',
  next: 'Next level',
  home: 'Home',
  victory: 'Well done!',
  defeat: 'No room left!',
  reward: 'Reward',
  nearMissTitle: 'So close!',
  nearMissBody: 'Only {n} screws left. One more slot and you win.',
  nearMissAd: 'Watch an ad',
  nearMissCoins: 'Use {n} nuts',
  nearMissGiveUp: 'Give up',
  nearMissTimeLeft: 'Offer: {n}s',
  undo: 'Undo',
  addSlot: '+1 slot',
  clearToolbox: 'Clear',
  toolbox: 'Toolbox',
  promoTitle: 'You may also like',
  promoInstall: 'Check it out',
  promoLater: 'Later',
  howTo: 'Unscrew free screws and drop them in the box of their colour. Every colour also has a pattern.',
  mockBadge: 'Demo mode: purchases and ads are simulated',
};

export type StringKey = keyof Strings;

export function createT(locale: Locale): (key: StringKey, vars?: Record<string, string | number>) => string {
  const table = locale === 'fr' ? fr : en;
  return (key, vars = {}) => table[key].replace(/\{(\w+)\}/g, (_, name: string) => String(vars[name] ?? ''));
}

export function pickLocale(language: string): Locale {
  return language.toLowerCase().startsWith('fr') ? 'fr' : 'en';
}
