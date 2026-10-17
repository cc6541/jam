# Économiser les tokens

## Déjà en place dans ce repo
| Mesure | Fichier | Effet |
|---|---|---|
| `CLAUDE.md` court ; les détails sont dans `docs/` et lus à la demande | `CLAUDE.md` | Moins de contexte chargé à chaque session |
| Résumé de démarrage (branche + prochaine tâche) | `scripts/claude/session-brief.sh` (hook SessionStart) | Évite de relire `TASKS.md` à chaque session, après `/clear` ou `/compact` |
| Fichiers lourds interdits en lecture (lockfile, niveaux JSON, builds natifs, images, sons) | `.claude/settings.json` → `permissions.deny` | Évite les lectures accidentelles de gros fichiers |
| Scripts silencieux (`--output-logs=errors-only`, reporter `dot`) + `pnpm check` | `package.json` | Seules les erreurs entrent dans le contexte |
| Typecheck en fin de tour, muet si OK, une seule relance | `scripts/claude/quiet-check.sh` (hook Stop) | Attrape les erreurs tôt sans boucle coûteuse |
| `pnpm levels:stats` au lieu de lire les niveaux | `level-tools` (phase 3) | Un résumé plutôt que des Mo de JSON |
| Modèles par agent (Opus seulement là où c'est critique) ; comptes-rendus qui citent le résultat, pas la sortie | `.claude/agents/*.md` | Coût par tâche réduit |

## Habitudes (les plus gros gains)
1. **Une session = une tâche.** `/clear` entre deux tâches ; le hook réinjecte la suivante.
2. `/context` pour voir ce qui occupe le contexte ; `/compact <consigne>` avant qu'il ne déborde.
3. **Plan mode** pour les tâches floues : on corrige le plan avant que l'agent ne lise et écrive à tort.
4. Désactiver les serveurs MCP inutiles (`/mcp`) : leurs définitions d'outils coûtent à chaque requête.
5. Sonnet par défaut (`/model`), Opus seulement pour l'architecture, le moteur et le solveur.
6. Donner les chemins exacts dans la demande (« dans `packages/engine-screw/src/step.ts` ») plutôt que « trouve où… ».

## Outils tiers (à installer sur votre machine, pas dans le repo)
Par ordre de priorité ; les gains annoncés viennent des auteurs et varient selon l'usage.
1. **rtk** (Rust Token Killer) et son plugin Claude Code : un hook réécrit les commandes Bash pour compresser
   leur sortie (tests, git, ls…). Ne couvre pas les outils Read/Grep/Glob natifs.
   **Retenu.** Installation dans le setup script de l'environnement cloud (et sur votre machine) :
   `curl -fsSL https://raw.githubusercontent.com/rtk-ai/rtk/refs/heads/master/install.sh | RTK_VERSION=v1.0.1 sh`
   puis `~/.local/bin/rtk init -g --auto-patch`. Version épinglée car le proxy cloud bloque la détection de la dernière.
   `.claude/settings.json` définit `RTK_SUPPRESS_HOOK_WARNING` et `RTK_TELEMETRY_DISABLED`. Bilan : `rtk gain`.
2. **headroom** (`headroomlabs-ai/headroom`) : compression du contexte entre Claude Code et l'API
   (`headroom wrap claude` ou proxy local), réversible via `headroom_retrieve`. Fait en partie doublon avec rtk :
   commencer par rtk, ajouter headroom si les gros contextes restent un problème.
3. **context-mode** (serveur MCP) : garde les gros résultats dans une base locale et ne renvoie qu'un résumé.
4. **caveman** (skill) : réponses plus courtes, donc moins de tokens en sortie. Rend les explications plus sèches.

Ces outils tournent sur votre machine. Ils ne s'appliquent pas aux sessions cloud de claude.ai/code,
sauf à les installer via le script de setup de l'environnement.
