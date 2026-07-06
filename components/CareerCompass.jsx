"use client";

import React, { useState, useMemo, useEffect } from "react";
import POOLS from "../data/questions-v2.json";
import WORLDS_DATA from "../data/worlds.json";
import COURSES from "../data/courses-v2.json";
import CITIES from "../data/cities-v2.json";
import { emptyVector, applyAnswer, applyLikert, applyMulti, buildSurvey, pickLikert, normalize, identity, topDimensions, DIMS } from "../lib/scoreEngine";
import { rankWorlds, rankCareers } from "../lib/matchEngine";
import { fitInterests, fitOutcome, fitEnvironment, passesHardFilters, prepList, generateNarrative, haversineKm } from "../lib/fitEngine-v2";
import { LANGS, makeT, makeTD } from "../lib/i18n";
import { loadStore, saveStore, newProfile, uid } from "../lib/storage";

// ————— Theme palettes: dark (cinematic) and light —————
const PALETTES = {
  dark: {
    bg: "#07070E", card: "#12121D", card2: "#181826",
    line: "rgba(255,255,255,0.09)", lineStrong: "rgba(255,255,255,0.18)",
    ink: "#F2F3F8", grey: "#9CA3B8",
    violet: "#3B82F6", violetSoft: "rgba(59,130,246,0.16)", accent: "#60A5FA",
    pink: "#EC4899",
    green: "#34D399", greenSoft: "rgba(52,211,153,0.14)",
    amber: "#FBBF24", amberSoft: "rgba(251,191,36,0.13)",
    red: "#F87171", redSoft: "rgba(248,113,113,0.13)",
    grad: "linear-gradient(135deg,#2563EB,#EC4899)",
    track: "rgba(255,255,255,0.08)",
    headerBg: "rgba(7,7,14,0.82)",
    chipIdle: "transparent",
    rowBg: "rgba(255,255,255,0.04)",
  },
  light: {
    bg: "#F5F5FB", card: "#FFFFFF", card2: "#F1F1F8",
    line: "rgba(20,20,60,0.10)", lineStrong: "rgba(20,20,60,0.22)",
    ink: "#1A1B2E", grey: "#5D6470",
    violet: "#2244BB", violetSoft: "rgba(34,68,187,0.10)", accent: "#2244BB",
    pink: "#DB2777",
    green: "#0E9F6E", greenSoft: "rgba(14,159,110,0.12)",
    amber: "#B45309", amberSoft: "rgba(245,158,11,0.16)",
    red: "#DC2626", redSoft: "rgba(220,38,38,0.10)",
    grad: "linear-gradient(135deg,#2244BB,#DB2777)",
    track: "rgba(20,20,60,0.10)",
    headerBg: "rgba(245,245,251,0.85)",
    chipIdle: "#FFFFFF",
    rowBg: "rgba(20,20,60,0.04)",
  },
};

const WORLD_HUES = ["#3B82F6", "#EC4899", "#38BDF8", "#FBBF24", "#34D399", "#F87171", "#A3E635"];

const INTEREST_TAGS = [
  "Programming", "Mathematics", "Economics & finance", "Design & creativity",
  "Machines & hardware", "People & communication", "Science & research", "Building things",
  "Health & body", "Nature & environment", "Media & video", "Teaching & mentoring",
  "Languages & writing", "Law & society", "Sport & movement", "Food & hospitality",
];

const DIM_TO_TAGS = {
  R: ["Machines & hardware", "Building things", "Sport & movement"],
  I: ["Mathematics", "Science & research", "Programming"],
  A: ["Design & creativity", "Media & video", "Languages & writing"],
  S: ["People & communication", "Teaching & mentoring", "Health & body"],
  E: ["Economics & finance", "People & communication", "Law & society"],
  C: ["Economics & finance", "Mathematics"],
};

const NATURE_KEY = {
  scientific: "nat_scientific",
  classical: "nat_classical",
  mixed: "nat_mixed",
  "technical-practical": "nat_technical",
};

const mono = { fontFamily: "'Space Mono', monospace" };
const display = { fontFamily: "'Outfit', system-ui, sans-serif" };
const DATE_LOCALE = { en: "en-GB", it: "it-IT", hi: "hi-IN" };

const natureStyleFor = (T, nature) =>
  nature === "classical" ? { bg: T.amberSoft, fg: T.amber }
  : nature === "scientific" ? { bg: T.violetSoft, fg: T.accent }
  : { bg: T.greenSoft, fg: T.green };

// App context: the building blocks below MUST stay at module level. Defining
// them inside the main component gives them a fresh identity on every render,
// which makes React remount the whole page on each click (scroll jumps to top,
// entrance animations replay). Theme and shared handlers flow through context.
const AppCtx = React.createContext(null);

function PeopleIcon({ size = 18, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} aria-hidden>
      <circle cx="9" cy="8.3" r="3.4" />
      <path d="M2.8 19.2c0-3.1 2.8-5.2 6.2-5.2s6.2 2.1 6.2 5.2V20H2.8z" />
      <circle cx="16.6" cy="6.9" r="2.7" opacity="0.75" />
      <path d="M15.9 13.7c2.7.3 4.9 2.1 4.9 4.6V20h-3.4v-.8c0-2.1-.5-3.9-1.5-5.5z" opacity="0.75" />
    </svg>
  );
}

function Bar({ score, color }) {
  const { T, scoreColor } = React.useContext(AppCtx);
  return (
    <div className="w-full h-2 rounded-full" style={{ background: T.track }}>
      <div className="h-2 rounded-full transition-all duration-500" style={{ width: `${score}%`, background: color || scoreColor(score) }} />
    </div>
  );
}

function ChipBtn({ active, onClick, children }) {
  const { T } = React.useContext(AppCtx);
  return (
    <button onClick={onClick} className="px-3.5 py-1.5 rounded-full text-sm transition-all"
      style={{
        border: `1.5px solid ${active ? T.violet : T.line}`,
        background: active ? T.grad : T.chipIdle,
        color: active ? "#fff" : T.ink,
        boxShadow: active ? "0 4px 18px rgba(59,130,246,0.35)" : "none",
      }}>
      {children}
    </button>
  );
}

function Section({ children, className = "" }) {
  const { T } = React.useContext(AppCtx);
  return (
    <section className={`rounded-2xl p-5 md:p-7 cc-fade-up ${className}`}
      style={{ background: T.card, border: `1px solid ${T.line}` }}>
      {children}
    </section>
  );
}

function NatureBadge({ c, full = false }) {
  const { T, t } = React.useContext(AppCtx);
  const n = natureStyleFor(T, c.nature);
  const text = t(NATURE_KEY[c.nature]);
  return (
    <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: n.bg, color: n.fg }}>
      {full ? text : text.split(" — ")[0]}
    </span>
  );
}

