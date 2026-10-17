import type { ReactNode } from 'react';
import type { StringKey } from './i18n';
import { Button, Modal } from './primitives';
import { Swatch, type SwatchDef } from './swatch';

type T = (key: StringKey, vars?: Record<string, string | number>) => string;

export interface BoosterButton {
  id: string;
  label: string;
  /** Quantité possédée ; 0 = achat au prix indiqué. */
  owned: number;
  price: number;
  disabled?: boolean;
}

export function Hud({
  t,
  level,
  coins,
  boosters,
  onBooster,
  onHome,
}: {
  t: T;
  level: number;
  coins: number;
  boosters: BoosterButton[];
  onBooster: (id: string) => void;
  onHome: () => void;
}) {
  return (
    <header className="jam-hud">
      <button type="button" className="jam-hud__home" onClick={onHome} aria-label={t('home')}>
        ⌂
      </button>
      <span className="jam-hud__level">
        {t('level')} {level}
      </span>
      <span className="jam-hud__coins" aria-label={`${t('coins')}: ${coins}`}>
        ● {coins}
      </span>
      <div className="jam-hud__boosters">
        {boosters.map((b) => (
          <button
            key={b.id}
            type="button"
            className="jam-booster"
            disabled={b.disabled === true}
            onClick={() => onBooster(b.id)}
            aria-label={`${b.label} (${b.owned > 0 ? `×${b.owned}` : `${b.price} ${t('coins')}`})`}
          >
            <span>{b.label}</span>
            <small>{b.owned > 0 ? `×${b.owned}` : `● ${b.price}`}</small>
          </button>
        ))}
      </div>
    </header>
  );
}

export function HomeScreen({
  t,
  title,
  nextLevel,
  coins,
  swatches,
  onPlay,
  onShop,
  footer,
}: {
  t: T;
  title: string;
  nextLevel: number;
  coins: number;
  swatches: SwatchDef[];
  onPlay: () => void;
  onShop: () => void;
  footer?: ReactNode;
}) {
  return (
    <main className="jam-home">
      <h1 className="jam-home__title">{title}</h1>
      <p className="jam-home__coins">
        ● {coins} {t('coins')}
      </p>
      <div className="jam-home__actions">
        <Button onClick={onPlay}>
          {t('play')} · {t('level')} {nextLevel}
        </Button>
        <Button variant="secondary" onClick={onShop}>
          {t('shop')}
        </Button>
      </div>
      <p className="jam-home__howto">{t('howTo')}</p>
      <ul className="jam-legend" aria-label="Couleurs et motifs">
        {swatches.map((s) => (
          <li key={s.id}>
            <Swatch swatch={s} size={32} />
            <span>{s.label}</span>
          </li>
        ))}
      </ul>
      {footer}
    </main>
  );
}

export interface ShopProduct {
  id: string;
  title: string;
  detail?: string;
  displayPrice: string;
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
    <Modal title={t('shop')} onClose={onClose}>
      {mock ? <p className="jam-note">{t('mockBadge')}</p> : null}
      <ul className="jam-shop">
        {products.map((p) => (
          <li key={p.id} className="jam-shop__item">
            <div>
              <strong>{p.title}</strong>
              {p.badge ? <span className="jam-badge">{p.badge}</span> : null}
              {p.detail ? <small>{p.detail}</small> : null}
            </div>
            <Button onClick={() => onBuy(p.id)} disabled={p.owned === true}>
              {p.owned ? t('owned') : p.displayPrice}
            </Button>
          </li>
        ))}
      </ul>
      <div className="jam-modal__actions">
        <Button variant="secondary" onClick={onRestore}>
          {t('restore')}
        </Button>
        <Button variant="secondary" onClick={onClose}>
          {t('close')}
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
}) {
  return (
    <Modal title={t('nearMissTitle')}>
      <p>{t('nearMissBody', { n: remaining })}</p>
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
      <p className="jam-note">{t('nearMissTimeLeft', { n: Math.ceil(secondsLeft) })}</p>
      <div className="jam-modal__actions jam-modal__actions--stack">
        <Button onClick={onWatchAd} disabled={!adReady}>
          {t('nearMissAd')}
        </Button>
        <Button variant="secondary" onClick={onPay} disabled={!canPay}>
          {t('nearMissCoins', { n: continueCost })}
        </Button>
        <Button variant="secondary" onClick={onGiveUp}>
          {t('nearMissGiveUp')}
        </Button>
      </div>
    </Modal>
  );
}

export function EndModal({
  t,
  result,
  reward,
  onNext,
  onRetry,
  onHome,
}: {
  t: T;
  result: 'won' | 'lost';
  reward?: number;
  onNext: () => void;
  onRetry: () => void;
  onHome: () => void;
}) {
  return (
    <Modal title={result === 'won' ? t('victory') : t('defeat')}>
      {result === 'won' && reward ? (
        <p>
          {t('reward')} : ● {reward}
        </p>
      ) : null}
      <div className="jam-modal__actions jam-modal__actions--stack">
        {result === 'won' ? <Button onClick={onNext}>{t('next')}</Button> : null}
        <Button variant={result === 'won' ? 'secondary' : 'primary'} onClick={onRetry}>
          {t('retry')}
        </Button>
        <Button variant="secondary" onClick={onHome}>
          {t('home')}
        </Button>
      </div>
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
    <Modal title={t('promoTitle')} onClose={onClose}>
      <p className="jam-promo__name">{name}</p>
      <p>{tagline}</p>
      <div className="jam-modal__actions">
        <Button onClick={onInstall}>{t('promoInstall')}</Button>
        <Button variant="secondary" onClick={onClose}>
          {t('promoLater')}
        </Button>
      </div>
    </Modal>
  );
}
