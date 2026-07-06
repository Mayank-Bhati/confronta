"""Polite HTTP client: identifies itself, rate-limits, and logs every fetch."""
import time

import requests

from .db import FetchLog, Session

USER_AGENT = "CareerCompassPipeline/0.1 (student-guidance prototype; contact: bhati.mayank842@gmail.com)"
DELAY_SECONDS = 1.0

_session = requests.Session()
_session.headers["User-Agent"] = USER_AGENT
_last_request = [0.0]


def fetch(url, timeout=25):
    wait = DELAY_SECONDS - (time.time() - _last_request[0])
    if wait > 0:
        time.sleep(wait)
    status, note = None, None
    try:
        resp = _session.get(url, timeout=timeout)
        _last_request[0] = time.time()
        status = resp.status_code
        resp.raise_for_status()
        return resp
    except requests.RequestException as exc:
        note = str(exc)[:500]
        raise
    finally:
        with Session() as s:
            s.add(FetchLog(url=url, status=status, note=note))
            s.commit()
