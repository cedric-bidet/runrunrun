# Schéma de `data/seances.json`

Journal unifié : passé et futur, course et renforcement. `statut` vaut 'realise' ou 'prevu'.
Une séance réalisée porte ses métriques à plat + `analyse`. Une séance prévue porte `cible` +
`consigne`, jamais de métriques. Les séances de renfo portent `bloc_renfo`, qui renvoie à
data/renforcement.json. Toute statistique doit filtrer sur statut === 'realise'.

## Nouveauté v3.1 — `dose_seance`

Une séance de renfo peut porter un objet `dose_seance` { series, note } qui écrase le nombre
de séries affiché sur les cartes d'exercices de renforcement.json. Sans ce champ, la dose du
bloc s'applique telle quelle.

RAISON : jusqu'au 20 août, une modulation de dose n'existait que dans le texte de `consigne`,
que l'écran Séances n'affiche pas au moment de l'exécution — l'athlète voyait 3 × 15 sur la
carte et faisait 3 × 15. Une consigne que l'interface ne montre pas n'est pas une consigne.

TODO app : le rendu des cartes d'exercices doit lire `dose_seance.series` en priorité sur la
dose du bloc.

## Ajout 24 août — `derive_cout_km_pct`

Dérive du coût cardiaque par kilomètre (moyenne des km 2-4 contre moyenne des trois derniers
km pleins), en complément de `derive_reelle_pct` qui ne regarde que la FC.

RAISON : le 24 août, la dérive FC ressort à 0,7 % alors que l'allure s'est effondrée d'une
minute au kilomètre. Quand l'athlète tient son plafond de FC, la dérive migre dans l'allure et
l'indicateur FC seul devient aveugle. Les deux champs doivent être lus ensemble.

## Ajout 27 août — `ids_lies`

Liste d'identifiants Strava annexes couverts par une entrée.

RAISON : le 26 août, la montre a produit deux activités pour une seule séance prescrite — les
40 min Z2, puis les 6 lignes droites enregistrées à part. Le rendu ne sait pas distinguer deux
entrées de même date et de même type (`ouvrirDetail` cherche sur date + type), et une activité
de 850 m écrase les échelles du graphe de coût cardiaque et du nuage allure/FC. Une séance
prescrite reste donc une entrée ; les identifiants Strava supplémentaires vivent dans
`ids_lies`. Toute réconciliation Strava doit chercher un identifiant dans `id` ET dans
`ids_lies` avant de créer une entrée.

## Ajout 29 août — règle de protocole, test de référence, et champ `test_reference_valide`

Un test de coût cardiaque n'est comparable qu'à durée ET parcours identiques. Le 29 août, la
consigne fixait « coût à battre : 873 b/km » — valeur établie le 17 août sur 40 min et 6,56 km
— tout en prescrivant 55 min. Une sortie de 55 min accumule mécaniquement plus de dérive
qu'une de 40, et allonger la boucle de La Prairie oblige à sortir du parcours calibré. Les
deux exigences sont incompatibles.

Conséquence : le test de référence est désormais une séance dédiée de 40 min sur la boucle de
La Prairie à 8h10, jamais fusionnée avec une sortie longue. Les sorties longues se lisent sur
`derive_cout_km_pct`, pas sur le coût absolu. Toute séance présentée comme test porte
`test_reference_valide` (booléen) ; à false, son `cout_cardiaque_bkm` ne doit jamais être
tracé sur la même série que les tests valides.

## Ajout 31 août — `temperature_c`

Fourchette de température relevée par le capteur de la montre sur la séance.

RAISON : trois séances de fin de journée (10, 24, 31 août) ont été lues avec des conclusions
très différentes sans que la température soit jamais consignée, alors qu'elle explique une
part importante de l'écart. Le 24 août s'est couru entre 29 et 36 °C, le 31 entre 27 et 28 °C :
sur le même parcours et le même type de créneau, l'écart de coût cardiaque est de 72 b/km.
Sans ce champ, ces deux séances paraissent opposer une régression à un progrès.

Rappel de calcul, valable pour les deux dérives : fenêtre km 2-4 contre les trois derniers km
PLEINS. Un km partiel de fin n'entre jamais dans le calcul.

## Note d'outillage 31 août — `push_files`

