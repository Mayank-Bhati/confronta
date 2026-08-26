"use client";

import React, { useState, useMemo, useEffect } from "react";
import POOLS from "../data/questions-v2.json";
import WORLDS_DATA from "../data/worlds.json";
import COURSES from "../data/courses-v2.json";
import CITIES from "../data/cities-v2.json";
import HOME_CITIES from "../data/home-cities.json";
import { emptyVector, applyAnswer, applyLikert, applyMulti, buildSurvey, pickLikert, normalize, identity, topDimensions, DIMS } from "../lib/scoreEngine";
import { rankWorlds, rankCareers, SCORE_VERSION } from "../lib/matchEngine";
import { fitInterests, fitOutcome, fitEnvironment, estimateMonthlyCost, passesHardFilters, prepList, generateNarrative, haversineKm } from "../lib/fitEngine-v2";
import { LANGS, makeT, makeTD } from "../lib/i18n";
import { loadStore, saveStore, newProfile, uid } from "../lib/storage";
import { getSupabase } from "../lib/supabaseClient";
import { SIGN_IN_ENABLED } from "../lib/flags";
import { track } from "../lib/track";

import { AppCtx } from "./compass/context";
import { PALETTES, WORLD_HUES, INTEREST_TAGS, DIM_TO_TAGS, NATURE_KEY, mono, display, DATE_LOCALE, natureStyleFor } from "./compass/constants";
import { PeopleIcon, Logo, Bar, ChipBtn, Section, NatureBadge, GoogleLink, OfficialLink, InstitutionCard, BackLink, ScrollTop, scrollToTop } from "./compass/ui";
import Header from "./compass/Header";
import AuthModal from "./compass/AuthModal";
import ProfileModal from "./compass/ProfileModal";
import FeedbackButton from "./compass/FeedbackButton";
import Welcome from "./compass/stages/Welcome";
import Survey from "./compass/stages/Survey";
import Reveal from "./compass/stages/Reveal";
import Worlds from "./compass/stages/Worlds";
import Careers from "./compass/stages/Careers";
import Paths from "./compass/stages/Paths";
import SavedPage from "./compass/stages/SavedPage";
import Compare from "./compass/stages/Compare";

