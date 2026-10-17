// Plafond de fréquence : pur, l'appelant persiste `PromoState` (ex. JsonDoc du shell, clés préfixées bundleId).
import type { CrossPromoConfig, Platform, PromoApp } from './config';
import { storeLink } from './links';

export interface PromoState {
  lastShownAt: number | null;
  /** Jour UTC (AAAA-MM-JJ) et nombre de cartes affichées ce jour-là. */
  day: { date: string; count: number };
  perApp: Record<string, number>;
}

export const newPromoState = (): PromoState => ({ lastShownAt: null, day: { date: '', count: 0 }, perApp: {} });

export interface PromoContext {
  /** `bundleId` de l'app courante (jamais promue à elle-même). */
  selfBundleId: string;
  platform: Platform;
  /** Niveaux terminés par le joueur. */
  levelsCompleted: number;
  nowMs: number;
  /** Le joueur a acheté « sans pub » : on ne le sollicite pas. */
  noAds?: boolean;
}

const HOUR = 3_600_000;
const dayOf = (ms: number) => new Date(ms).toISOString().slice(0, 10);

/** Carte à afficher maintenant, ou `undefined`. Choisit l'app la moins montrée. */
export function pickPromo(config: CrossPromoConfig, state: PromoState, ctx: PromoContext): PromoApp | undefined {
  const { cap } = config;
  if (ctx.noAds || ctx.levelsCompleted < cap.minLevel) return undefined;
  if (state.lastShownAt !== null && ctx.nowMs - state.lastShownAt < cap.minHoursBetween * HOUR) return undefined;
  if (ctx.nowMs < (state.lastShownAt ?? -Infinity)) return undefined; // horloge revenue en arrière
  const shownToday = state.day.date === dayOf(ctx.nowMs) ? state.day.count : 0;
  if (shownToday >= cap.maxPerDay) return undefined;

  return config.apps
    .filter((a) => a.bundleId !== ctx.selfBundleId)
    .filter((a) => (state.perApp[a.id] ?? 0) < cap.maxPerApp)
    .filter((a) => storeLink(a, ctx.platform, { source: 'x', placement: 'x' }) !== undefined)
    .sort((a, b) => (state.perApp[a.id] ?? 0) - (state.perApp[b.id] ?? 0))[0];
}

export function recordShown(state: PromoState, appId: string, nowMs: number): PromoState {
  const date = dayOf(nowMs);
  return {
    lastShownAt: nowMs,
    day: { date, count: (state.day.date === date ? state.day.count : 0) + 1 },
    perApp: { ...state.perApp, [appId]: (state.perApp[appId] ?? 0) + 1 },
  };
}
