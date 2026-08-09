"""AlmaLaurea adapter — REAL graduate-outcome data, per university and per
degree class, replacing the per-field estimates the site shipped with.

Why this exists: employment rate, pay, teaching satisfaction and
would-choose-again were previously one estimated value per subject area, which
made every economics course in Italy look identical and could not be sourced.
AlmaLaurea (the consortium ~80 Italian universities report to) publishes
exactly these figures broken down by ateneo × degree class, from its annual
surveys:
  · "Condizione occupazionale"  — employment at 1/3/5 years, monthly net pay
  · "Profilo dei laureati"      — satisfaction with teaching, would-choose-again,
                                  on-time completion

Access notes (probed 2026-08-07): plain curl gets 403 from GitHub runners and
504 from Italian consumer networks — the site fingerprints non-browser
clients. A real headless Chromium passes, so this module drives Playwright,
the same approach that unlocked the Cineca API.

Run from the Actions runner:  python -m careercompass_pipeline.adapters.almalaurea discover
"""
import json
import os
import re
import sys

BASE = "https://www2.almalaurea.it/cgi-php/universita/statistiche"
OCC = f"{BASE}/occupazione.php"
PROFILO = f"{BASE}/profilo.php"
OUT_DIR = os.environ.get("AL_OUT", "/tmp/aldump")

UA = ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36")


def _browser(p):
    """A Chromium that looks like a normal desktop browser."""
    browser = p.chromium.launch(args=["--disable-blink-features=AutomationControlled"])
    ctx = browser.new_context(
        user_agent=UA,
        locale="it-IT",
        timezone_id="Europe/Rome",
        viewport={"width": 1440, "height": 900},
        extra_http_headers={"Accept-Language": "it-IT,it;q=0.9,en;q=0.8"},
    )
    ctx.add_init_script("Object.defineProperty(navigator,'webdriver',{get:()=>undefined})")
    return browser, ctx


def _dump(name, text):
    os.makedirs(OUT_DIR, exist_ok=True)
    path = os.path.join(OUT_DIR, name)
    with open(path, "w", encoding="utf-8") as f:
        f.write(text)
    print(f"  wrote {path} ({len(text)} chars)")


SELECT_JS = """els => els.map(s => ({
    name: s.name,
    total: s.options.length,
    options: Array.from(s.options).slice(0, 14).map(o => ({ value: o.value, label: (o.textContent || '').trim().slice(0, 70) })),
}))"""


def _accept_cookies(page):
    """The Drupal EU-cookie banner blocks interaction until dismissed."""
    for sel in ("button.agree-button", ".eu-cookie-compliance-default-button",
                "button:has-text('Accetta')", "button:has-text('Accetto')"):
        try:
            el = page.locator(sel).first
            if el.count() and el.is_visible():
                el.click(timeout=3000)
                page.wait_for_timeout(800)
                print(f"  cookie banner dismissed via {sel}")
                return True
        except Exception:
            pass
    return False


def _visit(page, label, url, findings):
    try:
        resp = page.goto(url, wait_until="domcontentloaded", timeout=60000)
        page.wait_for_timeout(2500)
        _accept_cookies(page)
        status = resp.status if resp else None
        html = page.content()
        _dump(f"{label}.html", html)
        selects = page.eval_on_selector_all("select", SELECT_JS)
        # the results page is a table, not a form
        tables = page.eval_on_selector_all(
            "table", "els => els.slice(0,3).map(t => (t.innerText||'').trim().slice(0, 900))")
        findings[label] = {"status": status, "title": page.title(), "chars": len(html),
                           "selects": selects, "tables": tables}
        print(f"\n=== {label}: HTTP {status} · {len(html)} chars · title={page.title()!r}")
        for s in selects:
            print(f"   select {s['name']!r} ({s['total']} options)")
            for o in s["options"][:8]:
                print(f"      {o['value']!r} = {o['label']}")
        for i, tb in enumerate(tables):
            if tb:
                print(f"   --- table {i} ---\n{tb[:600]}")
        return True
    except Exception as e:
        findings[label] = {"error": str(e)[:200]}
        print(f"\n=== {label}: FAILED {str(e)[:200]}")
        return False