function GoogleLink({ c }) {
  const { T, t } = React.useContext(AppCtx);
  return (
    <a href={`https://www.google.com/search?q=${c.googleQuery}`} target="_blank" rel="noreferrer"
      onClick={(e) => e.stopPropagation()}
      className="text-xs font-semibold underline whitespace-nowrap" style={{ color: T.accent }}>
      {t("card_google")}
    </a>
  );
}

function OfficialLink({ c }) {
  const { T, t } = React.useContext(AppCtx);
  if (!c.url) return null;
  return (
    <a href={c.url} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}
      className="inline-block mt-1 text-xs font-semibold underline" style={{ color: T.accent }}>
      {t("card_official")}
    </a>
  );
}

function InstitutionCard({ c, showFit, chosen, onCardClick, saveCtx, badge }) {
  const { T, t, scoreColor, isSavedOn, toggleSave } = React.useContext(AppCtx);
  return (
    <div onClick={onCardClick} className={`cc-card w-full text-left rounded-2xl p-4 md:p-5 ${onCardClick ? "cursor-pointer" : ""}`}
      style={{ background: chosen ? T.violetSoft : T.card, border: `1.5px solid ${chosen ? T.violet : T.line}` }}>
      {badge && (
        <div className="mb-2 text-xs px-2.5 py-1 rounded-full inline-block" style={{ background: T.violetSoft, color: T.accent }}>
          {badge}
        </div>
      )}
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: c.type === "ITS" ? T.greenSoft : T.violetSoft, color: c.type === "ITS" ? T.green : T.accent, ...mono }}>
              {c.type} · {c.years}y · {c.city}
            </span>
            <NatureBadge c={c} />
            <GoogleLink c={c} />
          </div>
          <div className="font-bold mt-2" style={display}>{c.name}</div>
          <div className="text-sm" style={{ color: T.grey }}>{c.inst}</div>
          <OfficialLink c={c} />
        </div>
        <div className="text-right shrink-0">
          {showFit && c.envFit && (
            <>
              <div className="text-sm font-bold" style={{ ...mono, color: scoreColor(c.envFit.score) }}>{c.envFit.score}/100</div>
              <div className="text-xs" style={{ color: T.grey }}>{t("card_env")}</div>
            </>
          )}
          <button onClick={(e) => { e.stopPropagation(); toggleSave(c, saveCtx); }}
            className="mt-2 px-3 py-1 rounded-full text-xs font-bold transition-all"
            style={{
              border: `1.5px solid ${isSavedOn(c.id, saveCtx?.careerId ?? null) ? T.green : T.lineStrong}`,
              background: isSavedOn(c.id, saveCtx?.careerId ?? null) ? T.greenSoft : "transparent",
              color: isSavedOn(c.id, saveCtx?.careerId ?? null) ? T.green : T.ink,
            }}>
            {isSavedOn(c.id, saveCtx?.careerId ?? null) ? t("card_saved") : t("card_save")}
          </button>
          {chosen && <div className="mt-1 text-xs font-bold" style={{ color: T.accent }}>{t("card_finalist")}</div>}
        </div>
      </div>
      {showFit && c.envFit && (
        <div className="mt-2 text-xs space-y-0.5" style={{ color: T.grey }}>
          {c.envFit.reasons.slice(0, 2).map((r, i) => <div key={i}>· {r}</div>)}
        </div>
      )}
    </div>
  );
}

function BackLink({ onClick, label }) {
  const { T, t, goBack } = React.useContext(AppCtx);
  return (
    <button onClick={onClick ?? goBack} className="text-sm font-semibold transition-colors hover:opacity-80" style={{ color: T.accent }}>
      ← {label ?? t("back")}
    </button>
  );
}

function Logo({ size = 34 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden>
      <defs>
        <linearGradient id="ccLogoGrad" x1="0" y1="0" x2="48" y2="48">
          <stop stopColor="#2563EB" />
          <stop offset="1" stopColor="#EC4899" />
        </linearGradient>
      </defs>
      <circle cx="24" cy="24" r="20.5" stroke="url(#ccLogoGrad)" strokeWidth="3.5" />
      <path d="M32.5 15.5 L26.8 26.8 L15.5 32.5 L21.2 21.2 Z" fill="url(#ccLogoGrad)" />
      <circle cx="24" cy="24" r="2.4" fill="#07070E" />
    </svg>
  );
}

