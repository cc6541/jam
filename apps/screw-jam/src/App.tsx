import { storeLink, localized, pickPromo, recordShown, type PromoApp } from '@jam/cross-promo';
import type { Id } from '@jam/engine-screw';
import { BoardView, DEFAULT_THEME as PIXI_THEME, vibrateHaptics } from '@jam/render-pixi';
import { coinMultiplier, shouldShowInterstitial, spend, useBooster, type BoosterId } from '@jam/shell';
import {
  CrossPromoModal,
  DEFAULT_UI_THEME,
  EndModal,
  HomeScreen,
  BoosterBar,
  Hud,
  NearMissModal,
  ShopModal,
  themeStyle,
  type BoosterButton,
  type ShopProduct,
  type SwatchDef,
} from '@jam/ui';
import { Application } from 'pixi.js';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import appConfig from '../app.config.json';
import { boosterNames, colorNames, productCopy } from './copy';
import { GameSession } from './game-session';
import { grantPurchase, isAvailable, isOwned, completeLevel, type Profile } from './profile';
import { PRODUCTS, mockPrice, type ProductId } from './products';
import type { Services } from './services';

type Modal =
  | { kind: 'shop' }
  | { kind: 'nearMiss'; remaining: number; offerSeconds: number; deadline: number }
  | { kind: 'end'; result: 'won' | 'lost'; reward?: number }
  | { kind: 'promo'; app: PromoApp };

const BOOSTERS: BoosterId[] = ['undo', 'addToolboxSlot', 'clearToolbox'];
const hex = (n: number) => `#${n.toString(16).padStart(6, '0')}`;

