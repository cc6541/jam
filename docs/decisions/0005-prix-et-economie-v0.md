# 0005 — Positionnement prix et économie v0

Date : 2026-10-17 · Statut : **hypothèses de lancement**, réglables sans mise à jour de l'app
(prix Store = tiers choisis dans App Store Connect / Play Console ; valeurs d'économie = remote config statique, `docs/ZERO-INFRA.md`).
Nom d'affichage Store : volontairement non fixé (à décider plus tard) ; le bundleId reste à fournir.

## Ce que le benchmark montre (et ne montre pas)
Sources : listings App Store et agrégateurs, via recherche web ; les pages elles-mêmes n'étaient pas joignables
depuis le conteneur, donc **rien n'a été vérifié à la source et les prix changent selon pays et date**.

| Observation | Valeurs relevées |
|---|---|
| « Remove Ads » des clones directs « Screw Jam / Nuts & Bolts » | 3,99 $ (deux apps), 5,99 $, bundle 9,99 $ et 10,99 $ ; 6,99 $ (« Twist Pin Puzzle », bundle 9,99 $) |
| « Remove Ads » des jeux de blocs | 2,99 $ (Wood Blast), 4,99 $ (Wood Block Puzzle), 9,99 $ (Block Blast) |
| Packs de pièces des jeux de vis | de 0,99 $ à 7,99–9,99 $ en cœur de gamme ; 44,99 $ et 79,99 $ en haut de grille |
| Rollic « Screw Jam » (snapshot avril 2026, tracker tiers) | pièces 1,99 / 4,99 / 7,99 / 14,99 $, vies infinies 9,99–29,99 $, Gold Pass 7,99 $, offres « échec » et « niveau difficile » 4,99 $ ; pas de « Remove Ads » listé |
| Tirelire | 1,99–4,99 $ dans la plupart des jeux analysés, 3 $ le plus courant ; rarement le premier achat |
| Revenu hybrid-casual (puzzle) | ARPDAU 0,10–0,50 $ selon les sources (écart ×2–3), part IAP 40–60 % ; seuls 3,5 % des joueurs mobiles achètent (AppsFlyer, via un tiers) |

Limites : aucun benchmark propre à « Remove Ads » 2,99 $ vs 3,99 $ ; les chiffres de revenu viennent de blogs d'éditeurs d'outils.
Les prix de lancement sont donc des **points de départ à tester**, pas une vérité de marché.

## Positionnement retenu
**Milieu de grille, sans haut de grille au lancement.** Les clones directs se concentrent autour de 3,99 $ pour « Remove Ads » ;
se placer au mode évite de paraître cher sans brader. On n'ouvre pas les packs à 44,99 $ et plus : aucune donnée sur nos joueurs,
et ils compliquent le support (remboursements) pour un revenu hypothétique.
Prix en tiers Apple/Google (le prix local TTC est choisi dans la console, pas converti à la main).

| Produit | Prix | Remarque |
|---|---|---|
| Sans pub (non consommable) | **3,99** | Supprime interstitielles et bannières ; les pubs récompensées restent volontaires |
| Pack de démarrage (1 fois) | **1,99** | Premier achat : pièces + 3 boosters, affiché après le niveau 8 |
| Pièces S / M / L / XL | **0,99 / 2,99 / 4,99 / 9,99** | Bonus croissant : 400 / 1 300 / 2 300 / 5 000 pièces |
| Tirelire (déblocage) | **2,99** | Contenu plafonné à ~1,5× la valeur du prix en pièces |

## Valeurs d'économie (remote config)
Une victoire ≈ 1,5 min de jeu. Repère : 400 pièces ≈ 0,99 $.

| Clé | Valeur | Logique |
|---|---|---|
| `economy.startingCoins` | 200 | Assez pour tester un booster dès le début |
| `economy.levelReward` | 20 | ~20 victoires pour 400 pièces |
| `boosterPrices.undo` | 60 | Booster le plus courant, le moins cher |
| `boosterPrices.addToolboxSlot` | 120 | |
| `boosterPrices.clearToolbox` | 200 | |
| `economy.continueCost` | 150 | Seconde chance du near miss ; l'alternative gratuite est la pub récompensée |
| `piggy.perWin` / `capacity` | 20 / 1 800 | ~90 victoires pour le remplir |
| `ads.firstInterstitialLevel` | 6 | Pas de pub avant que le joueur soit accroché |
| `ads.interstitialEveryLevels` | 3 | Un plafond de temps minimum entre deux interstitielles reste à ajouter au shell |

## Comment valider (sans serveur)
- Variantes tirées côté client (hash de l'install ID) et pilotées par le JSON statique, lecture dans Firebase Analytics.
- Premiers tests à faire : « Sans pub » 2,99 vs 3,99 ; moment d'affichage du pack de démarrage ; `continueCost` 150 vs 100.
- Mesures à suivre : conversion du premier achat, ARPDAU par source (pubs / IAP), complétion des niveaux 1 à 20 (déjà un KPI de la phase 0).

## Hors périmètre / à décider
- Nom d'affichage Store, bundleId, comptes Apple et Google.
- KPI cibles (phase 0) : les fourchettes ci-dessus sont trop incertaines pour les fixer sans toi.