export default function CareerCompass() {
  // ————— Language + theme + profiles (device-local) —————
  const [store, setStore] = useState({ profiles: [], activeId: null, lang: "en", theme: "dark" });
  const [storeLoaded, setStoreLoaded] = useState(false);
  useEffect(() => { setStore((s) => ({ ...s, ...loadStore() })); setStoreLoaded(true); }, []);
  useEffect(() => { if (storeLoaded) saveStore(store); }, [store, storeLoaded]);
  function updateStore(fn) { setStore(fn); }

  const lang = store.lang || "en";
  const theme = store.theme || "dark";
  const T = PALETTES[theme];
  const t = useMemo(() => makeT(lang), [lang]);
  const td = useMemo(() => makeTD(lang), [lang]);
  const activeProfile = store.profiles.find((p) => p.id === store.activeId) || null;

  useEffect(() => {
    document.documentElement.style.background = T.bg;
    document.documentElement.style.colorScheme = theme;
    document.body.style.background = T.bg;
  }, [theme, T.bg]);

  const scoreColor = (s) => (s >= 70 ? T.green : s >= 45 ? T.amber : T.red);
  const scoreSoft = (s) => (s >= 70 ? T.greenSoft : s >= 45 ? T.amberSoft : T.redSoft);
  const natureStyle = (nature) =>
    nature === "classical" ? { bg: T.amberSoft, fg: T.amber }
    : nature === "scientific" ? { bg: T.violetSoft, fg: T.accent }
    : { bg: T.greenSoft, fg: T.green };

  // ————— App state —————
  const [stage, setStage] = useState("welcome");
  const [navStack, setNavStack] = useState([]);
  const [survey, setSurvey] = useState(null);
  const [likertQs, setLikertQs] = useState([]);
  const [phase, setPhase] = useState("binary"); // binary → multi → likert
  const [qIndex, setQIndex] = useState(0);
  const [multiSel, setMultiSel] = useState([]);
  const [vector, setVector] = useState(emptyVector());
  const [qHistory, setQHistory] = useState([]); // snapshots for the survey back button
  const [profile, setProfile] = useState({ interests: [], goals: ["work"], isee: "mid", awayFromHome: false, homeCityId: "", relocationCities: [], mathStrength: 3 });
  const [worldId, setWorldId] = useState(null);
  const [careerId, setCareerId] = useState(null);
  const [prefs, setPrefs] = useState({ pathType: "any", maxDistance: 100, budget: 900 });
  const [saved, setSaved] = useState([]); // [{ courseId, careerId, careerName, worldName }] — contextual per path
  const [finalists, setFinalists] = useState([]);
  const [narrative, setNarrative] = useState("");
  const [showProfiles, setShowProfiles] = useState(false);
  const [newName, setNewName] = useState("");
  const [savedToName, setSavedToName] = useState("");
  const [lastResult, setLastResult] = useState(null);

  const totalQ = 10 + 5 + 5;
  const answered = phase === "binary" ? qIndex : phase === "multi" ? 10 + qIndex : 15 + qIndex;
  const homeCity = CITIES.find((c) => c.id === profile.homeCityId) || null;
  const hasResult = lastResult !== null || DIMS.some((d) => vector[d] > 0);

  // ————— Derived rankings —————
  const norm = useMemo(() => normalize(vector), [vector]);
  const ident = useMemo(() => identity(vector), [vector]);
  const identTitle = t(`pair_${ident.letters}`) === `pair_${ident.letters}` ? t("pair_XX") : t(`pair_${ident.letters}`);
  const rankedWorlds = useMemo(() => rankWorlds(vector, WORLDS_DATA.worlds), [vector]);
  const world = rankedWorlds.find((w) => w.id === worldId);
  const rankedCareers = useMemo(() => (world ? rankCareers(vector, world) : []), [vector, world]);
  const career = rankedCareers.find((c) => c.id === careerId);
  const pair = finalists.map((id) => COURSES.find((c) => c.id === id)).filter(Boolean);

  // ————— Stage navigation with a real history stack —————
  const renderableStage = (s) => {
    if (s === "career") return !!world;
    if (s === "filter") return !!career;
    if (s === "compare") return pair.length === 2;
    if (s === "express") return !!survey;
    if (s === "reveal") return hasResult;
    return true;
  };

  function go(next) {
    if (next === stage) return;
    // The survey isn't a place to "go back" into once left — skip it in history.
    setNavStack((s) => (stage === "express" ? s : [...s, stage]));
    setStage(next);
  }

  function goBack() {
    const st = [...navStack];
    let target = "welcome";
    while (st.length) {
      const cand = st.pop();
      if (renderableStage(cand) && cand !== stage) { target = cand; break; }
    }
    setNavStack(st);
    setStage(target);
  }

  function goHome() { setNavStack([]); setStage("welcome"); }

  // ————— Survey flow (with undo history) —————
  function startSurvey() {
    setSurvey(buildSurvey(POOLS, 10, 5));
    setVector(emptyVector());
    setPhase("binary");
    setQIndex(0);
    setMultiSel([]);
    setLikertQs([]);
    setQHistory([]);
    setSavedToName("");
    setLastResult(null);
    setNavStack(["welcome"]);
    setStage("express");
  }

  function goInsights() {
    if (hasResult) go("reveal");
    else startSurvey();
  }

  function pushSnapshot() {
    setQHistory((h) => [...h, { phase, qIndex, vector, multiSel, likertQs }]);
  }

  function goBackQuestion() {
    if (!qHistory.length) { goHome(); return; }
    const last = qHistory[qHistory.length - 1];
    setQHistory((h) => h.slice(0, -1));
    setPhase(last.phase);
    setQIndex(last.qIndex);
    setVector(last.vector);
    setMultiSel(last.multiSel);
    setLikertQs(last.likertQs);
  }

  function finishExpress(v) {
    const tags = new Set();
    for (const d of topDimensions(v, 2)) for (const tg of DIM_TO_TAGS[d]) tags.add(tg);
    setProfile((p) => ({ ...p, interests: [...tags] }));
    const result = { id: uid(), date: Date.now(), letters: identity(v).letters, vector: v, interests: [...tags], goals: profile.goals };
    setLastResult(result);
    if (activeProfile) {
      updateStore((s) => ({
        ...s,
        profiles: s.profiles.map((p) => (p.id === s.activeId && !p.history.some((h) => h.id === result.id) ? { ...p, history: [result, ...p.history] } : p)),
      }));
      setSavedToName(activeProfile.name);
    } else {
      setSavedToName("");
    }
    go("reveal");
  }

  function answerBinary(weights) {
    pushSnapshot();
    const v = applyAnswer(vector, weights);
    setVector(v);
    if (qIndex + 1 >= survey.binary.length) { setPhase("multi"); setQIndex(0); }
    else setQIndex(qIndex + 1);
  }

  function submitMulti() {
    pushSnapshot();
    const q = survey.multi[qIndex];
    const v = applyMulti(vector, multiSel.map((i) => q.options[i]));
    setVector(v);
    setMultiSel([]);
    if (qIndex + 1 >= survey.multi.length) {
      setLikertQs(pickLikert(v, POOLS.likert, 5));
      setPhase("likert");
      setQIndex(0);
    } else setQIndex(qIndex + 1);
  }

  function answerLikert(val) {
    pushSnapshot();
    const q = likertQs[qIndex];
    const v = applyLikert(vector, q.dim, val);
    setVector(v);
    if (qIndex + 1 >= likertQs.length) finishExpress(v);
    else setQIndex(qIndex + 1);
  }

  // ————— Goals: multi-select with an exclusivity rule —————
  // "work" and "study" pull opposite ways → picking one releases the other.
  // "salary" combines with either. "unsure" stands alone.
  function toggleGoal(g) {
    setProfile((p) => {
      const goals = new Set(p.goals);
      if (g === "unsure") return { ...p, goals: ["unsure"] };
      goals.delete("unsure");
      if (goals.has(g)) goals.delete(g);
      else {
        goals.add(g);
        if (g === "work") goals.delete("study");
        if (g === "study") goals.delete("work");
      }
      if (!goals.size) goals.add("unsure");
      return { ...p, goals: [...goals] };
    });
  }

  const envPrefs = { ...prefs, isee: profile.isee, awayFromHome: profile.awayFromHome, budget: profile.awayFromHome ? prefs.budget * 12 : null, maxDistance: !profile.awayFromHome && homeCity ? prefs.maxDistance : null };

  const institutions = useMemo(() => {
    if (!career) return [];
    let list = career.courses.map((id) => COURSES.find((c) => c.id === id)).filter(Boolean);
    list = list.filter((c) => passesHardFilters(c, prefs));
    if (profile.awayFromHome && profile.relocationCities.length) {
      list = list.filter((c) => profile.relocationCities.includes(c.city.toLowerCase()));
    }
    return list
      .map((c) => ({ ...c, envFit: fitEnvironment(c, envPrefs, !profile.awayFromHome ? homeCity : null) }))
      .sort((a, b) => b.envFit.score - a.envFit.score);
  }, [career, prefs, profile, homeCity]);

  const savedEntries = saved
    .map((s) => ({ ...s, course: COURSES.find((c) => c.id === s.courseId) }))
    .filter((s) => s.course);

  const compareDims = useMemo(() => {
    if (pair.length < 2) return [];
    return [
      { key: "interest", label: t("cmp_interest"), data: pair.map((c) => fitInterests(c, profile.interests)) },
      { key: "outcome", label: t("cmp_outcome"), data: pair.map((c) => fitOutcome(c, profile.goals)) },
      { key: "env", label: t("cmp_env"), data: pair.map((c) => { const f = fitEnvironment(c, envPrefs, !profile.awayFromHome ? homeCity : null); return { score: f.score, note: f.reasons[0] || "" }; }) },
    ].map((r) => ({ ...r, scores: r.data.map((d) => d.score) }));
  }, [pair, profile, prefs, homeCity, t]);

  // ————— Contextual saves: a course is saved on a specific career path —————
  function isSavedOn(courseId, cId) {
    return saved.some((s) => s.courseId === courseId && s.careerId === cId);
  }
  function toggleSave(course, ctx) {
    const cId = ctx?.careerId ?? null;
    setSaved((prev) =>
      prev.some((s) => s.courseId === course.id && s.careerId === cId)
        ? prev.filter((s) => !(s.courseId === course.id && s.careerId === cId))
        : [...prev, { courseId: course.id, careerId: cId, careerName: ctx?.careerName || "", worldName: ctx?.worldName || "" }]
    );
  }

  function toggleFinalist(id) {
    setFinalists((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 2) return [prev[1], id];
      return [...prev, id];
    });
    setNarrative("");
  }

  function cityCostBadge(cityName) {
    const c = CITIES.find((x) => x.name === cityName);
    return c ? t("cost_badge", { a: c.costRange[0], b: c.costRange[1] }) : "";
  }

  // ————— Profile actions —————
  function createProfile() {
    const name = newName.trim();
    if (!name) return;
    const p = newProfile(name);
    if (lastResult && !savedToName) {
      p.history = [lastResult];
      setSavedToName(name);
    }
    updateStore((s) => (s.profiles.some((x) => x.id === p.id) ? s : { ...s, profiles: [...s.profiles, p], activeId: p.id }));
    setNewName("");
  }
  function switchProfile(id) { updateStore((s) => ({ ...s, activeId: id })); }
  function deleteProfile(id) {
    updateStore((s) => ({ ...s, profiles: s.profiles.filter((p) => p.id !== id), activeId: s.activeId === id ? null : s.activeId }));
  }
  function openResult(r) {
    setVector(r.vector);
    setProfile((p) => ({ ...p, interests: r.interests, goals: r.goals?.length ? r.goals : ["work"] }));
    setLastResult(r);
    setSavedToName(activeProfile?.name || "");
    setShowProfiles(false);
    setNavStack(["welcome"]);
    setStage("reveal");
  }

  const ctx = { T, t, scoreColor, scoreSoft, goBack, isSavedOn, toggleSave };

  return (
    <AppCtx.Provider value={ctx}>
    <div className="min-h-screen" style={{ background: T.bg, color: T.ink }}>

      {/* ————— Header ————— */}
      <header className="sticky top-0 z-40" style={{ background: T.headerBg, backdropFilter: "blur(14px)", borderBottom: `1px solid ${T.line}` }}>
        <div className="max-w-[1500px] mx-auto px-4 md:px-10 py-3 flex items-center justify-between gap-3 flex-wrap">
          <button onClick={goHome} className="flex items-center gap-2.5 group">
            <Logo />
            <span className="text-xl md:text-2xl font-extrabold tracking-tight" style={{ ...display, backgroundImage: T.grad, WebkitBackgroundClip: "text", backgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              CareerCompass
            </span>
            <span className="hidden lg:inline text-xs ml-1" style={{ color: T.grey, ...mono }}>{t("tagline")}</span>
          </button>

          <nav className="flex items-center gap-1.5 md:gap-2.5 flex-wrap">
            <button onClick={goHome} className="px-3 py-1.5 rounded-full text-sm font-semibold transition-colors hover:opacity-75"
              style={{ color: stage === "welcome" ? T.accent : T.ink }}>
              {t("nav_home")}
            </button>
            <button onClick={goInsights} className="px-3 py-1.5 rounded-full text-sm font-semibold transition-colors hover:opacity-75"
              style={{ color: stage === "reveal" ? T.accent : T.ink }}>
              {t("nav_insights")}
            </button>
            <button onClick={startSurvey} className="px-3 py-1.5 rounded-full text-sm font-semibold transition-colors hover:opacity-75" style={{ color: T.ink }}>
              {t("nav_retake")}
            </button>
            {saved.length > 0 && (
              <button onClick={() => go("saved")}
                className="px-3.5 py-1.5 rounded-full text-sm font-bold transition-all"
                style={{ background: T.greenSoft, color: T.green, border: `1.5px solid ${T.green}` }}>
                ☆ {t("nav_saved")} ({saved.length})
              </button>
            )}
            <button onClick={() => updateStore((s) => ({ ...s, theme: theme === "dark" ? "light" : "dark" }))}
              aria-label="Toggle theme"
              className="w-9 h-9 rounded-full text-base flex items-center justify-center transition-transform hover:scale-105"
              style={{ background: T.card2, border: `1.5px solid ${T.line}` }}>
              {theme === "dark" ? "☀️" : "🌙"}
            </button>
            <select value={lang} onChange={(e) => updateStore((s) => ({ ...s, lang: e.target.value }))}
              aria-label="Language"
              className="rounded-full px-2.5 py-1.5 text-sm font-semibold cursor-pointer"
              style={{ background: T.card2, color: T.ink, border: `1.5px solid ${T.line}` }}>
              {LANGS.map((l) => <option key={l.id} value={l.id}>{l.label}</option>)}
            </select>
            <button onClick={() => setShowProfiles(true)} aria-label={t("nav_profile")}
              className="w-9 h-9 rounded-full font-bold text-sm flex items-center justify-center transition-transform hover:scale-105"
              style={{ background: activeProfile ? activeProfile.color : T.card2, color: activeProfile ? "#07070E" : T.grey, border: `1.5px solid ${activeProfile ? "transparent" : T.lineStrong}` }}>
              {activeProfile ? activeProfile.name[0].toUpperCase() : <PeopleIcon color={T.grey} />}
            </button>
          </nav>
        </div>
      </header>

      <main className="max-w-[1500px] mx-auto px-4 md:px-10 pb-20 pt-6 space-y-5">

        {/* ————— Welcome / hero ————— */}
        {stage === "welcome" && (
          <div className="relative overflow-hidden rounded-3xl cc-fade-up" style={{ border: `1px solid ${T.line}`, background: T.card }}>
            <div className="cc-blob absolute -top-32 -left-24 w-[480px] h-[480px] rounded-full pointer-events-none" style={{ background: "radial-gradient(circle, rgba(139,92,246,0.35), transparent 65%)", filter: "blur(40px)" }} />
            <div className="cc-blob absolute -bottom-40 -right-24 w-[520px] h-[520px] rounded-full pointer-events-none" style={{ background: "radial-gradient(circle, rgba(236,72,153,0.28), transparent 65%)", filter: "blur(40px)", animationDelay: "-7s" }} />
            <div className="relative px-6 md:px-16 py-16 md:py-24">
              <div className="text-xs uppercase tracking-[0.25em] mb-4" style={{ color: T.accent, ...mono }}>{t("welcome_kicker")}</div>
              <h2 className="text-4xl md:text-6xl font-black leading-tight max-w-3xl" style={display}>
                <span style={{ backgroundImage: T.grad, WebkitBackgroundClip: "text", backgroundClip: "text", WebkitTextFillColor: "transparent" }}>{t("welcome_title")}</span>
              </h2>
              <p className="mt-5 text-base md:text-lg leading-relaxed max-w-2xl" style={{ color: T.grey }}>
                {t("welcome_body")}
              </p>
              <button onClick={startSurvey} className="cc-glow mt-8 px-8 py-4 rounded-full font-bold text-white text-lg transition-transform hover:scale-105" style={{ background: T.grad, ...display }}>
                {t("welcome_start")}
              </button>
              <div className="mt-10 space-y-3 max-w-2xl">
                {[t("feat_1"), t("feat_2"), t("feat_3")].map((f, i) => (
                  <div key={i} className="flex items-center gap-3 cc-fade-up" style={{ animationDelay: `${200 + i * 120}ms` }}>
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: T.grad }} />
                    <span className="text-sm md:text-base" style={{ color: T.grey }}>{f}</span>
                  </div>
                ))}
              </div>
              <p className="mt-10 text-xs max-w-xl" style={{ color: T.grey }}>{t("welcome_privacy")}</p>
            </div>
          </div>
        )}

        {/* ————— Survey ————— */}
        {stage === "express" && survey && (
          <div className="max-w-3xl mx-auto">
            <Section>
              <div className="flex items-center justify-between mb-2">
                <BackLink onClick={goBackQuestion} />
                <span className="text-xs" style={{ color: T.grey, ...mono }}>{answered + 1} / {totalQ}</span>
              </div>
              {phase === "multi" && qIndex === 0 && <div className="text-xs font-semibold mb-1" style={{ color: T.accent }}>{t("q_multi_round")}</div>}
              {phase === "likert" && qIndex === 0 && <div className="text-xs font-semibold mb-1" style={{ color: T.accent }}>{t("q_likert_round")}</div>}
              <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: T.track }}>
                <div className="cc-progress h-2 rounded-full transition-all duration-500" style={{ width: `${Math.round((answered / totalQ) * 100)}%` }} />
              </div>

              <div key={`${phase}-${qIndex}`} className="cc-fade-up">
                {phase === "binary" && survey.binary[qIndex] && (
                  <>
                    <h2 className="mt-6 text-xl font-bold" style={display}>{t("q_binary_title")}</h2>
                    <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {[survey.binary[qIndex].a, survey.binary[qIndex].b].map((opt, i) => (
                        <button key={i} onClick={() => answerBinary(opt.w)}
                          className="cc-card text-left rounded-2xl p-5"
                          style={{ background: T.card2, border: `1.5px solid ${T.line}`, color: T.ink }}>
                          <span className="text-base leading-snug">{td(opt.text)}</span>
                        </button>
                      ))}
                    </div>
                    <p className="mt-4 text-xs" style={{ color: T.grey }}>{t("q_binary_hint")}</p>
                  </>
                )}

                {phase === "multi" && survey.multi[qIndex] && (
                  <>
                    <h2 className="mt-6 text-xl font-bold" style={display}>{td(survey.multi[qIndex].prompt)}</h2>
                    <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {survey.multi[qIndex].options.map((opt, i) => (
                        <button key={i} onClick={() => setMultiSel((s) => (s.includes(i) ? s.filter((x) => x !== i) : [...s, i]))}
                          className="text-left rounded-xl p-3.5 text-sm transition-all"
                          style={{ background: multiSel.includes(i) ? T.violetSoft : T.card2, border: `1.5px solid ${multiSel.includes(i) ? T.violet : T.line}`, color: T.ink }}>
                          {multiSel.includes(i) ? "✓ " : ""}{td(opt.text)}
                        </button>
                      ))}
                    </div>
                    <button onClick={submitMulti} className="mt-5 px-6 py-2.5 rounded-full font-bold text-white transition-transform hover:scale-105"
                      style={{ background: multiSel.length ? T.grad : T.grey }}>
                      {multiSel.length ? t("q_continue", { n: multiSel.length }) : t("q_skip")}
                    </button>
                  </>
                )}

                {phase === "likert" && likertQs[qIndex] && (
                  <>
                    <h2 className="mt-6 text-xl font-bold leading-snug" style={display}>"{td(likertQs[qIndex].text)}"</h2>
                    <div className="mt-4 flex flex-col gap-2">
                      {[["lik_m2", -2], ["lik_m1", -1], ["lik_0", 0], ["lik_p1", 1], ["lik_p2", 2]].map(([k, v]) => (
                        <button key={k} onClick={() => answerLikert(v)}
                          className="cc-card text-left rounded-xl px-4 py-3 text-sm"
                          style={{ background: T.card2, border: `1.5px solid ${T.line}`, color: T.ink }}>
                          {t(k)}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </Section>
          </div>
        )}

        {/* ————— Reveal / insights ————— */}
        {stage === "reveal" && (
          <div className="max-w-4xl mx-auto space-y-5">
            <BackLink />
            <Section>
              <div className="text-xs uppercase tracking-[0.25em]" style={{ color: T.grey, ...mono }}>{t("reveal_youare")}</div>
              <h2 className="text-4xl md:text-5xl font-black mt-2" style={{ ...display, backgroundImage: T.grad, WebkitBackgroundClip: "text", backgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                {identTitle}
              </h2>
              <p className="mt-3 text-sm md:text-base" style={{ color: T.grey }}>
                {t("reveal_blurb", {
                  a: t(`dim_${ident.letters[0]}`), ad: t(`dimd_${ident.letters[0]}`).toLowerCase(),
                  b: t(`dim_${ident.letters[1]}`), bd: t(`dimd_${ident.letters[1]}`).toLowerCase(),
                })}
              </p>
              {savedToName ? (
                <p className="mt-3 text-xs font-semibold" style={{ color: T.green }}>{t("reveal_saved_to", { name: savedToName })}</p>
              ) : lastResult ? (
                <button onClick={() => setShowProfiles(true)} className="mt-3 text-xs font-bold underline" style={{ color: T.accent }}>
                  {t("reveal_create_prompt")}
                </button>
              ) : null}
              <div className="mt-6 space-y-2.5">
                {DIMS.map((d) => (
                  <div key={d} className="flex items-center gap-3">
                    <span className="w-28 text-xs font-semibold">{t(`dim_${d}`)}</span>
                    <div className="flex-1"><Bar score={norm[d]} color={T.violet} /></div>
                    <span className="w-8 text-xs text-right" style={{ ...mono, color: T.grey }}>{norm[d]}</span>
                  </div>
                ))}
              </div>
            </Section>

            {activeProfile && activeProfile.history.length > 0 && (
              <Section>
                <div className="text-xs uppercase tracking-widest mb-3" style={{ color: T.grey }}>{t("pf_history")}</div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {activeProfile.history.map((r) => {
                    const current = lastResult?.id === r.id;
                    const title = t(`pair_${r.letters}`) === `pair_${r.letters}` ? t("pair_XX") : t(`pair_${r.letters}`);
                    return (
                      <button key={r.id} onClick={() => openResult(r)} className="cc-card text-left rounded-xl p-3"
                        style={{ background: current ? T.violetSoft : T.card2, border: `1.5px solid ${current ? T.violet : T.line}` }}>
                        <div className="font-bold text-sm" style={{ ...display, color: current ? T.accent : T.ink }}>{title}</div>
                        <div className="text-xs mt-1" style={{ ...mono, color: T.grey }}>
                          {new Date(r.date).toLocaleDateString(DATE_LOCALE[lang] || "en-GB", { day: "numeric", month: "short", year: "numeric" })}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </Section>
            )}

            <Section>
              <h3 className="font-bold text-lg" style={display}>{t("check_title")}</h3>
              <p className="text-xs mt-1 mb-3" style={{ color: T.grey }}>{t("check_sub")}</p>
              <div className="flex flex-wrap gap-2">
                {INTEREST_TAGS.map((tag) => (
                  <ChipBtn key={tag} active={profile.interests.includes(tag)}
                    onClick={() => setProfile((p) => ({ ...p, interests: p.interests.includes(tag) ? p.interests.filter((x) => x !== tag) : [...p.interests, tag] }))}>
                    {td(tag)}
                  </ChipBtn>
                ))}
              </div>

              <div className="mt-6">
                <div className="text-xs uppercase tracking-widest mb-2" style={{ color: T.grey }}>{t("goal_title")}</div>
                <div className="flex flex-wrap gap-2">
                  {[["work", t("goal_work")], ["salary", t("goal_salary")], ["study", t("goal_study")], ["unsure", t("goal_unsure")]].map(([v, l]) => (
                    <ChipBtn key={v} active={profile.goals.includes(v)} onClick={() => toggleGoal(v)}>{l}</ChipBtn>
                  ))}
                </div>
                <p className="text-xs mt-2" style={{ color: T.grey }}>{t("goal_rules")}</p>
                {profile.goals.includes("unsure") && (
                  <p className="text-xs mt-1.5" style={{ color: T.green }}>{t("goal_unsure_note")}</p>
                )}
              </div>

              <div className="mt-6">
                <div className="text-xs uppercase tracking-widest mb-2" style={{ color: T.grey }}>{t("living_title")}</div>
                <div className="flex gap-2 flex-wrap">
                  <ChipBtn active={!profile.awayFromHome} onClick={() => setProfile((p) => ({ ...p, awayFromHome: false }))}>{t("living_home")}</ChipBtn>
                  <ChipBtn active={profile.awayFromHome} onClick={() => setProfile((p) => ({ ...p, awayFromHome: true }))}>{t("living_away")}</ChipBtn>
                </div>
              </div>

              {!profile.awayFromHome && (
                <div className="mt-4">
                  <div className="text-xs uppercase tracking-widest mb-2" style={{ color: T.grey }}>{t("city_label")}</div>
                  <select value={profile.homeCityId} onChange={(e) => setProfile((p) => ({ ...p, homeCityId: e.target.value }))}
                    className="w-full rounded-xl px-3 py-2.5 text-sm" style={{ border: `1.5px solid ${T.line}`, background: T.card2, color: T.ink }}>
                    <option value="">{t("city_choose")}</option>
                    {CITIES.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              )}

              {profile.awayFromHome && (
                <div className="mt-4">
                  <div className="text-xs uppercase tracking-widest mb-2" style={{ color: T.grey }}>{t("reloc_label")}</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {CITIES.map((c) => {
                      const on = profile.relocationCities.includes(c.id);
                      return (
                        <button key={c.id} onClick={() => setProfile((p) => ({ ...p, relocationCities: on ? p.relocationCities.filter((x) => x !== c.id) : [...p.relocationCities, c.id] }))}
                          className="text-left rounded-xl p-3 transition-all"
                          style={{ background: on ? T.violetSoft : T.card2, border: `1.5px solid ${on ? T.violet : T.line}`, color: T.ink }}>
                          <div className="flex justify-between items-baseline">
                            <span className="font-semibold text-sm">{on ? "✓ " : ""}{c.name}</span>
                            <span className="text-xs" style={{ ...mono, color: T.grey }}>€{c.costRange[0]}–{c.costRange[1]}/mo</span>
                          </div>
                          <div className="text-xs mt-0.5" style={{ color: T.grey }}>{c.vibe}</div>
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-xs mt-2" style={{ color: T.grey }}>{t("reloc_note")}</p>
                </div>
              )}

              <button onClick={() => go("worlds")} className="cc-glow mt-6 px-7 py-3.5 rounded-full font-bold text-white transition-transform hover:scale-105" style={{ background: T.grad, ...display }}>
                {t("cta_worlds")}
              </button>
            </Section>
          </div>
        )}

        {/* ————— Worlds ————— */}
        {stage === "worlds" && (
          <>
            <BackLink />
            <h2 className="font-black text-2xl md:text-4xl cc-fade-up" style={display}>
              {t("worlds_title", { t: identTitle })}
            </h2>
            <p className="text-sm -mt-2 cc-fade-up" style={{ color: T.grey }}>{t("worlds_sub")}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {rankedWorlds.map((w, i) => {
                const hue = WORLD_HUES[WORLDS_DATA.worlds.findIndex((x) => x.id === w.id) % WORLD_HUES.length];
                return (
                  <button key={w.id} onClick={() => { setWorldId(w.id); setCareerId(null); go("career"); }}
                    className="cc-card cc-fade-up relative overflow-hidden text-left rounded-2xl p-5 min-h-[150px]"
                    style={{ background: T.card, border: `1.5px solid ${i < 2 ? hue : T.line}`, animationDelay: `${i * 70}ms` }}>
                    <div className="absolute -top-16 -right-16 w-44 h-44 rounded-full pointer-events-none" style={{ background: `radial-gradient(circle, ${hue}33, transparent 70%)` }} />
                    <div className="flex items-center justify-between relative">
                      <span className="font-extrabold text-lg" style={{ ...display, color: hue }}>{td(w.name)}</span>
                      <span className="text-xs font-bold shrink-0" style={{ ...mono, color: scoreColor(w.fit) }}>{t("fit_you", { n: w.fit })}</span>
                    </div>
                    <div className="text-xs mt-2 relative" style={{ color: T.grey }}>{td(w.tagline)}</div>
                  </button>
                );
              })}
            </div>
          </>
        )}

        {/* ————— Careers in a world ————— */}
        {stage === "career" && world && (
          <>
            <BackLink label={t("career_all")} />
            <h2 className="font-black text-2xl md:text-3xl" style={{ ...display, color: T.accent }}>{td(world.name)}</h2>
            <p className="text-sm -mt-2" style={{ color: T.grey }}>{td(world.tagline)}</p>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {rankedCareers.map((c, i) => (
                <div key={c.id} className="cc-card cc-fade-up rounded-2xl p-5" style={{ background: T.card, border: `1px solid ${T.line}`, animationDelay: `${i * 60}ms` }}>
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div>
                      <div className="font-bold text-lg" style={display}>{c.name}</div>
                      <div className="text-sm mt-1" style={{ color: T.grey }}>{c.day}</div>
                      <div className="text-xs mt-2" style={{ ...mono, color: T.grey }}>
                        {c.netMonthly ? t("career_net", { n: c.netMonthly.toLocaleString() }) : t("career_var")} · {t("career_demand")}: {c.demand} · {t("career_via")} {c.pathTypes.join(" / ")}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span className="text-xs font-bold" style={{ ...mono, color: scoreColor(c.fit) }}>{t("fit_you", { n: c.fit })}</span>
                      <button onClick={() => { setCareerId(c.id); setFinalists([]); go("filter"); }}
                        className="px-4 py-2 rounded-full text-sm font-bold text-white transition-transform hover:scale-105" style={{ background: T.grad }}>
                        {t("career_explore")}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* ————— Institutions / filters ————— */}
        {stage === "filter" && career && (
          <>
            <BackLink label={td(world.name)} />
            <h2 className="font-black text-2xl md:text-3xl" style={display}>{t("paths_to", { c: career.name })}</h2>
            <Section>
              <h3 className="font-bold text-sm mb-3">{t("tune_title")}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                <div>
                  <div className="text-xs uppercase tracking-widest mb-2" style={{ color: T.grey }}>{t("pathtype")}</div>
                  <div className="flex gap-2 flex-wrap">
                    {[["any", t("pt_any")], ["University", t("pt_uni")], ["ITS", t("pt_its")]].map(([v, l]) => (
                      <ChipBtn key={v} active={prefs.pathType === v} onClick={() => setPrefs((p) => ({ ...p, pathType: v }))}>{l}</ChipBtn>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-widest mb-2" style={{ color: T.grey }}>{t("isee_label")}</div>
                  <div className="flex gap-2">
                    {[["low", "< €15k"], ["mid", "€15–35k"], ["high", "> €35k"]].map(([v, l]) => (
                      <ChipBtn key={v} active={profile.isee === v} onClick={() => setProfile((p) => ({ ...p, isee: v }))}>{l}</ChipBtn>
                    ))}
                  </div>
                </div>
                {profile.awayFromHome && (
                  <div>
                    <div className="text-xs uppercase tracking-widest mb-2" style={{ color: T.grey }}>{t("budget_label", { n: prefs.budget.toLocaleString() })}</div>
                    <input type="range" min="400" max="2000" step="50" value={prefs.budget} onChange={(e) => setPrefs((p) => ({ ...p, budget: +e.target.value }))} className="w-full" />
                  </div>
                )}
                {!profile.awayFromHome && homeCity && (
                  <div>
                    <div className="text-xs uppercase tracking-widest mb-2" style={{ color: T.grey }}>{t("dist_label", { city: homeCity.name, n: prefs.maxDistance })}</div>
                    <input type="range" min="10" max="300" step="10" value={prefs.maxDistance} onChange={(e) => setPrefs((p) => ({ ...p, maxDistance: +e.target.value }))} className="w-full" />
                  </div>
                )}
              </div>
              {profile.awayFromHome && profile.relocationCities.length > 0 && (
                <p className="text-xs mt-3" style={{ color: T.grey }}>
                  {t("cities_note", { list: profile.relocationCities.map((id) => CITIES.find((c) => c.id === id)?.name).join(", ") })}
                </p>
              )}
            </Section>

            {institutions.length === 0 && (
              <Section><p className="text-sm" style={{ color: T.grey }}>{t("no_match")}</p></Section>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {institutions.map((c) => (
                <InstitutionCard key={c.id} c={c} showFit chosen={finalists.includes(c.id)} onCardClick={() => toggleFinalist(c.id)}
                  saveCtx={{ careerId: career.id, careerName: career.name, worldName: td(world.name) }} />
              ))}
            </div>

            {finalists.length === 2 && (
              <button onClick={() => go("compare")} className="cc-glow w-full px-6 py-3.5 rounded-full font-bold text-white transition-transform hover:scale-[1.01]" style={{ background: T.grad, ...display }}>
                {t("compare_cta")}
              </button>
            )}
            {institutions.length > 0 && finalists.length < 2 && (
              <p className="text-xs text-center" style={{ color: T.grey }}>{t("pick_hint")}</p>
            )}
          </>
        )}

        {/* ————— Saved (contextual per career path) ————— */}
        {stage === "saved" && (
          <>
            <BackLink />
            <h2 className="font-black text-2xl md:text-3xl" style={display}>{t("saved_title", { n: savedEntries.length })}</h2>
            <p className="text-sm -mt-2" style={{ color: T.grey }}>{t("saved_sub")}</p>
            {savedEntries.length === 0 && <Section><p className="text-sm" style={{ color: T.grey }}>{t("saved_empty")}</p></Section>}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {savedEntries.map((s) => (
                <InstitutionCard key={`${s.courseId}::${s.careerId}`} c={s.course} chosen={finalists.includes(s.courseId)}
                  onCardClick={() => toggleFinalist(s.courseId)}
                  saveCtx={{ careerId: s.careerId, careerName: s.careerName, worldName: s.worldName }}
                  badge={s.careerName ? `${t("saved_from")}: ${s.worldName} → ${s.careerName}` : null} />
              ))}
            </div>
            {finalists.length === 2 && (
              <button onClick={() => go("compare")} className="cc-glow w-full px-6 py-3.5 rounded-full font-bold text-white transition-transform hover:scale-[1.01]" style={{ background: T.grad, ...display }}>
                {t("saved_compare")}
              </button>
            )}
          </>
        )}

        {/* ————— Compare ————— */}
        {stage === "compare" && pair.length === 2 && (
          <>
            <BackLink />
            <Section>
              <h2 className="font-black text-2xl mb-1" style={display}>{t("cmp_title")}</h2>
              <p className="text-xs mb-5" style={{ color: T.grey }}>{t("cmp_sub")}</p>

              <div className="grid grid-cols-2 gap-3 md:gap-4">
                {pair.map((c) => (
                  <div key={c.id} className="rounded-xl p-3 md:p-4" style={{ background: T.card2 }}>
                    <div className="flex items-baseline justify-between gap-2 flex-wrap">
                      <div className="font-extrabold text-sm md:text-base" style={{ ...display, color: T.accent }}>{c.name}</div>
                      <GoogleLink c={c} />
                    </div>
                    <div className="text-xs" style={{ color: T.grey }}>{c.inst} · {c.city}</div>
                    <OfficialLink c={c} />
                  </div>
                ))}
              </div>

              <div className="mt-5">
                <div className="text-xs uppercase tracking-widest mb-2" style={{ color: T.grey }}>{t("cmp_study")}</div>
                <div className="grid grid-cols-2 gap-3 md:gap-4">
                  {pair.map((c) => (
                    <div key={c.id} className="rounded-xl p-3 text-xs" style={{ border: `1px solid ${T.line}` }}>
                      <div className="mb-2 px-2 py-1 rounded-lg inline-block font-semibold" style={{ background: natureStyle(c.nature).bg, color: natureStyle(c.nature).fg }}>
                        {t(NATURE_KEY[c.nature])}
                      </div>
                      {c.curriculum.map((s, i) => (
                        <div key={i} style={{ fontWeight: /matemat|analisi/i.test(s) ? 700 : 400 }}>· {s}</div>
                      ))}
                    </div>
                  ))}
                </div>
                <p className="text-xs mt-2" style={{ color: T.grey }}>{t("cmp_study_note")}</p>
              </div>

              {compareDims.map((row) => (
                <div key={row.key} className="mt-5">
                  <div className="text-xs uppercase tracking-widest mb-2" style={{ color: T.grey }}>{row.label}</div>
                  <div className="grid grid-cols-2 gap-3 md:gap-4">
                    {row.data.map((d, i) => (
                      <div key={i} className="rounded-xl p-3" style={{ background: scoreSoft(d.score) }}>
                        <div className="text-sm font-bold mb-1" style={{ ...mono, color: scoreColor(d.score) }}>{d.score}/100</div>
                        <Bar score={d.score} />
                        <div className="mt-1.5 text-xs">{d.note}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              <div className="mt-5">
                <div className="text-xs uppercase tracking-widest mb-2" style={{ color: T.grey }}>{t("cmp_reality")}</div>
                <div className="grid grid-cols-2 gap-3 md:gap-4">
                  {pair.map((c) => (
                    <div key={c.id} className="rounded-xl p-3 text-xs space-y-1" style={{ border: `1px solid ${T.line}` }}>
                      <div><b>{c.env.wouldChooseAgain}%</b> {t("cmp_again")}</div>
                      <div><b>{c.env.teachSat}%</b> {t("cmp_teach")}</div>
                      <div><b>{c.env.dropout}%</b> {t("cmp_drop")}</div>
                      <div style={{ color: T.grey }}>{c.env.cityVibe}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-5">
                <div className="text-xs uppercase tracking-widest mb-2" style={{ color: T.grey }}>{t("cmp_money")}</div>
                <div className="grid grid-cols-2 gap-3 md:gap-4">
                  {pair.map((c) => (
                    <div key={c.id} className="rounded-xl p-3 text-xs space-y-1" style={{ border: `1px solid ${T.line}`, ...mono }}>
                      <div>{t("cmp_fees", { n: c.costByIsee[profile.isee].toLocaleString() })}</div>
                      {profile.awayFromHome && <div>{t("cmp_living", { city: c.city, r: cityCostBadge(c.city) || `~€${c.cityRent}/mo` })}</div>}
                      {!profile.awayFromHome && homeCity && <div>{t("cmp_km", { n: haversineKm(homeCity.lat, homeCity.lon, c.lat, c.lon), city: homeCity.name })}</div>}
                      <div>{t("cmp_after", { n: c.netMonthly.toLocaleString() })}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-5">
                <div className="text-xs uppercase tracking-widest mb-2" style={{ color: T.grey }}>{t("cmp_prep")}</div>
                <div className="grid grid-cols-2 gap-3 md:gap-4">
                  {pair.map((c) => (
                    <div key={c.id} className="rounded-xl p-3 text-xs space-y-1" style={{ background: T.amberSoft }}>
                      {prepList(c, profile).map((item, i) => <div key={i}>→ {item}</div>)}
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-6">
                <button onClick={() => setNarrative(generateNarrative(pair, compareDims, profile))}
                  className="px-5 py-2.5 rounded-full font-semibold text-sm text-white transition-transform hover:scale-105" style={{ background: T.grad }}>
                  {t("cmp_explain")}
                </button>
                {narrative && (
                  <div className="cc-fade-up mt-3 rounded-xl p-4 text-sm whitespace-pre-wrap leading-relaxed" style={{ background: T.card2, border: `1.5px dashed ${T.violet}` }}>
                    {narrative}
                  </div>
                )}
              </div>
            </Section>
          </>
        )}
      </main>

      {/* ————— Profile manager ————— */}
      {showProfiles && (
        <div className="cc-fade-in fixed inset-0 z-50 flex items-start md:items-center justify-center p-4 overflow-y-auto"
          style={{ background: "rgba(0,0,0,0.72)", backdropFilter: "blur(6px)" }}
          onClick={() => setShowProfiles(false)}>
          <div className="cc-fade-up w-full max-w-lg rounded-2xl p-6 my-8" style={{ background: T.card, border: `1px solid ${T.lineStrong}` }}
            onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-black text-xl" style={display}>{t("pf_title")}</h3>
              <button onClick={() => setShowProfiles(false)} className="w-8 h-8 rounded-full hover:opacity-70 transition-opacity" aria-label="Close">✕</button>
            </div>
            <p className="text-xs mt-1.5" style={{ color: T.grey }}>{t("pf_note")}</p>

            <div className="mt-4 flex gap-2">
              <input value={newName} onChange={(e) => setNewName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && createProfile()}
                placeholder={t("pf_new_ph")}
                className="flex-1 rounded-xl px-3 py-2.5 text-sm outline-none"
                style={{ background: T.card2, border: `1.5px solid ${T.line}`, color: T.ink }} />
              <button onClick={createProfile} className="px-4 py-2 rounded-xl text-sm font-bold text-white transition-transform hover:scale-105" style={{ background: T.grad }}>
                {t("pf_add")}
              </button>
            </div>

            {store.profiles.length === 0 && <p className="text-xs mt-4" style={{ color: T.grey }}>{t("pf_none_active")}</p>}

            <div className="mt-4 space-y-2">
              {store.profiles.map((p) => (
                <div key={p.id} className="rounded-xl p-3" style={{ background: T.card2, border: `1.5px solid ${p.id === store.activeId ? T.violet : T.line}` }}>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm shrink-0" style={{ background: p.color, color: "#07070E" }}>
                      {p.name[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-sm truncate">{p.name}</div>
                      {p.id === store.activeId && <div className="text-xs" style={{ color: T.accent }}>{t("pf_active")}</div>}
                    </div>
                    {p.id !== store.activeId && (
                      <button onClick={() => switchProfile(p.id)} className="px-3 py-1 rounded-full text-xs font-bold" style={{ border: `1.5px solid ${T.violet}`, color: T.accent }}>
                        {t("pf_use")}
                      </button>
                    )}
                    <button onClick={() => deleteProfile(p.id)} className="px-3 py-1 rounded-full text-xs font-bold" style={{ border: `1.5px solid ${T.line}`, color: T.grey }}>
                      {t("pf_del")}
                    </button>
                  </div>

                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
    </AppCtx.Provider>
  );
}
