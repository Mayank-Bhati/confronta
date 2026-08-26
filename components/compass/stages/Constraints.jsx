import React, { useState } from "react";

import { useApp } from "../context";
import { mono, display } from "../constants";
import { ChipBtn, Section, BackLink } from "../ui";
import CONSTRAINTS from "../../../data/constraints.json";
import HOME_CITIES from "../../../data/home-cities.json";

// The second survey. It deliberately measures nothing about personality — the
// first survey did that and this one must never imply it fell short. These
// questions ask what a student can live with, and every answer sets a field the
// ranking engine already reads, so the course list reorders the moment they
// finish. Skippable at every step, and abandoning it halfway still applies what
// was answered.
export default function Constraints() {
  const { T, t, td, prefs, setPrefs, profile, setProfile, go, applyConstraints } = useApp();
  const [i, setI] = useState(0);
  const [answers, setAnswers] = useState({});
  const [city, setCity] = useState(profile.homeCityId || "");
  const [cityQuery, setCityQuery] = useState("");

  // questions whose showIf no longer holds are skipped rather than shown empty
  const visible = CONSTRAINTS.questions.filter((q) => {
    if (!q.showIf) return true;
    return Object.entries(q.showIf).every(([k, v]) => answers[k] === v);
  });
  const q = visible[i];
  const done = i >= visible.length;

  function answer(value) {
    const next = { ...answers, [q.field]: value };
    setAnswers(next);
    if (q.id === "where" && value !== "home") setCity("");
    setI((n) => n + 1);
  }

  function finish(applied) {
    applyConstraints(applied, applied.locationMode === "home" ? city : "");
    go("filter");
  }

  if (done) {
    const count = Object.keys(answers).length;
    return (
      <>
        <BackLink />
        <Section>
          <div className="text-xs uppercase tracking-widest mb-2" style={{ ...mono, color: T.accent }}>
            {t("cs_done_eyebrow")}
          </div>
          <h2 className="font-black text-2xl md:text-3xl" style={display}>{t("cs_done_title")}</h2>
          <p className="text-sm mt-2" style={{ color: T.grey }}>{t("cs_done_sub", { n: count })}</p>
          <button onClick={() => finish(answers)}
            className="mt-5 px-6 py-3 rounded-full font-bold text-white transition-transform hover:scale-105"
            style={{ background: T.grad }}>
            {t("cs_done_cta")}
          </button>
        </Section>
      </>
    );
  }

  const needsCity = q.options.some((o) => o.needsCity);
  const matches = cityQuery.trim().length > 1
    ? HOME_CITIES.filter((c) => c.name.toLowerCase().startsWith(cityQuery.trim().toLowerCase())).slice(0, 6)
    : [];

  return (
    <>
      <BackLink />
      <Section>
        <div className="flex items-baseline justify-between gap-3 mb-1">
          <div className="text-xs uppercase tracking-widest" style={{ ...mono, color: T.grey }}>
            {t("cs_progress", { n: i + 1, total: visible.length })}
          </div>
          <button onClick={() => finish(answers)} className="text-xs underline" style={{ color: T.grey }}>
            {t("cs_skip_all")}
          </button>
        </div>

        <h2 className="font-black text-xl md:text-2xl mt-3" style={display}>{td(q.prompt)}</h2>
        {q.sub && <p className="text-sm mt-2" style={{ color: T.grey }}>{td(q.sub)}</p>}

        <div className="mt-5 flex flex-col gap-2.5">
          {q.options.map((o, k) => (
            <button key={k} onClick={() => answer(o.value)}
              className="text-left px-4 py-3.5 rounded-xl text-sm font-semibold transition-all hover:scale-[1.01]"
              style={{ background: T.card2, border: `1.5px solid ${T.line}`, color: T.ink }}>
              {td(o.text)}
            </button>
          ))}
        </div>

        {/* The home-city box only matters once "near home" is the live answer;
            without a city there is no origin to measure a commute from. */}
        {needsCity && answers.locationMode === "home" && !city && (
          <div className="mt-5">
            <div className="text-xs uppercase tracking-widest mb-2" style={{ color: T.grey }}>{t("cs_city_label")}</div>
            <input type="search" value={cityQuery} placeholder={t("cs_city_ph")}
              onChange={(e) => setCityQuery(e.target.value)}
              className="w-full rounded-xl px-3 py-2.5 text-sm"
              style={{ border: `1.5px solid ${T.line}`, background: T.card2, color: T.ink }} />
            <div className="flex gap-2 flex-wrap mt-2">
              {matches.map((c) => (
                <ChipBtn key={c.id} active={city === c.id} onClick={() => { setCity(c.id); setCityQuery(c.name); }}>
                  {c.name}
                </ChipBtn>
              ))}
            </div>
          </div>
        )}

        <button onClick={() => setI((n) => n + 1)} className="mt-5 text-sm underline" style={{ color: T.grey }}>
          {t("cs_skip_one")}
        </button>
      </Section>
    </>
  );
}
