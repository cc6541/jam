import type { Platform, PromoApp } from './config';

export interface Campaign {
  /** App qui affiche la carte (`id` de l'app source). */
  source: string;
  /** Emplacement : `level_end`, `home`... */
  placement: string;
}

/** Lien Store traçable ; `undefined` si l'app n'est pas publiée sur cette plateforme. */
export function storeLink(app: PromoApp, platform: Platform, campaign: Campaign): string | undefined {
  if (!app.live) return undefined;
  const name = `xpromo_${campaign.source}_${campaign.placement}`;
  if (platform === 'ios') {
    if (!app.iosAppId) return undefined;
    // `ct` : nom de campagne dans App Store Connect (campaign links), sans jeton de fournisseur.
    return `https://apps.apple.com/app/id${app.iosAppId}?ct=${encodeURIComponent(name)}`;
  }
  const referrer = `utm_source=${campaign.source}&utm_medium=crosspromo&utm_campaign=${name}`;
  return `https://play.google.com/store/apps/details?id=${encodeURIComponent(app.bundleId)}&referrer=${encodeURIComponent(referrer)}`;
}

export function localized(texts: Record<string, string>, locale: string): string {
  return texts[locale.slice(0, 2).toLowerCase()] ?? texts['en'] ?? '';
}
