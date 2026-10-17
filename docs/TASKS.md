# Roadmap

Règle : une case n'est cochée que si sa **DoD** (Definition of Done) passe. Comme preuve, citer le résultat de la commande (OK, ou les lignes d’erreur).
Agent conseillé entre crochets (voir `docs/AGENTS.md`).

## Phase 0 — Décisions (humain)
- [x] Premier titre : Screw Jam (modifiable ensuite grâce aux `engine-*` séparés).
- [x] Zéro serveur, zéro coût récurrent (`docs/ZERO-INFRA.md`).
- [ ] Valider les points **[À VALIDER]** de `docs/GAME-SPEC.md` (valeurs par défaut acceptables pour démarrer).
- [ ] Fixer les KPI cibles : rétention J1/J7, taux de complétion des niveaux 1 à 20, revenus pub par utilisateur actif.

## Phase 1 — Contrats [architect]
- [ ] Monorepo : pnpm + Turborepo, `tsconfig` de base strict, Vitest, ESLint.
  **DoD :** `pnpm install && pnpm typecheck && pnpm test` passent sur un repo vide de logique.
- [ ] Geler `engine-screw/src/types.ts` et `level-tools/schema/level.schema.json` (cohérents entre eux).
  **DoD :** un test vérifie qu'un `LevelDef` d'exemple passe le schéma, et que 3 niveaux invalides (vis sans plaque, couleur non multiple de 3, polygone vide) sont rejetés.
- [ ] Interfaces des ports du shell (`StoragePort`, `ClockPort`, `AdsPort`, `IapPort`, `AnalyticsPort`, `RemoteConfigPort`) avec leurs mocks.
  **DoD :** typecheck OK, les mocks sont utilisables en test.

## Phase 2 — Tests depuis la spec [qa], avant l'implémentation
- [ ] Tests Vitest de `engine-screw` couvrant chaque règle de `GAME-SPEC.md` (refus si bloquée, multi-tap, cascade boîtes et toolbox, défaite toolbox pleine, victoire, near miss, undo par replay, déterminisme).
  **DoD :** les tests compilent et échouent (moteur non implémenté) ; chaque règle de la spec est référencée par au moins un test.

## Phase 3 — Moteur, solveur, générateur [engine]
- [ ] Réducteur `step` + sélecteurs.
  **DoD :** tous les tests de la phase 2 passent ; couverture ≥ 90 % sur `engine-screw`.
- [ ] Solveur (BFS/A* avec mémoïsation d'état) + score de difficulté (profondeur, branches perdantes, taux d'échec d'un joueur aléatoire).
  **DoD :** `pnpm levels:validate` résout 50 niveaux en moins de 60 s en CI Linux.
- [ ] `pnpm levels:stats` : une ligne par pack (nombre de niveaux, difficulté min/moy/max, niveaux invalides).
  **DoD :** sortie de moins de 20 lignes pour 100 niveaux.
- [ ] Générateur procédural seedé + courbe de difficulté en dents de scie.
  **DoD :** génère les niveaux 1 à 100 de `apps/screw-jam/levels/`, tous validés, difficulté non décroissante par blocs de 10.

## Phase 4 — Plateau jouable [render]
- [ ] `render-pixi` : plateau, animations (vis qui sort, plaque qui tombe), haptique branchée sur les `GameEvent`.
  **DoD :** 60 fps mesurés sur un Android d'entrée de gamme pour le niveau le plus chargé ; aucune logique de jeu dans le rendu.

## Phase 5 — Shell [shell]
- [ ] Save namespacée, économie (pièces, boosters, tirelire), mocks Ads/IAP, remote config statique avec copie de secours.
  **DoD :** tests : isolation des clés par `bundleId`, fallback si le JSON distant est invalide ou absent, horloge qui refuse les retours en arrière.
- [ ] Brancher les vrais SDK (AdMob ou MAX, StoreKit 2 / Play Billing, Firebase Analytics + Crashlytics).
  **DoD :** build de debug sur appareil réel ; une pub test et un achat sandbox fonctionnent.

## Phase 6 — App Screw Jam [ui + publisher]
- [ ] `apps/screw-jam` : thème, `app.config.json`, UI React (menus, boutique, modale near miss, modale cross-promo).
- [ ] Cross-promo : cartes depuis le JSON statique, plafond de fréquence, liens Store avec paramètres de campagne.
- [ ] `ASO.json` (titre, sous-titre, mots-clés, FR + EN), captures.
  **DoD :** build Capacitor iOS + Android ; TestFlight et test interne Play publiés.

## Phase 7 — Valider la factory [architect]
- [ ] Créer une deuxième app avec le skill `new-app` (même moteur, autre thème).
  **DoD :** nouvelle app jouable en moins d'une journée, sans modifier `packages/*`.
