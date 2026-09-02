#!/usr/bin/env python3
"""Pousse vers Garmin Connect les séances prévues qui portent un champ `workout`.

Sélection : statut "prevu", date entre aujourd'hui et aujourd'hui + 10 jours, champ
`workout` présent. Idempotent sans fichier d'état — l'existence est vérifiée par nom
auprès de Garmin (préfixe "runrunrun · ") avant tout envoi.

Usage :
    python scripts/push_garmin.py --dry-run    # construit et affiche, n'envoie rien
    python scripts/push_garmin.py              # envoie réellement (GARMIN_TOKENS requis)
"""

from __future__ import annotations

import argparse
import json
import logging
import os
import sys
import tempfile
from datetime import date, datetime, timedelta
from pathlib import Path
from typing import Any

REPO_ROOT = Path(__file__).resolve().parent.parent
SEANCES_PATH = REPO_ROOT / "data" / "seances.json"
NAME_PREFIX = "runrunrun ·"
HORIZON_DAYS = 10

logging.basicConfig(level=logging.INFO, format="%(message)s")
log = logging.getLogger("push_garmin")


def charger_seances_a_pousser(today: date | None = None) -> list[dict[str, Any]]:
    """Séances prévues, avec `workout`, dans les HORIZON_DAYS jours à venir."""
    today = today or date.today()
    horizon = today + timedelta(days=HORIZON_DAYS)
    data = json.loads(SEANCES_PATH.read_text(encoding="utf-8"))
    retenues = []
    for seance in data.get("seances", []):
        if seance.get("statut") != "prevu" or "workout" not in seance:
            continue
        jour = datetime.strptime(seance["date"], "%Y-%m-%d").date()
        if today <= jour <= horizon:
            retenues.append(seance)
    retenues.sort(key=lambda s: s["date"])
    return retenues


def mmss_en_mps(mmss: str) -> float:
    """Allure "mm:ss" (par km) -> vitesse en mètres par seconde."""
    minutes, secondes = mmss.split(":")
    total_s = int(minutes) * 60 + int(secondes)
    return round(1000 / total_s, 3)


def construire_cible(cible: dict[str, Any]) -> tuple[dict[str, Any], float, float]:
    """Renvoie (targetType Garmin, borne basse, borne haute) pour une `cible` de step."""
    from garminconnect.workout import TargetType

    if cible["type"] == "fc":
        return (
            {
                "workoutTargetTypeId": TargetType.HEART_RATE,
                "workoutTargetTypeKey": "heart.rate.zone",
                "displayOrder": TargetType.HEART_RATE,
            },
            float(cible["min"]),
            float(cible["max"]),
        )
    if cible["type"] == "allure":
        # cible.min = allure la plus lente = vitesse la plus faible ; cible.max = la plus
        # rapide = vitesse la plus forte. La conversion préserve donc l'ordre (bas, haut).
        return (
            {
                "workoutTargetTypeId": TargetType.SPEED,
                "workoutTargetTypeKey": "speed.zone",
                "displayOrder": TargetType.SPEED,
            },
            mmss_en_mps(cible["min"]),
            mmss_en_mps(cible["max"]),
        )
    raise ValueError(f"cible.type inconnu : {cible['type']!r}")


def construire_steps(
    steps_json: list[dict[str, Any]], compteur: dict[str, int]
) -> tuple[list[Any], float]:
    """Construit récursivement les steps Garmin ; renvoie (steps, durée totale en s)."""
    from garminconnect.workout import (
        ConditionType,
        create_cooldown_step,
        create_interval_step,
        create_recovery_step,
        create_repeat_group,
        create_warmup_step,
    )

    createurs = {
        "warmup": create_warmup_step,
        "interval": create_interval_step,
        "recovery": create_recovery_step,
        "cooldown": create_cooldown_step,
    }

    garmin_steps = []
    duree_totale_s = 0.0

    for step in steps_json:
        if "repeat" in step:
            compteur["n"] += 1
            group_order = compteur["n"]
            enfants, duree_un_tour = construire_steps(step["steps"], compteur)
            garmin_steps.append(
                create_repeat_group(step["repeat"], enfants, group_order)
            )
            duree_totale_s += duree_un_tour * step["repeat"]
            continue

        creer = createurs.get(step["type"])
        if creer is None:
            raise ValueError(f"type de step inconnu : {step['type']!r}")

        cible = step.get("cible")
        target_type = None
        bornes = None
        if cible is not None:
            target_type, *bornes_liste = construire_cible(cible)
            bornes = tuple(bornes_liste)

        compteur["n"] += 1
        duree_s = step.get("duree_s")
        distance_m = step.get("distance_m")
        garmin_step = creer(duree_s or 0, compteur["n"], target_type)

        if distance_m is not None:
            garmin_step.endCondition = {
                "conditionTypeId": ConditionType.DISTANCE,
                "conditionTypeKey": "distance",
                "displayOrder": 1,
                "displayable": True,
            }
            garmin_step.endConditionValue = float(distance_m)

        # Les helpers create_*_step n'exposent pas les bornes de cible : on les pose
        # directement sur l'objet retourné (ExecutableStep est en extra="allow").
        if bornes is not None:
            garmin_step.targetValueOne, garmin_step.targetValueTwo = bornes

        garmin_steps.append(garmin_step)

        if duree_s is not None:
            duree_totale_s += duree_s
        elif distance_m is not None and cible and cible.get("type") == "allure":
            v_bas, v_haut = bornes
            duree_totale_s += distance_m / ((v_bas + v_haut) / 2)
        elif distance_m is not None:
            log.warning(
                "step %r : distance_m sans cible d'allure, durée non estimable "
                "(estimatedDurationInSecs sera sous-évalué)",
                step,
            )

    return garmin_steps, duree_totale_s


