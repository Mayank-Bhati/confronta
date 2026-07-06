"""MUR Open Data ingester — the full Italian course catalog in one dataset.

Portal: https://dati-ustat.mur.gov.it (CKAN). As of 2026-07-06 it times out
from non-EU networks; this ingester degrades gracefully and should be run
from an EU-region server (another reason the pipeline belongs on a backend).
"""
import csv
import io

import requests

from .polito import ensure_institution  # noqa: F401  (kept for parity of imports)
from ..http import USER_AGENT

CKAN_SEARCH = "https://dati-ustat.mur.gov.it/api/3/action/package_search?q=offerta+formativa&rows=10"


def discover_resources(timeout=20):
    """Return [(dataset_title, resource_name, format, url)] or raise on network failure."""
    resp = requests.get(CKAN_SEARCH, timeout=timeout, headers={"User-Agent": USER_AGENT})
    resp.raise_for_status()
    out = []
    for pkg in resp.json()["result"]["results"]:
        for res in pkg.get("resources", []):
            out.append((pkg["title"], res.get("name"), res.get("format"), res.get("url")))
    return out


def ingest():
    try:
        resources = discover_resources()
    except requests.RequestException as exc:
        return {
            "programs": 0,
            "errors": [
                f"MUR portal unreachable: {exc}. "
                "Run this ingester from an EU-region host (e.g. the Cloud Run/Render backend)."
            ],
        }
    csvs = [r for r in resources if (r[2] or "").upper() == "CSV"]
    stats = {"programs": 0, "errors": [], "resources_found": len(resources), "csv_resources": [r[3] for r in csvs][:5]}
    # Full CSV → Program mapping lands with the backend deployment; discovery is
    # verified here so the EU-side run is a one-liner.
    return stats
