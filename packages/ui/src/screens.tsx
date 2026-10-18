import type { CSSProperties, ReactNode } from 'react';
import type { StringKey } from './i18n';
import { useEffect, useState } from 'react';
import {
  AdIcon,
  BoosterGlyph,
  CheckIcon,
  ChestIcon,
  FlameIcon,
  GearIcon,
  GiftIcon,
  HeartIcon,
  HelpIcon,
  NutIcon,
  PlusIcon,
  ProductArt,
  ScrewArt,
  ShopIcon,
  type BoosterIcon,
  type ProductIcon,
} from './icons';
import { Button, Modal, Switch } from './primitives';

type T = (key: StringKey, vars?: Record<string, string | number>) => string;

/** Difficulté affichée d'un niveau (les rôles « respiration » et « prise en main » s'affichent comme normal). */
export type Difficulty = 'normal' | 'hard' | 'superHard';

const formatNumber = (n: number) => new Intl.NumberFormat().format(n);

/** mm:ss pour les minuteurs (recharge des vies). */
export const formatDuration = (ms: number) => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

export function DifficultyBadge({ t, difficulty, inline }: { t: T; difficulty: Difficulty; inline?: boolean }) {
  if (difficulty === 'normal') return null;
  return (
    <span className={`jam-hard${difficulty === 'superHard' ? ' jam-hard--super' : ''}${inline ? ' jam-hard--inline' : ''}`}>
      {difficulty === 'superHard' ? t('superHard') : t('hard')}
    </span>
  );
}

function CoinsButton({ t, coins, onShop }: { t: T; coins: number; onShop: () => void }) {
  return (
    <button type="button" className="jam-coins" onClick={onShop} aria-label={`${t('coins')}: ${coins}. ${t('addCoins')}`}>
      <NutIcon size={24} />
      {/* La clé change avec le solde : le chiffre « saute » à chaque gain. */}
      <span key={coins} className="jam-coins__value">
        {formatNumber(coins)}
      </span>
      <span className="jam-coins__plus">
        <PlusIcon size={14} />
      </span>
    </button>
  );
}

export function StreakChip({ t, streak }: { t: T; streak: number }) {
  if (streak < 1) return null;
  return (
    <span className="jam-streak" aria-label={`${t('streak')} : ${streak}`}>
      <FlameIcon size={18} />
      {streak}
    </span>
  );
}

// ---------- Jeu ----------

/** Barre du haut : réglages, niveau (badge de difficulté, série), écrous avec accès boutique. */
export function TopBar({
  t,
  level,
  difficulty = 'normal',
  streak = 0,
  coins,
  onSettings,
  onShop,
}: {
  t: T;
  level: number;
  difficulty?: Difficulty;
  streak?: number;
  coins: number;
  onSettings: () => void;
  onShop: () => void;
}) {
  return (
    <header className="jam-topbar">
      <button type="button" className="jam-iconbtn" onClick={onSettings} aria-label={t('settings')}>
        <GearIcon />
      </button>
      <div className={`jam-levelpill jam-levelpill--${difficulty}`}>
        <strong>
          {t('level')} {level}
        </strong>
        <span className="jam-levelpill__tags">
          <DifficultyBadge t={t} difficulty={difficulty} />
          <StreakChip t={t} streak={streak} />
        </span>
      </div>
      <CoinsButton t={t} coins={coins} onShop={onShop} />
    </header>
  );
}

export function ProgressBar({ label, value }: { label: string; value: number }) {
  const pct = Math.round(Math.max(0, Math.min(1, value)) * 100);
  return (
    <div className="jam-progress" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
      <div className="jam-progress__fill" style={{ width: `${pct}%` }} />
    </div>
  );
}

/** Bannière d'entrée dans un niveau (l'app la retire après l'animation). */
export function LevelBanner({ t, level, difficulty = 'normal' }: { t: T; level: number; difficulty?: Difficulty }) {
  return (
    <div className={`jam-banner jam-banner--${difficulty}`} aria-live="polite">
      <strong>
        {t('level')} {level}
      </strong>
      {difficulty !== 'normal' ? <span>{difficulty === 'superHard' ? t('superHard') : t('hard')} !</span> : null}
    </div>
  );
}

