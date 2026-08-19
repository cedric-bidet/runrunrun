# Objectif sub-50 — carnet d'entraînement

Web app mobile qui affiche le programme, le journal des séances (réalisées et à venir, course et renforcement) et les statistiques. Aucune dépendance, aucun build : du HTML, du CSS et un fichier JavaScript qui lit quatre fichiers JSON.

La page est organisée en 4 onglets, avec une barre de navigation fixée en bas (comme une app mobile) :

- **Accueil** — règle chronos + diagnostic et zones cardiaques
- **Programme** — périodisation, jalons, renforcement (ressources générales)
- **Séances** — journal semaine par semaine : cartes détaillées pour les séances réalisées, cartes cible + consigne pour les séances de course à venir, cartes d'exercices pour le renforcement
- **Stats** — statistiques clés et graphes (séances réalisées uniquement)

Elle est installable sur l'écran d'accueil (iOS/Android) via `manifest.json` — ouverture en plein écran, sans barre d'adresse.

```
index.html
manifest.json
assets/hello-ted/       design system Hello Ted, copié tel quel (voir plus bas)
assets/style.css
assets/tabbar.css
assets/renforcement.css
assets/app.js
assets/icones/         icônes de l'app (192, 180, 512 px)
data/athlete.json      profil, zones cardiaques, objectifs, chronos de référence
data/programme.json    vue macro : blocs de périodisation, jalons, cadence hebdomadaire (pas de détail de séance)
data/seances.json      journal unifié : réalisées et prévues, course et renforcement
data/renforcement.json référentiel d'exercices (consommé par les cartes de séance renfo)
```

## Le design system « Hello Ted »

L'habillage vient du design system **Hello Ted** (pixel art, orange et vert sur
crème). `assets/hello-ted/` en est une **copie conforme** : ne rien y modifier à
la main — pour mettre à jour, ré-exporter depuis Claude Design et remplacer le
dossier.

```
assets/hello-ted/styles.css     point d'entrée : n'importe que les fichiers de tokens
assets/hello-ted/tokens/        couleurs, typo, espacement, formes, mouvement, polices
assets/hello-ted/polices/       Gliker, auto-hébergée en WOFF2
assets/hello-ted/icones/        pixelarticons (MIT), 24 × 24, un glyphe par fichier
assets/hello-ted/ted/           les 7 humeurs de Ted
assets/hello-ted/marque/        logo, picto « T »
```

`index.html` charge `assets/hello-ted/styles.css` **avant** les feuilles de
l'app ; celles-ci n'écrivent aucune valeur brute, elles ne font qu'aliaser les
tokens (`--page`, `--encre`, `--accent`…). Une couleur en dur dans
`assets/*.css` est un bug.

Les règles à ne pas casser :

- **Angles droits partout.** Le seul rond du système est le disque de l'avatar de Ted.
- **Tout est cerné d'encre** `#252525` : 2px sur les cartes, 3px sur les boutons, 4px sur les bulles et la barre d'onglets.
- **Ombres dures**, décalées, sans flou : 2 / 4 / 6px. L'ombre lavande est réservée aux bulles de Ted.
- **Pas de dégradé, pas de flou, pas de transparence.** Les teintes des graphes passent par `color-mix`, pas par `opacity`.
- **Les chiffres sont toujours en Space Mono.** Un nombre en DM Sans est un bug.
- **Capitales réservées aux étiquettes mono** (+0.08em). Les titres restent en casse de phrase.
- **Pas de rouge** : les états d'alerte et de danger utilisent l'orange. La rampe d'effort est vert → lime → jaune → ambre → orange, et elle sert aussi bien aux zones cardiaques (Z1→Z5) qu'aux blocs de périodisation.
- **Ne jamais poser le logo sur fond orange** — le picto contient de l'orange et y perd ses contours.
- **Aucune icône dessinée à la main** : prendre le glyphe dans `assets/hello-ted/icones/`, ou dans le dépôt pixelarticons s'il manque.

### Ted

Ted est le coach : tout ce qui relève de la consigne passe par sa bulle, jamais
en corps de texte. Dans l'app il parle à quatre endroits — le verdict du
diagnostic (Accueil), le `a_retenir` d'une séance réalisée, la `consigne` d'une
séance à venir, et le `bilan` d'une semaine. Son humeur suit la note de la
séance (`excellent` → fier, `bon` → content, `attention` → compatissant,
`reference` → coach). La voix de l'interface reste, elle, impersonnelle : des
noms pour les libellés, des verbes à l'impératif pour les actions.

La charte cadre le dialogue à une ou deux phrases, alors que les analyses du
carnet font plusieurs paragraphes. La bulle n'affiche donc que les **quatre
premières lignes** : au-delà, elle devient cliquable (« Lire la suite ») et le
texte complet s'ouvre dans une superposition. Le repli est décidé en mesurant le
débordement réel, pas en comptant les caractères — il suit donc la largeur
disponible, et se recalcule au changement d'onglet, de semaine et de taille de
fenêtre. C'est le seul endroit du système qui utilise la transparence : un voile
d'encre à 55 %, sans flou.

### Polices

