# Game design — Screw Jam (refonte « rétention »)

Cœur conservé : trier des vis par couleur (genre éprouvé, parmi les puzzles mobiles les plus rentables).
Tout le reste est repensé autour d'une question : **pourquoi le joueur relance-t-il le jeu ?**

## 1. Diagnostic de la v0 (mesuré, `level-tools/src/_diag.ts`)
- Niveaux 1 à 22 : la toolbox n'est **jamais** nécessaire. Aucune décision, aucune tension → ennui → désinstallation J1.
- Ensuite la difficulté est un accident : ordre des caisses aléatoire, pics et creux sans intention (le 91 est trivial).
- Le score de difficulté mesurait un joueur qui tape au hasard. Un humain ne joue pas ainsi.

## 2. Ce qui rend un niveau difficile pour un humain
**La marge** : nombre de cases de toolbox libres quand on joue parfaitement (`marge = 5 − cases minimales`).
- Marge 5 : on ne réfléchit pas. Marge 2 : il faut anticiper. Marge 0 : une seule erreur et c'est perdu.
- **Le piège** : les caisses demandent d'abord les couleurs les plus enfouies (ordre adverse de la file). Le joueur qui
  range « ce qui va » remplit sa toolbox avec des vis inutiles. Mesure : taux d'échec du joueur naïf (glouton).

Le générateur vise désormais une marge et un taux de piège **par niveau**, au lieu d'espérer qu'ils arrivent.

## 3. Courbe (cycle de 10 niveaux, répété en montant)
| Position | Rôle | Cible | Psychologie |
|---|---|---|---|
| 1, 6 | Respiration | marge ≥ 4 | Victoire facile juste après un pic : soulagement, sentiment de compétence |
| 2–4, 7–9 | Normal | marge 4 → 2 avec la progression | Flow : défi ≈ compétence |
| 5 | **Difficile** (badge) | marge ≤ 1, piège | Tension, récompense ×2 |
| 10 | **Très difficile** (badge, écran d'annonce) | marge 0, joueur naïf perd ≥ 75 % | Pic émotionnel, ×3, moment où l'on paie pour continuer |

Niveaux 1–3 : prise en main (une règle à la fois). Premier vrai échec visé vers les niveaux 8–12 :
assez tôt pour apprendre la valeur des boosters, assez tard pour être déjà accroché.

**Distillation progressive** : une nouveauté tous les ~10 niveaux, annoncée par une carte (« Nouveau : vis renforcées »)
au niveau 11. La curiosité pour « ce qui vient ensuite » est un moteur de rétention à part entière.

## 4. Boucles de rétention
| Boucle | Mécanique | Levier psychologique |
|---|---|---|
| Partie | Dévissage, cascade, caisse qui part, confettis | Gratification immédiate, micro-récompenses toutes les secondes |
| Session | **Série de victoires** (flamme) : bonus croissant d'écrous, perdue à la défaite | Aversion à la perte, momentum (« encore un ») |
| Session | **Coffre de progression** tous les 10 niveaux, jauge visible | Effet de gradient d'objectif : on accélère en approchant du but |
| Session | **Vies** (5, une perdue par défaite, recharge 30 min) | Rendez-vous, rareté, rythme des sessions, levier de monétisation |
| Jour | **Récompense quotidienne** sur 7 jours, croissante, jour 7 = coffre | Habitude, série à ne pas casser |
| Défaite | **Presque !** (+1 case contre pub/écrous) + rappel de la série en jeu | Effet de quasi-victoire, coût irrécupérable |
| Long terme | Niveaux « Très difficile » à ×3, nouveautés annoncées | Statut, curiosité |

## 5. Monétisation reliée aux boucles
- Pic difficile → offre « Presque ! » → boosters → écrous → boutique. Vies épuisées → recharge (pub/écrous).
- Pub récompensée toujours **au choix** du joueur (x3 victoire, seconde chance, recharge de vie).
- Prix : `docs/decisions/0005`.

## 6. Lignes rouges (éthique, conformité Stores et UE)
Pas de faux adversaires présentés comme de vrais joueurs, pas de compte à rebours mensonger, prix toujours en monnaie
réelle à côté des écrous, probabilités affichées pour tout contenu aléatoire payant, aucune pression d'achat sur mineurs.
Ces limites protègent aussi l'acceptation sur les Stores (règles Apple/Google sur les contenus aléatoires) et
s'alignent sur les principes européens sur les monnaies virtuelles dans les jeux.

## 7. KPI à suivre (Firebase, zéro serveur)
Rétention J1/J7/J30, taux de complétion par niveau (courbe de churn), première défaite (niveau médian),
taux d'usage des boosters, conversion pub récompensée, ARPDAU par source.
