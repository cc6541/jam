// Boucles de rétention (docs/GAME-DESIGN.md §4) : logique pure, testable, horloge fournie par l'appelant.
// Réglages groupés ici pour être déplacés tels quels dans la remote config quand on voudra les tester en A/B.
import type { LevelDef, LevelTier } from '@jam/engine-screw';
import { grantBooster, type BoosterId, type Wallet } from '@jam/shell';

export const META = {
  /** Multiplicateur de récompense par rôle de niveau : le risque doit payer. */
  tierMultiplier: { tutorial: 1, breather: 1, normal: 1, hard: 2, superHard: 3 } satisfies Record<LevelTier, number>,
  /** Bonus de série : +10 % par victoire consécutive, plafonné à +50 %. */
  streakStep: 0.1,
  streakCap: 5,
  lives: { max: 5, regenMs: 30 * 60_000, refillCost: 300 },
  /** Calendrier de 7 jours, croissant ; le 7e jour est un coffre. Un jour manqué fait repartir au jour 1. */
  daily: [
    { coins: 50 },
    { boosters: { undo: 1 } },
    { coins: 100 },
    { boosters: { addToolboxSlot: 1 } },
    { coins: 150 },
    { boosters: { clearToolbox: 1 } },
    { coins: 300, boosters: { undo: 1, addToolboxSlot: 1, clearToolbox: 1 } },
  ] satisfies Reward[],
  /** Coffre de progression : tous les N niveaux gagnés. */
  chestEvery: 10,
} as const;

export interface Reward {
  coins?: number;
  boosters?: Partial<Record<BoosterId, number>>;
}

export interface MetaState {
  /** Victoires consécutives (remise à 0 à la défaite). */
  streak: number;
  lives: { count: number; updatedAt: number };
  /** Dernier jour (AAAA-MM-JJ local) où la récompense quotidienne a été prise, et rang (1 à 7) de ce jour. */
  daily: { lastDay: string | null; index: number };
  chestsOpened: number;
  /** Nouveautés déjà présentées (cartes « Nouveau »). */
  intros: string[];
}

export const newMeta = (now: number): MetaState => ({
  streak: 0,
  lives: { count: META.lives.max, updatedAt: now },
  daily: { lastDay: null, index: 0 },
  chestsOpened: 0,
  intros: [],
});

// ---------- Récompenses ----------

export function applyReward(wallet: Wallet, reward: Reward): Wallet {
  let w: Wallet = { ...wallet, coins: wallet.coins + (reward.coins ?? 0) };
  for (const [id, n] of Object.entries(reward.boosters ?? {}) as [BoosterId, number][]) w = grantBooster(w, id, n);
  return w;
}

/** Multiplicateur total d'une victoire : rôle du niveau × bonus de série (avant cette victoire). */
export function winMultiplier(tier: LevelTier, streak: number): number {
  return META.tierMultiplier[tier] * (1 + META.streakStep * Math.min(streak, META.streakCap));
}

export const tierOfLevel = (level: LevelDef | undefined): LevelTier => level?.meta?.tier ?? 'normal';

// ---------- Vies ----------

/** Vies à l'instant `now`, recharge comprise ; `nextIn` : ms avant la prochaine vie (0 si pleines). */
export function livesAt(meta: MetaState, now: number): { count: number; nextIn: number; state: MetaState['lives'] } {
  const { max, regenMs } = META.lives;
  const { count, updatedAt } = meta.lives;
  if (count >= max) return { count, nextIn: 0, state: { count, updatedAt: now } };
  const elapsed = Math.max(0, now - updatedAt);
  const gained = Math.floor(elapsed / regenMs);
  const total = Math.min(max, count + gained);
  if (total >= max) return { count: max, nextIn: 0, state: { count: max, updatedAt: now } };
  const since = updatedAt + gained * regenMs;
  return { count: total, nextIn: regenMs - (now - since), state: { count: total, updatedAt: since } };
}

export function loseLife(meta: MetaState, now: number): MetaState {
  const { count, state } = livesAt(meta, now);
  // Le chrono de recharge démarre à la première vie perdue.
  const updatedAt = count >= META.lives.max ? now : state.updatedAt;
  return { ...meta, streak: 0, lives: { count: Math.max(0, count - 1), updatedAt } };
}

export function refillLives(meta: MetaState, now: number, amount: number = META.lives.max): MetaState {
  const { count, state } = livesAt(meta, now);
  return { ...meta, lives: { count: Math.min(META.lives.max, count + amount), updatedAt: state.updatedAt } };
}

// ---------- Série ----------

export const winStreak = (meta: MetaState): MetaState => ({ ...meta, streak: meta.streak + 1 });

// ---------- Récompense quotidienne ----------

export function dayKey(ms: number): string {
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Jour du calendrier proposé aujourd'hui (0 à 6), ou null si déjà pris aujourd'hui. */
export function dailyOffer(meta: MetaState, now: number): number | null {
  const today = dayKey(now);
  if (meta.daily.lastDay === today) return null;
  const yesterday = dayKey(now - 86_400_000);
  const continues = meta.daily.lastDay === yesterday;
  return continues ? meta.daily.index % META.daily.length : 0;
}

export function claimDaily(meta: MetaState, wallet: Wallet, now: number): { meta: MetaState; wallet: Wallet; reward: Reward } | null {
  const index = dailyOffer(meta, now);
  if (index === null) return null;
  const reward = META.daily[index] as Reward;
  return { meta: { ...meta, daily: { lastDay: dayKey(now), index: index + 1 } }, wallet: applyReward(wallet, reward), reward };
}

// ---------- Coffre de progression ----------

/** Avancement vers le prochain coffre (0 à chestEvery − 1) et coffres en attente d'ouverture. */
export function chestProgress(meta: MetaState, levelsWon: number): { progress: number; due: number } {
  const earned = Math.floor(levelsWon / META.chestEvery);
  return { progress: levelsWon % META.chestEvery, due: Math.max(0, earned - meta.chestsOpened) };
}

/** Contenu du coffre n° k : écrous + un booster qui varie d'un coffre à l'autre (récompense variable, sans paiement). */
export function chestReward(k: number): Reward {
  const boosters: BoosterId[] = ['addToolboxSlot', 'undo', 'clearToolbox'];
  const booster = boosters[(k * 7 + 3) % boosters.length] as BoosterId;
  return { coins: 100 + 25 * Math.min(k, 8), boosters: { [booster]: 1 + (k % 3 === 2 ? 1 : 0) } };
}

export function openChest(meta: MetaState, wallet: Wallet): { meta: MetaState; wallet: Wallet; reward: Reward } {
  const reward = chestReward(meta.chestsOpened);
  return { meta: { ...meta, chestsOpened: meta.chestsOpened + 1 }, wallet: applyReward(wallet, reward), reward };
}

// ---------- Nouveautés ----------

export type IntroId = 'multiTap';

/** Nouveauté à présenter avant ce niveau, si elle n'a pas encore été vue. */
export function introFor(meta: MetaState, level: LevelDef): IntroId | null {
  const hasMultiTap = level.screws.some((s) => s.kind.type === 'multiTap');
  return hasMultiTap && !meta.intros.includes('multiTap') ? 'multiTap' : null;
}

export const markIntro = (meta: MetaState, id: IntroId): MetaState => ({ ...meta, intros: [...meta.intros, id] });
