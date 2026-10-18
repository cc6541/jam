// Écrans des boucles de rétention : cadeau du jour, coffre, vies, nouveautés, annonce de niveau très difficile.
import type { ReactNode } from 'react';
import type { StringKey } from './i18n';
import { AdIcon, BoosterGlyph, ChestIcon, GiftIcon, HeartIcon, NutIcon, ScrewArt, type BoosterIcon } from './icons';
import { Swatch, type SwatchDef } from './swatch';
import { Button, Modal } from './primitives';
import { formatDuration } from './screens';

type T = (key: StringKey, vars?: Record<string, string | number>) => string;

export interface RewardItem {
  kind: 'coins' | BoosterIcon;
  amount: number;
}

export function RewardList({ items }: { items: RewardItem[] }) {
  return (
    <ul className="jam-rewards">
      {items.map((item) => (
        <li key={item.kind} className="jam-rewards__item">
          {item.kind === 'coins' ? <NutIcon size={30} /> : <BoosterGlyph icon={item.kind} size={30} />}
          <span>{item.kind === 'coins' ? `+${item.amount}` : `×${item.amount}`}</span>
        </li>
      ))}
    </ul>
  );
}

/** Calendrier de 7 jours : passé coché, aujourd'hui mis en avant, avenir visible (anticipation). */
export function DailyModal({
  t,
  days,
  today,
  claimable,
  onClaim,
  onClose,
}: {
  t: T;
  days: RewardItem[][];
  /** Index (0 à 6) du jour proposé. */
  today: number;
  claimable: boolean;
  onClaim: () => void;
  onClose: () => void;
}) {
  return (
    <Modal title={t('daily')} tone="green" onClose={onClose} closeLabel={t('close')}>
      <p className="jam-lead">{t('dailyBody')}</p>
      <ol className="jam-days">
        {days.map((items, i) => (
          <li
            key={i}
            className={`jam-day${i < today ? ' jam-day--done' : ''}${i === today ? ' jam-day--today' : ''}${i === days.length - 1 ? ' jam-day--big' : ''}`}
          >
            <span className="jam-day__label">{t('dailyDay', { n: i + 1 })}</span>
            {i === days.length - 1 ? <ChestIcon size={38} /> : items[0]?.kind === 'coins' ? <NutIcon size={26} /> : <BoosterGlyph icon={(items[0]?.kind ?? 'undo') as BoosterIcon} size={26} />}
            <span className="jam-day__amount">{i === days.length - 1 ? '★' : items[0]?.kind === 'coins' ? items[0].amount : `×${items[0]?.amount ?? 1}`}</span>
          </li>
        ))}
      </ol>
      <div className="jam-modal__actions jam-modal__actions--stack">
        <Button onClick={claimable ? onClaim : onClose} disabled={!claimable}>
          <GiftIcon size={24} /> {claimable ? t('claim') : t('dailyCome')}
        </Button>
      </div>
    </Modal>
  );
}

export function ChestModal({ t, items, onCollect }: { t: T; items: RewardItem[]; onCollect: () => void }) {
  return (
    <Modal title={t('chestOpen')} tone="gold">
      <div className="jam-hero jam-hero--chest">
        <ChestIcon size={92} />
      </div>
      <RewardList items={items} />
      <div className="jam-modal__actions jam-modal__actions--stack">
        <Button onClick={onCollect}>{t('collect')}</Button>
      </div>
    </Modal>
  );
}

export function NoLivesModal({
  t,
  nextIn,
  refillCost,
  canPay,
  adReady,
  onAd,
  onPay,
  onClose,
}: {
  t: T;
  nextIn: number;
  refillCost: number;
  canPay: boolean;
  adReady: boolean;
  onAd: () => void;
  onPay: () => void;
  onClose: () => void;
}) {
  return (
    <Modal title={t('noLives')} tone="red" onClose={onClose} closeLabel={t('close')}>
      <div className="jam-hero">
        <span className="jam-hero__heart">
          <HeartIcon size={64} />
          <b>0</b>
        </span>
      </div>
      <p className="jam-lead">{t('livesNext', { t: formatDuration(nextIn) })}</p>
      <p className="jam-note">{t('noLivesBody')}</p>
      <div className="jam-modal__actions jam-modal__actions--stack">
        <Button onClick={onAd} disabled={!adReady}>
          <AdIcon /> {t('refillOne')}
        </Button>
        <Button variant="secondary" onClick={onPay} disabled={!canPay}>
          {t('refillAll')} · <NutIcon size={20} /> {refillCost}
        </Button>
      </div>
    </Modal>
  );
}

export function IntroModal({ t, title, body, art, onOk }: { t: T; title: string; body: string; art: ReactNode; onOk: () => void }) {
  return (
    <Modal title={t('newFeature')} tone="blue">
      <div className="jam-hero">{art}</div>
      <p className="jam-promo__name">{title}</p>
      <p className="jam-lead">{body}</p>
      <div className="jam-modal__actions jam-modal__actions--stack">
        <Button onClick={onOk}>{t('gotIt')}</Button>
      </div>
    </Modal>
  );
}

/** Annonce d'un niveau très difficile : on fait monter l'enjeu avant de jouer. */
export function SuperHardModal({ t, level, multiplier, onPlay }: { t: T; level: number; multiplier: number; onPlay: () => void }) {
  return (
    <Modal title={t('superHardTitle')} tone="red">
      <div className="jam-hero">
        <span className="jam-skull" aria-hidden="true">
          {level}
        </span>
      </div>
      <p className="jam-lead">{t('superHardBody', { m: multiplier })}</p>
      <div className="jam-modal__actions jam-modal__actions--stack">
        <Button variant="danger" onClick={onPlay}>
          {t('go')}
        </Button>
      </div>
    </Modal>
  );
}

/** Règles en trois gestes, montrées au premier lancement puis depuis le bouton « Aide ». */
export function HelpModal({ t, swatches, onOk }: { t: T; swatches: SwatchDef[]; onOk: () => void }) {
  const steps: { key: 'howTo1' | 'howTo2' | 'howTo3'; art: ReactNode }[] = [
    { key: 'howTo1', art: <span className="jam-howto__tap"><ScrewArt color="#ffc928" size={40} /></span> },
    { key: 'howTo2', art: <span className="jam-howto__crate"><ScrewArt color="#2fbf63" size={19} /><ScrewArt color="#2fbf63" size={19} /><ScrewArt color="#2fbf63" size={19} /></span> },
    { key: 'howTo3', art: <span className="jam-howto__tray">{[0, 1, 2, 3, 4].map((i) => <span key={i} className={`jam-howto__slot${i < 4 ? ' jam-howto__slot--full' : ''}`} />)}</span> },
  ];
  return (
    <Modal title={t('howToTitle')} tone="blue">
      <ol className="jam-howto">
        {steps.map((s, i) => (
          <li key={s.key} className="jam-howto__step">
            <span className="jam-howto__num">{i + 1}</span>
            <span className="jam-howto__art">{s.art}</span>
            <span className="jam-howto__text">{t(s.key)}</span>
          </li>
        ))}
      </ol>
      <p className="jam-howto__legend-title">{t('patterns')}</p>
      <div className="jam-howto__legend">
        {swatches.map((sw) => (
          <Swatch key={sw.id} swatch={sw} size={30} />
        ))}
      </div>
      <div className="jam-modal__actions jam-modal__actions--stack">
        <Button onClick={onOk}>{t('gotIt')}</Button>
      </div>
    </Modal>
  );
}