def discover():
    """Walk the real navigation path: landing page (sets cookies/session) →
    tendine.php (the dropdown query builder, where the ateneo and degree-class
    codes live) → a sample results query.
    """
    from playwright.sync_api import sync_playwright

    findings = {}
    calls = []
    with sync_playwright() as p:
        browser, ctx = _browser(p)
        page = ctx.new_page()

        def on_response(resp):
            u = resp.url
            if "almalaurea" in u and not any(u.endswith(x) for x in (".css", ".png", ".jpg", ".svg", ".woff", ".woff2")):
                calls.append({"url": u[:300], "status": resp.status,
                              "type": (resp.headers or {}).get("content-type", "")[:60]})
        page.on("response", on_response)

        # 1. landing pages — establish session + dismiss the cookie wall
        _visit(page, "profilo_landing", f"{PROFILO}?LANG=it", findings)
        _visit(page, "occupazione_landing", f"{OCC}?LANG=it", findings)
        # 2. the query builders, where university / class codes are listed
        for label, cfg, anno in (("tendine_profilo", "profilo", 2025),
                                 ("tendine_occupazione", "occupazione", 2024)):
            _visit(page, label, f"{BASE}/tendine.php?LANG=it&config={cfg}&anno={anno}", findings)

        # 3. the results endpoint itself, inside the now-established session.
        # These params come from a public AlmaLaurea result link: ateneo 70135,
        # 1 year after a triennale, employment section.
        sample = ("https://statistiche.almalaurea.it/cgi-php/universita/statistiche/visualizza.php"
                  "?anno=2023&annolau=1&corstipo=L&ateneo=70135&facolta=tutti&gruppo=tutti"
                  "&classe=tutti&isstella=0&areageografica=tutti&regione=tutti&dimensione=tutti"
                  "&aggregacodicione=1&condocc=2&LANG=it&CONFIG=occupazione")
        _visit(page, "visualizza_sample", sample, findings)

        # 3b. same query without the narrowing condocc filter — the sample above
        # returned "numero di occupati 0" because it excluded most graduates.
        full = ("https://statistiche.almalaurea.it/cgi-php/universita/statistiche/visualizza.php"
                "?anno=2023&annolau=1&corstipo=L&ateneo=70135&facolta=tutti&gruppo=tutti"
                "&classe=tutti&isstella=0&areageografica=tutti&regione=tutti&dimensione=tutti"
                "&aggregacodicione=1&condocc=tutti&LANG=it&CONFIG=occupazione")
        _visit(page, "visualizza_full", full, findings)

        # 4. solotendine.php is where the ateneo / degree-class codes live —
        # it is the dropdown fragment the query builder loads.
        for label, cfg, anno in (("solotendine_occupazione", "occupazione", 2024),
                                 ("solotendine_profilo", "profilo", 2025)):
            _visit(page, label, f"{BASE}/solotendine.php?anno={anno}&LANG=it&CONFIG={cfg}", findings)

        browser.close()
    _dump("network.json", json.dumps(calls, indent=1)[:200000])
    print("\n=== network calls ===")
    for c in calls:
        if any(k in c["url"] for k in ("statistiche", "cgi-php", "json", "php?")):
            print(f"   {c['status']} {c['type'][:24]:24} {c['url'][:150]}")
    _dump("discover.json", json.dumps(findings, indent=1, ensure_ascii=False))
    return findings


# ————————————————————————————————————————————————————————————————
# Ingest: real outcomes per (university × disciplinary group × course level)
# ————————————————————————————————————————————————————————————————

# Our institution slug → AlmaLaurea "ateneo" code (codes from solotendine.php).
# None = NOT an AlmaLaurea member, so there is no survey data and the site must
# say so rather than substitute a number. Politecnico di Milano and Bocconi are
# genuinely absent from the consortium list; ITS academies are outside it too
# (their source is INDIRE).
ATENEO = {
    "polito": "70032",      # Torino Politecnico
    "unito": "70031",       # Torino
    "unimib": "70132",      # Milano Bicocca
    "unimi": "70015",       # Milano
    "sapienza": "70026",    # Roma Sapienza
    "federico2": "70018",   # Napoli Federico II
    "unibo": "70003",       # Bologna
    "unifi": "70010",       # Firenze
    "unipa": "70020",       # Palermo
    "uniba": "70002",       # Bari
    "polimi": None,         # not an AlmaLaurea member
    "bocconi": None,        # not an AlmaLaurea member
    "its-lomb-mecc": None, "its-rizzoli": None, "its-energia-pi": None,
}

