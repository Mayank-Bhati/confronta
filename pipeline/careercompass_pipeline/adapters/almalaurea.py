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
    with sync_playwright() as p:
        browser, ctx = _browser(p)
        page = ctx.new_page()
        # 1. landing pages — establish session + dismiss the cookie wall
        _visit(page, "profilo_landing", f"{PROFILO}?LANG=it", findings)
        _visit(page, "occupazione_landing", f"{OCC}?LANG=it", findings)
        # 2. the query builders, where university / class codes are listed
        for label, cfg, anno in (("tendine_profilo", "profilo", 2025),
                                 ("tendine_occupazione", "occupazione", 2024)):
            _visit(page, label, f"{BASE}/tendine.php?LANG=it&config={cfg}&anno={anno}", findings)
        browser.close()
    _dump("discover.json", json.dumps(findings, indent=1, ensure_ascii=False))
    return findings


if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else "discover"
    if cmd == "discover":
        discover()
    else:
        print(f"unknown command {cmd}")
