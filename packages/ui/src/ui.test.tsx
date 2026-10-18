import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createT, pickLocale } from './i18n';
import { BoosterBar, CrossPromoModal, EndModal, HomeScreen, Hud, NearMissModal, ShopModal } from './screens';
import { Swatch, type SwatchDef } from './swatch';
import { DEFAULT_UI_THEME, themeStyle } from './theme';

const t = createT('fr');
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
    expect(style['--jam-neon']).toBe(DEFAULT_UI_THEME.neon);
    expect(Object.keys(style).filter((k) => k.startsWith('--jam-')).length).toBe(11);
  });
});

describe('accessibilité', () => {
  it('chaque pastille de couleur porte un motif et un libellé (invariant 6)', () => {
    const html = renderToStaticMarkup(<Swatch swatch={swatches[0] as SwatchDef} />);
    expect(html).toContain('aria-label="Rouge à points"');
    expect(html).toContain('<circle cx="-4.5"');
  });

  it('la légende de l’accueil liste chaque couleur avec son motif', () => {
    const html = renderToStaticMarkup(
      <HomeScreen t={t} title="Titre" nextLevel={3} coins={120} swatches={swatches} onPlay={() => undefined} onShop={() => undefined} />,
    );
    expect(html).toContain('Jouer · Niveau 3');
    expect(html.match(/role="img"/g)?.length).toBe(2);
  });

  it('les modales sont des dialogues nommés', () => {
    const html = renderToStaticMarkup(
      <ShopModal
        t={t}
        mock
        products={[{ id: 'noads', title: 'Sans pub', displayPrice: '3,99 €' }, { id: 'x', title: 'X', displayPrice: '1 €', owned: true }]}
        onBuy={() => undefined}
        onRestore={() => undefined}
        onClose={() => undefined}
      />,
    );
    expect(html).toContain('role="dialog"');
    expect(html).toContain('aria-label="Boutique"');
    expect(html).toContain('Mode démo');
    expect(html).toContain('3,99 €');
    expect(html).toContain('Acquis');
  });

  it('near miss : barre de temps, achat en pièces désactivable', () => {
    const html = renderToStaticMarkup(
      <NearMissModal
        t={t}
        remaining={2}
        secondsLeft={5}
        offerSeconds={10}
        continueCost={150}
        canPay={false}
        adReady
        onWatchAd={() => undefined}
        onPay={() => undefined}
        onGiveUp={() => undefined}
      />,
    );
    expect(html).toContain('role="progressbar"');
    expect(html).toContain('aria-valuenow="5"');
    expect(html).toContain('width:50%');
    expect(html).toMatch(/<button[^>]*disabled[^>]*>Utiliser 150 écrous/);
  });

  it('HUD, fin de partie et cross-promo se rendent', () => {
    const hud = renderToStaticMarkup(<Hud t={t} level={4} world="Atelier Néon" coins={80} onHome={() => undefined} />);
    expect(hud).toContain('Écrous : 80');
    expect(hud).toContain('Atelier Néon');
    const bar = renderToStaticMarkup(
      <BoosterBar
        t={t}
        onBooster={() => undefined}
        boosters={[
          { id: 'undo', label: 'Annuler', owned: 0, price: 60, icon: 'undo' },
          { id: 'slot', label: '+1 case', owned: 2, price: 120, icon: 'slot', disabled: true },
        ]}
      />,
    );
    expect(bar).toContain('aria-label="Annuler (60 Écrous)"');
    expect(bar).toContain('×2');
    expect(bar).toMatch(/<button[^>]*disabled[^>]*aria-label="\+1 case/);
    const win = renderToStaticMarkup(<EndModal t={t} result="won" reward={20} onNext={() => undefined} onRetry={() => undefined} onHome={() => undefined} />);
    expect(win).toContain('Niveau suivant');
    const lost = renderToStaticMarkup(<EndModal t={t} result="lost" onNext={() => undefined} onRetry={() => undefined} onHome={() => undefined} />);
    expect(lost).not.toContain('Niveau suivant');
    const promo = renderToStaticMarkup(<CrossPromoModal t={t} name="Bolt Jam" tagline="Trie" onInstall={() => undefined} onClose={() => undefined} />);
    expect(promo).toContain('Bolt Jam');
  });
});
