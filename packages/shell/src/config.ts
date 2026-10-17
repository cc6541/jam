// Remote config : JSON statique (GitHub Pages), schéma versionné, copie de secours embarquée.
// Ordre de repli : JSON distant valide → dernier JSON distant valide en cache → copie embarquée.
import type { RemoteConfigPort, StoragePort } from './ports';

export interface EconomyConfig {
  startingCoins: number;
  levelReward: number;
  /** Prix en pièces de chaque booster. */
  boosterPrices: { undo: number; addToolboxSlot: number; clearToolbox: number };
  /** Seconde chance du near miss payée en pièces. */
  continueCost: number;
  piggy: { perWin: number; capacity: number };
}

export interface LiveEvent {
  id: string;
  /** ISO 8601. */
  start: string;
  end: string;
  coinMultiplier: number;
}

export interface RemoteConfig {
  schemaVersion: 1;
  economy: EconomyConfig;
  ads: { firstInterstitialLevel: number; interstitialEveryLevels: number };
  events: LiveEvent[];
}

export type ConfigSource = 'remote' | 'cache' | 'embedded';

const CACHE_KEY = 'remote-config';

class Invalid extends Error {}

const record = (v: unknown): Record<string, unknown> => {
  if (typeof v !== 'object' || v === null || Array.isArray(v)) throw new Invalid();
  return v as Record<string, unknown>;
};
const count = (v: unknown): number => {
  if (typeof v !== 'number' || !Number.isInteger(v) || v < 0) throw new Invalid();
  return v;
};
const date = (v: unknown): string => {
  if (typeof v !== 'string' || Number.isNaN(Date.parse(v))) throw new Invalid();
  return v;
};

/** Valide et ne garde que les champs connus (les champs inconnus sont ignorés, pas refusés). */
export function parseRemoteConfig(input: unknown): RemoteConfig | undefined {
  try {
    const root = record(input);
    if (root['schemaVersion'] !== 1) return undefined;
    const economy = record(root['economy']);
    const prices = record(economy['boosterPrices']);
    const piggy = record(economy['piggy']);
    const ads = record(root['ads']);
    const events = root['events'];
    if (!Array.isArray(events)) return undefined;
    return {
      schemaVersion: 1,
      economy: {
        startingCoins: count(economy['startingCoins']),
        levelReward: count(economy['levelReward']),
        continueCost: count(economy['continueCost']),
        boosterPrices: {
          undo: count(prices['undo']),
          addToolboxSlot: count(prices['addToolboxSlot']),
          clearToolbox: count(prices['clearToolbox']),
        },
        piggy: { perWin: count(piggy['perWin']), capacity: count(piggy['capacity']) },
      },
      ads: {
        firstInterstitialLevel: count(ads['firstInterstitialLevel']),
        interstitialEveryLevels: count(ads['interstitialEveryLevels']),
      },
      events: events.map((raw) => {
        const e = record(raw);
        const multiplier = e['coinMultiplier'];
        if (typeof e['id'] !== 'string' || typeof multiplier !== 'number' || multiplier <= 0) throw new Invalid();
        return { id: e['id'], start: date(e['start']), end: date(e['end']), coinMultiplier: multiplier };
      }),
    };
  } catch (error) {
    if (error instanceof Invalid) return undefined;
    throw error;
  }
}

/** `storage` doit être namespacé. Ne lève jamais : au pire, la copie embarquée. */
export async function loadRemoteConfig(
  port: RemoteConfigPort,
  storage: StoragePort,
  embedded: RemoteConfig,
): Promise<{ config: RemoteConfig; source: ConfigSource }> {
  try {
    const remote = parseRemoteConfig(await port.fetch());
    if (remote) {
      await storage.set(CACHE_KEY, JSON.stringify(remote));
      return { config: remote, source: 'remote' };
    }
  } catch {
    // Hors ligne ou CDN indisponible : on passe au cache.
  }
  try {
    const cached = parseRemoteConfig(JSON.parse((await storage.get(CACHE_KEY)) ?? 'null'));
    if (cached) return { config: cached, source: 'cache' };
  } catch {
    // Cache corrompu.
  }
  return { config: embedded, source: 'embedded' };
}

/** Multiplicateur de pièces des événements en cours (dates calculées côté client). */
export function coinMultiplier(config: RemoteConfig, nowMs: number): number {
  return config.events
    .filter((e) => Date.parse(e.start) <= nowMs && nowMs < Date.parse(e.end))
    .reduce((m, e) => Math.max(m, e.coinMultiplier), 1);
}
