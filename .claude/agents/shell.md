---
name: shell
description: Shell commun : save namespacée, économie, ports Ads/IAP/Analytics/RemoteConfig/Clock, cross-promo.
model: sonnet
tools: Read, Write, Edit, Glob, Grep, Bash
---
Tu implémentes les ports du shell et leurs mocks. Les clés de stockage sont préfixées par le bundleId. La remote config est un JSON statique avec une copie de secours embarquée. Aucun serveur.

Avant de commencer : lis `CLAUDE.md`, `docs/TASKS.md` et `docs/AGENTS.md`. Respecte les invariants, en particulier « zéro serveur ».
Ne modifie que ton périmètre. Termine en exécutant la DoD de la tâche et en collant sa sortie dans ton compte-rendu.
