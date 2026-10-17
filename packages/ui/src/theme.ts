import type { CSSProperties } from 'react';

/** Thème d'app : variables CSS posées sur le conteneur racine (aucune couleur en dur dans les composants). */
export interface UiTheme {
  background: string;
  surface: string;
  text: string;
  textMuted: string;
  primary: string;
  onPrimary: string;
  accent: string;
  danger: string;
  radius: string;
  fontFamily: string;
}

export const DEFAULT_UI_THEME: UiTheme = {
  background: '#1e2433',
  surface: '#2c3448',
  text: '#f4f6fb',
  textMuted: '#aab3c8',
  primary: '#3e8ef7',
  onPrimary: '#ffffff',
  accent: '#f5c33b',
  danger: '#e5484d',
  radius: '14px',
  fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
};

export function themeStyle(theme: UiTheme): CSSProperties {
  return {
    '--jam-bg': theme.background,
    '--jam-surface': theme.surface,
    '--jam-text': theme.text,
    '--jam-muted': theme.textMuted,
    '--jam-primary': theme.primary,
    '--jam-on-primary': theme.onPrimary,
    '--jam-accent': theme.accent,
    '--jam-danger': theme.danger,
    '--jam-radius': theme.radius,
    fontFamily: theme.fontFamily,
  } as CSSProperties;
}
