// Anonymous funnel tracking — the minimum needed to answer "where do students
// stop?" during a testing round, and nothing more.
//
// What is recorded: a random session id, the step reached, a coarse detail
// (world/career id, never free text), the language, and phone/desktop.
// What is NOT recorded: names, emails, answers, IP addresses, or anything a
// person could be identified by. No cookies, so no consent banner is required.
//
// Rows go to the `events` table, which allows anonymous inserts and no reads —
// the same shape as feedback. Failures are swallowed on purpose: analytics
// must never break the page for a student.

import { getSupabase } from "./supabaseClient";

const SESSION_KEY = "cc-session";
const SENT = new Set(); // once-per-session steps, so refreshes don't inflate counts

function sessionId() {
  if (typeof window === "undefined") return null;
  try {
    let id = sessionStorage.getItem(SESSION_KEY);
    if (!id) {
      id = Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
      sessionStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    return null; // storage blocked (private mode): tracking simply does nothing
  }
}

function device() {
  if (typeof window === "undefined") return null;
  return window.innerWidth < 768 ? "phone" : "desktop";
}

/**
 * Record a funnel step.
 * @param step   short stable name: survey_started, survey_completed, world_opened…
 * @param detail optional coarse id (career/world/course id) — never free text
 * @param opts   { once: true } to count a step at most once per session
 */
export function track(step, detail = null, opts = {}) {
  if (typeof window === "undefined") return;
  const sid = sessionId();
  if (!sid) return;
  if (opts.once) {
    const key = `${step}:${detail || ""}`;
    if (SENT.has(key)) return;
    SENT.add(key);
  }
  try {
    const sb = getSupabase();
    if (!sb) return;
    const lang = (() => {
      try { return JSON.parse(localStorage.getItem("careercompass-v1") || "{}").lang || null; }
      catch { return null; }
    })();
    // fire and forget — a failed insert must never surface to the student
    sb.from("events")
      .insert({ session_id: sid, step: String(step).slice(0, 40), detail: detail ? String(detail).slice(0, 80) : null, lang, device: device() })
      .then(() => {}, () => {});
  } catch {
    /* never break the page for analytics */
  }
}
