# Spécification — Screw Jam (v0)

Source de vérité des règles. Les tests de `engine-screw` sont écrits à partir de ce document.
Tout point marqué **[À VALIDER]** est une hypothèse de game design : elle est réglable par config, pas codée en dur.

## Éléments
- **Plaque** : polygone posé à une hauteur `z` (plus grand = plus haut). Elle tombe quand plus aucune vis ne la retient.
- **Vis** : un point `(x, y)` d'une couleur, qui retient une ou plusieurs plaques (`pins`).
  Une vis est **bloquée** si une plaque encore présente, de `z` supérieur à toutes celles qu'elle retient,
  recouvre son point. Cet état est **dérivé**, jamais stocké.
- **Boîtes** : une file de boîtes colorées. Seules les `activeBoxes` (2 par défaut **[À VALIDER]**) sont ouvertes.
  Chaque boîte a 3 emplacements (c'est le « match-3 »).
- **Toolbox** : zone tampon de `toolboxSlots` emplacements (5 par défaut, jusqu'à 7 avec un booster **[À VALIDER]**).

## Tour de jeu (action `tap(screwId)`)
1. Si la vis est bloquée ou absente : action refusée, l'état est inchangé.
2. Vis `multiTap` : on décrémente `tapsLeft`. Elle ne sort qu'à 0.
3. La vis sort : elle va dans une boîte active de sa couleur qui a de la place ; sinon dans la toolbox ;
   si la toolbox est pleine, la partie est perdue (`status = 'lost'`).
4. Résolution en cascade, jusqu'à stabilité :
   - les plaques sans vis tombent ;
   - une boîte pleine part et la suivante de la file s'ouvre ;
   - les vis de la toolbox dont la couleur correspond à une boîte ouverte avec de la place y vont
     (dans l'ordre FIFO de la toolbox).
5. Plus aucune vis et plus aucune plaque : `status = 'won'`.

## Near Miss **[À VALIDER]**
À la défaite, si `vis restantes ≤ nearMiss.maxRemaining` (3 par défaut), on propose pendant
`nearMiss.offerSeconds` (10 s) une **seconde chance** (+1 emplacement de toolbox) contre une pub
récompensée ou des pièces. Le moteur expose seulement `isNearMiss(state)` ; le minuteur et l'offre vivent dans le shell.

## Boosters (actions du moteur)
- `undo` : revient au coup précédent (l'historique des actions est rejouable).
- `addToolboxSlot` : +1 emplacement, dans la limite du maximum.
- `clearToolbox` : renvoie la toolbox dans une boîte temporaire. **[À VALIDER]**

## Niveau
Défini par `LevelDef` (`packages/engine-screw/src/types.ts`) et validé par
`packages/level-tools/schema/level.schema.json`. Un niveau n'est publiable que si le solveur
trouve au moins une solution et en calcule un score de difficulté.