# Disciplinary group codes (solotendine "gruppo"). Our courses map onto these.
GRUPPO = {
    "ict": "10",            # Informatica e Tecnologie ICT
    "ing_ind": "12",        # Ingegneria industriale e dell'informazione
    "ing_civ": "11",        # Architettura e Ingegneria civile
    "economico": "7",
    "medico": "14",         # Medico-Sanitario e Farmaceutico
    "psicologico": "6",
    "educazione": "1",      # Educazione e Formazione
    "politico_sociale": "5",
    "scientifico": "9",
    "linguistico": "4",
    "arte_design": "2",
}

OCC_YEAR = 2024      # latest "Condizione occupazionale" survey
PROF_YEAR = 2025     # latest "Profilo dei laureati" survey

# Field → (label on the page, how to read the value). Labels verified against a
# real result page (Bologna, economics, triennale) on 2026-08-07.
#   totale  — label then Uomini/Donne/Totale, take Totale
#   likert  — label then a "Decisamente sì / Più sì che no / ..." breakdown;
#             the published "% satisfied" is the sum of the two positive bars
#   sub     — label then a named sub-row, take the value after that sub-row
WANTED_OCC = {
    "employment_rate": ("Tasso di occupazione", "totale", None),
    "unemployment_rate": ("Tasso di disoccupazione", "first", None),
    "net_pay": ("Retribuzione mensile netta", "totale", (300, 4000)),
    # Why a low employment rate is not the same as "no jobs": on a three-year
    # degree most graduates enrol straight into a master's. These three shares
    # (section 3, "Condizione occupazionale e formativa") make that visible.
    "working_only": ("Lavorano e non sono iscritti ad una laurea di secondo livello", "first", None),
    "working_studying": ("Lavorano e sono iscritti ad una laurea di secondo livello", "first", None),
    "studying_only": ("Non lavorano e sono iscritti ad una laurea di secondo livello", "first", None),
}
WANTED_PROF = {
    "would_choose_again": ("Si iscriverebbero di nuovo all'università", "sub", "Sì, allo stesso corso dell'Ateneo"),
    "course_satisfaction": ("Sono complessivamente soddisfatti del corso di laurea", "likert", None),
    "teaching_satisfaction": ("Sono soddisfatti dei rapporti con i docenti in generale", "likert", None),
    "on_time": ("Regolarità negli studi", "sub", "In corso"),
}
POSITIVE_BARS = ("decisamente sì", "più sì che no")


def _num(s):
    """'54,6' → 54.6 ; '-' → None ; '1.492' → 1492.0"""
    s = (s or "").strip().replace(" ", " ")
    if not s or s in {"-", "–", "n.d."}:
        return None
    s = s.replace(".", "").replace(",", ".")
    m = re.match(r"^-?\d+(\.\d+)?$", s)
    return float(s) if m else None


def _lines(html):
    body = re.search(r"<body.*?</body>", html, re.S)
    txt = body.group(0) if body else html
    txt = re.sub(r"<(script|style).*?</\1>", " ", txt, flags=re.S)
    txt = re.sub(r"<[^>]+>", "\n", txt)
    txt = txt.replace("&nbsp;", " ")
    return [l.strip() for l in txt.split("\n") if l.strip()]


def _find_all(lines, label):
    """Every line index matching `label`.

    The results page renders each section twice — an empty template block and
    then the populated one — so a parser that stops at the first match reads
    dashes and reports "no data" for figures that are actually published.
    """
    lab = label.lower()
    return [i for i, l in enumerate(lines) if lab in l.lower()]


def _pick(lines, spec, window=14):
    """Read one figure, trying every block the label appears in."""
    label, mode, extra = spec
    for i in _find_all(lines, label):
        v = _pick_at(lines, i, mode, extra, window)
        if v is not None:
            return v
    return None