export interface BoosterButton {
  id: string;
  label: string;
  /** Quantité possédée ; 0 = achat au prix indiqué. */
  owned: number;
  price: number;
  icon: BoosterIcon;
  disabled?: boolean;
}

export function BoosterBar({ t, boosters, onBooster }: { t: T; boosters: BoosterButton[]; onBooster: (id: string) => void }) {
  return (
    <nav className="jam-boosters" aria-label="Boosters">
      {boosters.map((b) => (
        <button
          key={b.id}
          type="button"
          className="jam-booster"
          disabled={b.disabled === true}
          onClick={() => onBooster(b.id)}
          aria-label={`${b.label} (${b.owned > 0 ? `×${b.owned}` : `${b.price} ${t('coins')}`})`}
        >
          <span className="jam-booster__disc">
            <BoosterGlyph icon={b.icon} />
            {b.owned > 0 ? (
              <span className="jam-booster__count">{b.owned}</span>
            ) : (
              <span className="jam-booster__price">
                <NutIcon size={13} />
                {b.price}
              </span>
            )}
          </span>
          <span className="jam-booster__label">{b.label}</span>
        </button>
      ))}
    </nav>
  );
}

// ---------- Accueil ----------

export interface LivesInfo {
  count: number;
  max: number;
  /** ms avant la prochaine vie (0 si pleines). */
  nextIn: number;
}

export function LivesPill({ t, lives, onClick }: { t: T; lives: LivesInfo; onClick?: () => void }) {
  const full = lives.count >= lives.max;
  return (
    <button
      type="button"
      className="jam-lives"
      onClick={onClick}
      aria-label={`${t('lives')} : ${lives.count}/${lives.max}${full ? '' : `. ${t('livesNext', { t: formatDuration(lives.nextIn) })}`}`}
    >
      <span className="jam-lives__heart">
        <HeartIcon size={30} />
        <span>{lives.count}</span>
      </span>
      <span className="jam-lives__timer">{full ? t('livesFull') : formatDuration(lives.nextIn)}</span>
    </button>
  );
}

export interface PathNode {
  level: number;
  difficulty: Difficulty;
  state: 'done' | 'current' | 'next';
  /** Un coffre s'ouvre après ce niveau. */
  chest?: boolean;
}

/** Abscisse (en %) d'un niveau sur le chemin : sinueuse et stable d'une session à l'autre. */
const pathX = (level: number) => 50 + Math.sin(level * 1.15) * 27;

