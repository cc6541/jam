# 0008 — Métadonnées de niveau et courbe de difficulté v2

Date : 2026-10-18 · Statut : adopté. Modifie un contrat gelé (`LevelDef`, schéma de niveau) : ajout **optionnel**.

Problème : la v0 n'avait aucune difficulté perçue sur ses 30 premiers niveaux (toolbox jamais nécessaire) et une
difficulté aléatoire ensuite (mesure dans `docs/GAME-DESIGN.md` §1). Le score de 0003 mesurait un joueur aléatoire.

Changements :
- `LevelDef.meta?` : `{ tier, minSlots, trapRate }`, ignoré par le moteur. Permet des badges vrais dans l'app
  (« Difficile », « Très difficile ») et la comparaison difficulté prévue / échec réel dans l'analytics.
- Générateur : `overlap` (empilement des planches) et `trap` (file de caisses adverse).
- Courbe : chaque niveau vise une **marge** (cases de toolbox de réserve en jeu parfait) et un taux de piège selon son
  rôle dans un cycle de 10 (respiration, normal, difficile au 5, très difficile au 10). Remplace la sélection par score de 0003.