def _pick_at(lines, i, mode, extra, window):
    chunk = lines[i + 1:i + 1 + window]

    if mode == "totale":
        for j, c in enumerate(chunk):
            if c.strip().lower() == "totale" and j + 1 < len(chunk):
                v = _num(chunk[j + 1])
                if v is None:
                    return None
                if extra and not (extra[0] <= v <= extra[1]):
                    return None       # out of plausible range → treat as absent
                return v
        return None

    if mode == "likert":
        # sum the two positive bars — AlmaLaurea's published "% satisfied".
        # Each bar is taken once: the window would otherwise spill into the
        # next question and produce totals above 100.
        seen, total = set(), None
        for j, c in enumerate(chunk):
            key = c.strip().lower()
            if key in POSITIVE_BARS and key not in seen and j + 1 < len(chunk):
                v = _num(chunk[j + 1])
                if v is not None:
                    seen.add(key)
                    total = v if total is None else total + v
            if len(seen) == len(POSITIVE_BARS):
                break
        return round(total, 1) if total is not None else None

    if mode == "first":
        for c in chunk:
            v = _num(c)
            if v is not None:
                return v
        return None

    if mode == "sub":
        for j, c in enumerate(chunk):
            if extra.lower() in c.lower() and j + 1 < len(chunk):
                return _num(chunk[j + 1])
        return None
    return None


def _query_url(config, ateneo, gruppo, corstipo, anno, annolau=1):
    return ("https://statistiche.almalaurea.it/cgi-php/universita/statistiche/visualizza.php"
            f"?anno={anno}&annolau={annolau}&corstipo={corstipo}&ateneo={ateneo}"
            f"&facolta=tutti&gruppo={gruppo}&classe=tutti&isstella=0&areageografica=tutti"
            f"&regione=tutti&dimensione=tutti&aggregacodicione=1&condocc=tutti"
            f"&LANG=it&CONFIG={config}")


def ingest(combos=None, delay=1.2):
    """Fetch real outcomes for the (ateneo, gruppo, corstipo) combos our
    catalogue actually uses and write pipeline/out/almalaurea.json.

    combos: list of [inst_slug, gruppo_key, corstipo]. Defaults to the full
    matrix of our AlmaLaurea-member institutions × the groups we teach.
    """
    from playwright.sync_api import sync_playwright

    if combos is None:
        members = [s for s, code in ATENEO.items() if code]
        groups = ["ict", "ing_ind", "ing_civ", "economico", "medico",
                  "psicologico", "educazione", "politico_sociale", "scientifico", "linguistico"]
        combos = [[s, g, "L"] for s in members for g in groups]
        # 5-year single-cycle: primary-teaching degrees (LM-85 bis)
        combos += [[s, "educazione", "LSE"] for s in members]

    rows, misses = {}, []
    with sync_playwright() as p:
        browser, ctx = _browser(p)
        page = ctx.new_page()
        # establish the session that unlocks occupazione.php
        page.goto(f"{PROFILO}?LANG=it", wait_until="domcontentloaded", timeout=60000)
        page.wait_for_timeout(2500)
        _accept_cookies(page)
        page.goto(f"{OCC}?LANG=it", wait_until="domcontentloaded", timeout=60000)
        page.wait_for_timeout(1500)

        for idx, (slug, gkey, corstipo) in enumerate(combos, 1):
            ateneo, gruppo = ATENEO[slug], GRUPPO[gkey]
            key = f"{slug}|{gkey}|{corstipo}"
            entry = {"institution": slug, "group": gkey, "level": corstipo,
                     "ateneo_code": ateneo, "gruppo_code": gruppo}
            for config, wanted, anno in (("occupazione", WANTED_OCC, OCC_YEAR),
                                         ("profilo", WANTED_PROF, PROF_YEAR)):
                url = _query_url(config, ateneo, gruppo, corstipo, anno)
                try:
                    page.goto(url, wait_until="domcontentloaded", timeout=60000)
                    page.wait_for_timeout(1200)
                    lines = _lines(page.content())
                    got = {k: _pick(lines, spec) for k, spec in wanted.items()}
                    entry.update({k: v for k, v in got.items()})
                    entry[f"{config}_year"] = anno
                    entry[f"{config}_source"] = url
                    if all(v is None for v in got.values()):
                        misses.append(f"{key}/{config}")
                except Exception as e:
                    misses.append(f"{key}/{config}: {str(e)[:80]}")
                page.wait_for_timeout(int(delay * 1000))
            rows[key] = entry
            if idx % 10 == 0 or idx == len(combos):
                print(f"  {idx}/{len(combos)} combos · {len(misses)} empty sections")
        browser.close()

    out = {"generated": OCC_YEAR, "surveys": {"occupazione": OCC_YEAR, "profilo": PROF_YEAR},
           "note": "AlmaLaurea consortium data, per university x disciplinary group x course level. "
                   "Institutions absent from the consortium (Politecnico di Milano, Bocconi, all ITS) have no rows.",
           "rows": rows, "empty": misses}
    os.makedirs("out", exist_ok=True)
    with open("out/almalaurea.json", "w", encoding="utf-8") as f:
        json.dump(out, f, indent=1, ensure_ascii=False)
    filled = sum(1 for r in rows.values() if r.get("employment_rate") is not None)
    print(f"\nwrote out/almalaurea.json — {len(rows)} combos, {filled} with an employment rate")
    return out



