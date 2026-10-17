# Sensations : haptique, sons, effets

Le moteur émet des `GameEvent` ; `render-pixi` les traduit en animation, et le `FeedbackPort` du shell en vibration et son.
Chaque événement a un retour **visuel + sonore + haptique** cohérent. Réglages joueur : son, musique, vibrations (séparés).

| Événement | Haptique | Son | Visuel |
|---|---|---|---|
| `screwTapped` (multi-tap, pas encore sortie) | `selection` | clic métallique court | la vis tourne d'un quart de tour |
| vis qui sort (`screwToBox` / `screwToToolbox`) | `light` | dévissage à hauteur montante | la vis tourne, se soulève, vole en arc vers sa destination |
| `screwToBox` | `light` | « clink » dont la hauteur monte avec le remplissage (1/3, 2/3) | petit rebond de la boîte |
| `boxCompleted` | `medium` | accord « verrouillé » satisfaisant | le couvercle se ferme, étincelles, la boîte part |
| `cascade` (profondeur n) | `medium` puis `heavy` à partir de 3 | accord qui monte d'un demi-ton par niveau | texte « Combo ×n », léger zoom caméra |
| `plateFell` | `medium` (petite) / `heavy` (grande) | glissement puis choc mat | chute avec rotation physique, poussière |
| `rejected` (bloquée) | `error` (double impulsion) | son sourd | la vis tremble, la plaque fautive clignote |
| `toolboxDanger` | battement léger toutes les 2 s | couche musicale de tension | contour de la toolbox qui pulse en rouge |
| `won` | `success` | fanfare courte | confettis, pièces qui défilent avec un tic sonore et `selection` par paquet |
| `lost` (near miss) | `warning` | ralenti + son suspendu | ralenti, jauge « Si près ! » |
| `revived` | `success` | « whoosh » positif | nouvel emplacement qui apparaît en brillant |

## Règles
- Haptique : au plus une impulsion toutes les 40 ms (les cascades sont regroupées). Respecter le réglage système.
- Sons : fichiers courts (< 50 Ko, OGG/M4A), préchargés, légère variation aléatoire de hauteur (±3 %) pour éviter la répétition.
- Musique : boucle calme en couches ; la couche de tension s'ajoute avec `toolboxDanger`.
- Animations : 60 fps ; durée d'une sortie de vis ≤ 350 ms pour ne jamais ralentir le joueur (les taps suivants sont acceptés pendant l'animation).
- Effets « ASMR » : textures bois et métal, ombres douces, matériaux qui réagissent (reflet sur la vis qui tourne).
