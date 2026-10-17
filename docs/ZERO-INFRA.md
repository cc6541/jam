# Stratégie « zéro infrastructure »

Objectif : faire tourner N jeux sans aucun serveur à opérer et sans facture cloud.
Les seuls coûts fixes inévitables sont les comptes Store (Apple Developer ~99 $/an, Google Play ~25 $ une fois).

| Besoin | Solution retenue | Coût | Pourquoi pas un serveur |
|---|---|---|---|
| Niveaux | Générés **hors ligne** (solveur + générateur dans `level-tools`), embarqués dans l'app en JSON | 0 | Pas de téléchargement à la volée |
| Sauvegarde | Stockage local (Capacitor Preferences), clés préfixées par `bundleId` | 0 | Sauvegarde multi-appareil assurée par les backups natifs iOS/Android |
| Remote config, cross-promo, events live | **Fichier JSON statique** versionné dans le repo, servi par GitHub Pages ; une copie de secours est embarquée dans l'app | 0 | Un CDN statique suffit, aucune logique serveur |
| Événements datés (week-end x2, etc.) | Calculés côté client depuis le JSON statique (dates de début et de fin) | 0 | — |
| Heure / anti-triche | Horloge locale + garde-fous (temps monotone, refus des retours en arrière). En ligne : en-tête HTTP `Date` du fetch du JSON statique. **Pas de NTP dédié.** | 0 | Jeu solo sans classement : la triche ne coûte presque rien |
| Pubs | SDK AdMob ou AppLovin MAX (côté client) | 0, ça rapporte | — |
| IAP | Plugin Capacitor natif StoreKit 2 / Play Billing, vérification sur l'appareil. Option : RevenueCat (gratuit sous un seuil de revenus, à vérifier au moment du choix) | 0 | Pas de validation de reçus serveur au démarrage |
| Analytics et crashs | Firebase Analytics + Crashlytics (offre gratuite, aucun serveur à gérer) | 0 | — |
| A/B tests | Variante tirée côté client (hash de l'install ID) et pilotée par le JSON statique ; on lit les résultats dans Firebase Analytics | 0 | — |
| CI | GitHub Actions (Linux) : typecheck, tests, validation des niveaux. Builds iOS sur un Mac local ou un service CI à offre gratuite | 0 | Les minutes macOS hébergées coûtent cher : à éviter |

## Ce qui est volontairement exclu (car il exigerait un serveur)
Classements, multijoueur, sauvegarde cloud propriétaire, chat, cadeaux entre joueurs, validation serveur des achats.
Toute réintroduction passe par une note dans `docs/decisions/` avec le coût estimé.

## Conséquence sur l'architecture
- `shell` expose des **ports** (`StoragePort`, `ClockPort`, `AdsPort`, `IapPort`, `AnalyticsPort`, `RemoteConfigPort`).
  Les implémentations sont locales ou SDK ; les mocks servent en dev et en tests.
- Le JSON statique a un **schéma versionné**. L'app ignore un champ inconnu et retombe sur la copie embarquée
  si le fetch échoue ou si le schéma est invalide.
