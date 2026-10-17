# Engagement et monétisation

Objectif : maximiser les revenus **sans abîmer la rétention**, qui est la source des revenus.
Tout est piloté par la config distante statique (`docs/ZERO-INFRA.md`) pour être réglable et A/B-testable sans mise à jour.
Valeurs = points de départ, à ajuster sur les données.

## KPI cibles (lancement)
Rétention J1 ≥ 40 %, J7 ≥ 15 % · complétion de chacun des niveaux 1-20 ≥ 70 % · revenus pub ≈ 0,05 $ / joueur actif / jour.
Suivis dans Firebase Analytics : `level_start`, `level_end` (résultat, coups, revives, boosters), `offer_shown`, `offer_result`, `ad_shown`, `iap_purchase`.

## Boucle de jeu et progression
- **Premiers niveaux** (1-5) très faciles avec tutoriel intégré ; premier niveau « difficile » vers le 7.
- **Difficulté en dents de scie** : tous les 5 à 10 niveaux, un niveau étiqueté **Difficile** ou **Très difficile**
  (récompense ×2 / ×3). C'est là que se concentrent revives et boosters.
- **Coffre de progression** tous les 10 niveaux (pièces + booster).
- **Série de victoires** : multiplicateur de pièces qui monte à chaque victoire et retombe à la défaite → augmente la valeur perçue d'un revive.
- **Vies** : 5 vies, une perdue à chaque défaite, +1 toutes les 30 min (horloge locale `ClockPort`).
  Recharge : pub récompensée (+1), pièces (toutes), ou vies illimitées 30 min via IAP.
- **Récompense quotidienne** sur 7 jours (jour 7 = gros lot). Propre à chaque app.
- **Notifications locales** (sans serveur) : vies rechargées, récompense quotidienne disponible. Opt-in, max 1/jour.
- **Événements datés** (week-end ×2 pièces, défi de la semaine) déclarés dans le JSON statique.

## Near miss et seconde chance (le levier n°1)
À la défaite, si `isNearMiss` : écran « Si près ! » avec la jauge de progression du niveau, minuteur réel de 10 s.
- 1er revive : pub récompensée **ou** 900 pièces. 2e : 1 900 pièces. Au-delà : pas de revive.
- Hors near miss : proposer quand même un revive, mais seulement en pièces.
- Refus ou fin du minuteur → écran de défaite (perte d'une vie) avec « Rejouer ».

## Pubs
- **Récompensées** (toujours au choix du joueur) : revive, ×2 récompense de fin de niveau, booster gratuit, vie.
- **Interstitielles** : à partir du niveau 10, entre deux niveaux uniquement, au plus une toutes les 90 s,
  jamais juste après une défaite ni pendant une offre. Désactivées par l'achat « Sans pub ».
- Plafond par session et par jour réglable dans la config.

## Achats intégrés
- **Sans pub** (retire les interstitielles, garde les récompensées volontaires).
- **Pack de démarrage** proposé une fois entre les niveaux 8 et 15, valable 24 h réelles.
- **Packs de pièces** et **packs de boosters** ; **tirelire** qui se remplit de pièces à chaque victoire et se « casse » par un IAP.
- Prix et contenus dans la config distante ; les identifiants produits sont déclarés dans les stores.

## Garde-fous (non négociables)
- Prix et contenus toujours affichés clairement ; minuteurs réels (pas de faux compte à rebours qui se réinitialise).
- Aucun tirage aléatoire payant (pas de loot box) ; aucune monnaie ni progression partagée entre apps.
- Consentement RGPD et ATT avant toute pub personnalisée ; ne pas cibler les enfants.
- Tout niveau reste gagnable sans payer (garanti par le solveur).
