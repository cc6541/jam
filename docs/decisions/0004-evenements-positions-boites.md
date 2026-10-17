# 0004 — Positions dans les événements de boîtes

Date : 2026-10-17 · Statut : adopté (phase 4). Modifie un contrat gelé (`engine-screw/src/types.ts`).

Problème : pour animer une vis vers sa boîte, le rendu devait savoir *quelle* boîte et *quel* emplacement.
Avec seulement `boxColor`, il aurait dû recalculer « première boîte ouverte de la couleur avec de la place »
et le remplacement des boîtes pleines, c'est-à-dire dupliquer une règle du moteur (interdit côté rendu).

Changement (ajout de champs, rétrocompatible pour les lecteurs) :
- `screwToBox` : `boxIndex` (place dans `openBoxes` au moment de l'événement) et `slot` (emplacement dans la boîte) ;
- `boxCompleted` : `boxIndex` et `next` (couleur de la boîte qui prend sa place, ou `null`).
- Type `ScrewSource` extrait pour `screwToBox.from`.

Le schéma de niveau n'est pas concerné. Tests [R5], [R7], [R11] mis à jour.
