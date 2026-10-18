import { storeLink, localized, pickPromo, recordShown, type PromoApp } from '@jam/cross-promo';
import type { Id, LevelDef, LevelTier } from '@jam/engine-screw';
import { BoardView, DEFAULT_THEME as PIXI_THEME, vibrateHaptics, woodTexture, type HapticsPort } from '@jam/render-pixi';
import { coinMultiplier, shouldShowInterstitial, spend, useBooster, type BoosterId } from '@jam/shell';
import {
  BoosterBar,
  ChestModal,
  CrossPromoModal,
  DailyModal,
  DEFAULT_UI_THEME,
  HelpModal,
  HomeScreen,
  IntroModal,
  LevelBanner,
  LoseModal,
  NearMissModal,
  NoLivesModal,
  ProgressBar,
  SettingsModal,
  ShopModal,
  SuperHardModal,
  themeStyle,
  TopBar,
  WinModal,
  type BoosterButton,
  type Difficulty,
  type RewardItem,
  type ShopProduct,
  type PathNode,
  type SwatchDef,
} from '@jam/ui';
import { Application } from 'pixi.js';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import appConfig from '../app.config.json';
import { boosterNames, colorNames, productCopy } from './copy';
import { GameSession } from './game-session';
import {
  chestProgress,
  claimDaily,
  dailyOffer,
  introFor,
  livesAt,
  loseLife,
  markIntro,
  META,
  openChest,
  refillLives,
  tierOfLevel,
  winMultiplier,
  winStreak,
  type IntroId,
  type Reward,
} from './meta';
import { completeLevel, grantCoins, grantPurchase, isAvailable, isOwned, withDefaults, type Profile, type Settings } from './profile';
import { PRODUCTS, mockPrice, type ProductId } from './products';
import type { Services } from './services';
import { SynthSounds } from './sfx';

type Modal =
  | { kind: 'shop' }
  | { kind: 'settings' }
  | { kind: 'nearMiss'; remaining: number; offerSeconds: number; deadline: number }
  | { kind: 'win'; reward: number; bonuses: string[] }
  | { kind: 'lose' }
  | { kind: 'promo'; app: PromoApp }
  | { kind: 'daily' }
  | { kind: 'chest'; items: RewardItem[] }
  | { kind: 'noLives' }
  | { kind: 'intro'; id: IntroId; level: number }
  | { kind: 'superHard'; level: number }
  | { kind: 'help' };

const BOOSTERS: BoosterId[] = ['undo', 'addToolboxSlot', 'clearToolbox'];
const BANNER_MS = 1600;
/** Laisse les confettis vivre un instant avant d'ouvrir la modale de victoire. */
const WIN_DELAY_MS = 650;
const hex = (n: number) => `#${n.toString(16).padStart(6, '0')}`;
const NUT_PACKS: ProductId[] = ['coins_s', 'coins_m', 'coins_l', 'coins_xl'];

const difficultyOf = (tier: LevelTier): Difficulty => (tier === 'hard' || tier === 'superHard' ? tier : 'normal');

/** Tronçon de la carte autour du prochain niveau : deux niveaux faits, puis ce qui arrive (pics et coffres visibles d'avance). */
function pathAround(next: number, levelAt: (n: number) => LevelDef | undefined): PathNode[] {
  const nodes: PathNode[] = [];
  for (let n = Math.max(1, next - 2); nodes.length < 7; n++) {
    const def = levelAt(n);
    if (!def) break;
    nodes.push({
      level: n,
      difficulty: difficultyOf(tierOfLevel(def)),
      state: n < next ? 'done' : n === next ? 'current' : 'next',
      ...(n % META.chestEvery === 0 ? { chest: true } : {}),
    });
  }
  return nodes;
}

