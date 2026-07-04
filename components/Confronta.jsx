"use client";

import React, { useState, useMemo } from "react";
import COURSES from "../data/courses.json";
import { DIMENSIONS, generateNarrative } from "../lib/fitEngine";

// Optional: point this at a Cloudflare Worker / serverless proxy that holds
// your Anthropic API key server-side. Leave empty → local narrative generator.
const AI_PROXY_URL = "";

const C = {
  ink: "#16213E",
  blue: "#2244BB",
  blueSoft: "#E8EDFB",
  green: "#1E9E6A",
  greenSoft: "#E4F4ED",
  amber: "#D08700",
  amberSoft: "#FCF3DD",
  red: "#C94040",
  redSoft: "#FBEAEA",
  paper: "#F7F6F1",
  line: "#D9DCE8",
  grey: "#6B7280",
};

const INTERESTS = [
  "Programming", "Mathematics", "Economics & finance", "Design & creativity",
  "Machines & hardware", "People & communication", "Science & research", "Building things",
];

const scoreColor = (s) => (s >= 70 ? C.green : s >= 45 ? C.amber : C.red);
const scoreSoft = (s) => (s >= 70 ? C.greenSoft : s >= 45 ? C.amberSoft : C.redSoft);

function FitBar({ score }) {
  return (
    <div className="w-full h-2 rounded-full" style={{ background: "#E7E7E0" }}>
      <div
        className="h-2 rounded-full transition-all duration-500"
        style={{ width: `${score}%`, background: scoreColor(score) }}
      />
    </div>
  );
}

function Chip({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className="px-3 py-1.5 rounded-full text-sm transition-colors"
      style={{
        border: `1.5px solid ${active ? C.blue : C.line}`,
        background: active ? C.blue : "#fff",
        color: active ? "#fff" : C.ink,
      }}
    >
      {children}
    </button>
  );
}