export function App({ s }: { s: Services }) {
  const { t, config, locale } = s;
  const params = useMemo(() => new URLSearchParams(location.search), []);
  const show = params.get('show');

  const [profile, setProfileState] = useState<Profile | null>(null);
  const profileRef = useRef<Profile | null>(null);
  const [screen, setScreen] = useState<'home' | 'play'>(params.get('play') !== null ? 'play' : 'home');
  const [modal, setModalState] = useState<Modal | null>(null);
  const modalRef = useRef<Modal | null>(null);
  const [, setTick] = useState(0);
  const boardEl = useRef<HTMLDivElement>(null);
  const session = useRef<GameSession | null>(null);
  const startRef = useRef<((level: number) => void) | null>(null);
  const currentLevel = useRef(1);
  const continuation = useRef<(() => void) | null>(null);

  const setModal = useCallback((m: Modal | null) => {
    modalRef.current = m;
    setModalState(m);
  }, []);
  const bump = useCallback(() => setTick((n) => n + 1), []);

  const updateProfile = useCallback(
    (change: (p: Profile) => Profile) => {
      const current = profileRef.current;
      if (!current) return;
      const next = change(current);
      profileRef.current = next;
      setProfileState(next);
      void s.profileDoc.save(next);
    },
    [s.profileDoc],
  );

  // Chargement de la sauvegarde ; aperçus de développement via ?show=shop|promo|end|nearmiss.
  useEffect(() => {
    void s.profileDoc.load().then((p) => {
      const start = params.get('level');
      const loaded = start ? { ...p, nextLevel: Number(start) } : p;
      profileRef.current = loaded;
      currentLevel.current = loaded.nextLevel;
      setProfileState(loaded);
      if (show === 'shop') setModal({ kind: 'shop' });
      if (show === 'end') setModal({ kind: 'end', result: 'won', reward: config.economy.levelReward });
      if (show === 'nearmiss') {
        setModal({ kind: 'nearMiss', remaining: 2, offerSeconds: 10, deadline: s.clock.now() + 10_000 });
      }
      if (show === 'promo') {
        setModal({
          kind: 'promo',
          app: { id: 'preview', bundleId: 'com.example.preview', name: { en: 'Preview Jam' }, tagline: { en: 'Sample card' }, live: false },
        });
      }
    });
    const flush = () => void s.clock.flush();
    document.addEventListener('visibilitychange', flush);
    return () => document.removeEventListener('visibilitychange', flush);
  }, [s, params, show, config.economy.levelReward, setModal]);

  // ---------- Fin de partie ----------

  const onEnd = useCallback(
    (result: 'won' | 'lost', nearMiss: boolean) => {
      const sess = session.current;
      if (!sess) return;
      if (result === 'won') {
        const multiplier = coinMultiplier(config, s.clock.now());
        updateProfile((p) => completeLevel(p, currentLevel.current, config, multiplier));
        setModal({ kind: 'end', result, reward: Math.round(config.economy.levelReward * multiplier) });
      } else if (nearMiss) {
        const { offerSeconds } = sess.level.rules.nearMiss;
        setModal({
          kind: 'nearMiss',
          remaining: Object.keys(sess.state.screws).length,
          offerSeconds,
          deadline: s.clock.now() + offerSeconds * 1000,
        });
      } else {
        setModal({ kind: 'end', result });
      }
      bump();
    },
    [config, s.clock, updateProfile, setModal, bump],
  );

  // ---------- Plateau Pixi : créé à l'entrée dans l'écran de jeu, détruit à la sortie ----------

  useEffect(() => {
    if (screen !== 'play' || !profile || !boardEl.current) return;
    const host = boardEl.current;
    let cancelled = false;
    let app: Application | null = null;
    let view: BoardView | null = null;

    void (async () => {
      const a = new Application();
      await a.init({ resizeTo: host, backgroundAlpha: 0, antialias: false, autoDensity: true, resolution: Math.min(2, devicePixelRatio) });
      if (cancelled) {
        a.destroy(true);
        return;
      }
      app = a;
      host.appendChild(a.canvas);
      const board = new BoardView(a.renderer, {
        onTap: (id: Id) => {
          if (modalRef.current) return;
          session.current?.tap(id);
          bump();
        },
        onEnd,
        haptics: vibrateHaptics,
        labels: { toolbox: t('toolbox') },
      });
      view = board;
      a.stage.addChild(board.root);
      a.ticker.add((ticker) => board.update(ticker.deltaMS));
      const onResize = () => board.resize({ width: a.screen.width, height: a.screen.height });
      window.addEventListener('resize', onResize);
      a.renderer.on('resize', onResize);

      startRef.current = (n: number) => {
        const level = s.levels[(n - 1) % s.levels.length];
        if (!level) return;
        currentLevel.current = n;
        session.current = new GameSession(level, board, () => ({ width: a.screen.width, height: a.screen.height }));
        setModal(null);
        bump();
      };
      startRef.current(currentLevel.current);
    })();

    return () => {
      cancelled = true;
      startRef.current = null;
      session.current = null;
      view?.destroy();
      app?.destroy(true, { children: true });
    };
    // Le plateau ne se recrée que lorsqu'on entre/sort de l'écran de jeu (dépendances volontairement réduites).
  }, [screen, profile === null]);

  // ---------- Actions ----------

  const play = (level: number) => {
    currentLevel.current = level;
    if (screen === 'play') startRef.current?.(level);
    else setScreen('play');
  };

  const goHome = () => {
    setModal(null);
    setScreen('home');
  };

  const continueGame = () => {
    session.current?.addToolboxSlot();
    setModal(null);
    bump();
  };

  const watchAd = async () => {
    const result = await s.ads.showRewarded('near_miss');
    if (result.status === 'rewarded') continueGame();
  };

  const payToContinue = () => {
    const current = profileRef.current;
    if (!current) return;
    const paid = spend(current.wallet, config.economy.continueCost);
    if (!paid.ok) return;
    updateProfile((p) => ({ ...p, wallet: paid.wallet }));
    continueGame();
  };

  const useBoosterButton = (id: BoosterId) => {
    const sess = session.current;
    const current = profileRef.current;
    if (!sess || !current || modalRef.current || sess.state.status !== 'playing') return;
    const used = useBooster(current.wallet, config.economy, id);
    if (!used.ok) {
      setModal({ kind: 'shop' });
      return;
    }
    const accepted = (events: { type: string }[]) => !events.some((e) => e.type === 'rejected');
    const applied =
      id === 'undo' ? sess.undo() : id === 'addToolboxSlot' ? accepted(sess.addToolboxSlot().events) : accepted(sess.clearToolbox().events);
    if (applied) updateProfile((p) => ({ ...p, wallet: used.wallet }));
    bump();
  };

  const nextLevel = async () => {
    const current = profileRef.current;
    if (!current) return;
    const finished = current.nextLevel - 1;
    if (shouldShowInterstitial(finished, config.ads, current.noAds)) await s.ads.showInterstitial('level_end');
    const app = pickPromo(s.promoConfig, current.promo, {
      selfBundleId: s.bundleId,
      platform: s.platform,
      levelsCompleted: finished,
      nowMs: s.clock.now(),
      noAds: current.noAds,
    });
    const begin = () => play(current.nextLevel);
    if (app) {
      updateProfile((p) => ({ ...p, promo: recordShown(p.promo, app.id, s.clock.now()) }));
      continuation.current = begin;
      setModal({ kind: 'promo', app });
    } else {
      begin();
    }
  };

  const closePromo = () => {
    const next = continuation.current;
    continuation.current = null;
    setModal(null);
    next?.();
  };

  const buy = async (id: string) => {
    const result = await s.iap.purchase(id);
    if (result.status === 'purchased') updateProfile((p) => grantPurchase(p, id as ProductId));
  };

  const restore = async () => {
    for (const id of await s.iap.restore()) updateProfile((p) => grantPurchase(p, id as ProductId));
  };

  // ---------- Rendu ----------

  const theme = { ...DEFAULT_UI_THEME, ...appConfig.theme.ui };
  const swatches: SwatchDef[] = (Object.keys(PIXI_THEME.screws) as (keyof typeof PIXI_THEME.screws)[]).map((c) => ({
    id: c,
    label: colorNames[locale][c] ?? c,
    color: hex(PIXI_THEME.screws[c].fill),
    pattern: PIXI_THEME.screws[c].pattern,
  }));

  if (!profile) return <div className="jam-root" style={themeStyle(theme)} />;

  const sess = session.current;
  const boosters: BoosterButton[] = BOOSTERS.map((id) => {
    const playing = sess?.state.status === 'playing';
    const usable =
      id === 'undo' ? sess?.canUndo === true : id === 'addToolboxSlot' ? (sess?.state.toolboxSlots ?? 0) < (sess?.level.rules.toolboxMaxSlots ?? 0) : (sess?.state.toolbox.length ?? 0) > 0;
    return {
      id,
      label: boosterNames[locale][id],
      icon: id === 'undo' ? 'undo' : id === 'addToolboxSlot' ? 'slot' : 'clear',
      owned: profile.wallet.boosters[id],
      price: config.economy.boosterPrices[id],
      disabled: !playing || !usable || modal !== null,
    };
  });

  const products: ShopProduct[] = PRODUCTS.filter((p) => isAvailable(profile, p.id)).map((p) => {
    const copy = productCopy[locale][p.id];
    const detail = p.id === 'piggy' ? `${profile.wallet.piggy} ${t('coins').toLowerCase()}` : copy.detail;
    return {
      id: p.id,
      title: copy.title,
      displayPrice: mockPrice(p.tier, locale),
      owned: isOwned(profile, p.id),
      ...(detail ? { detail } : {}),
      ...(copy.badge ? { badge: copy.badge } : {}),
    };
  });

  return (
    <div className="jam-root" style={themeStyle(theme)}>
      {screen === 'home' ? (
        <HomeScreen
          t={t}
          title={appConfig.displayName}
          nextLevel={profile.nextLevel}
          coins={profile.wallet.coins}
          swatches={swatches}
          onPlay={() => play(profile.nextLevel)}
          onShop={() => setModal({ kind: 'shop' })}
          footer={s.mock ? <p className="jam-note">{t('mockBadge')}</p> : null}
        />
      ) : (
        <div className="jam-play">
          <Hud t={t} level={currentLevel.current} world={appConfig.world[locale]} coins={profile.wallet.coins} onHome={goHome} />
          <div ref={boardEl} className="jam-board" />
          <BoosterBar t={t} boosters={boosters} onBooster={(id) => useBoosterButton(id as BoosterId)} />
        </div>
      )}

      {modal?.kind === 'shop' ? (
        <ShopModal t={t} products={products} mock={s.mock} onBuy={(id) => void buy(id)} onRestore={() => void restore()} onClose={() => setModal(null)} />
      ) : null}
      {modal?.kind === 'nearMiss' ? (
        <NearMissHost
          t={t}
          modal={modal}
          clock={s.clock}
          continueCost={config.economy.continueCost}
          canPay={profile.wallet.coins >= config.economy.continueCost}
          adReady={s.ads.isRewardedReady('near_miss')}
          onWatchAd={() => void watchAd()}
          onPay={payToContinue}
          onGiveUp={() => setModal({ kind: 'end', result: 'lost' })}
        />
      ) : null}
      {modal?.kind === 'end' ? (
        <EndModal
          t={t}
          result={modal.result}
          {...(modal.reward !== undefined ? { reward: modal.reward } : {})}
          onNext={() => void nextLevel()}
          onRetry={() => play(currentLevel.current)}
          onHome={goHome}
        />
      ) : null}
      {modal?.kind === 'promo' ? (
        <CrossPromoModal
          t={t}
          name={localized(modal.app.name, locale)}
          tagline={localized(modal.app.tagline, locale)}
          onInstall={() => {
            const url = storeLink(modal.app, s.platform, { source: appConfig.id, placement: 'level_end' });
            if (url) window.open(url, '_blank', 'noopener');
            closePromo();
          }}
          onClose={closePromo}
        />
      ) : null}
    </div>
  );
}

/** Minuteur de l'offre near miss : l'heure vient de l'horloge monotone du shell. */
function NearMissHost(props: {
  t: Services['t'];
  modal: Extract<Modal, { kind: 'nearMiss' }>;
  clock: Services['clock'];
  continueCost: number;
  canPay: boolean;
  adReady: boolean;
  onWatchAd: () => void;
  onPay: () => void;
  onGiveUp: () => void;
}) {
  const { modal, clock, onGiveUp } = props;
  const left = () => Math.max(0, (modal.deadline - clock.now()) / 1000);
  const [secondsLeft, setSecondsLeft] = useState(left);
  useEffect(() => {
    const id = setInterval(() => {
      const value = left();
      setSecondsLeft(value);
      if (value <= 0) onGiveUp();
    }, 250);
    return () => clearInterval(id);
  }, [modal.deadline]);
  return (
    <NearMissModal
      t={props.t}
      remaining={modal.remaining}
      secondsLeft={secondsLeft}
      offerSeconds={modal.offerSeconds}
      continueCost={props.continueCost}
      canPay={props.canPay}
      adReady={props.adReady}
      onWatchAd={props.onWatchAd}
      onPay={props.onPay}
      onGiveUp={onGiveUp}
    />
  );
}
