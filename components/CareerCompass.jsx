"use client";

import React, { useState, useMemo } from "react";
import POOLS from "../data/questions-v2.json";
import WORLDS_DATA from "../data/worlds.json";
import COURSES from "../data/courses-v2.json";
import CITIES from "../data/cities-v2.json";
import { emptyVector, applyAnswer, applyLikert, applyMulti, buildSurvey, pickLikert, LIKERT_SCALE, normalize, identity, topDimensions, DIMS, DIM_INFO } from "../lib/scoreEngine";
import { rankWorlds, rankCareers } from "../lib/matchEngine";
import { fitInterests, fitOutcome, fitEnvironment, passesHardFilters, prepList, generateNarrative, haversineKm } from "../lib/fitEngine-v2";

const C = {
  ink: "#16213E", blue: "#2244BB", blueSoft: "#E8EDFB", green: "#1E9E6A",
  greenSoft: "#E4F4ED", amber: "#D08700", amberSoft: "#FCF3DD", red: "#C94040",
  redSoft: "#FBEAEA", paper: "#F7F6F1", line: "#D9DCE8", grey: "#6B7280",
};

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

const NATURE_LABEL = {
  scientific: { text: "Scientific — mathematics is guaranteed", bg: "#E8EDFB", fg: "#2244BB" },
  classical: { text: "Classical — literature & humanities core", bg: "#FCF3DD", fg: "#D08700" },
  mixed: { text: "Mixed — light maths, strong practice", bg: "#E4F4ED", fg: "#1E9E6A" },
  "technical-practical": { text: "Technical-practical — workshop over theory", bg: "#E4F4ED", fg: "#1E9E6A" },
};

const scoreColor = (s) => (s >= 70 ? C.green : s >= 45 ? C.amber : C.red);
const scoreSoft = (s) => (s >= 70 ? C.greenSoft : s >= 45 ? C.amberSoft : C.redSoft);

function Bar({ score, color }) {
  return (
    <div className="w-full h-2 rounded-full" style={{ background: "#E7E7E0" }}>
      <div className="h-2 rounded-full transition-all duration-500" style={{ width: `${score}%`, background: color || scoreColor(score) }} />
    </div>
  );
}

function Chip({ active, onClick, children }) {
  return (
    <button onClick={onClick} className="px-3 py-1.5 rounded-full text-sm transition-colors"
      style={{ border: `1.5px solid ${active ? C.blue : C.line}`, background: active ? C.blue : "#fff", color: active ? "#fff" : C.ink }}>
      {children}
    </button>
  );
}

function Section({ children }) {
  return <section className="rounded-2xl p-5" style={{ background: "#fff", border: `1.5px solid ${C.line}` }}>{children}</section>;
}

function GoogleLink({ course }) {
  return (
    <a href={`https://www.google.com/search?q=${course.googleQuery}`} target="_blank" rel="noreferrer"
      onClick={(e) => e.stopPropagation()}
      className="text-xs font-semibold underline" style={{ color: C.blue }}>
      View on Google ↗
    </a>
  );
}

