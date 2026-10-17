// Cross-promo : seul lien autorisé entre apps (invariant 3). JSON statique, schéma versionné,
// aucun serveur : les cartes viennent de `config/cross-promo.json` (GitHub Pages) ou de la copie embarquée.

export type Platform = 'ios' | 'android';

export interface PromoApp {
  id: string;
  bundleId: string;
  /** Texte par langue ; repli sur `en`. */
  name: Record<string, string>;
  tagline: Record<string, string>;
  /** Absent tant que l'app n'est pas publiée sur ce Store : aucune carte, aucun faux lien. */
  iosAppId?: string;
  live: boolean;
}

export interface FrequencyCap {
  /** Pas de carte avant ce niveau terminé. */
  minLevel: number;
  maxPerDay: number;
  minHoursBetween: number;
  maxPerApp: number;
}

export interface CrossPromoConfig {
  schemaVersion: 1;
  apps: PromoApp[];
  cap: FrequencyCap;
}

export const EMPTY_CONFIG: CrossPromoConfig = {
  schemaVersion: 1,
  apps: [],
  cap: { minLevel: 8, maxPerDay: 1, minHoursBetween: 24, maxPerApp: 3 },
};

class Invalid extends Error {}

const rec = (v: unknown): Record<string, unknown> => {
  if (typeof v !== 'object' || v === null || Array.isArray(v)) throw new Invalid();
  return v as Record<string, unknown>;
};
const str = (v: unknown): string => {
  if (typeof v !== 'string' || v === '') throw new Invalid();
  return v;
};
const count = (v: unknown): number => {
  if (typeof v !== 'number' || !Number.isInteger(v) || v < 0) throw new Invalid();
  return v;
};
const texts = (v: unknown): Record<string, string> => {
  const r = rec(v);
  if (typeof r['en'] !== 'string') throw new Invalid();
  return Object.fromEntries(Object.entries(r).filter((e): e is [string, string] => typeof e[1] === 'string'));
};

/** Valide le JSON statique ; les champs inconnus sont ignorés, un contenu invalide donne `undefined`. */
export function parseCrossPromo(input: unknown): CrossPromoConfig | undefined {
  try {
    const root = rec(input);
    if (root['schemaVersion'] !== 1 || !Array.isArray(root['apps'])) return undefined;
    const cap = rec(root['cap']);
    return {
      schemaVersion: 1,
      cap: {
        minLevel: count(cap['minLevel']),
        maxPerDay: count(cap['maxPerDay']),
        minHoursBetween: count(cap['minHoursBetween']),
        maxPerApp: count(cap['maxPerApp']),
      },
      apps: root['apps'].map((raw) => {
        const a = rec(raw);
        const app: PromoApp = {
          id: str(a['id']),
          bundleId: str(a['bundleId']),
          name: texts(a['name']),
          tagline: texts(a['tagline']),
          live: a['live'] === true,
        };
        if (typeof a['iosAppId'] === 'string' && /^\d+$/.test(a['iosAppId'])) app.iosAppId = a['iosAppId'];
        return app;
      }),
    };
  } catch (error) {
    if (error instanceof Invalid) return undefined;
    throw error;
  }
}