export default function Confronta() {
  const [profile, setProfile] = useState({
    interests: ["Programming"],
    mathStrength: 3,
    avgMark: 78,
    isee: "mid",
    goal: "work",
    awayFromHome: true,
  });
  const [selected, setSelected] = useState(["polito", "its-ict"]);
  const [personalized, setPersonalized] = useState(true);
  const [profileOpen, setProfileOpen] = useState(true);
  const [aiText, setAiText] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  const pair = useMemo(
    () => selected.map((id) => COURSES.find((c) => c.id === id)).filter(Boolean),
    [selected]
  );

  const toggleCourse = (id) => {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 2) return [prev[1], id];
      return [...prev, id];
    });
    setAiText("");
  };

  const toggleInterest = (i) =>
    setProfile((p) => ({
      ...p,
      interests: p.interests.includes(i)
        ? p.interests.filter((x) => x !== i)
        : [...p.interests, i],
    }));

  const fits = useMemo(
    () =>
      pair.map((course) =>
        Object.fromEntries(DIMENSIONS.map((d) => [d.key, d.fn(course, profile)]))
      ),
    [pair, profile]
  );

  async function explain() {
    if (pair.length < 2) return;
    setAiLoading(true);
    setAiText("");
    try {
      if (AI_PROXY_URL) {
        const res = await fetch(AI_PROXY_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ profile, pair }),
        });
        const data = await res.json();
        setAiText(data.text || generateNarrative(pair, fits, profile));
      } else {
        // Deterministic narrative from the fit engine — no server, no key, no cost.
        await new Promise((r) => setTimeout(r, 350)); // brief pause reads as "thinking"
        setAiText(generateNarrative(pair, fits, profile));
      }
    } catch {
      setAiText(generateNarrative(pair, fits, profile));
    } finally {
      setAiLoading(false);
    }
  }

  const gridPaper = {
    background: `
      linear-gradient(${C.paper} 0, ${C.paper} 0),
      repeating-linear-gradient(0deg, transparent, transparent 27px, rgba(34,68,187,0.07) 27px, rgba(34,68,187,0.07) 28px),
      repeating-linear-gradient(90deg, transparent, transparent 27px, rgba(34,68,187,0.07) 27px, rgba(34,68,187,0.07) 28px)
    `,
    backgroundColor: C.paper,
  };

  return (
    <div
      className="min-h-screen"
      style={{ ...gridPaper, color: C.ink, fontFamily: "'Archivo', system-ui, sans-serif" }}
    >
      {/* Fonts */}
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;800&family=Space+Mono:wght@400;700&display=swap');`}</style>

      <header className="px-6 pt-8 pb-5 max-w-5xl mx-auto">
        <div className="flex items-baseline gap-3 flex-wrap">
          <h1 className="text-4xl font-extrabold tracking-tight" style={{ color: C.blue }}>
            Confronta
          </h1>
          <span className="text-sm" style={{ color: C.grey, fontFamily: "'Space Mono', monospace" }}>
            same data · your lens
          </span>
        </div>
        <p className="mt-2 text-sm max-w-xl" style={{ color: C.grey }}>
          Pick two paths. The comparison re-scores against <em>your</em> profile — not a generic
          ranking. Prototype · sample data, Lombardia–Piemonte.
        </p>
      </header>

      <main className="px-6 pb-16 max-w-5xl mx-auto space-y-6">
        {/* Profile */}
        <section className="rounded-2xl p-5" style={{ background: "#fff", border: `1.5px solid ${C.line}` }}>
          <button className="flex items-center justify-between w-full" onClick={() => setProfileOpen((o) => !o)}>
            <h2 className="font-bold text-lg">1 · Your profile — the lens</h2>
            <span style={{ color: C.blue, fontFamily: "'Space Mono', monospace" }}>
              {profileOpen ? "−" : "+"}
            </span>
          </button>

          {profileOpen && (
            <div className="mt-4 space-y-5">
              <div>
                <div className="text-xs uppercase tracking-widest mb-2" style={{ color: C.grey }}>
                  Interests
                </div>
                <div className="flex flex-wrap gap-2">
                  {INTERESTS.map((i) => (
                    <Chip key={i} active={profile.interests.includes(i)} onClick={() => toggleInterest(i)}>
                      {i}
                    </Chip>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <div className="text-xs uppercase tracking-widest mb-2" style={{ color: C.grey }}>
                    Math strength · {profile.mathStrength}/5
                  </div>
                  <input
                    type="range" min="1" max="5" value={profile.mathStrength} className="w-full"
                    onChange={(e) => setProfile((p) => ({ ...p, mathStrength: +e.target.value }))}
                    style={{ accentColor: C.blue }}
                  />
                </div>
                <div>
                  <div className="text-xs uppercase tracking-widest mb-2" style={{ color: C.grey }}>
                    Average mark · {profile.avgMark}/100
                  </div>
                  <input
                    type="range" min="60" max="100" value={profile.avgMark} className="w-full"
                    onChange={(e) => setProfile((p) => ({ ...p, avgMark: +e.target.value }))}
                    style={{ accentColor: C.blue }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                <div>
                  <div className="text-xs uppercase tracking-widest mb-2" style={{ color: C.grey }}>
                    ISEE band
                  </div>
                  <div className="flex gap-2">
                    {[["low", "< €15k"], ["mid", "€15–35k"], ["high", "> €35k"]].map(([v, l]) => (
                      <Chip key={v} active={profile.isee === v} onClick={() => setProfile((p) => ({ ...p, isee: v }))}>
                        {l}
                      </Chip>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-widest mb-2" style={{ color: C.grey }}>
                    After the diploma, I want to…
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {[["work", "Work soon"], ["salary", "Max salary"], ["study", "Master's"]].map(([v, l]) => (
                      <Chip key={v} active={profile.goal === v} onClick={() => setProfile((p) => ({ ...p, goal: v }))}>
                        {l}
                      </Chip>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-widest mb-2" style={{ color: C.grey }}>
                    Living
                  </div>
                  <Chip
                    active={profile.awayFromHome}
                    onClick={() => setProfile((p) => ({ ...p, awayFromHome: !p.awayFromHome }))}
                  >
                    {profile.awayFromHome ? "Away from home" : "Living at home"}
                  </Chip>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Course picker */}
        <section>
          <h2 className="font-bold text-lg mb-3">2 · Pick two paths</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {COURSES.map((c) => {
              const active = selected.includes(c.id);
              return (
                <button
                  key={c.id}
                  onClick={() => toggleCourse(c.id)}
                  className="text-left rounded-2xl p-4 transition-all"
                  style={{
                    background: active ? C.blueSoft : "#fff",
                    border: `1.5px solid ${active ? C.blue : C.line}`,
                    boxShadow: active ? `3px 3px 0 ${C.blue}` : "none",
                  }}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className="text-xs px-2 py-0.5 rounded-full"
                      style={{
                        background: c.type === "ITS" ? C.greenSoft : C.blueSoft,
                        color: c.type === "ITS" ? C.green : C.blue,
                        fontFamily: "'Space Mono', monospace",
                      }}
                    >
                      {c.type} · {c.years}y
                    </span>
                    {active && <span style={{ color: C.blue, fontWeight: 800 }}>✓</span>}
                  </div>
                  <div className="mt-2 font-semibold leading-tight">{c.name}</div>
                  <div className="text-sm" style={{ color: C.grey }}>
                    {c.inst} · {c.city}
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Comparison */}
        {pair.length === 2 && (
          <section className="rounded-2xl overflow-hidden" style={{ background: "#fff", border: `1.5px solid ${C.line}` }}>
            <div className="p-5 flex flex-wrap items-center justify-between gap-3" style={{ borderBottom: `1.5px solid ${C.line}` }}>
              <h2 className="font-bold text-lg">3 · The comparison</h2>
              <div className="flex rounded-full p-1" style={{ background: C.paper, border: `1.5px solid ${C.line}` }}>
                {[["Neutral view", false], ["Your lens", true]].map(([label, val]) => (
                  <button
                    key={label}
                    onClick={() => setPersonalized(val)}
                    className="px-4 py-1.5 rounded-full text-sm font-semibold transition-all"
                    style={{
                      background: personalized === val ? C.blue : "transparent",
                      color: personalized === val ? "#fff" : C.grey,
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2">
              {pair.map((c, i) => (
                <div
                  key={c.id}
                  className="p-4"
                  style={{ borderRight: i === 0 ? `1.5px solid ${C.line}` : "none", background: C.paper }}
                >
                  <div className="font-extrabold" style={{ color: C.blue }}>{c.name}</div>
                  <div className="text-sm" style={{ color: C.grey }}>{c.inst}</div>
                </div>
              ))}
            </div>

            {DIMENSIONS.map((d) => (
              <div key={d.key} style={{ borderTop: `1.5px solid ${C.line}` }}>
                <div className="px-4 pt-3 text-xs uppercase tracking-widest" style={{ color: C.grey }}>
                  {d.label}
                </div>
                <div className="grid grid-cols-2">
                  {pair.map((c, i) => {
                    const f = fits[i][d.key];
                    const raw =
                      d.key === "admission"
                        ? `${c.test} · selectivity ${c.selectivity}/100 · math load ${c.mathLoad}/5`
                        : d.key === "afford"
                        ? `€${c.costByIsee[profile.isee].toLocaleString()}/y fees · rent ~€${c.cityRent}/m (${c.city})`
                        : d.key === "interest"
                        ? c.subjects.join(" · ")
                        : `${c.employment1y}% employed in 1y · €${c.salary.toLocaleString()} entry · master's ${c.mastersAccess}/5`;
                    return (
                      <div key={c.id} className="p-4" style={{ borderRight: i === 0 ? `1.5px solid ${C.line}` : "none" }}>
                        <div className="text-sm" style={{ fontFamily: "'Space Mono', monospace" }}>{raw}</div>
                        {personalized && (
                          <div className="mt-3 rounded-xl p-3" style={{ background: scoreSoft(f.score) }}>
                            <div className="flex items-center gap-2 mb-2">
                              <span
                                className="text-sm font-bold"
                                style={{ color: scoreColor(f.score), fontFamily: "'Space Mono', monospace" }}
                              >
                                {f.score}/100 for you
                              </span>
                            </div>
                            <FitBar score={f.score} />
                            <div className="mt-2 text-xs" style={{ color: C.ink }}>{f.note}</div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            <div className="p-5" style={{ borderTop: `1.5px solid ${C.line}`, background: C.paper }}>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={explain}
                  disabled={aiLoading}
                  className="px-5 py-2.5 rounded-full font-semibold text-sm"
                  style={{ background: aiLoading ? C.grey : C.ink, color: "#fff" }}
                >
                  {aiLoading ? "Thinking…" : "Explain the differences for me"}
                </button>
                <span className="text-xs" style={{ color: C.grey }}>
                  Explanation derived only from the data above · never says which is “better”
                </span>
              </div>
              {aiText && (
                <div
                  className="mt-4 rounded-xl p-4 text-sm whitespace-pre-wrap leading-relaxed"
                  style={{ background: "#fff", border: `1.5px dashed ${C.blue}` }}
                >
                  {aiText}
                </div>
              )}
            </div>
          </section>
        )}

        {pair.length < 2 && (
          <div
            className="rounded-2xl p-8 text-center"
            style={{ background: "#fff", border: `1.5px dashed ${C.line}`, color: C.grey }}
          >
            Select {2 - pair.length} more path{pair.length === 1 ? "" : "s"} above to see the
            personalized comparison.
          </div>
        )}

        <footer className="text-xs pt-2" style={{ color: C.grey }}>
          Prototype · sample figures for demonstration, modelled on public AlmaLaurea / MUR ranges ·
          no student data stored.
        </footer>
      </main>
    </div>
  );
}
