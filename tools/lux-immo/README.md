# Hub maisons – Luxembourg-ville & alentours

Outil local (Python, SQLite, aucun serveur externe) qui scrape les portails et agences listés dans
`sources.json`, ne garde que les **maisons** de la zone Luxembourg-ville + communes limitrophes
(`lux_immo/filters.py`), et les affiche dans un hub web mis à jour **sur demande**.

```bash
cd tools/lux-immo && pip install -r requirements.txt
python -m lux_immo serve        # http://127.0.0.1:8765 → bouton « Actualiser »
python -m lux_immo check        # diagnostic par source (pages / brutes / retenues)
python -m lux_immo refresh      # scrape en CLI (cron possible)
python -m lux_immo export > annonces.csv
python -m pytest
```

Le hub suit : nouvelles annonces, baisses de prix (historique en base), annonces retirées, favoris, masquage,
€/m², filtres et tri.

## Ajouter une agence
Ajouter un bloc dans `sources.json` avec l'URL de la page de résultats « maisons à vendre »
(`{page}` = pagination, `"transaction": "rent"` pour la location). L'extraction essaie dans l'ordre
JSON-LD → JSON embarqué (`__NEXT_DATA__`) → heuristique HTML (carte avec lien + prix en €).

## Limites connues
- Les URLs de `sources.json` sont des **points de départ non vérifiés** (le sandbox de développement n'avait pas accès
  à ces sites) : lancez `check`, corrigez les sources en `??`.
- Sites rendus uniquement en JavaScript : non supportés (il faudrait Playwright).
- `robots.txt` est respecté et les requêtes sont espacées ; vérifiez les CGU de chaque site pour un usage personnel.
