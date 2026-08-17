# Fichiers Garmin (.fit)

Les séances de course prévues sont encodées en workouts structurés Garmin, prêts à importer dans la montre (Forerunner 165).

Le MCP GitHub ne transporte pas de binaire : chaque fichier est donc stocké ici **encodé en base64**, sous le nom `AAAA-MM-JJ-<type>.fit.b64`.

## Récupérer un fichier utilisable

```bash
base64 -d 2026-08-17-z2.fit.b64 > 2026-08-17-z2.fit
```

Sur macOS, `base64 -d` fonctionne aussi (ou `base64 -D` selon la version).

## Importer dans Garmin Connect

1. Ouvrir [connect.garmin.com](https://connect.garmin.com) sur ordinateur.
2. `Entraînement` → `Entraînements` → `Importer`.
3. Déposer le fichier `.fit` décodé.
4. Une fois l'entraînement visible dans la liste : `Envoyer à l'appareil` → Forerunner 165.
5. Sur la montre : `Entraînement` → `Entraînements` → sélectionner la séance.

Alternative : brancher la montre en USB et copier le `.fit` dans `GARMIN/NEWFILES/`.

## Contenu des séances

Chaque workout est construit à partir du champ `cible` de la séance dans `data/seances.json` et des zones cardiaques de `data/athlete.json`. Les étapes portent une cible de **fréquence cardiaque**, jamais d'allure : sur ce bloc, la FC commande et l'allure suit.

Structure type d'une séance Z2 :

| Étape | Intensité | Durée | Cible FC |
|---|---|---|---|
| Échauffement | WARMUP | 8 min | 120–140 bpm |
| Z2 principal | ACTIVE | durée cible − 13 min | 138–148 bpm |
| Retour au calme | COOLDOWN | 5 min | 110–137 bpm |

Les lignes droites (séance du 26 août) sont un bloc répété 6 fois : 20 s en accélération libre, puis 60 s de récupération marchée. Aucune cible FC dessus — ce n'est pas un fractionné, c'est un rappel neuromusculaire.

Plafond absolu sur tout le bloc de reconstruction aérobie : **155 bpm**.