export default function CareerCompass() {
  const [stage, setStage] = useState("welcome");
  const [survey] = useState(() => buildSurvey(POOLS, 10, 5));
  const [likertQs, setLikertQs] = useState([]);
  const [phase, setPhase] = useState("binary"); // binary → multi → likert
  const [qIndex, setQIndex] = useState(0);
  const [multiSel, setMultiSel] = useState([]);
  const [vector, setVector] = useState(emptyVector());
  const [profile, setProfile] = useState({ interests: [], goal: "work", isee: "mid", awayFromHome: false, homeCityId: "", relocationCities: [], mathStrength: 3 });
  const [worldId, setWorldId] = useState(null);
  const [careerId, setCareerId] = useState(null);
  const [prefs, setPrefs] = useState({ pathType: "any", maxDistance: 100, budget: 900 });
  const [saved, setSaved] = useState([]); // course ids, survives across worlds
  const [finalists, setFinalists] = useState([]);
  const [narrative, setNarrative] = useState("");
  const [prevStage, setPrevStage] = useState("worlds");

  const totalQ = 10 + 5 + 5;
  const answered = phase === "binary" ? qIndex : phase === "multi" ? 10 + qIndex : 15 + qIndex;
  const homeCity = CITIES.find((c) => c.id === profile.homeCityId) || null;

  function finishExpress(v) {
    const tags = new Set();
    for (const d of topDimensions(v, 2)) for (const t of DIM_TO_TAGS[d]) tags.add(t);
    setProfile((p) => ({ ...p, interests: [...tags] }));
    setStage("reveal");
  }

  function answerBinary(weights) {
    const v = applyAnswer(vector, weights);
    setVector(v);
    if (qIndex + 1 >= survey.binary.length) { setPhase("multi"); setQIndex(0); }
    else setQIndex(qIndex + 1);
  }

  function submitMulti() {
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
    const q = likertQs[qIndex];
    const v = applyLikert(vector, q.dim, val);
    setVector(v);
    if (qIndex + 1 >= likertQs.length) finishExpress(v);
    else setQIndex(qIndex + 1);
  }

  const norm = useMemo(() => normalize(vector), [vector]);
  const ident = useMemo(() => identity(vector), [vector]);
  const rankedWorlds = useMemo(() => rankWorlds(vector, WORLDS_DATA.worlds), [vector]);
  const world = rankedWorlds.find((w) => w.id === worldId);
  const rankedCareers = useMemo(() => (world ? rankCareers(vector, world) : []), [vector, world]);
  const career = rankedCareers.find((c) => c.id === careerId);

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

  const savedCourses = saved.map((id) => COURSES.find((c) => c.id === id)).filter(Boolean);
  const pair = finalists.map((id) => COURSES.find((c) => c.id === id)).filter(Boolean);

  const compareDims = useMemo(() => {
    if (pair.length < 2) return [];
    return [
      { key: "interest", label: "Interest match", data: pair.map((c) => fitInterests(c, profile.interests)) },
      { key: "outcome", label: "Outcome fit", data: pair.map((c) => fitOutcome(c, profile.goal)) },
      { key: "env", label: "Environment fit", data: pair.map((c) => { const f = fitEnvironment(c, envPrefs, !profile.awayFromHome ? homeCity : null); return { score: f.score, note: f.reasons[0] || "" }; }) },
    ].map((r) => ({ ...r, scores: r.data.map((d) => d.score) }));
  }, [pair, profile, prefs, homeCity]);

  function toggleSave(id) {
    setSaved((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
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
    return c ? `€${c.costRange[0]}–${c.costRange[1]}/month to live` : "";
  }

  const gridPaper = {
    background: `linear-gradient(${C.paper} 0, ${C.paper} 0), repeating-linear-gradient(0deg, transparent, transparent 27px, rgba(34,68,187,0.07) 27px, rgba(34,68,187,0.07) 28px), repeating-linear-gradient(90deg, transparent, transparent 27px, rgba(34,68,187,0.07) 27px, rgba(34,68,187,0.07) 28px)`,
    backgroundColor: C.paper,
  };

  const InstitutionCard = ({ c, showFit, chosen, onCardClick }) => (
    <div onClick={onCardClick} className={`w-full text-left rounded-2xl p-4 transition-all ${onCardClick ? "cursor-pointer" : ""}`}
      style={{ background: chosen ? C.blueSoft : "#fff", border: `1.5px solid ${chosen ? C.blue : C.line}`, boxShadow: chosen ? `3px 3px 0 ${C.blue}` : "none" }}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: c.type === "ITS" ? C.greenSoft : C.blueSoft, color: c.type === "ITS" ? C.green : C.blue, fontFamily: "'Space Mono', monospace" }}>
              {c.type} · {c.years}y · {c.city}
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: NATURE_LABEL[c.nature].bg, color: NATURE_LABEL[c.nature].fg }}>
              {NATURE_LABEL[c.nature].text.split(" — ")[0]}
            </span>
          </div>
          <div className="font-bold mt-2">{c.name}</div>
          <div className="text-sm" style={{ color: C.grey }}>{c.inst}</div>
          <div className="mt-1"><GoogleLink course={c} /></div>
        </div>
        <div className="text-right shrink-0">
          {showFit && c.envFit && (
            <>
              <div className="text-sm font-bold" style={{ fontFamily: "'Space Mono', monospace", color: scoreColor(c.envFit.score) }}>{c.envFit.score}/100</div>
              <div className="text-xs" style={{ color: C.grey }}>environment fit</div>
            </>
          )}
          <button onClick={(e) => { e.stopPropagation(); toggleSave(c.id); }}
            className="mt-2 px-3 py-1 rounded-full text-xs font-bold"
            style={{ border: `1.5px solid ${saved.includes(c.id) ? C.green : C.line}`, background: saved.includes(c.id) ? C.greenSoft : "#fff", color: saved.includes(c.id) ? C.green : C.ink }}>
            {saved.includes(c.id) ? "✓ Saved" : "☆ Save"}
          </button>
          {chosen && <div className="mt-1 text-xs font-bold" style={{ color: C.blue }}>✓ finalist</div>}
        </div>
      </div>
      {showFit && c.envFit && (
        <div className="mt-2 text-xs space-y-0.5" style={{ color: C.grey }}>
          {c.envFit.reasons.slice(0, 2).map((r, i) => <div key={i}>· {r}</div>)}
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen" style={{ ...gridPaper, color: C.ink, fontFamily: "'Archivo', system-ui, sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;800&family=Space+Mono:wght@400;700&display=swap');`}</style>

      <header className="px-6 pt-8 pb-4 max-w-3xl mx-auto flex items-baseline justify-between flex-wrap gap-2">
        <div className="flex items-baseline gap-3 flex-wrap">
          <h1 className="text-3xl font-extrabold tracking-tight cursor-pointer" style={{ color: C.blue }} onClick={() => setStage("welcome")}>CareerCompass</h1>
          <span className="text-xs" style={{ color: C.grey, fontFamily: "'Space Mono', monospace" }}>find your world · then your path</span>
        </div>
        {saved.length > 0 && stage !== "welcome" && stage !== "express" && (
          <button onClick={() => { setPrevStage(stage); setStage("saved"); }} className="px-4 py-1.5 rounded-full text-sm font-bold"
            style={{ background: C.greenSoft, color: C.green, border: `1.5px solid ${C.green}` }}>
            ☆ Saved ({saved.length})
          </button>
        )}
      </header>

      <main className="px-6 pb-16 max-w-3xl mx-auto space-y-5">

        {stage === "welcome" && (
          <Section>
            <h2 className="text-2xl font-extrabold" style={{ color: C.blue }}>What are you going to become?</h2>
            <p className="mt-3 text-sm leading-relaxed" style={{ color: C.grey }}>
              Not a test you can fail. ~20 quick questions — go with your gut — and we'll show you worlds of
              careers that fit how you actually are, including paths you've never heard of. Then compare the
              real institutions that lead there. Different every time you take it.
            </p>
            <button onClick={() => setStage("express")} className="mt-5 px-6 py-3 rounded-full font-bold text-white" style={{ background: C.blue }}>
              Start · ~4 minutes
            </button>
            <p className="mt-4 text-xs" style={{ color: C.grey }}>
              Anonymous. Nothing is saved or sent anywhere — everything runs on your device. Guidance, not advice.
            </p>
          </Section>
        )}

        {stage === "express" && (
          <Section>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs" style={{ color: C.grey, fontFamily: "'Space Mono', monospace" }}>{answered + 1} / {totalQ}</span>
              {phase === "multi" && qIndex === 0 && <span className="text-xs font-semibold" style={{ color: C.blue }}>New round — pick as many as you want</span>}
              {phase === "likert" && qIndex === 0 && <span className="text-xs font-semibold" style={{ color: C.blue }}>Last 5 — how strongly is this you?</span>}
            </div>
            <Bar score={Math.round((answered / totalQ) * 100)} color={C.blue} />

            {phase === "binary" && survey.binary[qIndex] && (
              <>
                <h2 className="mt-6 text-lg font-bold">Which would you rather?</h2>
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[survey.binary[qIndex].a, survey.binary[qIndex].b].map((opt, i) => (
                    <button key={i} onClick={() => answerBinary(opt.w)}
                      className="text-left rounded-2xl p-5 transition-all hover:-translate-y-0.5"
                      style={{ background: "#fff", border: `1.5px solid ${C.line}`, boxShadow: `3px 3px 0 ${C.line}` }}>
                      <span className="text-base leading-snug">{opt.text}</span>
                    </button>
                  ))}
                </div>
                <p className="mt-4 text-xs" style={{ color: C.grey }}>No wrong answers. Gut feeling wins.</p>
              </>
            )}

            {phase === "multi" && survey.multi[qIndex] && (
              <>
                <h2 className="mt-6 text-lg font-bold">{survey.multi[qIndex].prompt}</h2>
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {survey.multi[qIndex].options.map((opt, i) => (
                    <button key={i} onClick={() => setMultiSel((s) => (s.includes(i) ? s.filter((x) => x !== i) : [...s, i]))}
                      className="text-left rounded-xl p-3 text-sm transition-all"
                      style={{ background: multiSel.includes(i) ? C.blueSoft : "#fff", border: `1.5px solid ${multiSel.includes(i) ? C.blue : C.line}` }}>
                      {multiSel.includes(i) ? "✓ " : ""}{opt.text}
                    </button>
                  ))}
                </div>
                <button onClick={submitMulti} className="mt-4 px-6 py-2.5 rounded-full font-bold text-white" style={{ background: multiSel.length ? C.blue : C.grey }}>
                  {multiSel.length ? `Continue (${multiSel.length} picked)` : "None of these → skip"}
                </button>
              </>
            )}

            {phase === "likert" && likertQs[qIndex] && (
              <>
                <h2 className="mt-6 text-lg font-bold leading-snug">"{likertQs[qIndex].text}"</h2>
                <div className="mt-4 flex flex-col gap-2">
                  {LIKERT_SCALE.map((s) => (
                    <button key={s.v} onClick={() => answerLikert(s.v)}
                      className="text-left rounded-xl px-4 py-3 text-sm transition-all hover:-translate-y-0.5"
                      style={{ background: "#fff", border: `1.5px solid ${C.line}` }}>
                      {s.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </Section>
        )}

        {stage === "reveal" && (
          <>
            <Section>
              <div className="text-xs uppercase tracking-widest" style={{ color: C.grey }}>You are</div>
              <h2 className="text-3xl font-extrabold mt-1" style={{ color: C.blue }}>{ident.title}</h2>
              <p className="mt-2 text-sm" style={{ color: C.grey }}>
                {ident.primary.name} first ({ident.primary.desc.toLowerCase()}), {ident.secondary.name} second ({ident.secondary.desc.toLowerCase()}).
                This is how your interests lean today — not a box.
              </p>
              <div className="mt-5 space-y-2">
                {DIMS.map((d) => (
                  <div key={d} className="flex items-center gap-3">
                    <span className="w-24 text-xs font-semibold">{DIM_INFO[d].name}</span>
                    <div className="flex-1"><Bar score={norm[d]} color={C.blue} /></div>
                    <span className="w-8 text-xs text-right" style={{ fontFamily: "'Space Mono', monospace", color: C.grey }}>{norm[d]}</span>
                  </div>
                ))}
              </div>
            </Section>

            <Section>
              <h3 className="font-bold">Did we get you right?</h3>
              <p className="text-xs mt-1 mb-3" style={{ color: C.grey }}>Inferred from your answers — fix anything. You're in charge, not the algorithm.</p>
              <div className="flex flex-wrap gap-2">
                {INTEREST_TAGS.map((t) => (
                  <Chip key={t} active={profile.interests.includes(t)}
                    onClick={() => setProfile((p) => ({ ...p, interests: p.interests.includes(t) ? p.interests.filter((x) => x !== t) : [...p.interests, t] }))}>
                    {t}
                  </Chip>
                ))}
              </div>

              <div className="mt-5">
                <div className="text-xs uppercase tracking-widest mb-2" style={{ color: C.grey }}>After the diploma I want to…</div>
                <div className="flex flex-wrap gap-2">
                  {[["work", "Work soon"], ["salary", "Max salary"], ["study", "Master's & beyond"], ["unsure", "I don't know yet"]].map(([v, l]) => (
                    <Chip key={v} active={profile.goal === v} onClick={() => setProfile((p) => ({ ...p, goal: v }))}>{l}</Chip>
                  ))}
                </div>
                {profile.goal === "unsure" && (
                  <p className="text-xs mt-2" style={{ color: C.green }}>Totally fine — we'll show you a balanced view and keep every door open.</p>
                )}
              </div>

              <div className="mt-5">
                <div className="text-xs uppercase tracking-widest mb-2" style={{ color: C.grey }}>During my studies I'd be…</div>
                <div className="flex gap-2 flex-wrap">
                  <Chip active={!profile.awayFromHome} onClick={() => setProfile((p) => ({ ...p, awayFromHome: false }))}>Living at home</Chip>
                  <Chip active={profile.awayFromHome} onClick={() => setProfile((p) => ({ ...p, awayFromHome: true }))}>Moving away from home</Chip>
                </div>
              </div>

              {!profile.awayFromHome && (
                <div className="mt-4">
                  <div className="text-xs uppercase tracking-widest mb-2" style={{ color: C.grey }}>My city — we'll sort paths by distance from you</div>
                  <select value={profile.homeCityId} onChange={(e) => setProfile((p) => ({ ...p, homeCityId: e.target.value }))}
                    className="w-full rounded-xl px-3 py-2 text-sm" style={{ border: `1.5px solid ${C.line}`, background: "#fff" }}>
                    <option value="">Choose your city…</option>
                    {CITIES.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              )}

              {profile.awayFromHome && (
                <div className="mt-4">
                  <div className="text-xs uppercase tracking-widest mb-2" style={{ color: C.grey }}>Cities I'd be happy to live in (pick any) — with real living costs</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {CITIES.map((c) => {
                      const on = profile.relocationCities.includes(c.id);
                      return (
                        <button key={c.id} onClick={() => setProfile((p) => ({ ...p, relocationCities: on ? p.relocationCities.filter((x) => x !== c.id) : [...p.relocationCities, c.id] }))}
                          className="text-left rounded-xl p-3 transition-all"
                          style={{ background: on ? C.blueSoft : "#fff", border: `1.5px solid ${on ? C.blue : C.line}` }}>
                          <div className="flex justify-between items-baseline">
                            <span className="font-semibold text-sm">{on ? "✓ " : ""}{c.name}</span>
                            <span className="text-xs" style={{ fontFamily: "'Space Mono', monospace", color: C.grey }}>€{c.costRange[0]}–{c.costRange[1]}/mo</span>
                          </div>
                          <div className="text-xs mt-0.5" style={{ color: C.grey }}>{c.vibe}</div>
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-xs mt-2" style={{ color: C.grey }}>Living cost is a range — a hostel room and a private flat are different lives. Fees are separate and fixed by your ISEE.</p>
                </div>
              )}

              <button onClick={() => setStage("worlds")} className="mt-5 px-6 py-3 rounded-full font-bold text-white" style={{ background: C.ink }}>
                Show me my worlds →
              </button>
            </Section>
          </>
        )}

        {stage === "worlds" && (
          <>
            <h2 className="font-bold text-lg">Worlds that fit {ident.title.toLowerCase().replace("the ", "a ")}</h2>
            <p className="text-sm -mt-3" style={{ color: C.grey }}>Ranked for you. Open the ones that spark something — especially the unexpected ones.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {rankedWorlds.map((w, i) => (
                <button key={w.id} onClick={() => { setWorldId(w.id); setCareerId(null); setStage("career"); }}
                  className="text-left rounded-2xl p-4 transition-all hover:-translate-y-0.5"
                  style={{ background: i < 2 ? C.blueSoft : "#fff", border: `1.5px solid ${i < 2 ? C.blue : C.line}` }}>
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold" style={{ color: C.blue }}>{w.name}</span>
                    <span className="text-xs font-bold" style={{ fontFamily: "'Space Mono', monospace", color: scoreColor(w.fit) }}>{w.fit}% you</span>
                  </div>
                  <div className="text-xs mt-1" style={{ color: C.grey }}>{w.tagline}</div>
                </button>
              ))}
            </div>
          </>
        )}

        {stage === "career" && world && (
          <>
            <button onClick={() => setStage("worlds")} className="text-sm font-semibold" style={{ color: C.blue }}>← All worlds</button>
            <h2 className="font-bold text-xl" style={{ color: C.blue }}>{world.name}</h2>
            <p className="text-sm -mt-3" style={{ color: C.grey }}>{world.tagline}</p>
            <div className="space-y-3">
              {rankedCareers.map((c) => (
                <Section key={c.id}>
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div>
                      <div className="font-bold">{c.name}</div>
                      <div className="text-sm mt-1" style={{ color: C.grey }}>{c.day}</div>
                      <div className="text-xs mt-2" style={{ fontFamily: "'Space Mono', monospace", color: C.grey }}>
                        {c.netMonthly ? `~€${c.netMonthly.toLocaleString()}/month net after taxes (entry)` : "variable income"} · demand: {c.demand} · via {c.pathTypes.join(" / ")}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span className="text-xs font-bold" style={{ fontFamily: "'Space Mono', monospace", color: scoreColor(c.fit) }}>{c.fit}% you</span>
                      <button onClick={() => { setCareerId(c.id); setFinalists([]); setStage("filter"); }}
                        className="px-4 py-2 rounded-full text-sm font-bold text-white" style={{ background: C.ink }}>
                        Explore paths →
                      </button>
                    </div>
                  </div>
                </Section>
              ))}
            </div>
          </>
        )}

        {stage === "filter" && career && (
          <>
            <button onClick={() => setStage("career")} className="text-sm font-semibold" style={{ color: C.blue }}>← {world.name}</button>
            <h2 className="font-bold text-xl">Paths to {career.name}</h2>
            <Section>
              <h3 className="font-bold text-sm mb-3">Tune your environment</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="text-xs uppercase tracking-widest mb-2" style={{ color: C.grey }}>Path type</div>
                  <div className="flex gap-2 flex-wrap">
                    {[["any", "Any"], ["University", "University"], ["ITS", "ITS (2y, practical)"]].map(([v, l]) => (
                      <Chip key={v} active={prefs.pathType === v} onClick={() => setPrefs((p) => ({ ...p, pathType: v }))}>{l}</Chip>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-widest mb-2" style={{ color: C.grey }}>ISEE band — your fees are fixed by this</div>
                  <div className="flex gap-2">
                    {[["low", "< €15k"], ["mid", "€15–35k"], ["high", "> €35k"]].map(([v, l]) => (
                      <Chip key={v} active={profile.isee === v} onClick={() => setProfile((p) => ({ ...p, isee: v }))}>{l}</Chip>
                    ))}
                  </div>
                </div>
                {profile.awayFromHome && (
                  <div>
                    <div className="text-xs uppercase tracking-widest mb-2" style={{ color: C.grey }}>Monthly living budget · €{prefs.budget.toLocaleString()}/month</div>
                    <input type="range" min="400" max="2000" step="50" value={prefs.budget} onChange={(e) => setPrefs((p) => ({ ...p, budget: +e.target.value }))} className="w-full" style={{ accentColor: C.blue }} />
                  </div>
                )}
                {!profile.awayFromHome && homeCity && (
                  <div>
                    <div className="text-xs uppercase tracking-widest mb-2" style={{ color: C.grey }}>Max commuting distance from {homeCity.name} · {prefs.maxDistance} km</div>
                    <input type="range" min="10" max="300" step="10" value={prefs.maxDistance} onChange={(e) => setPrefs((p) => ({ ...p, maxDistance: +e.target.value }))} className="w-full" style={{ accentColor: C.blue }} />
                  </div>
                )}
              </div>
              {profile.awayFromHome && profile.relocationCities.length > 0 && (
                <p className="text-xs mt-3" style={{ color: C.grey }}>
                  Showing only your chosen cities: {profile.relocationCities.map((id) => CITIES.find((c) => c.id === id)?.name).join(", ")} — change them in your profile (tap the identity screen).
                </p>
              )}
            </Section>

            {institutions.length === 0 && (
              <Section>
                <p className="text-sm" style={{ color: C.grey }}>
                  No institutions match these filters for this career in the current dataset — we're expanding region by region.
                  Try relaxing a filter or adding a city.
                </p>
              </Section>
            )}

            <div className="space-y-3">
              {institutions.map((c) => (
                <InstitutionCard key={c.id} c={c} showFit chosen={finalists.includes(c.id)} onCardClick={() => toggleFinalist(c.id)} />
              ))}
            </div>

            {finalists.length === 2 && (
              <button onClick={() => { setPrevStage("filter"); setStage("compare"); }} className="w-full px-6 py-3 rounded-full font-bold text-white" style={{ background: C.blue }}>
                Compare my 2 finalists →
              </button>
            )}
            {institutions.length > 0 && finalists.length < 2 && (
              <p className="text-xs text-center" style={{ color: C.grey }}>Tap cards to pick 2 finalists · ☆ Save keeps them for cross-world comparison later.</p>
            )}
          </>
        )}

        {stage === "saved" && (
          <>
            <button onClick={() => setStage(prevStage)} className="text-sm font-semibold" style={{ color: C.blue }}>← Back</button>
            <h2 className="font-bold text-xl">Your saved paths ({savedCourses.length})</h2>
            <p className="text-sm -mt-3" style={{ color: C.grey }}>Saved across all worlds — tap any two to compare them, even from different careers.</p>
            <div className="space-y-3">
              {savedCourses.map((c) => (
                <InstitutionCard key={c.id} c={c} chosen={finalists.includes(c.id)} onCardClick={() => toggleFinalist(c.id)} />
              ))}
            </div>
            {finalists.length === 2 && (
              <button onClick={() => { setPrevStage("saved"); setStage("compare"); }} className="w-full px-6 py-3 rounded-full font-bold text-white" style={{ background: C.blue }}>
                Compare these 2 →
              </button>
            )}
          </>
        )}

        {stage === "compare" && pair.length === 2 && (
          <>
            <button onClick={() => setStage(prevStage)} className="text-sm font-semibold" style={{ color: C.blue }}>← Back</button>
            <Section>
              <h2 className="font-bold text-lg mb-1">Your finalists, your lens</h2>
              <p className="text-xs mb-4" style={{ color: C.grey }}>Same data, scored for you. No winner declared — the trade-offs are yours.</p>

              <div className="grid grid-cols-2 gap-3">
                {pair.map((c) => (
                  <div key={c.id} className="rounded-xl p-3" style={{ background: C.paper }}>
                    <div className="font-extrabold text-sm" style={{ color: C.blue }}>{c.name}</div>
                    <div className="text-xs" style={{ color: C.grey }}>{c.inst} · {c.city}</div>
                    <div className="mt-1"><GoogleLink course={c} /></div>
                  </div>
                ))}
              </div>

              <div className="mt-4">
                <div className="text-xs uppercase tracking-widest mb-2" style={{ color: C.grey }}>What you'll actually study</div>
                <div className="grid grid-cols-2 gap-3">
                  {pair.map((c) => (
                    <div key={c.id} className="rounded-xl p-3 text-xs" style={{ border: `1.5px solid ${C.line}` }}>
                      <div className="mb-2 px-2 py-1 rounded-lg inline-block font-semibold" style={{ background: NATURE_LABEL[c.nature].bg, color: NATURE_LABEL[c.nature].fg }}>
                        {NATURE_LABEL[c.nature].text}
                      </div>
                      {c.curriculum.map((s, i) => (
                        <div key={i} style={{ fontWeight: /matemat|analisi/i.test(s) ? 700 : 400 }}>· {s}</div>
                      ))}
                    </div>
                  ))}
                </div>
                <p className="text-xs mt-2" style={{ color: C.grey }}>Maths subjects in bold — if that's a dealbreaker, better to know now than in October.</p>
              </div>

              {compareDims.map((row) => (
                <div key={row.key} className="mt-4">
                  <div className="text-xs uppercase tracking-widest mb-2" style={{ color: C.grey }}>{row.label}</div>
                  <div className="grid grid-cols-2 gap-3">
                    {row.data.map((d, i) => (
                      <div key={i} className="rounded-xl p-3" style={{ background: scoreSoft(d.score) }}>
                        <div className="text-sm font-bold mb-1" style={{ fontFamily: "'Space Mono', monospace", color: scoreColor(d.score) }}>{d.score}/100</div>
                        <Bar score={d.score} />
                        <div className="mt-1.5 text-xs">{d.note}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              <div className="mt-4">
                <div className="text-xs uppercase tracking-widest mb-2" style={{ color: C.grey }}>Reality check (graduate surveys)</div>
                <div className="grid grid-cols-2 gap-3">
                  {pair.map((c) => (
                    <div key={c.id} className="rounded-xl p-3 text-xs space-y-1" style={{ border: `1.5px solid ${C.line}` }}>
                      <div><b>{c.env.wouldChooseAgain}%</b> would choose it again</div>
                      <div><b>{c.env.teachSat}%</b> satisfied with professors</div>
                      <div><b>{c.env.dropout}%</b> off-schedule / dropout</div>
                      <div style={{ color: C.grey }}>{c.env.cityVibe}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-4">
                <div className="text-xs uppercase tracking-widest mb-2" style={{ color: C.grey }}>Money, honestly</div>
                <div className="grid grid-cols-2 gap-3">
                  {pair.map((c) => (
                    <div key={c.id} className="rounded-xl p-3 text-xs space-y-1" style={{ border: `1.5px solid ${C.line}`, fontFamily: "'Space Mono', monospace" }}>
                      <div>Fees (your ISEE): €{c.costByIsee[profile.isee].toLocaleString()}/y</div>
                      {profile.awayFromHome && <div>Living in {c.city}: {cityCostBadge(c.city) || `~€${c.cityRent}/mo rent`}</div>}
                      {!profile.awayFromHome && homeCity && <div>{haversineKm(homeCity.lat, homeCity.lon, c.lat, c.lon)} km from {homeCity.name}</div>}
                      <div>After: ~€{c.netMonthly.toLocaleString()}/mo net entry</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-4">
                <div className="text-xs uppercase tracking-widest mb-2" style={{ color: C.grey }}>Your preparation plan</div>
                <div className="grid grid-cols-2 gap-3">
                  {pair.map((c) => (
                    <div key={c.id} className="rounded-xl p-3 text-xs space-y-1" style={{ background: C.amberSoft }}>
                      {prepList(c, profile).map((item, i) => <div key={i}>→ {item}</div>)}
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-5">
                <button onClick={() => setNarrative(generateNarrative(pair, compareDims, profile))}
                  className="px-5 py-2.5 rounded-full font-semibold text-sm text-white" style={{ background: C.ink }}>
                  Explain the differences for me
                </button>
                {narrative && (
                  <div className="mt-3 rounded-xl p-4 text-sm whitespace-pre-wrap leading-relaxed" style={{ background: "#fff", border: `1.5px dashed ${C.blue}` }}>
                    {narrative}
                  </div>
                )}
              </div>
            </Section>
          </>
        )}

        <footer className="text-xs pt-2" style={{ color: C.grey }}>
          Prototype · figures modelled on public AlmaLaurea / MUR / Ustat data · net salaries are indicative estimates ·
          anonymous, nothing stored · guidance, not advice.
        </footer>
      </main>
    </div>
  );
}
