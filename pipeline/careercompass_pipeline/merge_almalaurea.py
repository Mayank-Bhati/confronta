"""Merge the sharded national AlmaLaurea ingest into one dataset.

The national pass runs as eight parallel Actions shards, each writing
`almalaurea-shard-N.json`. This folds them into `data/almalaurea.json`, keyed
by AlmaLaurea's own ateneo code so the dataset does not depend on our
institution slugs and survives us adding universities later.

Merge rules, in order of importance:
  · a value is only overwritten when the incoming one is non-null, so a shard
    that happened to hit an empty render never erases a good figure
  · conflicting non-null values are reported, not silently resolved — three
    scrapes have agreed exactly so far, and a disagreement would mean the
    extraction has drifted and needs looking at

    python3 -m careercompass_pipeline.merge_almalaurea <dir-with-shards>
"""
import glob
import json
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DATA = os.path.join(ROOT, "data")

VALUE_FIELDS = ("employment_rate", "unemployment_rate", "net_pay", "working_only",
                "working_studying", "studying_only", "would_choose_again",
                "course_satisfaction", "teaching_satisfaction", "on_time")


def merge(shard_dir):
    files = sorted(glob.glob(os.path.join(shard_dir, "**", "almalaurea-shard-*.json"), recursive=True))
    if not files:
        raise SystemExit(f"no shard files under {shard_dir}")

    rows, conflicts, surveys = {}, [], None
    for f in files:
        data = json.load(open(f, encoding="utf-8"))
        surveys = surveys or data.get("surveys")
        for key, row in data.get("rows", {}).items():
            if key not in rows:
                rows[key] = row
                continue
            existing = rows[key]
            for field in VALUE_FIELDS:
                new, old = row.get(field), existing.get(field)
                if new is None:
                    continue
                if old is None:
                    existing[field] = new
                elif abs(float(new) - float(old)) > 0.05:
                    conflicts.append({"key": key, "field": field, "kept": old, "other": new})
    print(f"merged {len(files)} shards → {len(rows)} rows")
    if conflicts:
        print(f"  !! {len(conflicts)} conflicting values (kept the first): {conflicts[:5]}")

    unis = {r["ateneo_code"]: r.get("university") for r in rows.values() if r.get("ateneo_code")}
    out = {
        "surveys": surveys,
        "scope": "every AlmaLaurea consortium university, by subject group and course level",
        "note": "Keyed <ateneo_code>|<group>|<level>. Institutions outside the consortium "
                "(Politecnico di Milano, Bocconi, all ITS academies) are absent by design — "
                "the site shows 'no survey data' for them rather than a substitute figure.",
        "universities": dict(sorted(unis.items())),
        "rows": dict(sorted(rows.items())),
        "conflicts": conflicts,
    }
    path = os.path.join(DATA, "almalaurea.json")
    json.dump(out, open(path, "w", encoding="utf-8"), indent=1, ensure_ascii=False)

    filled = sum(1 for r in rows.values() if r.get("employment_rate") is not None)
    print(f"wrote {path}\n  {len(unis)} universities · {len(rows)} rows · {filled} with an employment rate")
    return out


if __name__ == "__main__":
    merge(sys.argv[1] if len(sys.argv) > 1 else "/tmp/shards")