def construire_workout(seance: dict[str, Any]):
    from garminconnect.workout import RunningWorkout, SportType, WorkoutSegment

    compteur = {"n": 0}
    steps, duree_s = construire_steps(seance["workout"]["steps"], compteur)
    nom = f"{NAME_PREFIX} {seance['date']} · {seance['workout']['nom']}"
    return RunningWorkout(
        workoutName=nom,
        estimatedDurationInSecs=round(duree_s),
        workoutSegments=[
            WorkoutSegment(
                segmentOrder=1,
                sportType={
                    "sportTypeId": SportType.RUNNING,
                    "sportTypeKey": "running",
                    "displayOrder": 1,
                },
                workoutSteps=steps,
            )
        ],
    )


def se_connecter():
    """Connexion Garmin via le jeton stocké dans le secret GARMIN_TOKENS.

    Le jeton (contenu de garmin_tokens.json généré par une connexion locale) est écrit
    dans un fichier temporaire au démarrage — jamais commité, jamais journalisé.
    """
    from garminconnect import (
        Garmin,
        GarminConnectAuthenticationError,
        GarminConnectConnectionError,
    )

    secret = os.environ.get("GARMIN_TOKENS")
    if not secret:
        log.error(
            "Secret GARMIN_TOKENS absent. Générer un jeton en local (connexion "
            "interactive avec garminconnect) et le déposer dans Settings → Secrets "
            "and variables → Actions."
        )
        sys.exit(1)

    tokendir = tempfile.mkdtemp(prefix="garmin_tokens_")
    (Path(tokendir) / "garmin_tokens.json").write_text(secret, encoding="utf-8")

    garmin = Garmin()
    try:
        garmin.login(tokenstore=tokendir)
    except (GarminConnectAuthenticationError, GarminConnectConnectionError) as e:
        log.error(
            "Jeton Garmin expiré ou invalide — régénérer en local et mettre à jour "
            "le secret GARMIN_TOKENS. (%s: %s)",
            type(e).__name__,
            e,
        )
        sys.exit(1)
    return garmin


def noms_existants(garmin) -> set[str]:
    """Noms de tous les workouts déjà présents dans la bibliothèque Garmin."""
    noms: set[str] = set()
    start = 0
    limit = 100
    while True:
        page = garmin.get_workouts(start=start, limit=limit)
        if not page:
            break
        noms.update(w.get("workoutName") for w in page if w.get("workoutName"))
        if len(page) < limit:
            break
        start += limit
    return noms


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="construit les séances et affiche le JSON, n'envoie rien à Garmin",
    )
    args = parser.parse_args()

    seances = charger_seances_a_pousser()
    if not seances:
        log.info("Aucune séance à pousser dans les %d prochains jours.", HORIZON_DAYS)
        return 0

    if args.dry_run:
        for seance in seances:
            workout = construire_workout(seance)
            log.info(
                "%s — %s — %d s (dry-run)\n%s",
                seance["date"],
                workout.workoutName,
                workout.estimatedDurationInSecs,
                json.dumps(workout.to_dict(), indent=2, ensure_ascii=False),
            )
        return 0

    garmin = se_connecter()
    existants = noms_existants(garmin)

    echec = False
    for seance in seances:
        nom_seance = seance.get("workout", {}).get("nom", "?")
        try:
            workout = construire_workout(seance)
            if workout.workoutName in existants:
                log.info("%s — %s — déjà en place", seance["date"], workout.workoutName)
                continue

            resultat = garmin.upload_running_workout(workout)
            workout_id = resultat.get("workoutId")
            if not workout_id:
                raise RuntimeError(f"réponse d'upload sans workoutId : {resultat!r}")

            garmin.schedule_workout(workout_id, seance["date"])
            log.info("%s — %s — créée", seance["date"], workout.workoutName)
        except Exception as e:  # noqa: BLE001 — on continue les autres séances
            echec = True
            log.error("%s — %s — erreur : %s", seance["date"], nom_seance, e)

    return 1 if echec else 0


if __name__ == "__main__":
    sys.exit(main())