/** Carte de progression : niveaux faits, niveau courant mis en avant, pics de difficulté et coffres à venir. */
export function LevelPath({ t, nodes, onPlay }: { t: T; nodes: PathNode[]; onPlay: () => void }) {
  const last = Math.max(1, nodes.length - 1);
  const points = nodes.map((n, i) => ({ x: pathX(n.level), y: 90 - (i * 80) / last }));
  const d = points
    .map((p, i) => {
      if (i === 0) return `M ${p.x} ${p.y}`;
      const prev = points[i - 1] as { x: number; y: number };
      const my = (prev.y + p.y) / 2;
      return `C ${prev.x} ${my}, ${p.x} ${my}, ${p.x} ${p.y}`;
    })
    .join(' ');
  const doneUntil = nodes.findIndex((n) => n.state === 'current');
  const dDone = doneUntil > 0 ? d.split(' C ').slice(0, doneUntil + 1).join(' C ') : '';
  return (
    <div className="jam-map" role="list" aria-label={t('level')}>
      <svg className="jam-map__path" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        <path d={d} className="jam-map__road" vectorEffect="non-scaling-stroke" />
        <path d={d} className="jam-map__dash" vectorEffect="non-scaling-stroke" />
        {dDone ? <path d={dDone} className="jam-map__done" vectorEffect="non-scaling-stroke" /> : null}
      </svg>
      {nodes.map((n, i) => {
        const p = points[i] as { x: number; y: number };
        const label = `${t('level')} ${n.level}${n.difficulty === 'hard' ? `, ${t('hard')}` : n.difficulty === 'superHard' ? `, ${t('superHard')}` : ''}`;
        const content =
          n.state === 'done' ? <CheckIcon size={22} /> : <span className="jam-node__num">{n.level}</span>;
        return (
          <div key={n.level} role="listitem" className="jam-node__slot" style={{ left: `${p.x}%`, top: `${p.y}%` }}>
            {n.state === 'current' ? (
              <>
                <span className="jam-node__token" aria-hidden="true">
                  <ScrewArt color="#ffc928" size={40} />
                </span>
                <button type="button" className={`jam-node jam-node--current jam-node--${n.difficulty}`} onClick={onPlay} aria-label={`${t('play')} : ${label}`}>
                  {content}
                </button>
              </>
            ) : (
              <span className={`jam-node jam-node--${n.state} jam-node--${n.difficulty}`} aria-label={label}>
                {content}
                {n.state === 'next' && n.difficulty !== 'normal' ? <span className="jam-node__flag">{n.difficulty === 'superHard' ? '!!' : '!'}</span> : null}
              </span>
            )}
            {n.chest ? (
              <span className={`jam-node__chest${n.state === 'done' ? ' jam-node__chest--open' : ''}`} aria-hidden="true">
                <ChestIcon size={30} />
              </span>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function SideButton({ label, onClick, children, dot, ring }: { label: string; onClick: () => void; children: ReactNode; dot?: boolean; ring?: number }) {
  return (
    <button type="button" className="jam-side" onClick={onClick} aria-label={label}>
      <span className="jam-side__disc" style={ring !== undefined ? ({ '--ring': `${Math.round(ring * 360)}deg` } as CSSProperties) : undefined}>
        {children}
        {dot ? <span className="jam-side__dot" /> : null}
      </span>
      <span className="jam-side__label">{label}</span>
    </button>
  );
}

export function HomeScreen({
  t,
  title,
  nextLevel,
  nextDifficulty = 'normal',
  coins,
  lives,
  streak,
  chest,
  dailyReady,
  path,
  onPlay,
  onShop,
  onSettings,
  onLives,
  onDaily,
  onHelp,
  footer,
}: {
  t: T;
  title: string;
  nextLevel: number;
  nextDifficulty?: Difficulty;
  coins: number;
  lives: LivesInfo;
  streak: number;
  /** Avancement vers le prochain coffre. */
  chest: { progress: number; every: number };
  dailyReady: boolean;
  path: PathNode[];
  onPlay: () => void;
  onShop: () => void;
  onSettings: () => void;
  onLives: () => void;
  onDaily: () => void;
  onHelp: () => void;
  footer?: ReactNode;
}) {
  const words = title.split(' ');
  const last = words.pop() ?? title;
  return (
    <main className="jam-home">
      <div className="jam-home__top">
        <button type="button" className="jam-iconbtn" onClick={onSettings} aria-label={t('settings')}>
          <GearIcon />
        </button>
        <LivesPill t={t} lives={lives} onClick={onLives} />
        <CoinsButton t={t} coins={coins} onShop={onShop} />
      </div>

      <h1 className="jam-logo">
        <span className="jam-logo__art">
          <ScrewArt color="#f0444b" size={34} />
          <ScrewArt color="#ffc928" size={44} />
          <ScrewArt color="#2fbf63" size={34} />
        </span>
        <span className="jam-logo__words">
          {words.length > 0 ? <span className="jam-logo__word">{words.join(' ')}</span> : null}
          <span className="jam-logo__word jam-logo__word--accent">{last}</span>
        </span>
      </h1>

      <div className="jam-home__stage">
        <LevelPath t={t} nodes={path} onPlay={onPlay} />
        <div className="jam-home__side jam-home__side--left">
          <SideButton label={t('daily')} onClick={onDaily} dot={dailyReady}>
            <GiftIcon size={36} />
          </SideButton>
          <SideButton label={t('shop')} onClick={onShop}>
            <ShopIcon size={34} />
          </SideButton>
        </div>
        <div className="jam-home__side jam-home__side--right">
          <SideButton label={`${t('chest')} ${chest.progress}/${chest.every}`} onClick={onPlay} ring={chest.progress / chest.every}>
            <ChestIcon size={36} />
          </SideButton>
          <SideButton label={t('help')} onClick={onHelp}>
            <HelpIcon />
          </SideButton>
        </div>
      </div>

      <div className="jam-home__cta">
        {streak > 0 ? (
          <p className="jam-home__streak">
            <FlameIcon size={20} /> {t('streakBonus', { n: streak, p: Math.min(streak, 5) * 10 })}
          </p>
        ) : null}
        <Button size="lg" onClick={onPlay}>
          <span className="jam-cta__label">
            {t('level')} {nextLevel}
          </span>
          <DifficultyBadge t={t} difficulty={nextDifficulty} inline />
        </Button>
      </div>
      {footer}
    </main>
  );
}

// ---------- Modales ----------

export interface ShopProduct {
  id: string;
  title: string;
  detail?: string;
  displayPrice: string;
  icon: ProductIcon;
  /** Taille du tas d'écrous (1 à 4) pour les packs. */
  tier?: number;
  /** Mis en avant sur toute la largeur. */
  featured?: boolean;
  /** Non consommable déjà acheté. */
  owned?: boolean;
  badge?: string;
}

export function ShopModal({
  t,
  products,
  mock,
  onBuy,
  onRestore,
  onClose,
}: {
  t: T;
  products: ShopProduct[];
  mock: boolean;
  onBuy: (id: string) => void;
  onRestore: () => void;
  onClose: () => void;
}) {
  return (
    <Modal title={t('shop')} tone="blue" onClose={onClose} closeLabel={t('close')}>
      {mock ? <p className="jam-note">{t('mockBadge')}</p> : null}
      <ul className="jam-shop">
        {products.map((p) => (
          <li key={p.id} className={`jam-shop__item${p.featured ? ' jam-shop__item--wide' : ''}`}>
            {p.badge ? <span className="jam-badge">{p.badge}</span> : null}
            <ProductArt icon={p.icon} {...(p.tier ? { tier: p.tier } : {})} />
            <div className="jam-shop__text">
              <strong>{p.title}</strong>
              {p.detail ? <small>{p.detail}</small> : null}
            </div>
            <Button size="sm" variant={p.featured ? 'primary' : 'secondary'} onClick={() => onBuy(p.id)} disabled={p.owned === true}>
              {p.owned ? t('owned') : p.displayPrice}
            </Button>
          </li>
        ))}
      </ul>
      <div className="jam-modal__actions">
        <Button variant="ghost" onClick={onRestore}>
          {t('restore')}
        </Button>
      </div>
    </Modal>
  );
}

/** Le minuteur vit dans l'app/le shell : ce composant n'affiche que `secondsLeft`. */
export function NearMissModal({
  t,
  remaining,
  secondsLeft,
  offerSeconds,
  continueCost,
  canPay,
  adReady,
  onWatchAd,
  onPay,
  onGiveUp,
  streak,
}: {
  t: T;
  remaining: number;
  secondsLeft: number;
  offerSeconds: number;
  continueCost: number;
  canPay: boolean;
  adReady: boolean;
  onWatchAd: () => void;
  onPay: () => void;
  onGiveUp: () => void;
  /** Série en cours : rappelée car elle sera perdue (aversion à la perte). */
  streak?: number;
}) {
  return (
    <Modal title={t('nearMissTitle')} tone="gold">
      <div className="jam-hero">
        <span className="jam-hero__slot" aria-hidden="true">
          <BoosterGlyph icon="slot" size={44} />
        </span>
      </div>
      <p className="jam-lead">{t('nearMissBody', { n: remaining })}</p>
      {streak && streak >= 2 ? (
        <p className="jam-warn">
          <FlameIcon size={20} /> {t('streakWarn', { n: streak })}
        </p>
      ) : null}
      <div
        className="jam-timer"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={offerSeconds}
        aria-valuenow={secondsLeft}
        aria-label={t('nearMissTimeLeft', { n: Math.ceil(secondsLeft) })}
      >
        <div className="jam-timer__bar" style={{ width: `${Math.max(0, Math.min(1, secondsLeft / offerSeconds)) * 100}%` }} />
      </div>
      <div className="jam-modal__actions jam-modal__actions--stack">
        <Button onClick={onWatchAd} disabled={!adReady}>
          <AdIcon /> {t('nearMissAd')}
        </Button>
        <Button variant="secondary" onClick={onPay} disabled={!canPay}>
          <NutIcon size={22} /> {continueCost}
        </Button>
        <Button variant="ghost" onClick={onGiveUp}>
          {t('nearMissGiveUp')}
        </Button>
      </div>
    </Modal>
  );
}

export function WinModal({
  t,
  reward,
  multiplier = 3,
  bonuses = [],
  adReady,
  onMultiply,
  onContinue,
}: {
  t: T;
  reward: number;
  multiplier?: number;
  /** Détail des bonus appliqués (rôle du niveau, série) : le joueur voit pourquoi il gagne plus. */
  bonuses?: string[];
  adReady: boolean;
  onMultiply: () => void;
  onContinue: () => void;
}) {
  const shown = useCountUp(reward);
  return (
    <Modal title={t('levelComplete')} tone="green">
      <div className="jam-reward">
        <span className="jam-rays" aria-hidden="true" />
        <NutIcon size={50} />
        <span aria-label={`+${reward}`}>+{shown}</span>
      </div>
      {bonuses.length > 0 ? (
        <ul className="jam-bonuses">
          {bonuses.map((b) => (
            <li key={b}>{b}</li>
          ))}
        </ul>
      ) : null}
      <div className="jam-modal__actions jam-modal__actions--stack">
        {adReady ? (
          <Button variant="gold" onClick={onMultiply}>
            <AdIcon /> {t('triple')} · +{reward * multiplier}
          </Button>
        ) : null}
        <Button onClick={onContinue}>{t('continue')}</Button>
      </div>
    </Modal>
  );
}

export function LoseModal({ t, onRetry, onHome }: { t: T; onRetry: () => void; onHome: () => void }) {
  return (
    <Modal title={t('defeat')} tone="red">
      <p className="jam-lead">{t('defeatBody')}</p>
      <div className="jam-modal__actions jam-modal__actions--stack">
        <Button onClick={onRetry}>{t('retry')}</Button>
        <Button variant="ghost" onClick={onHome}>
          {t('home')}
        </Button>
      </div>
    </Modal>
  );
}

export function SettingsModal({
  t,
  sound,
  haptics,
  onSound,
  onHaptics,
  onRestore,
  onHome,
  onClose,
  footer,
}: {
  t: T;
  sound: boolean;
  haptics: boolean;
  onSound: (value: boolean) => void;
  onHaptics: (value: boolean) => void;
  onRestore: () => void;
  /** Absent sur l'accueil. */
  onHome?: () => void;
  onClose: () => void;
  footer?: ReactNode;
}) {
  return (
    <Modal title={t('settings')} tone="blue" onClose={onClose} closeLabel={t('close')}>
      <div className="jam-settings">
        <Switch label={t('sound')} checked={sound} onChange={onSound} />
        <Switch label={t('haptics')} checked={haptics} onChange={onHaptics} />
      </div>
      <div className="jam-modal__actions jam-modal__actions--stack">
        {onHome ? (
          <Button variant="secondary" onClick={onHome}>
            {t('home')}
          </Button>
        ) : null}
        <Button variant="ghost" onClick={onRestore}>
          {t('restore')}
        </Button>
      </div>
      {footer}
    </Modal>
  );
}

export function CrossPromoModal({
  t,
  name,
  tagline,
  onInstall,
  onClose,
}: {
  t: T;
  name: string;
  tagline: string;
  onInstall: () => void;
  onClose: () => void;
}) {
  return (
    <Modal title={t('promoTitle')} tone="blue" onClose={onClose} closeLabel={t('close')}>
      <p className="jam-promo__name">{name}</p>
      <p className="jam-lead">{tagline}</p>
      <div className="jam-modal__actions jam-modal__actions--stack">
        <Button onClick={onInstall}>{t('promoInstall')}</Button>
        <Button variant="ghost" onClick={onClose}>
          {t('promoLater')}
        </Button>
      </div>
    </Modal>
  );
}

/** Compteur qui défile jusqu'à `target` (instantané si l'utilisateur réduit les animations). */
function useCountUp(target: number, duration = 700): number {
  const [value, setValue] = useState(0);
  useEffect(() => {
    const reduce = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      setValue(target);
      return;
    }
    let frame = 0;
    const start = performance.now();
    const step = (now: number) => {
      const k = Math.min(1, (now - start) / duration);
      setValue(Math.round(target * (1 - (1 - k) ** 3)));
      if (k < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [target, duration]);
  return value;
}