# ————————————————————————————————————————————————————————————————
# National ingest: every AlmaLaurea member university, not just ours.
# Sharded so GitHub Actions can run it in parallel — one pass is ~1,900 page
# loads, which is hours in a single job and ~12 minutes across eight.
# ————————————————————————————————————————————————————————————————

# Single-cycle degrees only exist in a few areas; querying LSE for every group
# would double the run for combinations that cannot exist.
LSE_GROUPS = ("educazione", "medico")


def _open_session(page, attempts=3):
    """Establish the session that unlocks statistiche.almalaurea.it.

    profilo.php 302-redirects to tendine.php, so navigating again too soon
    aborts the in-flight redirect ("interrupted by another navigation") and
    kills the run. Wait for the redirect to settle, and retry the handshake
    rather than losing a whole shard to a transient race.
    """
    from playwright.sync_api import Error as PWError
    for attempt in range(1, attempts + 1):
        try:
            page.goto(f"{PROFILO}?LANG=it", wait_until="load", timeout=60000)
            page.wait_for_timeout(2500)
            _accept_cookies(page)
            page.wait_for_timeout(1200)
            page.goto(f"{OCC}?LANG=it", wait_until="load", timeout=60000)
            page.wait_for_timeout(1500)
            return True
        except PWError as e:
            print(f"  session attempt {attempt}/{attempts} failed: {str(e)[:90]}")
            page.wait_for_timeout(3000)
    raise RuntimeError("could not open an AlmaLaurea session")


def fetch_universities(page):
    """The live ateneo list from the query builder — never a hardcoded copy,
    so a university joining or leaving the consortium is picked up by itself."""
    page.goto(f"{BASE}/solotendine.php?anno={OCC_YEAR}&LANG=it&CONFIG=occupazione",
              wait_until="domcontentloaded", timeout=60000)
    page.wait_for_timeout(1500)
    opts = page.eval_on_selector_all(
        "select[name=ateneo] option",
        "els => els.map(o => ({ code: o.value, name: (o.textContent||'').trim() }))")
    return [o for o in opts if o["code"].isdigit()]


