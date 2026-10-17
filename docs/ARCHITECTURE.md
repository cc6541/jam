# Architecture

```
packages/
  engine-screw/  réducteur pur Screw Jam + sélecteurs + solveur + générateur
  level-tools/   schéma JSON des niveaux, validation CI, scoring de difficulté
  shell/         save (namespacée), économie, IAP, pubs, analytics, remote config statique
  cross-promo/   cartes promo, liens Store traçables, capping, config statique
  render-pixi/   plateau, animations, haptique
  ui/            composants React thémables (menus, boutique, modales)
apps/<nom>/      thème + app.config.json + levels/ + ASO ; quasiment pas de code
```

Dépendances autorisées : `apps → ui, render-pixi, shell, cross-promo, engine-*` ;
`render-pixi → engine-*` ; `level-tools → engine-*` (solveur). `shell`, `cross-promo` et `engine-*`
ne dépendent d'aucun autre package interne.

Rendu : PixiJS pour le plateau, React pour l'UI, Capacitor pour iOS/Android.
