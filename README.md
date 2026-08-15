# Objectif sub-50 — carnet d'entraînement

Page statique qui affiche le programme semaine par semaine, le journal des séances avec analyse, et les statistiques. Aucune dépendance, aucun build : du HTML, du CSS et un fichier JavaScript qui lit trois fichiers JSON.

```
index.html
assets/style.css
assets/app.js
data/athlete.json      profil, zones cardiaques, objectifs, chronos de référence
data/programme.json    blocs de périodisation + semaines détaillées
data/seances.json      séances réalisées + analyse de chacune
```

## Publier sur GitHub Pages

1. Créer un dépôt, y pousser le contenu de ce dossier à la racine.
2. `Settings` → `Pages` → Source : `Deploy from a branch`, branche `main`, dossier `/ (root)`.
3. La page est en ligne sur `https://<utilisateur>.github.io/<dépôt>/` après une minute environ.

## Tester en local

Ouvrir `index.html` directement depuis le disque ne fonctionne pas : le navigateur refuse de lire les JSON en `file://`. Il faut un serveur :

```bash
cd objectif-sub50
python3 -m http.server 8000
```

puis `http://localhost:8000`.

## Ajouter une séance

Insérer un objet dans le tableau `seances` de `data/seances.json`. L'ordre n'a pas d'importance, la page trie par date. Mettre à jour le champ `maj` du fichier.

```json
{
  "id": "19747910470",
  "date": "2026-08-17",
  "titre": "Z2, 40 minutes",
  "type": "z2",
  "lieu": "La Prairie, Caen",
  "distance_km": 6.5,
  "temps_s": 2400,
  "fc_moy": 141,
  "fc_max": 150,
  "denivele": 11,
  "effort_relatif": 55,
  "cadence_spm": 172,
  "conditions": "8h30, frais",
  "commentaire_athlete": "facultatif",
  "splits": [
    { "km": 1, "temps_s": 380, "fc_moy": 130 },
    { "km": 7, "dist_km": 0.4, "temps_s": 150, "fc_moy": 148 }
  ],
  "analyse": {
    "verdict": "une phrase",
    "corps": "le raisonnement",
    "a_retenir": "la consigne pour la suite",
    "note": "excellent"
  }
}
```

Détails utiles :

- `cadence_spm` est la cadence en pas par minute, soit **le double** de la valeur affichée par l'API Strava (qui compte un seul pied).
- `splits` accepte deux formes : par kilomètre (`km` + `temps_s`), ou par section libre (`libelle` + `temps_s`). Ajouter `dist_km` pour un kilomètre incomplet, l'allure est alors calculée correctement.
- `note` pilote la couleur de la bordure gauche : `excellent`, `bon`, `attention`, `reference`.
- Le **coût cardiaque** (battements par kilomètre) est calculé automatiquement, rien à saisir.

## Faire évoluer le programme

Dans `data/programme.json` :

- `blocs` : la périodisation macro. La couleur du bloc en cours devient la couleur d'accent de toute la page — quand le bloc seuil démarrera en septembre, la page passera à l'orange.
- `semaines` : le détail. `statut` vaut `termine`, `en_cours` ou `a_venir`. Passer `fait: true` sur une séance planifiée la coche. Le champ `bilan` n'apparaît que s'il est rempli.

Le graphe de volume compare les kilomètres réellement courus (agrégés par numéro de semaine ISO depuis `seances.json`) à `volume_cible_km`. Rien à saisir en double.

## Mise à jour assistée

Le plus simple : coller le lien Strava ou les chiffres de la séance dans une conversation avec Claude, dans ce projet. Les trois JSON sont régénérés, il n'y a plus qu'à les commiter.
