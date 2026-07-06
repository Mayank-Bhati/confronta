"""Optional LLM extraction step (Gemini free tier).

Turns a messy curriculum page into structured subject rows for universities
whose HTML has no clean tables (e.g. PoliMi's Manifesto app pages).

Requires GEMINI_API_KEY in the environment; without it the step is skipped so
the pipeline stays fully runnable offline.
"""
import json
import os

import requests

MODEL = "gemini-1.5-flash"
ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={key}"

PROMPT = """You are a data extraction service. From the following university web page text,
extract the bachelor programme's study plan as JSON:
{"subjects": [{"year": 1, "name": "...", "ects": 8}, ...]}
Rules: only subjects actually taught in this programme; year is 1, 2 or 3 if stated,
otherwise null; ects integer or null. Return ONLY the JSON object.

PAGE TEXT:
"""


def extract_subjects(page_text):
    key = os.environ.get("GEMINI_API_KEY")
    if not key:
        return None  # step skipped — no key configured
    body = {
        "contents": [{"parts": [{"text": PROMPT + page_text[:28000]}]}],
        "generationConfig": {"temperature": 0, "responseMimeType": "application/json"},
    }
    resp = requests.post(ENDPOINT.format(model=MODEL, key=key), json=body, timeout=60)
    resp.raise_for_status()
    text = resp.json()["candidates"][0]["content"]["parts"][0]["text"]
    return json.loads(text).get("subjects", [])
