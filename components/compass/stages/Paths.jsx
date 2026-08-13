import React, { useState } from "react";

import { useApp } from "../context";
import { mono, display } from "../constants";
import { ChipBtn, Section, InstitutionCard, BackLink } from "../ui";
import CITIES from "../../../data/cities-v2.json";
import COURSES from "../../../data/courses-v2.json";

export default function Paths() {
  const { T, t, td, career, world, prefs, setPrefs, profile, setProfile, homeCity, institutions, finalists, toggleFinalist, go, awayFromHome, toggleGoal } = useApp();
  const [beyondOpen, setBeyondOpen] = useState(false);

  // Why the list is empty matters. "Relax a filter" is wrong advice when no
  // filter is set and the real reason is that this job is only reached through
  // an ITS, which cannot answer a "master's & beyond" goal.
  const allForCareer = (career.courses || []).map((id) => COURSES.find((c) => c.id === id)).filter(Boolean);
  const onlyITS = allForCareer.length > 0 && allForCareer.every((c) => c.type === "ITS");
  const blockedByStudyGoal = onlyITS && (profile.goals || []).includes("study");
  return (
    <>
          <>
            <BackLink label={td(world.name)} />
            <h2 className="font-black text-2xl md:text-3xl" style={display}>{t("paths_to", { c: td(career.name) })}</h2>
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
                  <div className="text-xs uppercase tracking-widest mb-2" style={{ color: T.grey }}>{t("own_label")}</div>
                  <div className="flex gap-2 flex-wrap">
                    {[["any", t("own_any")], ["public", t("own_public")], ["private", t("own_private")]].map(([v, l]) => (
                      <ChipBtn key={v} active={prefs.ownership === v} onClick={() => setPrefs((p) => ({ ...p, ownership: v }))}>{l}</ChipBtn>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-widest mb-2" style={{ color: T.grey }}>
                    {t("isee_label")}{" "}
                    <a href="https://www.inps.it/it/it/dettaglio-approfondimento.schede-informative.49936.tipologie-di-isee.html"
                      target="_blank" rel="noreferrer" className="underline normal-case" style={{ color: T.accent }}>
                      {t("isee_what")}
                    </a>
                  </div>
                  <div className="flex gap-2">
                    {[["low", "≤ €22k (no-tax area)"], ["mid", "€22–30k"], ["high", "> €30k"]].map(([v, l]) => (
                      <ChipBtn key={v} active={profile.isee === v} onClick={() => setProfile((p) => ({ ...p, isee: v }))}>{l}</ChipBtn>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-widest mb-2" style={{ color: T.grey }}>
                    {prefs.budget > 0 ? t("budget_label", { n: prefs.budget.toLocaleString() }) : t("budget_label_off")}
                  </div>
                  <input type="range" min="0" max="2000" step="50" value={prefs.budget} onChange={(e) => setPrefs((p) => ({ ...p, budget: +e.target.value }))} className="w-full" />
                  <p className="text-xs mt-1" style={{ color: T.grey }}>{prefs.budget > 0 ? t(awayFromHome ? "budget_hint_away" : "budget_hint_home") : t("budget_hint_off")}</p>
                </div>
                {profile.locationMode === "home" && homeCity && (
                  <div>
                    <div className="text-xs uppercase tracking-widest mb-2" style={{ color: T.grey }}>
                      {prefs.maxDistance > 0 ? t("dist_label", { city: homeCity.name, n: prefs.maxDistance }) : t("dist_label_off", { city: homeCity.name })}
                    </div>
                    <input type="range" min="0" max="500" step="10" value={prefs.maxDistance} onChange={(e) => setPrefs((p) => ({ ...p, maxDistance: +e.target.value }))} className="w-full" />
                  </div>
                )}
                {profile.locationMode === "cities" && profile.relocationCities.length > 0 && (
                  <div>
                    <div className="text-xs uppercase tracking-widest mb-2" style={{ color: T.grey }}>
                      {prefs.cityRadius > 0 ? t("radius_label", { n: prefs.cityRadius }) : t("radius_label_off")}
                    </div>
                    <input type="range" min="0" max="500" step="10" value={prefs.cityRadius} onChange={(e) => setPrefs((p) => ({ ...p, cityRadius: +e.target.value }))} className="w-full" />
                  </div>
                )}
              </div>
              {/* Type a city or region to see only universities there, and sort
                  by distance — the two things testers reached for first. */}
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3 items-end">
                <div>
                  <div className="text-xs uppercase tracking-widest mb-2" style={{ color: T.grey }}>{t("place_label")}</div>
                  <input type="search" value={prefs.place || ""} placeholder={t("place_ph")}
                    onChange={(e) => setPrefs((p) => ({ ...p, place: e.target.value }))}
                    className="w-full rounded-xl px-3 py-2.5 text-sm"
                    style={{ border: `1.5px solid ${T.line}`, background: T.card2, color: T.ink }} />
                </div>
                <div>
                  <div className="text-xs uppercase tracking-widest mb-2" style={{ color: T.grey }}>{t("sort_label")}</div>
                  <div className="flex gap-2 flex-wrap">
                    {[["fit", t("sort_bestfit")], ["distance", t("sort_nearest")]].map(([v, l]) => (
                      <ChipBtn key={v} active={(prefs.sortBy || "fit") === v} onClick={() => setPrefs((p) => ({ ...p, sortBy: v }))}>{l}</ChipBtn>
                    ))}
                  </div>
                </div>
              </div>
              {profile.locationMode === "cities" && profile.relocationCities.length > 0 && (
                <p className="text-xs mt-3" style={{ color: T.grey }}>
                  {t("cities_note", { list: profile.relocationCities.map((id) => CITIES.find((c) => c.id === id)?.name).join(", ") })}
                </p>
              )}
            </Section>

            {institutions.length === 0 && (
              <Section>
                {blockedByStudyGoal ? (
                  <>
                    <p className="text-sm" style={{ color: T.ink }}>{t("no_match_its_study", { c: td(career.name) })}</p>
                    <button onClick={() => toggleGoal("work")}
                      className="mt-3 px-4 py-2 rounded-full text-sm font-bold text-white transition-transform hover:scale-105"
                      style={{ background: T.grad }}>
                      {t("no_match_switch_goal")}
                    </button>
                  </>
                ) : prefs.place ? (
                  <>
                    <p className="text-sm" style={{ color: T.ink }}>{t("no_match_place", { p: prefs.place })}</p>
                    <button onClick={() => setPrefs((x) => ({ ...x, place: "" }))}
                      className="mt-3 px-4 py-2 rounded-full text-sm font-bold" style={{ border: `1.5px solid ${T.lineStrong}`, color: T.ink }}>
                      {t("no_match_clear_place")}
                    </button>
                  </>
                ) : (
                  <p className="text-sm" style={{ color: T.grey }}>{t("no_match")}</p>
                )}
              </Section>
            )}

            {(() => {
              const within = institutions.filter((c) => !c.beyondRange);
              const beyond = institutions.filter((c) => c.beyondRange);
              const card = (c) => (
                <InstitutionCard key={c.id} c={c} showFit chosen={finalists.includes(c.id)} onCardClick={() => toggleFinalist(c.id)}
                  saveCtx={{ careerId: career.id, careerName: career.name, worldName: td(world.name) }} />
              );
              return (
                <>
                  {beyond.length > 0 && within.length > 0 && (
                    <div className="text-xs uppercase tracking-widest" style={{ color: T.grey }}>{t("within_range")}</div>
                  )}
                  {within.length === 0 && institutions.length > 0 && (
                    <Section><p className="text-sm" style={{ color: T.grey }}>{t("none_within_range")}</p></Section>
                  )}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">{within.map(card)}</div>
                  {beyond.length > 0 && (
                    <div className="mt-2">
                      <button onClick={() => setBeyondOpen((o) => !o)} className="text-sm font-bold py-2" style={{ color: T.grey }}>
                        {beyondOpen ? "▾ " : "▸ "}{t("beyond_range", { n: beyond.length })}
                      </button>
                      {beyondOpen && (
                        <>
                          <p className="text-xs mb-3" style={{ color: T.grey }}>{t("beyond_range_hint")}</p>
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">{beyond.map(card)}</div>
                        </>
                      )}
                    </div>
                  )}
                </>
              );
            })()}

            {institutions.length > 0 && finalists.length < 2 && (
              <p className="text-xs text-center" style={{ color: T.grey }}>{t("pick_hint")}</p>
            )}
          </>
    </>
  );
}
