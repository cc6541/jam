# 0003 — Solveur, score de difficulté et courbe

Date : 2026-10-17 · Statut : adopté (phase 3). Code : `engine-screw/src/solver.ts`, `level-tools/src/curve.ts`.

## Solveur
DFS sur les états du moteur réel (aucune règle dupliquée), sans boosters, mémoïsation des états perdants.
Clé d'état canonique : vis du plateau + `tapsLeft`, puis toolbox, réserve et boîtes résumées par couleurs
(deux vis de même couleur hors plateau sont interchangeables). Ordre d'exploration : vis rangeables en boîte d'abord.
Budget : 200 000 états en validation, 20 000 en génération (un candidat qui dépasse est jeté).

## Score de difficulté (0 à 100)
`round(100 × (0,5 × échec glouton + 0,2 × échec aléatoire + 0,3 × états perdants / (états perdants + profondeur)))`
- échec aléatoire : 100 parties seedées, tap uniforme parmi les vis libres ;
- échec glouton : idem, mais préfère les vis rangeables directement (plus proche d'un humain débutant) ;
- états perdants : branches mortes rencontrées par le solveur avant sa solution.
Ces poids sont un point de départ à recaler sur les KPI de complétion réels (analytics).

## Courbe en dents de scie
Blocs de 10 niveaux. Chaque bloc a ses paramètres de génération (plus de vis, couleurs, plaques, multiTap)
et une moyenne visée `3 + 8 × bloc`. Le générateur produit des candidats solubles, garde la fenêtre de 10
dont la moyenne est ≥ celle du bloc précédent et la plus proche de la cible, triée par difficulté croissante :
la difficulté monte dans le bloc puis redescend au début du suivant. `pnpm levels:validate` rejette un pack
dont un bloc est plus facile que le précédent.