| Rôle | Police | Source |
| --- | --- | --- |
| Titres, chiffres, étiquettes | Space Mono | Google Fonts |
| Corps de texte | DM Sans | Google Fonts |
| Voix de Ted (`--font-dialogue`) | **Silkscreen** | Google Fonts |
| Titres « fun » (`--font-fun`) | **Gliker** | auto-hébergée (`polices/`) |

Plus aucun substitut : les quatre polices sont les bonnes. Seule Gliker est
auto-hébergée, Google ne la distribuant pas.

**Silkscreen** porte le dialogue de Ted. Elle remplace Megapixel, dont le
fichier fourni ne comptait que 78 glyphes et aucun accent minuscule —
inutilisable en français. Silkscreen couvre les 215 glyphes du sous-ensemble
latin ; seul `Ÿ` manque, absent du français courant.

Deux contraintes propres à une police pixel, inscrites dans les tokens :

- **Corps en multiple de sa grille** — 16px, jamais 14, sinon elle floute.
- **Graisse 400 ou 700 uniquement.** Demander 500 déclenche un gras synthétique
  qui empâte le dessin ; `--type-dialogue` est donc en 400.

Silkscreen dessine ses minuscules en petites capitales : le dialogue de Ted se
lit donc tout en capitales. C'est le caractère de la police, pas un réglage.

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

## Le journal unifié (`data/seances.json`)

Un seul tableau `seances`, trié par date, mélangeant passé et futur, course et renforcement. Le champ `statut` (`realise` ou `prevu`) fait toute la différence de rendu — **toute statistique doit filtrer sur `statut === 'realise'`**, sinon une séance à venir fausse silencieusement les agrégats.

**Séance réalisée** — porte ses métriques à plat et une analyse :

```json
{
  "id": "19747910470", "date": "2026-08-17", "statut": "realise", "type": "z2",
  "titre": "Z2, 40 minutes", "lieu": "La Prairie, Caen",
  "distance_km": 6.5, "temps_s": 2400, "fc_moy": 141, "fc_max": 150,
  "denivele": 11, "effort_relatif": 55, "cadence_spm": 172, "conditions": "8h30, frais",
  "commentaire_athlete": "facultatif",
  "splits": [
    { "km": 1, "temps_s": 380, "fc_moy": 130 },
    { "km": 7, "dist_km": 0.4, "temps_s": 150, "fc_moy": 148 }
  ],
  "analyse": { "verdict": "une phrase", "corps": "le raisonnement", "a_retenir": "la consigne pour la suite", "note": "excellent" }
}
```

- `cadence_spm` est la cadence en pas par minute, soit **le double** de la valeur affichée par l'API Strava (qui compte un seul pied).
- `splits` accepte deux formes : par kilomètre (`km` + `temps_s`), ou par section libre (`libelle` + `temps_s`). Ajouter `dist_km` pour un kilomètre incomplet, l'allure est alors calculée correctement.
- `note` pilote la couleur de la bordure gauche : `excellent`, `bon`, `attention`, `reference`.
- Le **coût cardiaque** (battements par kilomètre) est calculé automatiquement, rien à saisir.

**Séance de course à venir** — jamais de métriques, une `cible` (clés variables selon le type : `duree_min`, `distance_km`, `allure`, `fc_min`/`fc_max`, `structure`, `temps_au_seuil_min`, `distance_test_m` — le formateur n'affiche que ce qui est présent) et une `consigne` :

```json
{
  "id": "p-2026-08-17", "date": "2026-08-17", "statut": "prevu", "type": "z2",
  "titre": "Z2, 40 min", "lieu": "La Prairie", "creneau": "Fin de matinée",
  "cible": { "duree_min": 40, "distance_km": 6.2, "allure": "6:20–6:35", "fc_min": 138, "fc_max": 148 },
  "consigne": "Premier kilomètre à 6:35 ou plus lent, sans exception."
}
```

**Séance de renforcement** (réalisée ou prévue) — `type: "renfo"` et `bloc_renfo` (`"A"` ou `"B"`), qui renvoie à `blocs[]` dans `data/renforcement.json`. La carte de séance affiche automatiquement les exercices du bloc.

## Programme (`data/programme.json`) — vue macro uniquement

Aucun détail de séance ici : le détail vit dans `seances.json`.

- `blocs` : la périodisation macro. La couleur du bloc en cours devient la couleur d'accent de toute la page — quand le bloc seuil démarrera en septembre, la page passera à l'orange.
- `jalons` : les repères de la trajectoire (`date`, `libelle`, `detail`) — affichés dans l'onglet Programme, distincts visuellement une fois passés.
- `semaines` : `num`, `debut`, `fin`, `titre`, `statut` (`termine` / `en_cours` / `a_venir`), `volume_cible_km`, `objectif`, `bilan`. Le `bilan` n'apparaît dans l'onglet Séances que s'il est rempli.

Le graphe de volume compare les kilomètres réellement courus (agrégés par numéro de semaine ISO depuis `seances.json`, séances réalisées uniquement) à `volume_cible_km`. Rien à saisir en double.

## Mise à jour assistée

Le plus simple : coller le lien Strava ou les chiffres de la séance dans une conversation avec Claude, dans ce projet. Les JSON de `data/` sont régénérés, il n'y a plus qu'à les commiter.
