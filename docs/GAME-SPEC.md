# Spécification — Screw Jam (v1, validée le 2026-10-17)

Source de vérité des règles. Les tests de `engine-screw` sont écrits à partir de ce document.
Toutes les valeurs chiffrées sont des **réglages** (`LevelRules` ou config distante), jamais codées en dur.
Engagement et monétisation : `docs/MONETIZATION.md`. Sensations (haptique, sons, effets) : `docs/JUICE.md`.

## Éléments
- **Plaque** : polygone posé à une hauteur `z` (plus grand = plus haut). Elle tombe quand plus aucune vis ne la retient.
- **Vis** : un point `(x, y)` d'une couleur, qui retient une ou plusieurs plaques (`pins`).
  Une vis est **bloquée** si une plaque encore présente, de `z` supérieur à toutes celles qu'elle retient,
  recouvre son point. Cet état est **dérivé**, jamais stocké.
- **Types de vis** : `standard` ; `multiTap` (il faut la taper `taps` fois) ; `joker` (va dans n'importe quelle boîte).
- **Boîtes** : une file de boîtes colorées. `activeBoxes` = 2 sont ouvertes en même temps ; chacune a `boxCapacity` = 3 emplacements.
- **Toolbox** : zone tampon de `toolboxSlots` = 5 emplacements, extensible jusqu'à `toolboxMaxSlots` = 7.

## Tour de jeu (action `tap(screwId)`)
1. Si la partie n'est pas en cours, ou si la vis est bloquée ou absente : action refusée, état inchangé, événement `rejected`.
2. Vis `multiTap` : on décrémente `tapsLeft`. Elle ne sort qu'à 0.
3. La vis sort : elle va dans une boîte ouverte de sa couleur qui a de la place (un joker va dans la boîte ouverte
   la plus remplie) ; sinon dans la toolbox ; si la toolbox est pleine, la vis devient `overflow` et la partie est perdue.
4. Résolution en cascade, jusqu'à stabilité :
   - les plaques sans vis tombent ;
   - une boîte pleine part et la suivante de la file s'ouvre ;
   - les vis de la toolbox dont la couleur correspond à une boîte ouverte avec de la place y vont (ordre FIFO).
   Chaque boîte complétée pendant une même résolution augmente la profondeur de cascade (événement `cascade`).
5. Plus aucune vis et plus aucune plaque : partie gagnée.
6. S'il ne reste qu'un emplacement libre dans la toolbox : événement `toolboxDanger` (tension).

## Near miss et seconde chance
- `isNearMiss(state)` : partie perdue et vis restantes ≤ `nearMiss.maxRemaining` (3).
- Action `revive` (uniquement après une défaite) : +1 emplacement de toolbox (au-delà du maximum si nécessaire),
  la vis `overflow` y est placée, cascade, puis la partie reprend. Le nombre de revives est compté.
- L'offre (minuteur de 10 s, prix croissant) est gérée par le shell : voir `docs/MONETIZATION.md`.

## Boosters (actions du moteur)
- `extraSlot` : +1 emplacement de toolbox, dans la limite de `toolboxMaxSlots`.
- `drill(screwId)` : retire une vis **même bloquée** ; elle suit les règles de destination normales.
- `undo` : annule le dernier coup, en rejouant l'historique sans lui (déterministe).

## Niveau
Défini par `LevelDef` (`packages/engine-screw/src/types.ts`) et validé par `@jam/level-tools`.
Contraintes : ids uniques ; chaque vis retient au moins une plaque existante ; chaque plaque est retenue par au moins
une vis ; polygones d'au moins 3 points dans le plateau ; pour chaque couleur, le nombre de vis (jokers compris dans
le total) correspond exactement aux boîtes de la file. Un niveau n'est publiable que si le solveur le résout.
