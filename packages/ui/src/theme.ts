import type { CSSProperties } from 'react';

/** Thème d'app : variables CSS posées sur le conteneur racine (aucune couleur d'app en dur dans les composants). */
export interface UiTheme {
  /** Dégradé du fond (haut → bas). */
  bgTop: string;
  bgBottom: string;
  /** Cartes et modales. */
  surface: string;
  surfaceAlt: string;
  text: string;
  textMuted: string;
  /** Action principale (vert « jouer ») et son bord en relief. */
  primary: string;
  primaryDark: string;
  /** Action secondaire (bleu). */
  secondary: string;
  secondaryDark: string;
  /** Écrous, récompenses. */
  accent: string;
  danger: string;
  radius: string;
  fontFamily: string;
}

export const DEFAULT_UI_THEME: UiTheme = {
  bgTop: '#5cc4ff',
  bgBottom: '#2f7fe0',
  surface: '#ffffff',
  surfaceAlt: '#eef4fb',
  text: '#1d2b4f',
  textMuted: '#5b6b8c',
  primary: '#2fbf5b',
  primaryDark: '#1d8a3f',
  secondary: '#2f8cf5',
  secondaryDark: '#1b5fb8',
  accent: '#ffc928',
  danger: '#f0444b',
  radius: '18px',
  fontFamily: "Fredoka, ui-rounded, 'SF Pro Rounded', 'Arial Rounded MT Bold', system-ui, sans-serif",
};

export function themeStyle(theme: UiTheme): CSSProperties {
  return {
    '--jam-bg-top': theme.bgTop,
    '--jam-bg-bottom': theme.bgBottom,
    '--jam-surface': theme.surface,
    '--jam-surface-alt': theme.surfaceAlt,
    '--jam-text': theme.text,
    '--jam-muted': theme.textMuted,
    '--jam-primary': theme.primary,
    '--jam-primary-dark': theme.primaryDark,
    '--jam-secondary': theme.secondary,
    '--jam-secondary-dark': theme.secondaryDark,
    '--jam-accent': theme.accent,
    '--jam-danger': theme.danger,
    '--jam-radius': theme.radius,
    fontFamily: theme.fontFamily,
  } as CSSProperties;
}