function rewardItems(reward: Reward): RewardItem[] {
  const icon = { undo: 'undo', addToolboxSlot: 'slot', clearToolbox: 'clear' } as const;
  return [
    ...(reward.coins ? [{ kind: 'coins' as const, amount: reward.coins }] : []),
    ...Object.entries(reward.boosters ?? {}).map(([id, amount]) => ({ kind: icon[id as BoosterId], amount: amount ?? 0 })),
  ];
}

export function App({ s }: { s: Services }) {
  const { t, config, locale } = s;
  const params = useMemo(() => new URLSearchParams(location.search), []);
  const show = params.get('show');

  const [profile, setProfileState] = useState<Profile | null>(null);
  const profileRef = useRef<Profile | null>(null);
  const [screen, setScreen] = useState<'home' | 'play'>('home');
  const [modal, setModalState] = useState<Modal | null>(null);
  const modalRef = useRef<Modal | null>(null);
  const [banner, setBanner] = useState<{ level: number; key: number } | null>(null);
  const [, setTick] = useState(0);
  const boardEl = useRef<HTMLDivElement>(null);
  const session = useRef<GameSession | null>(null);
  const startRef = useRef<((level: number) => void) | null>(null);
  const currentLevel = useRef(1);
  const continuation = useRef<(() => void) | null>(null);
  const sounds = useMemo(() => new SynthSounds(), []);
  const haptics = useMemo<HapticsPort>(
    () => ({ play: (cue) => (profileRef.current?.settings.haptics === false ? undefined : vibrateHaptics.play(cue)) }),
    [],
  );

  const levelAt = useCallback((n: number): LevelDef | undefined => s.levels[(n - 1) % s.levels.length], [s.levels]);
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
      sounds.enabled = next.settings.sound;
      setProfileState(next);
      void s.profileDoc.save(next);
    },
    [s.profileDoc, sounds],
  );

  // Chargement ; cadeau du jour proposé d'office ; aperçus de développement via ?show=…
  useEffect(() => {
    void s.profileDoc.load().then((raw) => {
      const p = withDefaults(raw);
      const start = params.get('level');
      // Développement : ?level=N simule une progression réelle (coffres déjà ouverts jusque-là).
      const loaded = start
        ? { ...p, nextLevel: Number(start), meta: { ...p.meta, chestsOpened: Math.floor((Number(start) - 1) / META.chestEvery) } }
        : p;
      profileRef.current = loaded;
      currentLevel.current = loaded.nextLevel;
      sounds.enabled = loaded.settings.sound;
      setProfileState(loaded);
      const previews: Record<string, Modal> = {
        shop: { kind: 'shop' },
        settings: { kind: 'settings' },
        win: { kind: 'win', reward: 72, bonuses: [t('tierBonus', { tier: t('superHard'), m: 3 }), t('streakBonus', { n: 2, p: 20 })] },
        lose: { kind: 'lose' },
        nearmiss: { kind: 'nearMiss', remaining: 2, offerSeconds: 10, deadline: s.clock.now() + 10_000 },
        daily: { kind: 'daily' },
        chest: { kind: 'chest', items: rewardItems({ coins: 125, boosters: { addToolboxSlot: 1 } }) },
        nolives: { kind: 'noLives' },
        intro: { kind: 'intro', id: 'multiTap', level: 11 },
        superhard: { kind: 'superHard', level: 30 },
        help: { kind: 'help' },
      };
      if (show && previews[show]) setModal(previews[show]);
      // Premier lancement : les règles d'abord, le cadeau du jour ensuite.
      else if (!loaded.meta.intros.includes('howTo')) setModal({ kind: 'help' });
      else if (dailyOffer(loaded.meta, s.clock.now()) !== null) setModal({ kind: 'daily' });
    });
    const flush = () => void s.clock.flush();
    document.addEventListener('visibilitychange', flush);
    return () => document.removeEventListener('visibilitychange', flush);
  }, [s, params, show, setModal, sounds, t]);

  // Texture de bois générée pendant que le joueur est sur l'accueil : pas d'à-coup au lancement du premier niveau.
  useEffect(() => {
    const id = setTimeout(() => woodTexture(), 300);
    return () => clearTimeout(id);
  }, []);

  // Minuteur des vies affiché à l'accueil.
  useEffect(() => {
    if (screen !== 'home') return;
    const id = setInterval(bump, 1000);
    return () => clearInterval(id);
  }, [screen, bump]);

  // ---------- Fin de partie ----------

  const onEnd = useCallback(
    (result: 'won' | 'lost', nearMiss: boolean) => {
      const sess = session.current;
      const current = profileRef.current;
      if (!sess || !current) return;
      if (result === 'won') {
        const tier = tierOfLevel(sess.level);
        const streak = current.meta.streak;
        const multiplier = winMultiplier(tier, streak) * coinMultiplier(config, s.clock.now());
        const reward = Math.round(config.economy.levelReward * multiplier);
        const bonuses = [
          ...(META.tierMultiplier[tier] > 1
            ? [t('tierBonus', { tier: tier === 'superHard' ? t('superHard') : t('hard'), m: META.tierMultiplier[tier] })]
            : []),
          ...(streak > 0 ? [t('streakBonus', { n: streak, p: Math.min(streak, META.streakCap) * 10 })] : []),
        ];
        updateProfile((p) => ({ ...completeLevel(p, currentLevel.current, config, multiplier), meta: winStreak(p.meta) }));
        setTimeout(() => setModal({ kind: 'win', reward, bonuses }), WIN_DELAY_MS);
      } else if (nearMiss) {
        const { offerSeconds } = sess.level.rules.nearMiss;
        setModal({ kind: 'nearMiss', remaining: Object.keys(sess.state.screws).length, offerSeconds, deadline: s.clock.now() + offerSeconds * 1000 });
      } else {
        lose();
      }
      bump();
    },
    // `lose` ne dépend que de refs.
    [config, s.clock, updateProfile, setModal, bump, t],
  );

  /** Défaite actée : une vie en moins, la série retombe à zéro. */
  const lose = () => {
    updateProfile((p) => ({ ...p, meta: loseLife(p.meta, s.clock.now()) }));
    setModal({ kind: 'lose' });
  };

  // ---------- Plateau Pixi : créé à l'entrée dans l'écran de jeu, détruit à la sortie ----------

  useEffect(() => {
    if (screen !== 'play' || !profile || !boardEl.current) return;
    const host = boardEl.current;
    let cancelled = false;
    let app: Application | null = null;
    let view: BoardView | null = null;

    void (async () => {
      // La police des badges doit être prête avant de dessiner du texte dans le canvas.
      await document.fonts?.load(`700 16px Fredoka`).catch(() => undefined);
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
        haptics,
        sounds,
      });
      view = board;
      a.stage.addChild(board.root);
      // Rendu à la demande : une scène immobile n'est pas redessinée (batterie, chauffe).
      a.ticker.remove(a.render, a);
      a.ticker.add((ticker) => {
        board.update(ticker.deltaMS);
        if (board.takeDirty()) a.render();
      });
      const onResize = () => board.resize({ width: a.screen.width, height: a.screen.height });
      window.addEventListener('resize', onResize);
      a.renderer.on('resize', onResize);

      startRef.current = (n: number) => {
        const level = levelAt(n);
        if (!level) return;
        currentLevel.current = n;
        session.current = new GameSession(level, board, () => ({ width: a.screen.width, height: a.screen.height }));
        setModal(null);
        setBanner({ level: n, key: Date.now() });
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

  useEffect(() => {
    if (!banner) return;
    const id = setTimeout(() => setBanner(null), BANNER_MS);
    return () => clearTimeout(id);
  }, [banner]);

  // ---------- Lancement d'un niveau : vies, nouveauté, annonce ----------

  const startLevel = (level: number) => {
    currentLevel.current = level;
    setModal(null);
    if (screen === 'play') startRef.current?.(level);
    else setScreen('play');
  };

  /** Portes avant de jouer : une vie disponible, une nouveauté à présenter, un niveau très difficile à annoncer. */
  const requestPlay = (level: number, skip: { intro?: boolean; warn?: boolean } = {}) => {
    const current = profileRef.current;
    const def = levelAt(level);
    if (!current || !def) return;
    if (livesAt(current.meta, s.clock.now()).count <= 0) {
      setModal({ kind: 'noLives' });
      return;
    }
    const intro = skip.intro ? null : introFor(current.meta, def);
    if (intro) {
      setModal({ kind: 'intro', id: intro, level });
      return;
    }
    if (!skip.warn && tierOfLevel(def) === 'superHard') {
      setModal({ kind: 'superHard', level });
      return;
    }
    startLevel(level);
  };

  const goHome = () => {
    setModal(null);
    setScreen('home');
  };

  // ---------- Actions de jeu ----------

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

  // ---------- Après une victoire : pub, coffre, cross-promo, niveau suivant ----------

  const nextLevel = async () => {
    const current = profileRef.current;
    if (!current) return;
    setModal(null);
    const finished = current.nextLevel - 1;
    if (shouldShowInterstitial(finished, config.ads, current.noAds)) await s.ads.showInterstitial('level_end');
    const goOn = () => {
      const latest = profileRef.current;
      if (!latest) return;
      const app = pickPromo(s.promoConfig, latest.promo, {
        selfBundleId: s.bundleId,
        platform: s.platform,
        levelsCompleted: finished,
        nowMs: s.clock.now(),
        noAds: latest.noAds,
      });
      const begin = () => requestPlay(latest.nextLevel);
      if (app) {
        updateProfile((p) => ({ ...p, promo: recordShown(p.promo, app.id, s.clock.now()) }));
        continuation.current = begin;
        setModal({ kind: 'promo', app });
      } else {
        begin();
      }
    };
    if (chestProgress(current.meta, finished).due > 0) {
      let items: RewardItem[] = [];
      updateProfile((p) => {
        const opened = openChest(p.meta, p.wallet);
        items = rewardItems(opened.reward);
        return { ...p, meta: opened.meta, wallet: opened.wallet };
      });
      continuation.current = goOn;
      setModal({ kind: 'chest', items });
    } else {
      goOn();
    }
  };

  const multiplyReward = async (reward: number) => {
    const result = await s.ads.showRewarded('win_x3');
    if (result.status === 'rewarded') updateProfile((p) => grantCoins(p, reward * 2));
    void nextLevel();
  };

  const resume = () => {
    const next = continuation.current;
    continuation.current = null;
    setModal(null);
    next?.();
  };

  // ---------- Boutique, réglages, vies, cadeau du jour ----------

  const buy = async (id: string) => {
    const result = await s.iap.purchase(id);
    if (result.status === 'purchased') updateProfile((p) => grantPurchase(p, id as ProductId));
  };

  const restore = async () => {
    for (const id of await s.iap.restore()) updateProfile((p) => grantPurchase(p, id as ProductId));
  };

  const setSetting = (key: keyof Settings, value: boolean) => updateProfile((p) => ({ ...p, settings: { ...p.settings, [key]: value } }));

  const refillByAd = async () => {
    const result = await s.ads.showRewarded('lives');
    if (result.status === 'rewarded') {
      updateProfile((p) => ({ ...p, meta: refillLives(p.meta, s.clock.now(), 1) }));
      setModal(null);
    }
  };

  const refillByCoins = () => {
    const current = profileRef.current;
    if (!current) return;
    const paid = spend(current.wallet, META.lives.refillCost);
    if (!paid.ok) return;
    updateProfile((p) => ({ ...p, wallet: paid.wallet, meta: refillLives(p.meta, s.clock.now()) }));
    setModal(null);
  };

  const claim = () => {
    updateProfile((p) => {
      const claimed = claimDaily(p.meta, p.wallet, s.clock.now());
      return claimed ? { ...p, meta: claimed.meta, wallet: claimed.wallet } : p;
    });
    setModal(null);
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

  const now = s.clock.now();
  const lives = livesAt(profile.meta, now);
  const sess = session.current;
  const level = currentLevel.current;
  const difficulty = difficultyOf(tierOfLevel(sess?.level ?? levelAt(level)));
  const progress = sess ? 1 - Object.keys(sess.state.screws).length / Math.max(1, sess.level.screws.length) : 0;
  const boosters: BoosterButton[] = BOOSTERS.map((id) => {
    const playing = sess?.state.status === 'playing';
    const usable =
      id === 'undo'
        ? sess?.canUndo === true
        : id === 'addToolboxSlot'
          ? (sess?.state.toolboxSlots ?? 0) < (sess?.level.rules.toolboxMaxSlots ?? 0)
          : (sess?.state.toolbox.length ?? 0) > 0;
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
    const pack = NUT_PACKS.indexOf(p.id);
    return {
      id: p.id,
      title: copy.title,
      displayPrice: mockPrice(p.tier, locale),
      owned: isOwned(profile, p.id),
      icon: pack >= 0 ? 'nuts' : p.id === 'noads' ? 'noads' : p.id === 'starter' ? 'starter' : 'piggy',
      featured: pack < 0,
      ...(pack >= 0 ? { tier: pack + 1 } : {}),
      ...(detail ? { detail } : {}),
      ...(copy.badge ? { badge: copy.badge } : {}),
    };
  });

  const offer = dailyOffer(profile.meta, now);
  const mockNote = s.mock ? <p className="jam-note">{t('mockBadge')}</p> : null;

  return (
    <div className="jam-root" style={themeStyle(theme)}>
      {screen === 'home' ? (
        <HomeScreen
          t={t}
          title={appConfig.displayName}
          nextLevel={profile.nextLevel}
          nextDifficulty={difficultyOf(tierOfLevel(levelAt(profile.nextLevel)))}
          coins={profile.wallet.coins}
          lives={{ count: lives.count, max: META.lives.max, nextIn: lives.nextIn }}
          streak={profile.meta.streak}
          chest={{ progress: chestProgress(profile.meta, profile.nextLevel - 1).progress, every: META.chestEvery }}
          dailyReady={offer !== null}
          path={pathAround(profile.nextLevel, levelAt)}
          onPlay={() => requestPlay(profile.nextLevel)}
          onShop={() => setModal({ kind: 'shop' })}
          onSettings={() => setModal({ kind: 'settings' })}
          onLives={() => lives.count < META.lives.max && setModal({ kind: 'noLives' })}
          onDaily={() => setModal({ kind: 'daily' })}
          onHelp={() => setModal({ kind: 'help' })}
          footer={mockNote}
        />
      ) : (
        <div className="jam-play">
          <TopBar
            t={t}
            level={level}
            difficulty={difficulty}
            streak={profile.meta.streak}
            coins={profile.wallet.coins}
            onSettings={() => setModal({ kind: 'settings' })}
            onShop={() => setModal({ kind: 'shop' })}
          />
          <ProgressBar label={t('progress')} value={progress} />
          <div ref={boardEl} className="jam-board" />
          <BoosterBar t={t} boosters={boosters} onBooster={(id) => useBoosterButton(id as BoosterId)} />
          {banner ? <LevelBanner key={banner.key} t={t} level={banner.level} difficulty={difficultyOf(tierOfLevel(levelAt(banner.level)))} /> : null}
        </div>
      )}

      {modal?.kind === 'shop' ? (
        <ShopModal t={t} products={products} mock={s.mock} onBuy={(id) => void buy(id)} onRestore={() => void restore()} onClose={() => setModal(null)} />
      ) : null}
      {modal?.kind === 'settings' ? (
        <SettingsModal
          t={t}
          sound={profile.settings.sound}
          haptics={profile.settings.haptics}
          onSound={(v) => setSetting('sound', v)}
          onHaptics={(v) => setSetting('haptics', v)}
          onRestore={() => void restore()}
          {...(screen === 'play' ? { onHome: goHome } : {})}
          onClose={() => setModal(null)}
          footer={mockNote}
        />
      ) : null}
      {modal?.kind === 'nearMiss' ? (
        <NearMissHost
          t={t}
          modal={modal}
          clock={s.clock}
          streak={profile.meta.streak}
          continueCost={config.economy.continueCost}
          canPay={profile.wallet.coins >= config.economy.continueCost}
          adReady={s.ads.isRewardedReady('near_miss')}
          onWatchAd={() => void watchAd()}
          onPay={payToContinue}
          onGiveUp={lose}
        />
      ) : null}
      {modal?.kind === 'win' ? (
        <WinModal
          t={t}
          reward={modal.reward}
          bonuses={modal.bonuses}
          adReady={s.ads.isRewardedReady('win_x3')}
          onMultiply={() => void multiplyReward(modal.reward)}
          onContinue={() => void nextLevel()}
        />
      ) : null}
      {modal?.kind === 'lose' ? <LoseModal t={t} onRetry={() => requestPlay(currentLevel.current)} onHome={goHome} /> : null}
      {modal?.kind === 'promo' ? (
        <CrossPromoModal
          t={t}
          name={localized(modal.app.name, locale)}
          tagline={localized(modal.app.tagline, locale)}
          onInstall={() => {
            const url = storeLink(modal.app, s.platform, { source: appConfig.id, placement: 'level_end' });
            if (url) window.open(url, '_blank', 'noopener');
            resume();
          }}
          onClose={resume}
        />
      ) : null}
      {modal?.kind === 'daily' ? (
        <DailyModal
          t={t}
          days={META.daily.map((r) => rewardItems(r))}
          today={offer ?? profile.meta.daily.index % META.daily.length}
          claimable={offer !== null}
          onClaim={claim}
          onClose={() => setModal(null)}
        />
      ) : null}
      {modal?.kind === 'chest' ? <ChestModal t={t} items={modal.items} onCollect={resume} /> : null}
      {modal?.kind === 'noLives' ? (
        <NoLivesModal
          t={t}
          nextIn={lives.nextIn}
          refillCost={META.lives.refillCost}
          canPay={profile.wallet.coins >= META.lives.refillCost}
          adReady={s.ads.isRewardedReady('lives')}
          onAd={() => void refillByAd()}
          onPay={refillByCoins}
          onClose={() => setModal(null)}
        />
      ) : null}
      {modal?.kind === 'intro' ? (
        <IntroModal
          t={t}
          title={t('multiTapTitle')}
          body={t('multiTapBody')}
          art={<span className="jam-skull jam-skull--intro">3</span>}
          onOk={() => {
            const target = modal.level;
            updateProfile((p) => ({ ...p, meta: markIntro(p.meta, modal.id) }));
            requestPlay(target, { intro: true });
          }}
        />
      ) : null}
      {modal?.kind === 'help' ? (
        <HelpModal
          t={t}
          swatches={swatches}
          onOk={() => {
            const first = !profile.meta.intros.includes('howTo');
            if (first) updateProfile((p) => ({ ...p, meta: markIntro(p.meta, 'howTo') }));
            setModal(first && offer !== null ? { kind: 'daily' } : null);
          }}
        />
      ) : null}
      {modal?.kind === 'superHard' ? (
        <SuperHardModal t={t} level={modal.level} multiplier={META.tierMultiplier.superHard} onPlay={() => requestPlay(modal.level, { intro: true, warn: true })} />
      ) : null}
    </div>
  );
}

/** Minuteur de l'offre near miss : l'heure vient de l'horloge monotone du shell. */
function NearMissHost(props: {
  t: Services['t'];
  modal: Extract<Modal, { kind: 'nearMiss' }>;
  clock: Services['clock'];
  streak: number;
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
      if (value <= 0) {
        clearInterval(id);
        onGiveUp();
      }
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
      streak={props.streak}
    />
  );
}