export default function CareerCompass() {
  // ————— Language + theme + profiles (device-local) —————
  const [store, setStore] = useState({ profiles: [], activeId: null, lang: "it", theme: "light", saved: [] });
  const [storeLoaded, setStoreLoaded] = useState(false);
  useEffect(() => { setStore((s) => ({ ...s, ...loadStore() })); setStoreLoaded(true); track("landed", null, { once: true }); }, []);
  useEffect(() => { if (storeLoaded) saveStore(store); }, [store, storeLoaded]);
  function updateStore(fn) { setStore(fn); }

  const lang = store.lang || "it";
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
  const [profile, setProfile] = useState({ interests: [], goals: ["work"], isee: "mid", locationMode: "anywhere", homeCityId: "", relocationCities: [], mathStrength: 3 });
  const [worldId, setWorldId] = useState(null);
  const [careerId, setCareerId] = useState(null);
  // 0 = no limit. Nothing is filtered or flagged until the student asks for it:
  // a pre-set distance and budget silently hid options and marked courses "over
  // budget" before they had said anything.
  const [prefs, setPrefs] = useState({ pathType: "any", ownership: "any", maxDistance: 0, cityRadius: 0, budget: 0, place: "", sortBy: "fit" });
  const saved = store.saved; // [{ courseId, careerId, careerName, worldName, resultId }] — persisted, contextual per path
  const [savedFilter, setSavedFilter] = useState("all");
  const [savedProfileFilter, setSavedProfileFilter] = useState("all");
  const [finalists, setFinalists] = useState([]);
  const [tourQueue, setTourQueue] = useState(null); // null = not in tournament
  const [roundChoice, setRoundChoice] = useState(null);
  const [narrative, setNarrative] = useState("");
  const [showProfiles, setShowProfiles] = useState(false);
  const [newName, setNewName] = useState("");
  const [savedToName, setSavedToName] = useState("");
  const [lastResult, setLastResult] = useState(null);

  const totalQ = 10 + 5 + 5;
  const answered = phase === "binary" ? qIndex : phase === "multi" ? 10 + qIndex : 15 + qIndex;
  const homeCity = HOME_CITIES.find((c) => c.id === profile.homeCityId) || CITIES.find((c) => c.id === profile.homeCityId) || null;
  const awayFromHome = profile.locationMode !== "home"; // cost model: anywhere/cities = living away
  const hasResult = lastResult !== null || DIMS.some((d) => vector[d] > 0);
  // A profile shows ITS OWN results, even when it has none. The old fallback
  // to guestHistory made a freshly created (or newly switched-to) profile
  // display someone else's guest results as if they belonged to it.
  const historyList = activeProfile ? (activeProfile.history || []) : (store.guestHistory || []);

  // ————— Derived rankings —————
  const norm = useMemo(() => normalize(vector), [vector]);
  const ident = useMemo(() => identity(vector), [vector]);
  const identTitle = t(`pair_${ident.letters}`) === `pair_${ident.letters}` ? t("pair_XX") : t(`pair_${ident.letters}`);
  // Every career on the site, tagged with its world — powers the search box
  // for students who already know the job they want.
  const allCareers = useMemo(() => {
    const out = [];
    for (const w of WORLDS_DATA.worlds) {
      for (const c of w.careers) out.push({ ...c, worldId: w.id, worldName: w.name });
    }
    return out;
  }, []);

  const rankedWorlds = useMemo(() => rankWorlds(vector, WORLDS_DATA.worlds, profile.interests), [vector, profile.interests]);
  const world = rankedWorlds.find((w) => w.id === worldId);
  const rankedCareers = useMemo(() => (world ? rankCareers(vector, world, profile.interests) : []), [vector, world, profile.interests]);
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
    // one row per stage per session: the funnel, not a click stream
    track(`stage_${next}`, null, { once: true });
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
    track("survey_started");
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
    if (hasResult) { go("reveal"); return; }
    // No result in this session — but past results live in the profile or guest history.
    if (historyList.length) { openResult(historyList[0]); return; }
    startSurvey();
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
    const result = { id: uid(), date: Date.now(), letters: identity(v).letters, vector: v, interests: [...tags], goals: profile.goals, scoreVersion: SCORE_VERSION };
    setLastResult(result);
    if (activeProfile) {
      updateStore((s) => ({
        ...s,
        profiles: s.profiles.map((p) => (p.id === s.activeId && !p.history.some((h) => h.id === result.id) ? { ...p, history: [result, ...p.history] } : p)),
      }));
      setSavedToName(activeProfile.name);
    } else {
      // No profile: keep the result anyway — a completed test must never be lost.
      updateStore((s) => ({ ...s, guestHistory: [result, ...(s.guestHistory || [])].slice(0, 10) }));
      setSavedToName("");
    }
    track("survey_completed", identity(v).letters);
    cloudUpsertResults([result]);
    if (SIGN_IN_ENABLED && !session && !store.authPromptSeen) {
      setShowAuth(true);
      updateStore((st) => ({ ...st, authPromptSeen: true }));
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
        // "work soon" and "a master's" pull in opposite directions
        if (g === "work") goals.delete("study");
        if (g === "study") goals.delete("work");
      }
      goals.delete("salary");   // retired goal — ignore anything stored earlier
      if (!goals.size) goals.add("unsure");
      return { ...p, goals: [...goals] };
    });
  }

  // Slider at max (500) means "all of Italy": no distance cap at all.
  const envPrefs = { ...prefs, isee: profile.isee, awayFromHome, monthlyBudget: prefs.budget, maxDistance: profile.locationMode === "home" && homeCity && prefs.maxDistance > 0 && prefs.maxDistance < 500 ? prefs.maxDistance : null };

  const institutions = useMemo(() => {
    if (!career) return [];
    let list = career.courses.map((id) => COURSES.find((c) => c.id === id)).filter(Boolean);
    list = list.filter((c) => passesHardFilters(c, { ...prefs, goals: profile.goals }));
    // Location is a soft filter made visible: courses beyond the chosen range
    // stay listed (collapsed) up to 2× the slider, then disappear entirely —
    // a hidden best answer is the failure mode we exist to prevent.
    // A slider at max (500) means "all of Italy": distances still shown, no cap.
    let rangeLimit = null;
    let distOf = null;
    if (profile.locationMode === "home" && homeCity) {
      if (prefs.maxDistance > 0 && prefs.maxDistance < 500) rangeLimit = prefs.maxDistance;
      distOf = (course) => haversineKm(homeCity.lat, homeCity.lon, course.lat, course.lon);
    } else if (profile.locationMode === "cities" && profile.relocationCities.length) {
      const chosen = CITIES.filter((c) => profile.relocationCities.includes(c.id));
      if (prefs.cityRadius > 0 && prefs.cityRadius < 500) rangeLimit = prefs.cityRadius;
      distOf = (course) => Math.min(...chosen.map((city) => haversineKm(city.lat, city.lon, course.lat, course.lon)));
    }
    // Free-text place, typed on the profession page. It does two jobs: it
    // marks which courses are "in" that city/region, and — when the text names
    // a city we know — it becomes the origin for "nearest first", so the
    // student sees that city's universities and then the ones closest to it.
    const place = (prefs.place || "").trim().toLowerCase();
    let placeOrigin = null;
    if (place) {
      const fold = (x) => (x || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const hit = HOME_CITIES.find((c) => fold(c.name) === fold(place))
        || HOME_CITIES.find((c) => fold(c.name).startsWith(fold(place)))
        || CITIES.find((c) => fold(c.name).startsWith(fold(place)));
      if (hit) placeOrigin = hit;
      const matches = (c) => (c.city || "").toLowerCase().includes(place) ||
                             (c.region || "").toLowerCase().includes(place) ||
                             (c.inst || "").toLowerCase().includes(place);
      // Anything outside the place stays reachable under "beyond", ordered by
      // how far it is — hiding a good option a train ride away is the failure
      // mode this product exists to prevent.
      if (!placeOrigin) list = list.filter(matches);
      else {
        distOf = (course) => haversineKm(placeOrigin.lat, placeOrigin.lon, course.lat, course.lon);
        rangeLimit = 0;   // "in this place" vs "further away", by name not km
        list = list.map((c) => ({ ...c, _inPlace: matches(c) }));
      }
    }
    return list
      .map((c) => ({ ...c, distKm: distOf ? Math.round(distOf(c)) : null }))
      .filter((c) => placeOrigin != null || rangeLimit == null || c.distKm <= rangeLimit * 2)
      .map((c) => ({
        ...c,
        beyondRange: placeOrigin != null
          ? !c._inPlace
          : (rangeLimit != null && c.distKm > rangeLimit),
        envFit: fitEnvironment(c, envPrefs, profile.locationMode === "home" ? homeCity : null, t),
      }))
      .sort((a, b) => (prefs.sortBy === "distance" && a.distKm != null && b.distKm != null)
        ? a.distKm - b.distKm
        : b.envFit.score - a.envFit.score);
  }, [career, prefs, profile, homeCity, t]);

  const savedEntries = saved
    .map((s) => ({ ...s, course: COURSES.find((c) => c.id === s.courseId) }))
    .filter((s) => s.course);
  const savedResultIds = [...new Set(savedEntries.map((s) => s.resultId || "none"))];
  const savedProfileIds = [...new Set(savedEntries.map((s) => s.profileId || "none"))];
  const profileLabel = (pid) => {
    if (pid === "none") return t("saved_guest");
    return store.profiles.find((p) => p.id === pid)?.name || "—";
  };
  const filteredSavedEntries = savedEntries
    .filter((s) => savedProfileFilter === "all" || (s.profileId || "none") === savedProfileFilter)
    .filter((s) => savedFilter === "all" || (s.resultId || "none") === savedFilter);
  // A result may live under any profile or in the unassigned pile — looking
  // only in the active profile made every other one render as a bare "—",
  // which told the student nothing about what they were filtering by.
  const findResult = (rid) => {
    if (!rid) return null;
    for (const p of store.profiles) {
      const hit = (p.history || []).find((h) => h.id === rid);
      if (hit) return hit;
    }
    return (store.guestHistory || []).find((h) => h.id === rid) || null;
  };
  const resultLabel = (rid) => {
    if (!rid) return t("saved_filter_notest");
    const r = findResult(rid);
    if (!r) return t("saved_filter_gone");
    const title = t(`pair_${r.letters}`) === `pair_${r.letters}` ? t("pair_XX") : t(`pair_${r.letters}`);
    const owner = store.profiles.find((p) => (p.history || []).some((h) => h.id === rid));
    const date = new Date(r.date).toLocaleDateString(DATE_LOCALE[lang] || "en-GB", { day: "numeric", month: "short" });
    return owner ? `${title} · ${owner.name} · ${date}` : `${title} · ${date}`;
  };

  const compareDims = useMemo(() => {
    if (pair.length < 2) return [];
    return [
      { key: "interest", label: t("cmp_interest"), data: pair.map((c) => fitInterests(c, profile.interests, t)) },
      { key: "outcome", label: t("cmp_outcome"), data: pair.map((c) => fitOutcome(c, profile.goals, t)) },
      { key: "env", label: t("cmp_env"), data: pair.map((c) => { const f = fitEnvironment(c, envPrefs, profile.locationMode === "home" ? homeCity : null, t); return { score: f.score, note: f.reasons[0] || "" }; }) },
    ].map((r) => ({ ...r, scores: r.data.map((d) => d.score) }));
  }, [pair, profile, prefs, homeCity, t]);

  // ————— Contextual saves: a course is saved on a specific career path.
  // The star is per (course, career) — the same everywhere, whatever result
  // is open, so a refresh or an old result never shows a saved course as
  // unsaved (that caused doubles). resultId stays as a tag for filtering.
  const currentResultId = () => lastResult?.id || null;
  function isSavedOn(courseId, cId) {
    return saved.some((s) => s.courseId === courseId && s.careerId === cId);
  }
  function toggleSave(course, ctx) {
    const cId = ctx?.careerId ?? null;
    const rid = currentResultId();
    const existing = saved.filter((s) => s.courseId === course.id && s.careerId === cId);
    if (existing.length) {
      updateStore((s) => ({ ...s, saved: s.saved.filter((x) => !(x.courseId === course.id && x.careerId === cId)) }));
      existing.forEach(cloudDeleteSave);
    } else {
      track("course_saved", course.id);
      const entry = {
        courseId: course.id, careerId: cId, careerName: ctx?.careerName || "", worldName: ctx?.worldName || "",
        resultId: rid, profileId: activeProfile?.id || null,
      };
      updateStore((s) => ({ ...s, saved: [...s.saved, entry] }));
      cloudUpsertSaves([entry]);
      if (SIGN_IN_ENABLED && !session && !saveNudged) { setShowAuth(true); setSaveNudged(true); }
    }
  }

  // One intent, one action. The course list had two ways to say "this one
  // interests me": tapping the card marked it a comparison finalist, and a
  // small star saved it. Students found the card — five sessions compared
  // while three saved — and finalists live in React state, so anyone who
  // picked two, compared them and closed the tab kept nothing at all.
  //
  // Picking a card now also saves it. Picking again only clears the finalist
  // mark and leaves the save in place: removing a save is deliberate, through
  // the star or the cross on the saved page, so a stray tap never destroys
  // something the student meant to keep.
  function pickCourse(course, ctx) {
    if (!isSavedOn(course.id, ctx?.careerId ?? null)) toggleSave(course, ctx);
    toggleFinalist(course.id);
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

  // ————— Account (Supabase email-code auth + cloud sync) —————
  const [session, setSession] = useState(null);
  const [authEmail, setAuthEmail] = useState("");
  const [authCode, setAuthCode] = useState("");
  const [authStage, setAuthStage] = useState("idle"); // idle | sent
  const [authMsg, setAuthMsg] = useState("");
  const [showAuth, setShowAuth] = useState(false);
  const [authBusy, setAuthBusy] = useState(false);
  const [saveNudged, setSaveNudged] = useState(false);

  useEffect(() => {
    const sb = getSupabase();
    if (!sb) return;
    // magic-link failures come back as #error_description=... on the redirect
    const hash = new URLSearchParams(window.location.hash.slice(1));
    const errDesc = hash.get("error_description");
    if (errDesc) {
      setShowAuth(true);
      setAuthMsg(t("acct_err", { e: errDesc.replace(/\+/g, " ") }));
      window.history.replaceState({}, "", window.location.pathname);
    }
    sb.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = sb.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      if (s) {
        setShowAuth(false);
        if (window.location.search.includes("code=")) {
          window.history.replaceState({}, "", window.location.pathname);
        }
      }
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const syncedUser = React.useRef(null);
  useEffect(() => {
    if (session?.user?.id && storeLoaded && syncedUser.current !== session.user.id) {
      syncedUser.current = session.user.id;
      syncWithCloud(session);
    }
  }, [session, storeLoaded]);

  async function sendCode() {
    const sb = getSupabase();
    if (!sb || !authEmail.includes("@") || authBusy) return;
    setAuthBusy(true);
    setAuthMsg("");
    const { error } = await sb.auth.signInWithOtp({
      email: authEmail.trim(),
      options: { shouldCreateUser: true, emailRedirectTo: window.location.origin + window.location.pathname },
    });
    setAuthBusy(false);
    if (error) setAuthMsg(t("acct_err", { e: error.message }));
    else { setAuthStage("sent"); setAuthMsg(t("acct_sent")); }
  }

  async function verifyCode() {
    const sb = getSupabase();
    if (!sb || !authCode.trim() || authBusy) return;
    setAuthBusy(true);
    const { error } = await sb.auth.verifyOtp({ email: authEmail.trim(), token: authCode.trim(), type: "email" });
    setAuthBusy(false);
    if (error) setAuthMsg(t("acct_err", { e: error.message }));
    else { setAuthStage("idle"); setAuthCode(""); setAuthMsg(""); }
  }

  async function signOut() {
    const sb = getSupabase();
    if (sb) await sb.auth.signOut();
    setSession(null);
    syncedUser.current = null;
  }

  function cloudUpsertResults(results) {
    const sb = getSupabase();
    if (!sb || !session?.user?.id) return;
    sb.from("survey_results").upsert(results.map((r) => ({
      user_id: session.user.id, local_id: r.id, letters: r.letters,
      vector: r.vector, interests: r.interests, goals: r.goals,
      taken_at: new Date(r.date).toISOString(),
    })), { onConflict: "user_id,local_id" }).then(({ error }) => error && console.warn("sync result:", error.message));
  }

  function cloudDeleteResult(rid) {
    const sb = getSupabase();
    if (!sb || !session?.user?.id) return;
    sb.from("survey_results").delete().eq("user_id", session.user.id).eq("local_id", rid)
      .then(({ error }) => error && console.warn("delete result:", error.message));
  }

  function cloudUpsertSaves(entries) {
    const sb = getSupabase();
    if (!sb || !session?.user?.id) return;
    sb.from("saved_courses").upsert(entries.map((e) => ({
      user_id: session.user.id, result_local_id: e.resultId || "", course_id: e.courseId,
      career_id: e.careerId || "", career_name: e.careerName, world_name: e.worldName,
    })), { onConflict: "user_id,result_local_id,course_id,career_id" }).then(({ error }) => error && console.warn("sync save:", error.message));
  }

  function cloudDeleteSave(e) {
    const sb = getSupabase();
    if (!sb || !session?.user?.id) return;
    sb.from("saved_courses").delete()
      .eq("user_id", session.user.id).eq("course_id", e.courseId)
      .eq("career_id", e.careerId || "").eq("result_local_id", e.resultId || "")
      .then(({ error }) => error && console.warn("delete save:", error.message));
  }

  async function syncWithCloud(sess) {
    const sb = getSupabase();
    if (!sb || !sess?.user?.id) return;
    setAuthMsg(t("acct_syncing"));
    try {
      const localHist = (store.profiles.find((p) => p.id === store.activeId)?.history) || [];
      if (localHist.length) cloudUpsertResults(localHist);
      if (store.saved.length) cloudUpsertSaves(store.saved);
      const { data: rows } = await sb.from("survey_results").select("*");
      const { data: saves } = await sb.from("saved_courses").select("*");
      updateStore((s) => {
        let profiles = s.profiles;
        let activeId = s.activeId;
        if (!profiles.find((p) => p.id === activeId)) {
          const p = newProfile(sess.user.email?.split("@")[0] || "Me");
          profiles = [...profiles, p];
          activeId = p.id;
        }
        profiles = profiles.map((p) => {
          if (p.id !== activeId) return p;
          const have = new Set(p.history.map((h) => h.id));
          const merged = [...p.history];
          for (const r of rows || []) {
            if (!have.has(r.local_id)) merged.push({
              id: r.local_id, date: new Date(r.taken_at || r.created_at).getTime(),
              letters: r.letters, vector: r.vector, interests: r.interests, goals: r.goals,
            });
          }
          merged.sort((a, b) => b.date - a.date);
          return { ...p, history: merged };
        });
        // dedupe by (course, career) — the star identity; resultId is only a tag
        const haveS = new Set(s.saved.map((x) => `${x.courseId}|${x.careerId || ""}`));
        const mergedSaved = [...s.saved];
        for (const r of saves || []) {
          const k = `${r.course_id}|${r.career_id || ""}`;
          if (!haveS.has(k)) {
            haveS.add(k);
            mergedSaved.push({
              courseId: r.course_id, careerId: r.career_id || null,
              careerName: r.career_name, worldName: r.world_name, resultId: r.result_local_id || null,
            });
          }
        }
        return { ...s, profiles, activeId, saved: mergedSaved };
      });
      setAuthMsg(t("acct_synced"));
    } catch (e) {
      setAuthMsg(t("acct_err", { e: String(e).slice(0, 80) }));
    }
  }

  // ————— Profile actions —————
  function createProfile() {
    track("profile_created");
    const name = newName.trim();
    if (!name) return;
    const p = newProfile(name);
    const adopted = [...(store.guestHistory || [])];
    if (lastResult && !savedToName && !adopted.some((h) => h.id === lastResult.id)) adopted.unshift(lastResult);
    if (adopted.length) {
      p.history = adopted;
      setSavedToName(name);
    }
    updateStore((s) => (s.profiles.some((x) => x.id === p.id) ? s : { ...s, profiles: [...s.profiles, p], activeId: p.id, guestHistory: [] }));
    setNewName("");
  }
  function switchProfile(id) { updateStore((s) => ({ ...s, activeId: id })); }

  // "Take me to the course": from a saved winner or a past choice, land on the
  // page where that course actually lives instead of just reading its name.
  function goToCourse(courseId) {
    track("course_reopened", courseId);
    for (const w of WORLDS_DATA.worlds) {
      for (const c of w.careers) {
        if ((c.courses || []).includes(courseId)) {
          setWorldId(w.id);
          setCareerId(c.id);
          setPrefs((p) => ({ ...p, place: "", pathType: "any", ownership: "any" }));
          go("filter");
          setTimeout(scrollToTop, 60);
          return true;
        }
      }
    }
    return false;
  }

  // Put a particular result under a particular profile. Two people sharing one
  // browser (a parent and their child is the common case) need this: whoever
  // takes a test first has their results adopted by the first profile created.
  // targetId === null moves it back out to the unassigned pile.
  function moveResult(rid, targetId) {
    updateStore((s) => {
      let found = (s.guestHistory || []).find((h) => h.id === rid);
      for (const p of s.profiles) {
        const hit = (p.history || []).find((h) => h.id === rid);
        if (hit) found = hit;
      }
      if (!found) return s;
      const strippedProfiles = s.profiles.map((p) => ({ ...p, history: (p.history || []).filter((h) => h.id !== rid) }));
      const strippedGuest = (s.guestHistory || []).filter((h) => h.id !== rid);
      return {
        ...s,
        profiles: targetId
          ? strippedProfiles.map((p) => (p.id === targetId ? { ...p, history: [found, ...p.history] } : p))
          : strippedProfiles,
        guestHistory: targetId ? strippedGuest : [found, ...strippedGuest],
      };
    });
  }
  // Deleting a result deletes what was saved under it. Leaving the saves
  // behind stranded them: they showed up on the Saved page tagged to a test
  // that no longer exists, and nothing on screen could explain where they
  // came from.
  function deleteResult(rid) {
    const orphans = store.saved.filter((e) => e.resultId === rid);
    updateStore((s) => ({
      ...s,
      // a result id belongs to exactly one profile, so sweeping all of them
      // keeps the result and its saves from ever going out of sync
      profiles: s.profiles.map((p) => ({ ...p, history: (p.history || []).filter((h) => h.id !== rid) })),
      guestHistory: (s.guestHistory || []).filter((h) => h.id !== rid),
      saved: s.saved.filter((e) => e.resultId !== rid),
      // the champion is only meaningful while the path it won is still saved
      champion: orphans.some((e) => e.courseId === s.champion?.courseId) ? null : s.champion,
    }));
    if (orphans.length) {
      setFinalists((f) => f.filter((id) => !orphans.some((e) => e.courseId === id)));
      orphans.forEach(cloudDeleteSave);
    }
    cloudDeleteResult(rid);
  }
  function deleteProfile(id) {
    updateStore((s) => ({ ...s, profiles: s.profiles.filter((p) => p.id !== id), activeId: s.activeId === id ? null : s.activeId }));
  }
  // The final question: record the chosen course on the current result,
  // persisted with the result (profile history or guest history).
  function chooseFinal(courseId) {
    track("final_choice", courseId);
    setRoundChoice(courseId);
    setLastResult((r) => (r ? { ...r, finalChoice: courseId } : r));
    const rid = lastResult?.id;
    if (!rid) return;
    updateStore((s) => ({
      ...s,
      profiles: s.profiles.map((p) => ({ ...p, history: p.history.map((h) => (h.id === rid ? { ...h, finalChoice: courseId } : h)) })),
      guestHistory: (s.guestHistory || []).map((h) => (h.id === rid ? { ...h, finalChoice: courseId } : h)),
    }));
  }

  // ————— Tournament: with 3+ saved paths, the chosen course faces the next
  // saved course, round after round, until one champion remains (pinned on
  // the Saved page). Requested by testers: "winner out of all".
  function startTournament() {
    track("tournament_started");
    const ids = [...new Set(savedEntries.map((e) => e.course.id))];
    if (ids.length < 2) return;
    setFinalists([ids[0], ids[1]]);
    setTourQueue(ids.slice(2));
    setRoundChoice(null);
    go("compare");
  }
  function nextRound(winnerId) {
    setTourQueue((q) => {
      const [next, ...rest] = q;
      setFinalists([winnerId, next]);
      return rest;
    });
    setRoundChoice(null);
  }
  // Crowning ends the tournament: drop the finalists so the "compare these
  // two" bar stops following the student around after they already decided,
  // and land them on Saved, where the winner is pinned at the top.
  function crownChampion(courseId) {
    track("champion_crowned", courseId);
    updateStore((s) => ({ ...s, champion: { courseId, date: Date.now() } }));
    setTourQueue(null);
    setRoundChoice(null);
    setFinalists([]);
    go("saved");
  }
  function clearChampion() {
    updateStore((s) => ({ ...s, champion: null }));
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


  // Shared account panel — rendered inside the profile modal AND the sign-in pop-up
  const accountPanel = (
    <div className="mt-4 rounded-xl p-3.5" style={{ background: T.card2, border: `1.5px solid ${T.line}` }}>
      <div className="text-xs uppercase tracking-widest mb-2" style={{ color: T.grey }}>{t("acct_title")}</div>
      {session ? (
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <span className="text-sm font-semibold">{t("acct_signed", { email: session.user.email })}</span>
          <button onClick={signOut} className="px-3 py-1 rounded-full text-xs font-bold" style={{ border: `1.5px solid ${T.line}`, color: T.grey }}>
            {t("acct_out")}
          </button>
        </div>
      ) : (
        <>
          <p className="text-xs mb-2" style={{ color: T.grey }}>{t("acct_note")}</p>
          {authStage === "idle" ? (
            <div className="flex gap-2">
              <input value={authEmail} onChange={(e) => setAuthEmail(e.target.value)} onKeyDown={(e) => e.key === "Enter" && sendCode()}
                type="email" placeholder={t("acct_email_ph")}
                className="flex-1 rounded-xl px-3 py-2 text-sm outline-none"
                style={{ background: T.card, border: `1.5px solid ${T.line}`, color: T.ink }} />
              <button onClick={sendCode} disabled={authBusy}
                className="px-3.5 py-2 rounded-xl text-xs font-bold text-white transition-transform hover:scale-105 active:scale-95 disabled:opacity-60 disabled:scale-100"
                style={{ background: T.grad }}>
                {authBusy ? "…" : t("acct_send")}
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <input value={authCode} onChange={(e) => setAuthCode(e.target.value)} onKeyDown={(e) => e.key === "Enter" && verifyCode()}
                inputMode="numeric" placeholder={t("acct_code_ph")}
                className="flex-1 rounded-xl px-3 py-2 text-sm outline-none"
                style={{ background: T.card, border: `1.5px solid ${T.line}`, color: T.ink, ...mono }} />
              <button onClick={verifyCode} disabled={authBusy}
                className="px-3.5 py-2 rounded-xl text-xs font-bold text-white transition-transform hover:scale-105 active:scale-95 disabled:opacity-60 disabled:scale-100"
                style={{ background: T.grad }}>
                {authBusy ? "…" : t("acct_verify")}
              </button>
            </div>
          )}
        </>
      )}
      {authMsg && <p className="text-xs mt-2" style={{ color: T.accent }}>{authMsg}</p>}
    </div>
  );

  const ctx = {
    T, t, td, lang, theme, store, updateStore,
    scoreColor, scoreSoft, natureStyle, isSavedOn, toggleSave,
    stage, go, goBack, goHome, goInsights, startSurvey,
    survey, phase, qIndex, multiSel, setMultiSel, likertQs, answered, totalQ,
    answerBinary, submitMulti, answerLikert, goBackQuestion,
    norm, ident, identTitle, rankedWorlds, world, rankedCareers, career,
    setWorldId, setCareerId, profile, setProfile, toggleGoal,
    prefs, setPrefs, homeCity, awayFromHome, institutions, envPrefs, cityCostBadge,
    saved, savedEntries, filteredSavedEntries, savedFilter, setSavedFilter,
    savedProfileFilter, setSavedProfileFilter, savedProfileIds, profileLabel,
    savedResultIds, resultLabel, historyList, finalists, setFinalists, toggleFinalist, pickCourse, allCareers,
    pair, compareDims, narrative, setNarrative,
    lastResult, savedToName, activeProfile, openResult, deleteResult, chooseFinal, moveResult, goToCourse,
    tourQueue, roundChoice, startTournament, nextRound, crownChampion, clearChampion, champion: store.champion || null,
    showProfiles, setShowProfiles, newName, setNewName,
    createProfile, switchProfile, deleteProfile,
    session, showAuth, setShowAuth, accountPanel, signInEnabled: SIGN_IN_ENABLED,
  };

  return (
    <AppCtx.Provider value={ctx}>
    <div className="min-h-screen" style={{ background: T.bg, color: T.ink }}>

      {/* ————— Header ————— */}
      <Header />

      <main className="max-w-[1500px] mx-auto px-4 md:px-10 pb-20 pt-6 space-y-5">

        {/* ————— Welcome / hero ————— */}
        {stage === "welcome" && <Welcome />}

        {/* ————— Survey ————— */}
        {stage === "express" && survey && <Survey />}

        {/* ————— Reveal / insights ————— */}
        {stage === "reveal" && <Reveal />}

        {/* ————— Worlds ————— */}
        {stage === "worlds" && <Worlds />}

        {/* ————— Careers in a world ————— */}
        {stage === "career" && world && <Careers />}

        {/* ————— Institutions / filters ————— */}
        {stage === "filter" && career && <Paths />}

        {/* ————— Saved (contextual per career path) ————— */}
        {stage === "saved" && <SavedPage />}

        {/* ————— Compare ————— */}
        {stage === "compare" && pair.length === 2 && <Compare />}
      </main>

      {/* ————— Compare bar: appears anywhere two paths are picked, including
              across different worlds and careers (tester feedback). ————— */}
      <FeedbackButton />
      <ScrollTop />

      {finalists.length === 2 && stage !== "compare" && (
        <div className="cc-fade-up fixed bottom-0 left-0 right-0 z-40 px-4 pb-4 pt-3"
          style={{ background: `linear-gradient(to top, ${T.bg} 65%, transparent)` }}>
          <div className="max-w-[1500px] mx-auto flex items-center gap-3 rounded-2xl px-4 py-3"
            style={{ background: T.card, border: `1.5px solid ${T.violet}`, boxShadow: "0 8px 30px rgba(0,0,0,.18)" }}>
            <div className="min-w-0 flex-1 text-xs" style={{ color: T.grey }}>
              {pair.map((c) => c?.name).filter(Boolean).join("  vs  ")}
            </div>
            <button onClick={() => setFinalists([])} className="text-xs underline shrink-0" style={{ color: T.grey }}>
              {t("cmp_bar_clear")}
            </button>
            <button onClick={() => go("compare")}
              className="px-5 py-2.5 rounded-full font-bold text-sm text-white shrink-0 transition-transform hover:scale-105"
              style={{ background: T.grad }}>
              {t("compare_cta")}
            </button>
          </div>
        </div>
      )}

      {/* ————— Sign-in pop-up (save nudge / post-survey) ————— */}
      {SIGN_IN_ENABLED && <AuthModal />}

      {/* ————— Profile manager ————— */}
      <ProfileModal />
    </div>
    </AppCtx.Provider>
  );
}
