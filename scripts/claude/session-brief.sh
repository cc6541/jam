#!/usr/bin/env bash
# SessionStart : injecte un résumé de quelques lignes au lieu de laisser l'agent lire TASKS.md en entier.
cd "$(dirname "$0")/../.." || exit 0
line=$(grep -m1 -n '^- \[ \]' docs/TASKS.md 2>/dev/null)
n=${line%%:*}
next=${line#*:- \[ \] }
phase=$(awk -v n="${n:-0}" 'NR<n+0 && /^## /{p=$0} END{print p}' docs/TASKS.md 2>/dev/null)
echo "Branche: $(git branch --show-current 2>/dev/null) | modifs: $(git status --porcelain 2>/dev/null | wc -l)"
echo "Prochaine tâche (docs/TASKS.md L${n:-?}, ${phase#\#\# }): ${next:-aucune}"
