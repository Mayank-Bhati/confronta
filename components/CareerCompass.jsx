"use client";

import React, { useState, useMemo } from "react";
import QUESTIONS from "../data/questions.json";
import WORLDS_DATA from "../data/worlds.json";
import COURSES from "../data/courses-v2.json";
import CITIES from "../data/cities.json";
import { emptyVector, applyAnswer, pickTargeted, normalize, identity, topDimensions, DIMS, DIM_INFO } from "../lib/scoreEngine";
import { rankWorlds, rankCareers } from "../lib/matchEngine";
import { fitInterests, fitOutcome, fitEnvironment, passesHardFilters, prepList, generateNarrative, haversineKm } from "../lib/fitEngine-v2";

const C = {
  ink: "#16213E", blue: "#2244BB", blueSoft: "#E8EDFB", green: "#1E9E6A",
  greenSoft: "#E4F4ED", amber: "#D08700", amberSoft: "#FCF3DD", red: "#C94040",
  redSoft: "#FBEAEA", paper: "#F7F6F1", line: "#D9DCE8", grey: "#6B7280",
};

const INTEREST_TAGS = ["Programming", "Mathematics", "Economics & finance", "Design & creativity", "Machines & hardware", "People & communication", "Science & research", "Building things"];

const DIM_TO_TAGS = {
  R: ["Machines & hardware", "Building things"],
  I: ["Mathematics", "Science & research", "Programming"],
  A: ["Design & creativity"],
  S: ["People & communication"],
  E: ["Economics & finance", "People & communication"],
  C: ["Economics & finance", "Mathematics"],
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

export default function CareerCompass() {
  const [stage, setStage] = useState("welcome");
  const [vector, setVector] = useState(emptyVector());
  const [qIndex, setQIndex] = useState(0);
  const [targeted, setTargeted] = useState(null);
  const [profile, setProfile] = useState({ interests: [], goal: "work", isee: "mid", awayFromHome: false, mathStrength: 3, homeCityId: "" });
  const [worldId, setWorldId] = useState(null);
  const [careerId, setCareerId] = useState(null);
  const [prefs, setPrefs] = useState({ language: "any", pathType: "any", maxDistance: 150, budget: 6000, citySize: "any" });
  const [finalists, setFinalists] = useState([]);
  const [narrative, setNarrative] = useState("");

  const broad = QUESTIONS.broad;
  const questions = targeted ? [...broad, ...targeted] : broad;
  const totalQ = broad.length + 8;
  const homeCity = CITIES.find((c) => c.id === profile.homeCityId) || null;

  function answer(weights) {
    const v = applyAnswer(vector, weights);
    setVector(v);
    const next = qIndex + 1;
    if (next === broad.length && !targeted) {
      setTargeted(pickTargeted(v, QUESTIONS.targeted, 4));
      setQIndex(next);
    } else if (next >= totalQ) {
      const tags = new Set();
      for (const d of topDimensions(v, 2)) for (const t of DIM_TO_TAGS[d]) tags.add(t);
      setProfile((p) => ({ ...p, interests: [...tags] }));
      setStage("reveal");
    } else {
      setQIndex(next);
    }
  }

  const norm = useMemo(() => normalize(vector), [vector]);
  const ident = useMemo(() => identity(vector), [vector]);
  const rankedWorlds = useMemo(() => rankWorlds(vector, WORLDS_DATA.worlds), [vector]);
  const world = rankedWorlds.find((w) => w.id === worldId);
  const rankedCareers = useMemo(() => (world ? rankCareers(vector, world) : []), [vector, world]);
  const career = rankedCareers.find((c) => c.id === careerId);

  const institutions = useMemo(() => {
    if (!career) return [];
    return career.courses
      .map((id) => COURSES.find((c) => c.id === id))
      .filter(Boolean)
      .filter((c) => passesHardFilters(c, prefs))
      .map((c) => ({ ...c, envFit: fitEnvironment(c, { ...prefs, isee: profile.isee, awayFromHome: profile.awayFromHome }, homeCity) }))
      .sort((a, b) => b.envFit.score - a.envFit.score);
  }, [career, prefs, profile.isee, profile.awayFromHome, homeCity]);

  const pair = finalists.map((id) => institutions.find((c) => c.id === id) || COURSES.find((c) => c.id === id)).filter(Boolean);

  const compareDims = useMemo(() => {
    if (pair.length < 2) return [];
    const rows = [
      { key: "interest", label: "Interest match", data: pair.map((c) => fitInterests(c, profile.interests)) },
      { key: "outcome", label: "Outcome fit", data: pair.map((c) => fitOutcome(c, profile.goal)) },
      { key: "env", label: "Environment fit", data: pair.map((c) => { const f = fitEnvironment(c, { ...prefs, isee: profile.isee, awayFromHome: profile.awayFromHome }, homeCity); return { score: f.score, note: f.reasons[0] || "" }; }) },
    ];
    return rows.map((r) => ({ ...r, scores: r.data.map((d) => d.score) }));
  }, [pair, profile, prefs, homeCity]);

  function toggleFinalist(id) {
    setFinalists((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 2) return [prev[1], id];
      return [...prev, id];
    });
    setNarrative("");
  }

  const gridPaper = {
    background: `linear-gradient(${C.paper} 0, ${C.paper} 0), repeating-linear-gradient(0deg, transparent, transparent 27px, rgba(34,68,187,0.07) 27px, rgba(34,68,187,0.07) 28px), repeating-linear-gradient(90deg, transparent, transparent 27px, rgba(34,68,187,0.07) 27px, rgba(34,68,187,0.07) 28px)`,
    backgroundColor: C.paper,
  };

  const q = questions[qIndex];

  return (
    <div className="min-h-screen" style={{ ...gridPaper, color: C.ink, fontFamily: "'Archivo', system-ui, sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;800&family=Space+Mono:wght@400;700&display=swap');`}</style>

      <header className="px-6 pt-8 pb-4 max-w-3xl mx-auto">
        <div className="flex items-baseline gap-3 flex-wrap">
          <h1 className="text-3xl font-extrabold tracking-tight cursor-pointer" style={{ color: C.blue }} onClick={() => setStage("welcome")}>CareerCompass</h1>
          <span className="text-xs" style={{ color: C.grey, fontFamily: "'Space Mono', monospace" }}>find your world · then your path</span>
        </div>
      </header>

      <main className="px-6 pb-16 max-w-3xl mx-auto space-y-5">

        {stage === "welcome" && (
          <Section>
            <h2 className="text-2xl font-extrabold" style={{ color: C.blue }}>What are you going to become?</h2>
            <p className="mt-3 text-sm leading-relaxed" style={{ color: C.grey }}>
              Not a test you can fail. 20 quick this-or-that choices — go with your gut — and we'll show you
              worlds of careers that fit how you actually are, including paths you've never heard of.
              Then we help you compare the real institutions that lead there.
            </p>
            <button onClick={() => setStage("express")} className="mt-5 px-6 py-3 rounded-full font-bold text-white" style={{ background: C.blue }}>
              Start · ~3 minutes
            </button>
            <p className="mt-4 text-xs" style={{ color: C.grey }}>
              Anonymous. Nothing is saved or sent anywhere — everything runs on your device. This is guidance, not advice.
            </p>
          </Section>
        )}

        {stage === "express" && q && (
          <Section>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs" style={{ color: C.grey, fontFamily: "'Space Mono', monospace" }}>{qIndex + 1} / {totalQ}</span>
              {qIndex === broad.length && <span className="text-xs font-semibold" style={{ color: C.blue }}>Two worlds are close — let's find yours</span>}
            </div>
            <Bar score={Math.round((qIndex / totalQ) * 100)} color={C.blue} />
            <h2 className="mt-6 text-lg font-bold">Which would you rather?</h2>
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[q.a, q.b].map((opt, i) => (
                <button key={i} onClick={() => answer(opt.w)}
                  className="text-left rounded-2xl p-5 transition-all hover:-translate-y-0.5"
                  style={{ background: "#fff", border: `1.5px solid ${C.line}`, boxShadow: `3px 3px 0 ${C.line}` }}>
                  <span className="text-base leading-snug">{opt.text}</span>
                </button>
              ))}
            </div>
            <p className="mt-4 text-xs" style={{ color: C.grey }}>No wrong answers. Gut feeling wins.</p>
          </Section>
        )}

        {stage === "reveal" && (
          <>
            <Section>
              <div className="text-xs uppercase tracking-widest" style={{ color: C.grey }}>You are</div>
              <h2 className="text-3xl font-extrabold mt-1" style={{ color: C.blue }}>{ident.title}</h2>
              <p className="mt-2 text-sm" style={{ color: C.grey }}>
                {ident.primary.name} first ({ident.primary.desc.toLowerCase()}), {ident.secondary.name} second ({ident.secondary.desc.toLowerCase()}).
                This is how your interests lean today — not a box you're locked into.
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
              <p className="text-xs mt-1 mb-3" style={{ color: C.grey }}>These interests were inferred from your answers — fix anything that's off. You're in charge, not the algorithm.</p>
              <div className="flex flex-wrap gap-2">
                {INTEREST_TAGS.map((t) => (
                  <Chip key={t} active={profile.interests.includes(t)}
                    onClick={() => setProfile((p) => ({ ...p, interests: p.interests.includes(t) ? p.interests.filter((x) => x !== t) : [...p.interests, t] }))}>
                    {t}
                  </Chip>
                ))}
              </div>
              <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="text-xs uppercase tracking-widest mb-2" style={{ color: C.grey }}>After the diploma I want to…</div>
                  <div className="flex flex-wrap gap-2">
                    {[["work", "Work soon"], ["salary", "Max salary"], ["study", "Master's & beyond"]].map(([v, l]) => (
                      <Chip key={v} active={profile.goal === v} onClick={() => setProfile((p) => ({ ...p, goal: v }))}>{l}</Chip>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-widest mb-2" style={{ color: C.grey }}>My home city (for distances)</div>
                  <select value={profile.homeCityId} onChange={(e) => setProfile((p) => ({ ...p, homeCityId: e.target.value }))}
                    className="w-full rounded-xl px-3 py-2 text-sm" style={{ border: `1.5px solid ${C.line}`, background: "#fff" }}>
                    <option value="">Prefer not to say</option>
                    {CITIES.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              </div>
              <button onClick={() => setStage("worlds")} className="mt-5 px-6 py-3 rounded-full font-bold text-white" style={{ background: C.ink }}>
                Show me my worlds →
              </button>
            </Section>
          </>
        )}

        {stage === "worlds" && (
          <>
            <h2 className="font-bold text-lg">Worlds that fit {ident.title.toLowerCase().replace("the ", "a ")}</h2>
            <p className="text-sm -mt-3" style={{ color: C.grey }}>Ranked for you. Open the ones that spark something — especially the ones you didn't expect.</p>
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
                        {c.salary ? `~€${c.salary.toLocaleString()} entry` : "variable income"} · demand: {c.demand} · via {c.pathTypes.join(" / ")}
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
              <h3 className="font-bold text-sm mb-3">Your environment — what matters to you?</h3>
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
                  <div className="text-xs uppercase tracking-widest mb-2" style={{ color: C.grey }}>Living</div>
                  <Chip active={profile.awayFromHome} onClick={() => setProfile((p) => ({ ...p, awayFromHome: !p.awayFromHome }))}>
                    {profile.awayFromHome ? "Away from home" : "Living at home"}
                  </Chip>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-widest mb-2" style={{ color: C.grey }}>Budget · €{prefs.budget.toLocaleString()}/year (fees{profile.awayFromHome ? " + rent" : ""})</div>
                  <input type="range" min="1000" max="20000" step="500" value={prefs.budget} onChange={(e) => setPrefs((p) => ({ ...p, budget: +e.target.value }))} className="w-full" style={{ accentColor: C.blue }} />
                </div>
                {homeCity && (
                  <div>
                    <div className="text-xs uppercase tracking-widest mb-2" style={{ color: C.grey }}>Max distance from {homeCity.name} · {prefs.maxDistance} km</div>
                    <input type="range" min="20" max="1000" step="10" value={prefs.maxDistance} onChange={(e) => setPrefs((p) => ({ ...p, maxDistance: +e.target.value }))} className="w-full" style={{ accentColor: C.blue }} />
                  </div>
                )}
                <div>
                  <div className="text-xs uppercase tracking-widest mb-2" style={{ color: C.grey }}>ISEE band (for real costs)</div>
                  <div className="flex gap-2">
                    {[["low", "< €15k"], ["mid", "€15–35k"], ["high", "> €35k"]].map(([v, l]) => (
                      <Chip key={v} active={profile.isee === v} onClick={() => setProfile((p) => ({ ...p, isee: v }))}>{l}</Chip>
                    ))}
                  </div>
                </div>
              </div>
            </Section>

            {institutions.length === 0 && (
              <Section>
                <p className="text-sm" style={{ color: C.grey }}>
                  No institutions in our current dataset match these filters for this career — we're expanding region by region.
                  Try relaxing a filter, or explore a nearby career.
                </p>
              </Section>
            )}

            <div className="space-y-3">
              {institutions.map((c) => {
                const chosen = finalists.includes(c.id);
                return (
                  <button key={c.id} onClick={() => toggleFinalist(c.id)} className="w-full text-left rounded-2xl p-4 transition-all"
                    style={{ background: chosen ? C.blueSoft : "#fff", border: `1.5px solid ${chosen ? C.blue : C.line}`, boxShadow: chosen ? `3px 3px 0 ${C.blue}` : "none" }}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: c.type === "ITS" ? C.greenSoft : C.blueSoft, color: c.type === "ITS" ? C.green : C.blue, fontFamily: "'Space Mono', monospace" }}>
                          {c.type} · {c.years}y · {c.city}
                        </span>
                        <div className="font-bold mt-2">{c.name}</div>
                        <div className="text-sm" style={{ color: C.grey }}>{c.inst}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold" style={{ fontFamily: "'Space Mono', monospace", color: scoreColor(c.envFit.score) }}>{c.envFit.score}/100</div>
                        <div className="text-xs" style={{ color: C.grey }}>environment fit</div>
                        {chosen && <div className="mt-1 text-xs font-bold" style={{ color: C.blue }}>✓ finalist</div>}
                      </div>
                    </div>
                    <div className="mt-2 text-xs space-y-0.5" style={{ color: C.grey }}>
                      {c.envFit.reasons.slice(0, 2).map((r, i) => <div key={i}>· {r}</div>)}
                    </div>
                  </button>
                );
              })}
            </div>

            {finalists.length === 2 && (
              <button onClick={() => setStage("compare")} className="w-full px-6 py-3 rounded-full font-bold text-white" style={{ background: C.blue }}>
                Compare my 2 finalists →
              </button>
            )}
            {institutions.length > 0 && finalists.length < 2 && (
              <p className="text-xs text-center" style={{ color: C.grey }}>Tap {2 - finalists.length} {finalists.length === 1 ? "more institution" : "institutions"} to compare them side by side.</p>
            )}
          </>
        )}

        {stage === "compare" && pair.length === 2 && (
          <>
            <button onClick={() => setStage("filter")} className="text-sm font-semibold" style={{ color: C.blue }}>← Back to paths</button>
            <Section>
              <h2 className="font-bold text-lg mb-1">Your finalists, your lens</h2>
              <p className="text-xs mb-4" style={{ color: C.grey }}>Same data, scored for you. No winner is declared — the trade-offs are yours to weigh.</p>

              <div className="grid grid-cols-2 gap-3">
                {pair.map((c) => (
                  <div key={c.id} className="rounded-xl p-3" style={{ background: C.paper }}>
                    <div className="font-extrabold text-sm" style={{ color: C.blue }}>{c.name}</div>
                    <div className="text-xs" style={{ color: C.grey }}>{c.inst} · {c.city}</div>
                  </div>
                ))}
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
                <div className="text-xs uppercase tracking-widest mb-2" style={{ color: C.grey }}>Costs at your ISEE</div>
                <div className="grid grid-cols-2 gap-3">
                  {pair.map((c) => (
                    <div key={c.id} className="rounded-xl p-3 text-xs" style={{ border: `1.5px solid ${C.line}`, fontFamily: "'Space Mono', monospace" }}>
                      €{c.costByIsee[profile.isee].toLocaleString()}/y fees · rent ~€{c.cityRent}/m
                      {homeCity && <div className="mt-1">{haversineKm(homeCity.lat, homeCity.lon, c.lat, c.lon)} km from {homeCity.name}</div>}
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
          Prototype · figures modelled on public AlmaLaurea / MUR / Ustat data — being replaced with verified per-course values ·
          anonymous, nothing stored · guidance, not advice.
        </footer>
      </main>
    </div>
  );
}
