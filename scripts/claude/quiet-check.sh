#!/usr/bin/env bash
# Stop : silencieux si le typecheck passe. En cas d'échec, renvoie les 30 dernières lignes
# une seule fois (stop_hook_active évite une boucle de relances coûteuse).
grep -q '"stop_hook_active": *true' && exit 0
cd "$(dirname "$0")/../.." || exit 0
[ -d node_modules ] || exit 0
out=$(pnpm -s typecheck 2>&1) || { echo "$out" | tail -30 >&2; exit 2; }
exit 0
