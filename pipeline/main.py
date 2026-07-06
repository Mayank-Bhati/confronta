#!/usr/bin/env python3
"""CareerCompass data pipeline CLI.

Usage:
  python3 main.py init             # create tables
  python3 main.py ingest polito    # full PoliTo catalog + curricula
  python3 main.py ingest polimi    # PoliMi programme rows (exact URLs)
  python3 main.py ingest mur       # MUR open-data discovery (needs EU network)
  python3 main.py stats            # row counts
  python3 main.py export           # write pipeline/out/programs-preview.json
"""
import sys

from careercompass_pipeline.db import FetchLog, Institution, Program, ProgramSubject, Session, init_db


def stats():
    with Session() as s:
        print(f"institutions:      {s.query(Institution).count()}")
        print(f"programs:          {s.query(Program).count()}")
        print(f"program_subjects:  {s.query(ProgramSubject).count()}")
        print(f"fetch_log:         {s.query(FetchLog).count()}")
        for inst in s.query(Institution):
            n = s.query(Program).filter_by(institution_id=inst.id).count()
            print(f"  {inst.slug}: {n} programs")


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        return 1
    cmd = sys.argv[1]
    init_db()
    if cmd == "init":
        print("tables ready")
    elif cmd == "ingest":
        target = sys.argv[2] if len(sys.argv) > 2 else "polito"
        if target == "polito":
            from careercompass_pipeline.adapters import polito
            print(polito.ingest())
        elif target == "polimi":
            from careercompass_pipeline.adapters import polimi
            print(polimi.ingest())
        elif target == "mur":
            from careercompass_pipeline.adapters import mur
            print(mur.ingest())
        else:
            print(f"unknown target {target}")
            return 1
    elif cmd == "stats":
        stats()
    elif cmd == "export":
        from careercompass_pipeline.export_app_json import export
        path, n = export()
        print(f"wrote {n} programs → {path}")
    else:
        print(__doc__)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
