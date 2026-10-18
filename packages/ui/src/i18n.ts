export type Locale = 'fr' | 'en';

const fr = {
  play: 'Jouer',
  level: 'Niveau',
  hard: 'Difficile',
  shop: 'Boutique',
  settings: 'Réglages',
  close: 'Fermer',
  coins: 'Écrous',
  addCoins: 'Obtenir des écrous',
  owned: 'Acquis',
  restore: 'Restaurer mes achats',
  sound: 'Sons',
  haptics: 'Vibrations',
  retry: 'Rejouer',
  continue: 'Continuer',
  home: 'Accueil',
  levelComplete: 'Niveau terminé !',
  triple: 'x3 avec une pub',
  defeat: 'Plus de place !',
  defeatBody: 'La zone tampon est pleine. Prends le temps de repérer les vis libres de la bonne couleur.',
  nearMissTitle: 'Presque !',
  nearMissBody: 'Plus que {n} vis. Ajoute une case et termine le niveau.',
  nearMissAd: 'Gratuit',
  nearMissGiveUp: 'Abandonner',
  nearMissTimeLeft: 'Offre : {n} s',
  progress: 'Progression du niveau',
  undo: 'Annuler',
  addSlot: '+1 case',
  clearToolbox: 'Vider',
  promoTitle: 'À essayer aussi',
  promoInstall: 'Découvrir',
  promoLater: 'Plus tard',
  howTo: 'Touche les vis libres : elles vont dans la caisse de leur couleur, sinon dans la zone tampon.',
  patterns: 'Chaque couleur a son motif',
  mockBadge: 'Mode démo : achats et pubs simulés',
};

type Strings = typeof fr;

const en: Strings = {
  play: 'Play',
  level: 'Level',
  hard: 'Hard',
  shop: 'Shop',
  settings: 'Settings',
  close: 'Close',
  coins: 'Nuts',
  addCoins: 'Get nuts',
  owned: 'Owned',
  restore: 'Restore purchases',
  sound: 'Sound',
  haptics: 'Vibration',
  retry: 'Retry',
  continue: 'Continue',
  home: 'Home',
  levelComplete: 'Level complete!',
  triple: 'x3 with an ad',
  defeat: 'No room left!',
  defeatBody: 'The buffer is full. Take a moment to spot free screws of the right colour.',
  nearMissTitle: 'So close!',
  nearMissBody: 'Only {n} screws left. Add a slot and finish the level.',
  nearMissAd: 'Free',
  nearMissGiveUp: 'Give up',
  nearMissTimeLeft: 'Offer: {n}s',
  progress: 'Level progress',
  undo: 'Undo',
  addSlot: '+1 slot',
  clearToolbox: 'Clear',
  promoTitle: 'You may also like',
  promoInstall: 'Check it out',
  promoLater: 'Later',
  howTo: 'Tap free screws: they go to the box of their colour, otherwise to the buffer.',
  patterns: 'Every colour has its pattern',
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
