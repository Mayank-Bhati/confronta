import React, { useState } from "react";

import { useApp } from "../context";
import { INTEREST_TAGS, DATE_LOCALE, mono, display } from "../constants";
import { Bar, ChipBtn, Section, BackLink } from "../ui";
import { DIMS } from "../../../lib/scoreEngine";
import CITIES from "../../../data/cities-v2.json";
import HOME_CITIES from "../../../data/home-cities.json";
import COURSES from "../../../data/courses-v2.json";

// accent-insensitive match: "forli" finds Forlì, "aqu" finds L'Aquila
const fold = (s) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z]/g, "");

function CityPicker({ T, t, value, onPick }) {
  const selected = HOME_CITIES.find((c) => c.id === value) || null;
  const [query, setQuery] = useState(null); // null = not editing, show selection
  const shown = query === null ? (selected ? selected.name : "") : query;
  const matches = query === null ? [] : HOME_CITIES.filter((c) => fold(c.name).startsWith(fold(query))).slice(0, 8);
  return (
    <div className="relative">
      <input
        type="text" value={shown} placeholder={t("city_type")}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={(e) => { setQuery(""); e.target.select(); }}
        onBlur={() => setTimeout(() => setQuery(null), 150)}
        className="w-full rounded-xl px-3 py-2.5 text-sm"
        style={{ border: `1.5px solid ${T.line}`, background: T.card2, color: T.ink }}
      />
      {query !== null && query.length > 0 && (
        <div className="absolute z-20 mt-1 w-full rounded-xl overflow-hidden shadow-lg" style={{ border: `1.5px solid ${T.line}`, background: T.card2 }}>
          {matches.length === 0 && <div className="px-3 py-2.5 text-sm" style={{ color: T.grey }}>{t("city_none")}</div>}
          {matches.map((c) => (
            <button key={c.id} onMouseDown={() => { onPick(c.id); setQuery(null); }}
              className="block w-full text-left px-3 py-2.5 text-sm hover:opacity-80"
              style={{ color: T.ink, background: c.id === value ? T.violetSoft : "transparent" }}>
              {c.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Reveal() {
  const { T, t, td, lang, norm, ident, identTitle, profile, setProfile, toggleGoal, savedToName, lastResult, setShowProfiles, activeProfile, openResult, deleteResult, go, historyList, store, moveResult, goToCourse } = useApp();
  return (
    <>
          <div className="max-w-4xl mx-auto space-y-5">
            <BackLink />
            <div className="cc-fade-up rounded-3xl p-7 md:p-10" style={{ background: "linear-gradient(160deg,#16255F 0%,#2244BB 55%,#4D3FB8 100%)", color: "#fff", backgroundImage: "radial-gradient(rgba(255,255,255,0.10) 1px, transparent 1px), linear-gradient(160deg,#16255F 0%,#2244BB 55%,#4D3FB8 100%)", backgroundSize: "22px 22px, cover" }}>
              <div className="text-xs uppercase" style={{ ...mono, letterSpacing: ".28em", color: "#AAB8E8" }}>{t("reveal_youare")}</div>
              <h2 className="font-bold mt-2" style={{ ...display, fontSize: "clamp(36px,7vw,54px)", lineHeight: 1.05, letterSpacing: "-.01em" }}>
                {identTitle}
              </h2>
              {/* Two plain bullets, each a full sentence — testers found the
                  single run-on paragraph heavy to read. */}
              <ul className="mt-3 space-y-1.5 text-sm md:text-base" style={{ color: "#D8DFF6", maxWidth: "52ch" }}>
                {[0, 1].map((i) => (
                  <li key={i} className="flex gap-2">
                    <span aria-hidden style={{ color: "#8FE3C0" }}>•</span>
                    <span>
                      <b style={{ color: "#fff" }}>{t(`dim_${ident.letters[i]}`)}</b>
                      {" — "}{t(`dimd_${ident.letters[i]}`).toLowerCase()}.
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-2.5 text-sm" style={{ color: "#AAB8E8", maxWidth: "48ch" }}>{t("reveal_blurb")}</p>
              {savedToName ? (
                <p className="mt-3 text-xs font-semibold" style={{ color: "#8FE3C0" }}>{t("reveal_saved_to", { name: savedToName })}</p>
              ) : lastResult ? (
                <button onClick={() => setShowProfiles(true)} className="mt-3 text-xs font-bold underline" style={{ color: "#AAB8E8" }}>
                  {t("reveal_create_prompt")}
                </button>
              ) : null}
              <div className="mt-6 space-y-2.5">
                {DIMS.map((d) => (
                  <div key={d} className="flex items-center gap-3">
                    <span className="w-28 text-xs font-semibold" style={{ color: "#D8DFF6" }}>{t(`dim_${d}`)}</span>
                    <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.18)" }}>
                      <div className="h-2 rounded-full transition-all duration-500" style={{ width: `${norm[d]}%`, background: "linear-gradient(90deg,#8FE3C0,#CFF3E3)" }} />
                    </div>
                    <span className="w-8 text-xs text-right" style={{ ...mono, color: "#CFF3E3" }}>{norm[d]}</span>
                  </div>
                ))}
              </div>
            </div>

            {historyList.length > 0 && (
              <Section>
                <div className="text-xs uppercase tracking-widest mb-3" style={{ color: T.grey }}>{t("pf_history")}</div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {historyList.map((r) => {
                    const current = lastResult?.id === r.id;
                    const title = t(`pair_${r.letters}`) === `pair_${r.letters}` ? t("pair_XX") : t(`pair_${r.letters}`);
                    return (
                      <div key={r.id} onClick={() => openResult(r)} role="button" tabIndex={0}
                        onKeyDown={(e) => e.key === "Enter" && openResult(r)}
                        className="cc-card relative text-left rounded-xl p-3 cursor-pointer"
                        style={{ background: current ? T.violetSoft : T.card2, border: `1.5px solid ${current ? T.violet : T.line}` }}>
                        <button onClick={(e) => { e.stopPropagation(); deleteResult(r.id); }}
                          aria-label={t("pf_del")} title={t("pf_del")}
                          className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full text-xs flex items-center justify-center transition-colors hover:opacity-100 opacity-60"
                          style={{ color: T.grey, border: `1px solid ${T.line}` }}>
                          ✕
                        </button>
                        <div className="font-bold text-sm pr-6" style={{ ...display, color: current ? T.accent : T.ink }}>{title}</div>
                        <div className="text-xs mt-1" style={{ ...mono, color: T.grey }}>
                          {new Date(r.date).toLocaleDateString(DATE_LOCALE[lang] || "en-GB", { day: "numeric", month: "short", year: "numeric" })}
                        </div>
                        {/* Reassign this result to another profile. Shown only
                            when there is somewhere else to put it. */}
                        {(store?.profiles?.length > (activeProfile ? 1 : 0)) && (
                          <select
                            value={activeProfile?.id || ""}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => { e.stopPropagation(); moveResult(r.id, e.target.value || null); }}
                            className="mt-1.5 w-full rounded-lg px-2 py-1 text-xs"
                            style={{ border: `1px solid ${T.line}`, background: T.card, color: T.grey }}>
                            <option value="">{t("res_no_profile")}</option>
                            {store.profiles.map((p) => (
                              <option key={p.id} value={p.id}>{t("res_move_to", { name: p.name })}</option>
                            ))}
                          </select>
                        )}
                        {/* the choice made in Compare, shown with its result */}
                        {r.finalChoice && COURSES.find((c) => c.id === r.finalChoice) && (
                          <div className="text-xs mt-1.5 font-semibold" style={{ color: T.green }}>
                            ✓ {t("res_choice")}: {COURSES.find((c) => c.id === r.finalChoice).name}
                            <span style={{ color: T.grey, fontWeight: 400 }}> — {COURSES.find((c) => c.id === r.finalChoice).inst}</span>
                            <button onClick={(e) => { e.stopPropagation(); goToCourse(r.finalChoice); }}
                              className="block mt-1 underline" style={{ color: T.accent }}>
                              {t("res_take_me")}
                            </button>
                          </div>
                        )}
                      </div>
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
              {/* Affinity is an average over the ticked tags, so ticking nearly
                  everything makes every world score alike and the ranking falls
                  back on the survey. That is the right behaviour — if you like
                  everything, your likes cannot choose for you — but it happens
                  silently, so say it rather than letting the list quietly
                  flatten. Measured: 7 tags spread the worlds 66 points apart,
                  17 tags only 34. */}
              {profile.interests.length >= 12 && (
                <p className="text-xs mt-3" style={{ color: T.amber }}>
                  {t("check_too_many", { n: profile.interests.length, total: INTEREST_TAGS.length })}
                </p>
              )}

              <div className="mt-6">
                <div className="text-xs uppercase tracking-widest mb-2" style={{ color: T.grey }}>{t("goal_title")}</div>
                <div className="flex flex-wrap gap-2">
                  {[["work", t("goal_work")], ["study", t("goal_study")], ["unsure", t("goal_unsure")]].map(([v, l]) => (
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
                  <ChipBtn active={profile.locationMode === "anywhere"} onClick={() => setProfile((p) => ({ ...p, locationMode: "anywhere" }))}>{t("loc_anywhere")}</ChipBtn>
                  <ChipBtn active={profile.locationMode === "home"} onClick={() => setProfile((p) => ({ ...p, locationMode: "home" }))}>{t("living_home")}</ChipBtn>
                  <ChipBtn active={profile.locationMode === "cities"} onClick={() => setProfile((p) => ({ ...p, locationMode: "cities" }))}>{t("living_away")}</ChipBtn>
                </div>
              </div>

              {profile.locationMode === "home" && (
                <div className="mt-4">
                  <div className="text-xs uppercase tracking-widest mb-2" style={{ color: T.grey }}>{t("city_label")}</div>
                  <CityPicker T={T} t={t} value={profile.homeCityId} onPick={(id) => setProfile((p) => ({ ...p, homeCityId: id }))} />
                </div>
              )}

              {profile.locationMode === "cities" && (
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
    </>
  );
}
