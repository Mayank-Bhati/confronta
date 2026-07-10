import React from "react";

import { useApp } from "../context";
import { INTEREST_TAGS, DATE_LOCALE, mono, display } from "../constants";
import { Bar, ChipBtn, Section, BackLink } from "../ui";
import { DIMS } from "../../../lib/scoreEngine";
import CITIES from "../../../data/cities-v2.json";

export default function Reveal() {
  const { T, t, td, lang, norm, ident, identTitle, profile, setProfile, toggleGoal, savedToName, lastResult, setShowProfiles, activeProfile, openResult, deleteResult, go, historyList } = useApp();
  return (
    <>
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
    </>
  );
}
