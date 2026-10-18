# 0006 — Habillage « atelier » et vocabulaire

Date : 2026-10-18 · Statut : adopté. Référence visuelle fournie par l'humain (capture d'une maquette « Niveau 42 – Atelier Néon »).

- **Vocabulaire** : la monnaie s'appelle **écrous** (FR) / **nuts** (EN) dans l'interface ; le monde du premier pack s'appelle « Atelier Néon » / « Neon Workshop » (`app.config.json › world`). Les notes d'économie parlent encore de « pièces » : même chose. Le nom Store du jeu reste à fixer.
- **Rendu** : tout est vectoriel (aplats, traits, reflets), sans image ni filtre. Plaques alternées métal / bois, cadre bois, vis en relief avec leur motif gravé (invariant 6 conservé : la maquette met une croix partout, nous gardons un motif par couleur), bac de toolbox numéroté avec emplacements verrouillés visibles (« + »), caisses métal à liseré coloré.
- **Perf** : les décors statiques sont figés en textures (`cacheAsTexture`) ; le fond (néons, lampe) est en dégradés CSS derrière un canvas transparent ; antialiasing du canvas désactivé. Mesure en rendu logiciel sur le niveau 91 : ~34 fps avant ces optimisations, ~47 après (≈55 avant l'habillage). **Reste à mesurer sur un vrai Android** (DoD de la phase 4).
- **Hors périmètre** : illustrations raster (fond d'atelier, vis 3D, icônes de boosters peintes). Les emplacements sont prêts ; elles demandent des assets d'un illustrateur.
- **Aucune règle de jeu modifiée.** Les boosters gardent leurs noms (Annuler, +1 case, Vider) : la maquette montre « Tournevis » et « Marteau », dont l'effet n'est pas défini.
