// storage — device-local profiles. This is a static site with no backend, so
// "accounts" are browser-scoped: profiles + their survey history + language
// live in localStorage. Read/write only on the client.

const KEY = "careercompass-v1";

const DEFAULTS = { profiles: [], activeId: null, lang: "it", theme: "light", saved: [], guestHistory: [] };

export function uid() {
  return Math.random().toString(36).slice(2, 9) + Date.now().toString(36);
}

export function loadStore() {
  if (typeof window === "undefined") return { ...DEFAULTS };
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULTS };
    const parsed = JSON.parse(raw);
    const out = { ...DEFAULTS, ...parsed, profiles: parsed.profiles || [], saved: parsed.saved || [], guestHistory: parsed.guestHistory || [] };
    // one-time migration to the editorial light default (later manual choices persist)
    if (!parsed.themeV2) { out.theme = "light"; out.themeV2 = true; }
    // v1 launches for Italian students, so Italian is the default language.
    // Applied once: a language the student picks afterwards is kept.
    if (!parsed.langV2) { out.lang = "it"; out.langV2 = true; }
    // collapse duplicate saves left by the old per-result star identity:
    // one entry per (course, career), keeping the earliest
    const seen = new Set();
    out.saved = out.saved.filter((s) => {
      const k = `${s.courseId}|${s.careerId || ""}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
    return out;
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveStore(store) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(store));
  } catch {
    // storage full or blocked — profiles simply won't persist
  }
}

export const AVATAR_COLORS = ["#8B5CF6", "#EC4899", "#34D399", "#FBBF24", "#38BDF8", "#F87171"];

export function newProfile(name) {
  return {
    id: uid(),
    name: name.trim(),
    color: AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)],
    createdAt: Date.now(),
    history: [], // [{ id, date, letters, vector, interests, goals }]
  };
}
