import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createT, pickLocale } from './i18n';
import {
  BoosterBar,
  CrossPromoModal,
  HomeScreen,
  LevelBanner,
  LoseModal,
  NearMissModal,
  ProgressBar,
  SettingsModal,
  ShopModal,
  TopBar,
  WinModal,
} from './screens';
import { Swatch, type SwatchDef } from './swatch';
import { DEFAULT_UI_THEME, themeStyle } from './theme';

const t = createT('fr');
const noop = () => undefined;
const swatches: SwatchDef[] = [
  { id: 'red', label: 'Rouge à points', color: '#e5484d', pattern: 'dots' },
  { id: 'blue', label: 'Bleu à rayures', color: '#3e8ef7', pattern: 'stripes' },
];

describe('i18n', () => {
  it('remplace les variables et choisit la langue', () => {
    expect(t('nearMissBody', { n: 2 })).toContain('2 vis');
    expect(t('coins')).toBe('Écrous');
    expect(createT('en')('play')).toBe('Play');
    expect(pickLocale('fr-CA')).toBe('fr');
    expect(pickLocale('de')).toBe('en');
  });
});

describe('thème', () => {
  it('expose toutes les couleurs en variables CSS', () => {
    const style = themeStyle(DEFAULT_UI_THEME) as Record<string, string>;
    expect(style['--jam-primary']).toBe(DEFAULT_UI_THEME.primary);
    const colorKeys = Object.keys(DEFAULT_UI_THEME).filter((k) => k !== 'fontFamily' && k !== 'radius');
    expect(Object.keys(style).filter((k) => k.startsWith('--jam-') && k !== '--jam-radius')).toHaveLength(colorKeys.length);
  });
});

describe('accessibilité', () => {
  it('chaque pastille de couleur porte un motif et un libellé (invariant 6)', () => {
    const html = renderToStaticMarkup(<Swatch swatch={swatches[0] as SwatchDef} />);
    expect(html).toContain('aria-label="Rouge à points"');
    expect(html).toContain('<circle cx="-4.5"');
  });

  it('accueil : logo, bouton du prochain niveau (avec badge Difficile), légende couleurs + motifs', () => {
    const html = renderToStaticMarkup(
      <HomeScreen t={t} title="Screw Jam" nextLevel={9} nextHard coins={1450} swatches={swatches} onPlay={noop} onShop={noop} onSettings={noop} />,
    );
    expect(html).toContain('<h1 class="jam-logo">');
    expect(html.replace(/<!-- -->/g, "")).toContain("Niveau 9");
    expect(html).toContain('Difficile');
    expect(html.match(/role="img"/g)?.length).toBe(2);
    expect(html).toContain('aria-label="Réglages"');
  });

  it('barre du haut, progression, bannière', () => {
    const top = renderToStaticMarkup(<TopBar t={t} level={4} hard coins={80} onSettings={noop} onShop={noop} />);
    expect(top).toContain('aria-label="Écrous: 80. Obtenir des écrous"');
    expect(top).toContain('Difficile');
    const bar = renderToStaticMarkup(<ProgressBar label="Progression" value={0.42} />);
    expect(bar).toContain('aria-valuenow="42"');
    expect(bar).toContain('width:42%');
    expect(renderToStaticMarkup(<LevelBanner t={t} level={7} />)).toContain('aria-live="polite"');
  });

  it('boosters : quantité possédée ou prix, désactivables', () => {
    const html = renderToStaticMarkup(
      <BoosterBar
        t={t}
        onBooster={noop}
        boosters={[
          { id: 'undo', label: 'Annuler', owned: 0, price: 60, icon: 'undo' },
          { id: 'slot', label: '+1 case', owned: 2, price: 120, icon: 'slot', disabled: true },
        ]}
      />,
    );
    expect(html).toContain('aria-label="Annuler (60 Écrous)"');
    expect(html).toContain('jam-booster__count">2<');
    expect(html).toMatch(/<button[^>]*disabled[^>]*aria-label="\+1 case/);
  });

  it('les modales sont des dialogues nommés avec ruban et fermeture', () => {
    const html = renderToStaticMarkup(
      <ShopModal
        t={t}
        mock
        products={[
          { id: 'noads', title: 'Sans pub', displayPrice: '3,99 €', icon: 'noads', featured: true },
          { id: 'x', title: 'X', displayPrice: '1 €', icon: 'nuts', tier: 2, owned: true },
        ]}
        onBuy={noop}
        onRestore={noop}
        onClose={noop}
      />,
    );
    expect(html).toContain('role="dialog"');
    expect(html).toContain('aria-label="Boutique"');
    expect(html).toContain('class="jam-ribbon"');
    expect(html).toContain('aria-label="Fermer"');
    expect(html).toContain('Mode démo');
    expect(html).toContain('3,99 €');
    expect(html).toContain('Acquis');
  });

  it('near miss : minuteur, pub gratuite, paiement désactivable', () => {
    const html = renderToStaticMarkup(
      <NearMissModal t={t} remaining={2} secondsLeft={5} offerSeconds={10} continueCost={150} canPay={false} adReady onWatchAd={noop} onPay={noop} onGiveUp={noop} />,
    );
    expect(html).toContain('role="progressbar"');
    expect(html).toContain('aria-valuenow="5"');
    expect(html).toContain('width:50%');
    expect(html).toMatch(/<button[^>]*disabled[^>]*>.*150/);
    expect(html).not.toContain('aria-label="Fermer"');
  });

  it('victoire (x3 seulement si une pub est prête), défaite, réglages, cross-promo', () => {
    const win = renderToStaticMarkup(<WinModal t={t} reward={20} adReady onMultiply={noop} onContinue={noop} />);
    expect(win).toContain('Niveau terminé !');
    expect(win).toContain('+60');
    expect(renderToStaticMarkup(<WinModal t={t} reward={20} adReady={false} onMultiply={noop} onContinue={noop} />)).not.toContain('x3');
    expect(renderToStaticMarkup(<LoseModal t={t} onRetry={noop} onHome={noop} />)).toContain('Rejouer');
    const settings = renderToStaticMarkup(
      <SettingsModal t={t} sound haptics={false} onSound={noop} onHaptics={noop} onRestore={noop} onClose={noop} />,
    );
    expect(settings).toContain('role="switch" aria-checked="true"');
    expect(settings).toContain('role="switch" aria-checked="false"');
    expect(renderToStaticMarkup(<CrossPromoModal t={t} name="Bolt Jam" tagline="Trie" onInstall={noop} onClose={noop} />)).toContain('Bolt Jam');
  });
});
