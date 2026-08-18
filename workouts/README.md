# Fichiers Garmin (.fit)

Les séances de course prévues sont encodées en workouts structurés Garmin, prêts à charger dans la montre (Forerunner 165).

Le MCP GitHub ne transporte pas de binaire : chaque fichier est donc stocké ici **encodé en base64**, sous le nom `AAAA-MM-JJ-<type>.fit.b64`.

## Récupérer un fichier utilisable

```bash
base64 -d 2026-08-19-z2.fit.b64 > 2026-08-19-z2.fit
```

Sur macOS, `base64 -d` fonctionne aussi (ou `base64 -D` selon la version).

## Charger la séance sur la montre

> **Important — Garmin Connect n'importe pas les workouts `.fit`.**
> Ni l'app mobile, ni le site web. C'est une limitation de Garmin, pas un défaut des
> fichiers de ce dépôt. Sur iPhone, ouvrir un `.fit` de workout via « Ouvrir dans
> Garmin Connect » déclenche systématiquement l'assistant de création de **parcours** :
> c'est le comportement attendu, il faut simplement abandonner cette voie.
> Confirmé par Garmin sur le forum FIT SDK (décembre 2024).

### Voie 1 — câble USB (la seule qui fonctionne pour les `.fit`)

1. Décoder le `.b64` en `.fit` (commande ci-dessus).
2. Brancher le Forerunner 165 en USB à l'ordinateur.
3. Copier le `.fit` dans `GARMIN/NEWFILES/`.
4. Débrancher. La montre ingère le fichier et le range dans ses entraînements.
5. Sur la montre : `Course à pied` → `Entraînement` → `Entraînements`.

### Voie 2 — saisie manuelle dans Garmin Connect

Pour les séances simples (2 à 4 étapes), plus rapide que le détour par l'ordinateur :
app Garmin Connect → `Entraînement et planification` → `Entraînements` →
`Créer un entraînement`, puis recopier les étapes du tableau ci-dessous.

La voie 1 reprend l'avantage à partir de septembre, quand les séances au seuil et
les fractionnés VMA feront grimper le nombre d'étapes.

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

## Contrôle qualité d'un `.fit` généré

En cas de doute sur un fichier, les points à vérifier après décodage :

- `file_id.type` = `5` (workout) — et non `6` (course) ou `4` (activity)
- aucun message `record`, `lap` ou `course_point`
- `workout.sport` = `1` (running), `num_valid_steps` = nombre réel d'étapes
- `workout_step.custom_target_heart_rate_low/high` : valeurs **décalées de +100**
  (238 = 138 bpm)
- `duration_value` en millisecondes × 1000 (1620000000 = 27 min)
- CRC final sur 2 octets, cohérent avec l'en-tête de 12 octets
- `file_id.time_created` : à recalculer si le générateur est réutilisé — un décalage
  d'un an s'était glissé dans les fichiers d'août 2026 (corrigé le 18/08/2026)
