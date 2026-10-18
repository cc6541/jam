# 0007 — Refonte visuelle et UX selon les codes du genre

Date : 2026-10-18 · Statut : adopté. Remplace la direction « atelier sombre » de 0006 (le vocabulaire « écrous » est conservé).

Demande : un design plus professionnel et plus simple à prendre en main, inspiré des jeux de vis à succès
(Screw Jam de Rollic, Wood Nuts & Bolts, Screw Sort…). Aucune règle de jeu n'a changé.

## Choix
- **Lisibilité** : fond clair (ciel bleu), cartes blanches, police arrondie Fredoka (OFL) embarquée et inlinée → hors ligne.
- **Disposition du genre** : caisses en haut, zone tampon juste dessous (trajet du regard court), plateau au centre
  **cadré sur le contenu du niveau** (un petit niveau est zoomé, plus de grand cadre vide), boosters ronds en bas,
  barre du haut minimale (réglages, niveau + badge « Difficile », écrous avec accès boutique), barre de progression.
- **Matière** : planches de bois à coins arrondis, plus claires en hauteur (profondeur lisible), **trous visibles**
  à l'emplacement des vis (ils restent quand la vis sort), vis en relief avec ombre portée et motif gravé (invariant 6).
- **Sensation** : dévissage (rotation + soulèvement) puis vol en arc avec rebond, couvercle qui se ferme puis caisse qui
  s'envole avec confettis, planche qui tombe en pivotant, anneau rouge et secousse sur vis bloquée, pluie de confettis
  à la victoire, bannière de début de niveau, sons synthétisés en WebAudio (aucun fichier audio), haptique.
- **Écrans** : victoire avec « x3 avec une pub » (seulement si une pub est prête), défaite avec conseil, offre near miss,
  boutique en grille (le badge « Meilleure offre » va au pack au meilleur ratio écrous/prix, vérifié par un test),
  réglages Sons / Vibrations persistés.
- **Badge « Difficile »** : deux derniers niveaux de chaque bloc de 10 à partir du niveau 21 (pics de la courbe, 0003).

## Robustesse
- Un tween qui lève une exception est retiré au lieu de bloquer toutes les animations (bug trouvé en jouant :
  une caisse recréée pendant son animation d'entrée figeait le jeu).
- Vérifié en jouant 6 niveaux complets par le solveur (dont le 91, 47 coups) avec des taps plus rapides que les animations.

## Mesures (rendu logiciel, non représentatif d'un GPU)
App, niveau 91 : ~46 fps moyens, 1 % bas ~30. **Mesure sur Android d'entrée de gamme toujours à faire** (DoD phase 4).

## Reste hors périmètre
Illustrations raster (personnage, décors peints), musique, effets de particules avancés : demandent un artiste.
