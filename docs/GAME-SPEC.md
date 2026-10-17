# Spécification — Screw Jam (v0)

Source de vérité des règles. Les tests de `engine-screw` sont écrits à partir de ce document :
chaque règle porte un identifiant `[Rn]` cité dans le nom d'au moins un test.
Les valeurs de game design sont réglables par `LevelRules`, jamais codées en dur.
Valeurs par défaut validées le 2026-10-17 : voir `docs/decisions/0001-spec-v0-defaults.md`.

## Éléments
- **Plaque** : polygone posé à une hauteur `z` (plus grand = plus haut). Elle tombe quand plus aucune vis du plateau ne la retient.
- **Vis** : un point `(x, y)` d'une couleur, qui retient une ou plusieurs plaques (`pins`).
- **[R1] Vis bloquée** : une plaque encore présente, de `z` strictement supérieur à toutes celles que la vis retient,
  recouvre son point (intérieur ou bord du polygone). Cet état est **dérivé**, jamais stocké.
- **Boîtes** : une file de boîtes colorées (`boxQueue`). Seules `activeBoxes` boîtes (2 par défaut) sont ouvertes,
  chacune de `boxCapacity` emplacements (3 : c'est le « match-3 »).
- **Toolbox** : zone tampon FIFO de `toolboxSlots` emplacements (5 par défaut, `toolboxMaxSlots` = 7 avec boosters).
- **Réserve** (`holding`) : boîte temporaire sans limite, remplie seulement par le booster `clearToolbox`.

## Initialisation
- **[R2]** Toutes les vis et plaques du niveau sont présentes ; `tapsLeft` vaut `taps` pour une vis `multiTap`, 1 sinon.
  Les `activeBoxes` premières boîtes de la file sont ouvertes, dans l'ordre. Toolbox et réserve vides,
  `toolboxSlots = rules.toolboxSlots`, `moves = 0`, `status = 'playing'`.

## Tour de jeu (action `tap(screwId)`)
- **[R3]** Vis absente, vis bloquée ou partie non `playing` : action refusée (`rejected` avec la raison
  `unknown`, `blocked` ou `notPlaying`), l'état retourné est le même objet, inchangé.
- **[R4]** Tout tap accepté incrémente `moves` et décrémente `tapsLeft` (événement `screwTapped`).
  Une vis `multiTap` reste en place tant que `tapsLeft > 0`.
- **[R5]** À `tapsLeft = 0`, la vis sort du plateau : elle va dans la **première** boîte ouverte (ordre de `openBoxes`)
  de sa couleur qui a de la place ; sinon à la fin de la toolbox.
- **[R6]** Si la toolbox est pleine, la partie est perdue (`status = 'lost'`, événement `lost`) ; la vis reste
  sur le plateau avec `tapsLeft = 0`, rien d'autre ne change.
- **[R7]** Résolution en cascade, répétée jusqu'à stabilité :
  1. les plaques qu'aucune vis du plateau ne retient tombent (`plateFell`) ;
  2. une boîte pleine part (`boxCompleted`) ; la suivante de la file prend **sa place** dans `openBoxes`
     (si la file est épuisée, l'emplacement disparaît) ;
  3. les vis de la réserve, puis celles de la toolbox, dans l'ordre FIFO, vont dans la première boîte ouverte
     de leur couleur qui a de la place (`screwToBox`).
- **[R8]** Plus aucune vis ni plaque sur le plateau : `status = 'won'` (événement `won`).

## Near Miss
- **[R9]** `isNearMiss(state)` est vrai si la partie est perdue, qu'il reste au plus `nearMiss.maxRemaining` (3)
  vis sur le plateau et que `toolboxSlots < toolboxMaxSlots` (la seconde chance est possible).
  L'événement `lost` porte cette valeur. L'offre (pub récompensée ou pièces, `nearMiss.offerSeconds` = 10 s)
  et son minuteur vivent dans le shell.

## Boosters (actions du moteur ; le stock de boosters vit dans le shell)
- **[R10]** `addToolboxSlot` : +1 emplacement, refusé (`limit`) à `toolboxMaxSlots`. Sur une partie perdue,
  c'est la **seconde chance** : la partie repasse en `playing`. Refusé (`notPlaying`) sur une partie gagnée.
- **[R11]** `clearToolbox` : toute la toolbox passe dans la réserve (ordre conservé), puis cascade [R7].
  Refusé (`limit`) si la toolbox est vide, (`notPlaying`) hors partie en cours.
- **[R12]** `undo` n'est pas une action : le shell rejoue l'historique moins le dernier coup
  (`engine.replay(level, actions.slice(0, -1))`). `replay` donne le même état qu'une suite de `step`.

## Déterminisme
- **[R13]** `init`, `step` et `replay` sont purs : mêmes entrées → mêmes états et événements ;
  ils ne modifient jamais leurs arguments.

## Niveau
Défini par `LevelDef` (`packages/engine-screw/src/types.ts`) et validé par
`packages/level-tools/schema/level.schema.json` plus des contrôles sémantiques (`validateLevel`) :
ids uniques, chaque vis retient au moins une plaque existante, chaque plaque est retenue par au moins une vis,
polygone d'au moins 3 points, nombre de vis par couleur = `boxCapacity` × nombre de boîtes de cette couleur.
Un niveau n'est publiable que si le solveur trouve au moins une solution et en calcule un score de difficulté.
