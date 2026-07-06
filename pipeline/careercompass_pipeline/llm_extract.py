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
ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={key}"

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
    for attempt in range(max_retries + 1):
        resp = requests.post(ENDPOINT.format(model=MODEL, key=key), json=body, timeout=60)
        if resp.status_code == 429 and attempt < max_retries:
            time.sleep(30 * (attempt + 1))  # free-tier rate limit: back off and retry
            continue
        if resp.status_code != 200:
            # never include the URL in errors — it contains the API key
            raise RuntimeError(f"Gemini API error {resp.status_code}: {resp.text[:200]}")
        text = resp.json()["candidates"][0]["content"]["parts"][0]["text"]
        return json.loads(text).get("subjects", [])
