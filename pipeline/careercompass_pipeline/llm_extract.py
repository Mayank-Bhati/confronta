"""Optional LLM extraction step (Gemini free tier).

Turns a messy curriculum page into structured subject rows for universities
whose HTML has no clean tables (e.g. PoliMi's Manifesto app pages).

Requires GEMINI_API_KEY in the environment; without it the step is skipped so
the pipeline stays fully runnable offline.
"""
import json
import os
import time

import requests

from . import env  # noqa: F401  (loads pipeline/.env before reading GEMINI_API_KEY)

MODEL = os.environ.get("GEMINI_MODEL", "gemini-2.5-flash")
# The key travels in the x-goog-api-key header, never in the query string.
# It used to be "...:generateContent?key={key}", which meant any requests
# exception — a timeout, a DNS failure, a raise_for_status — printed the whole
# URL, key included. That is how the previous key ended up in terminal output
# and had to be treated as exposed. A header cannot leak into a traceback.
ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"

PROMPT = """You are a data extraction service. From the following university web page text,
extract the bachelor programme's study plan as JSON:
{"subjects": [{"year": 1, "name": "...", "ects": 8}, ...]}
Rules: only subjects actually taught in this programme; year is 1, 2 or 3 if stated,
otherwise null; ects integer or null. Return ONLY the JSON object.

PAGE TEXT:
"""


def extract_subjects(page_text, max_retries=3):
    key = os.environ.get("GEMINI_API_KEY")
    if not key:
        return None  # step skipped — no key configured
    body = {
        "contents": [{"parts": [{"text": PROMPT + page_text[:28000]}]}],
        "generationConfig": {"temperature": 0, "responseMimeType": "application/json"},
    }
    headers = {"x-goog-api-key": key, "Content-Type": "application/json"}
    url = ENDPOINT.format(model=MODEL)
    for attempt in range(max_retries + 1):
        try:
            resp = requests.post(url, json=body, headers=headers, timeout=60)
        except requests.RequestException as exc:
            # re-raise without the original message: transport errors quote the
            # request, and we never want that text near a secret again
            raise RuntimeError(f"Gemini request failed: {type(exc).__name__}") from None
        if resp.status_code == 429 and attempt < max_retries:
            time.sleep(30 * (attempt + 1))  # free-tier rate limit: back off and retry
            continue
        if resp.status_code != 200:
            raise RuntimeError(f"Gemini API error {resp.status_code}: {resp.text[:200]}")
        text = resp.json()["candidates"][0]["content"]["parts"][0]["text"]
        return json.loads(text).get("subjects", [])