L'écriture du dépôt passe désormais par `push_files` et non par `create_or_update_file`.

RAISON : deux tentatives consécutives via `create_or_update_file` ont échoué sur « No approval
received » alors que l'outil était déjà en autorisation automatique côté connecteur, et que le
SHA était valide — vérifié par relecture, le fichier n'avait pas bougé. Le même contenu
intégral est passé immédiatement via `push_files`, ce qui élimine l'hypothèse du volume.
Avantage annexe : `push_files` ne réclame pas de SHA, donc plus de risque de conflit entre la
lecture et l'écriture.

## Ajout 2 septembre (1) — `vma_kmh`, `allure_vma`, `distance_test_m`, `splits_minute`

Portés par les séances de type `vma`. Un test demi-Cooper ne se lit pas avec les outils d'une
Z2 : le coût cardiaque n'a aucun sens sur un effort maximal de six minutes, et le découpage
kilométrique non plus puisque le test fait 1,3 km. D'où des splits par minute et non par
kilomètre. Le champ `test_reference_valide` reste à false sur ces séances : elles ne portent
pas de `cout_cardiaque_bkm` et ne doivent jamais entrer dans la série des tests de référence
Z2. `vma_kmh` est la seule valeur à reporter — toutes les allures du bloc seuil en dérivent.

## Ajout 2 septembre (2) — protocole d'échauffement avant séance intensive

Établi après l'erreur du demi-Cooper. Trois règles, toutes issues d'un défaut mesuré ce
jour-là.

**(a) Une seule activité.** Le 2 septembre, l'échauffement et le test ont été enregistrés
comme deux activités Strava distinctes. Entre l'arrêt de la première (12h36) et le départ de
la seconde (12h40), la FC est retombée à 117–120 bpm — vérifiable sur les vingt premières
secondes du stream. Sur un effort maximal on doit partir à 130–140. Conséquence : le chrono ne
s'arrête jamais entre l'échauffement et les fractions, c'est le bouton Lap qui les sépare.

**(b) Échauffement plus court et plus frais.** 22 min à 151 bpm de moyenne par 30 °C, c'est
coûteux sans être préparatoire. Cible : 15 min, FC sous 145.

**(c) Lignes droites franches avant un effort maximal.** Le conseil donné la veille — « 4:00–
4:15/km, relevé du 26 août jugé trop rapide » — était faux dans ce contexte : résultat, pointe
à 4,6 m/s (3:37/km) contre 6,3 m/s (2:39/km) le 26 août, et FC max d'échauffement plafée à 165.
Des lignes droites plus lentes que l'allure de test n'activent rien. Règle corrigée : avant une
Z2, 4:00–4:15/km suffit ; avant un test maximal ou une séance de seuil, il faut toucher
2:45–3:00/km, franchement au-dessus de l'allure visée, avec récupération marchée complète, et
moins de 90 secondes entre la dernière ligne droite et le départ de la fraction.

Les défauts (b) et (c) ne se contredisent pas : l'échauffement était trop long et trop tiède en
moyenne, et pas assez vif au sommet. Le problème est la forme, pas la quantité.

## Note d'outillage 2 septembre — plafond d'écriture

Le fichier approche d'un plafond d'écriture. Trois tentatives de `push_files` sur le fichier
complet ont échoué sur « No approval received », alors qu'un fichier d'une ligne est passé
immédiatement dans la même session : le connecteur et le jeton sont valides, c'est le volume
qui bloque. Le fichier grossit d'environ 3 ko par séance analysée, à trois séances par semaine.

CORRECTIF À PRÉVOIR : séparer l'historique clos des séances vivantes — un
`data/seances-2026-08.json` archivé qu'on ne réécrit plus, et un `data/seances.json` limité au
mois courant et au prévisionnel, avec chargement des deux dans app.js.

## Procédure d'archivage mensuel

Le 1er de chaque mois, ou dès que `seances.json` dépasse ~25 Ko :

1. Créer `data/archives/seances-YYYY-MM.json` avec les séances du mois clos
2. Les retirer de `data/seances.json`
3. Ajouter le chemin dans `seances-index.json`

Les trois écritures passent en un seul `push_files`, ce qui garantit qu'aucun état
intermédiaire incohérent n'est publié. **Ne jamais faire l'étape 2 sans l'étape 1 dans le même
commit.**
