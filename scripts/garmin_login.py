#!/usr/bin/env python3
"""Génère le jeton Garmin Connect (garmin_tokens.json) — usage strictement local.

Connexion interactive : email, mot de passe, code MFA si la double authentification
est active. Le jeton produit contient un refresh token et se renouvelle seul par la
suite (voir push_garmin.py) ; ce script ne sert qu'à la toute première connexion, ou
à une régénération si le secret GARMIN_TOKENS finit par être rejeté.

Usage :
    pip install garminconnect[workout]
    python scripts/garmin_login.py [chemin de sortie, défaut ~/.garminconnect]

Le CONTENU du fichier garmin_tokens.json produit devient la valeur du secret GitHub
GARMIN_TOKENS (Settings → Secrets and variables → Actions → New repository secret).
Ne jamais committer ce fichier ni son contenu dans le dépôt.
"""

from __future__ import annotations

import sys
from getpass import getpass
from pathlib import Path

from garminconnect import (
    Garmin,
    GarminConnectAuthenticationError,
    GarminConnectConnectionError,
)


def main() -> int:
    tokenstore = sys.argv[1] if len(sys.argv) > 1 else "~/.garminconnect"
    tokenstore_path = str(Path(tokenstore).expanduser())

    email = input("Email Garmin : ").strip()
    password = getpass("Mot de passe Garmin : ")

    garmin = Garmin(
        email=email,
        password=password,
        prompt_mfa=lambda: input("Code MFA (reçu par email ou app Garmin) : ").strip(),
    )
    password = None  # ne pas garder le mot de passe en mémoire plus que nécessaire

    try:
        garmin.login(tokenstore=tokenstore_path)
    except (GarminConnectAuthenticationError, GarminConnectConnectionError) as e:
        print(f"Échec de connexion : {e}", file=sys.stderr)
        return 1

    fichier = Path(tokenstore_path) / "garmin_tokens.json"
    print(f"\nConnecté en tant que {garmin.display_name}.")
    print(f"Jeton écrit dans {fichier}")
    print(
        "\nColle le CONTENU de ce fichier (pas le chemin) dans le secret GitHub "
        "GARMIN_TOKENS :\nSettings → Secrets and variables → Actions → "
        "New repository secret → nom GARMIN_TOKENS."
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