def ingest_all(shard=0, shards=1, delay=0.8):
    """Every university × subject group × level, keyed by AlmaLaurea's own
    ateneo code so the dataset outlives our institution slugs."""
    from playwright.sync_api import sync_playwright

    rows, misses = {}, []
    with sync_playwright() as p:
        browser, ctx = _browser(p)
        page = ctx.new_page()
        _open_session(page)

        unis = fetch_universities(page)
        print(f"{len(unis)} AlmaLaurea universities listed")

        combos = []
        for u in unis:
            for gkey in GRUPPO:
                combos.append((u, gkey, "L"))
                if gkey in LSE_GROUPS:
                    combos.append((u, gkey, "LSE"))
        mine = [c for i, c in enumerate(combos) if i % shards == shard]
        print(f"shard {shard + 1}/{shards}: {len(mine)} of {len(combos)} combos")

        for idx, (u, gkey, corstipo) in enumerate(mine, 1):
            key = f"{u['code']}|{gkey}|{corstipo}"
            entry = {"ateneo_code": u["code"], "university": u["name"],
                     "group": gkey, "level": corstipo, "gruppo_code": GRUPPO[gkey]}
            for config, wanted, anno in (("occupazione", WANTED_OCC, OCC_YEAR),
                                         ("profilo", WANTED_PROF, PROF_YEAR)):
                url = _query_url(config, u["code"], GRUPPO[gkey], corstipo, anno)
                try:
                    page.goto(url, wait_until="domcontentloaded", timeout=60000)
                    page.wait_for_timeout(1000)
                    lines = _lines(page.content())
                    got = {k: _pick(lines, spec) for k, spec in wanted.items()}
                    entry.update(got)
                    entry[f"{config}_year"] = anno
                    entry[f"{config}_source"] = url
                except Exception as e:
                    misses.append(f"{key}/{config}: {str(e)[:60]}")
                page.wait_for_timeout(int(delay * 1000))
            # keep only combinations that actually exist somewhere
            if any(entry.get(k) is not None for k in ("employment_rate", "would_choose_again", "on_time")):
                rows[key] = entry
            if idx % 25 == 0 or idx == len(mine):
                print(f"  {idx}/{len(mine)} · {len(rows)} rows with data")
        browser.close()

    out = {"surveys": {"occupazione": OCC_YEAR, "profilo": PROF_YEAR},
           "shard": shard, "shards": shards, "rows": rows, "errors": misses}
    os.makedirs("out", exist_ok=True)
    name = f"out/almalaurea-shard-{shard}.json"
    with open(name, "w", encoding="utf-8") as f:
        json.dump(out, f, indent=1, ensure_ascii=False)
    print(f"\nwrote {name} — {len(rows)} rows with data, {len(misses)} errors")
    return out


if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else "discover"
    if cmd == "discover":
        discover()
    elif cmd == "ingest":
        ingest()
    elif cmd == "all":
        shard = int(sys.argv[2]) if len(sys.argv) > 2 else 0
        shards = int(sys.argv[3]) if len(sys.argv) > 3 else 1
        ingest_all(shard=shard, shards=shards)
    elif cmd == "labels":
        # dump the exact label/value lines of one result page per config, so the
        # parsers can be written against reality instead of guessed strings
        from playwright.sync_api import sync_playwright
        with sync_playwright() as p:
            browser, ctx = _browser(p)
            page = ctx.new_page()
            # both landings — statistiche.almalaurea.it only answers once the
            # occupazione page has been visited in this session
            page.goto(f"{PROFILO}?LANG=it", wait_until="domcontentloaded", timeout=60000)
            page.wait_for_timeout(2500)
            _accept_cookies(page)
            page.goto(f"{OCC}?LANG=it", wait_until="domcontentloaded", timeout=60000)
            page.wait_for_timeout(1500)
            for config, anno in (("occupazione", OCC_YEAR), ("profilo", PROF_YEAR)):
                url = _query_url(config, ATENEO["unibo"], GRUPPO["economico"], "L", anno)
                try:
                    page.goto(url, wait_until="domcontentloaded", timeout=60000)
                    page.wait_for_timeout(1500)
                    lines = _lines(page.content())
                    _dump(f"labels_{config}.txt", "\n".join(f"{i:4} {l}" for i, l in enumerate(lines)))
                    print(f"  {config}: {len(lines)} lines")
                except Exception as e:
                    print(f"  {config} FAILED: {str(e)[:140]}")
            browser.close()
    elif cmd == "sample":
        # small run to validate parsing before the full matrix
        ingest(combos=[["unibo", "economico", "L"], ["unito", "medico", "L"],
                       ["sapienza", "ict", "L"], ["unipa", "educazione", "LSE"]])
    else:
        print(f"unknown command {cmd}")
