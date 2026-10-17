# Roadmap

Règle : une case n'est cochée que si sa **DoD** (Definition of Done) passe. Comme preuve, citer le résultat de la commande (OK, ou les lignes d’erreur).
Agent conseillé entre crochets (voir `docs/AGENTS.md`).

## Phase 0 — Décisions (humain)
- [x] Premier titre : Screw Jam (modifiable ensuite grâce aux `engine-*` séparés).
- [x] Zéro serveur, zéro coût récurrent (`docs/ZERO-INFRA.md`).
- [x] Valider les points **[À VALIDER]** de `docs/GAME-SPEC.md` (valeurs par défaut acceptables pour démarrer). → `docs/decisions/0001-spec-v0-defaults.md`
- [ ] Fixer les KPI cibles : rétention J1/J7, taux de complétion des niveaux 1 à 20, revenus pub par utilisateur actif.

## Phase 1 — Contrats [architect]
- [x] Monorepo : pnpm + Turborepo, `tsconfig` de base strict, Vitest, ESLint.
  **DoD :** `pnpm install && pnpm typecheck && pnpm test` passent sur un repo vide de logique.
- [x] Geler `engine-screw/src/types.ts` et `level-tools/schema/level.schema.json` (cohérents entre eux).
  **DoD :** un test vérifie qu'un `LevelDef` d'exemple passe le schéma, et que 3 niveaux invalides (vis sans plaque, couleur non multiple de 3, polygone vide) sont rejetés.
- [x] Interfaces des ports du shell (`StoragePort`, `ClockPort`, `AdsPort`, `IapPort`, `AnalyticsPort`, `RemoteConfigPort`) avec leurs mocks.
  **DoD :** typecheck OK, les mocks sont utilisables en test.

## Phase 2 — Tests depuis la spec [qa], avant l'implémentation
- [x] Tests Vitest de `engine-screw` couvrant chaque règle de `GAME-SPEC.md` (refus si bloquée, multi-tap, cascade boîtes et toolbox, défaite toolbox pleine, victoire, near miss, undo par replay, déterminisme).
  **DoD :** les tests compilent et échouent (moteur non implémenté) ; chaque règle de la spec est référencée par au moins un test.
  Preuve : typecheck + lint OK ; `engine.test.ts` 45 échecs (stub), `spec-coverage.test.ts` 14/14 ([R1]–[R13]).

## Phase 3 — Moteur, solveur, générateur [engine]
- [x] Réducteur `step` + sélecteurs.
  **DoD :** tous les tests de la phase 2 passent ; couverture ≥ 90 % sur `engine-screw`.
  Preuve : `pnpm check` OK, 66 tests ; couverture lignes 100 %, branches 90,4 % (seuil 90 % imposé par `vitest.config.ts`).
- [x] Solveur (BFS/A* avec mémoïsation d'état) + score de difficulté (profondeur, branches perdantes, taux d'échec d'un joueur aléatoire).
  **DoD :** `pnpm levels:validate` résout 50 niveaux en moins de 60 s en CI Linux.
  Preuve : 100 niveaux validés (schéma + solveur + courbe) en 6,9 s ; DFS mémoïsée, voir `docs/decisions/0003`.
- [x] `pnpm levels:stats` : une ligne par pack (nombre de niveaux, difficulté min/moy/max, niveaux invalides).
  **DoD :** sortie de moins de 20 lignes pour 100 niveaux.
  Preuve : `screw-jam: 100 niveaux, difficulté min 0 / moy 33.4 / max 99, 0 invalides` (1 ligne).
- [x] Générateur procédural seedé + courbe de difficulté en dents de scie.
  **DoD :** génère les niveaux 1 à 100 de `apps/screw-jam/levels/`, tous validés, difficulté non décroissante par blocs de 10.
  Preuve : `pnpm levels:generate screw-jam 10 1` (2 min 30) ; moyennes par bloc 0 / 0 / 6 / 9,9 / 28 / 39 / 49,8 / 61,7 / 66,2 / 73,3.

## Phase 4 — Plateau jouable [render]
- [ ] `render-pixi` : plateau, animations (vis qui sort, plaque qui tombe), haptique branchée sur les `GameEvent`.
  **DoD :** 60 fps mesurés sur un Android d'entrée de gamme pour le niveau le plus chargé ; aucune logique de jeu dans le rendu.
  Fait : `@jam/render-pixi` (BoardView, director événements → animations + haptique, tweens sans horloge) ;
  « aucune logique de jeu » imposé par ESLint ; bench Chromium headless (rendu logiciel) : 60 fps moy / 59,5 en 1 % bas, 0 erreur.
  **Reste (humain) :** mesure sur Android d'entrée de gamme : `pnpm --filter @jam/render-pixi dev`, ouvrir
  `http://<ip-du-poste>:5173/?bench` sur le téléphone (niveau le plus chargé par défaut) et relever « 1% bas » ≥ 55.

## Phase 5 — Shell [shell]
- [x] Save namespacée, économie (pièces, boosters, tirelire), mocks Ads/IAP, remote config statique avec copie de secours.
  **DoD :** tests : isolation des clés par `bundleId`, fallback si le JSON distant est invalide ou absent, horloge qui refuse les retours en arrière.
  Preuve : `@jam/shell` 19 tests OK (NamespacedStorage, JsonDoc, MonotonicClock, loadRemoteConfig distant → cache → embarqué, économie, plafond d'interstitielles).
- [ ] Brancher les vrais SDK (AdMob ou MAX, StoreKit 2 / Play Billing, Firebase Analytics + Crashlytics).
  **DoD :** build de debug sur appareil réel ; une pub test et un achat sandbox fonctionnent.

## Phase 6 — App Screw Jam [ui + publisher]
- [ ] `apps/screw-jam` : thème, `app.config.json`, UI React (menus, boutique, modale near miss, modale cross-promo).
  Prix et économie de lancement : `docs/decisions/0005-prix-et-economie-v0.md` (hypothèses à tester). Nom Store et bundleId : à fournir.
- [ ] Cross-promo : cartes depuis le JSON statique, plafond de fréquence, liens Store avec paramètres de campagne.
- [ ] `ASO.json` (titre, sous-titre, mots-clés, FR + EN), captures.
  **DoD :** build Capacitor iOS + Android ; TestFlight et test interne Play publiés.

## Phase 7 — Valider la factory [architect]
- [ ] Créer une deuxième app avec le skill `new-app` (même moteur, autre thème).
  **DoD :** nouvelle app jouable en moins d'une journée, sans modifier `packages/*`.
