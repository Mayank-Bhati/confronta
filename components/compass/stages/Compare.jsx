import React from "react";

import { useApp } from "../context";
import { NATURE_KEY, mono, display } from "../constants";
import { Bar, Section, BackLink, GoogleLink, OfficialLink } from "../ui";
import { estimateMonthlyCost, prepList, generateNarrative, haversineKm, realOutcomes } from "../../../lib/fitEngine-v2";
import COURSES from "../../../data/courses-v2.json";

export default function Compare() {
  const { T, t, pair, profile, prefs, homeCity, compareDims, narrative, setNarrative, envPrefs, cityCostBadge, natureStyle, scoreColor, scoreSoft, td, awayFromHome, lastResult, chooseFinal, tourQueue, roundChoice, nextRound, crownChampion, champion } = useApp();
  const chosenId = roundChoice ?? lastResult?.finalChoice ?? null;
  return (
    <>
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
                    <div className="text-sm" style={{ color: T.grey }}>{c.inst} · {c.city}</div>
                    {c.admission && <div className="text-sm mt-0.5 font-semibold" style={{ color: c.admission === "open" ? T.green : T.amber }}>{t(`adm_${c.admission}`)} · {c.test}</div>}
                    <OfficialLink c={c} />
                  </div>
                ))}
              </div>

              {/* preparation sits right under the admission info it refers to */}
              <div className="mt-3">
                <div className="text-xs uppercase tracking-widest mb-2" style={{ color: T.grey }}>{t("cmp_prep")}</div>
                <div className="grid grid-cols-2 gap-3 md:gap-4">
                  {pair.map((c) => (
                    <div key={c.id} className="rounded-xl p-3 text-sm space-y-1" style={{ background: T.amberSoft }}>
                      {prepList(c, profile, t).map((item, i) => <div key={i}>→ {item}</div>)}
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-5">
                <div className="text-xs uppercase tracking-widest mb-2" style={{ color: T.grey }}>{t("cmp_study")}</div>
                <div className="grid grid-cols-2 gap-3 md:gap-4">
                  {pair.map((c) => (
                    <div key={c.id} className="rounded-xl p-3 text-sm" style={{ border: `1px solid ${T.line}` }}>
                      <div className="mb-2 px-2 py-1 rounded-lg inline-block font-semibold" style={{ background: natureStyle(c.nature).bg, color: natureStyle(c.nature).fg }}>
                        {t(NATURE_KEY[c.nature])}
                      </div>
                      {c.curriculumByYear ? (
                        ["1", "2", "3"].filter((y) => c.curriculumByYear[y]?.length).map((y) => (
                          <details key={y} className="cc-year mb-1" open={y === "1"}>
                            <summary className="cursor-pointer font-bold py-1 select-none" style={{ color: T.accent }}>
                              {t("year_label", { n: y })} — {t("subjects_count", { n: c.curriculumByYear[y].length })}
                            </summary>
                            {c.curriculumByYear[y].map((s, i) => (
                              <div key={i} className="pl-3 py-0.5" style={{ borderLeft: `2px solid ${T.line}`, fontWeight: /matemat|analisi|mathem|algebra|calcul/i.test(s.name) ? 700 : 400 }}>
                                {s.name}{s.ects ? ` — ${s.ects} ECTS` : ""}
                              </div>
                            ))}
                          </details>
                        ))
                      ) : (
                        c.curriculum.map((s, i) => (
                          <div key={i} className="pl-3 py-0.5" style={{ borderLeft: `2px solid ${T.line}`, fontWeight: /matemat|analisi|mathem|algebra|calcul/i.test(s) ? 700 : 400 }}>{s}</div>
                        ))
                      )}
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
                        <div className="text-base font-bold mb-1" style={{ ...mono, color: scoreColor(d.score) }}>{d.score}/100</div>
                        <Bar score={d.score} />
                        <div className="mt-1.5 text-sm">{d.note}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              <div className="mt-5">
                <div className="text-xs uppercase tracking-widest mb-2" style={{ color: T.grey }}>{t("cmp_reality")}</div>
                <div className="grid grid-cols-2 gap-3 md:gap-4">
                  {pair.map((c) => {
                    const r = realOutcomes(c);
                    return (
                      <div key={c.id} className="rounded-xl p-3 text-sm space-y-1" style={{ border: `1px solid ${T.line}` }}>
                        {r ? (
                          <>
                            {r.employment1y != null
                              ? <div><b>{r.employment1y}%</b> {t("cmp_emp_real")}</div>
                              : <div style={{ color: T.grey }}>{t("cmp_emp_suppressed")}</div>}
                            {r.wouldChooseAgain != null && <div><b>{r.wouldChooseAgain}%</b> {t("cmp_again")}</div>}
                            {r.teachSat != null && <div><b>{r.teachSat}%</b> {t("cmp_teach")}</div>}
                            {r.onTime != null && <div><b>{r.onTime}%</b> {t("cmp_ontime")}</div>}
                            {r.continuingMasters != null && (
                              <div><b>{r.continuingMasters}%</b> {t("cmp_masters")}</div>
                            )}
                            {r.netPay && <div><b>~€{r.netPay.toLocaleString()}</b> {t("cmp_pay_real")}</div>}
                            <a href={r.sourceOcc || r.sourceProf} target="_blank" rel="noreferrer" className="inline-block text-xs underline" style={{ color: T.accent }}>
                              {t("cmp_source_al", { y: r.occYear || r.profYear })}
                            </a>
                          </>
                        ) : (
                          <div style={{ color: T.grey }}>
                            {c.outcomes?.status === "its" ? t("cmp_nodata_its")
                              : c.outcomes?.status === "not_member" ? t("cmp_nodata_member")
                              : t("cmp_nodata")}
                          </div>
                        )}
                        <div style={{ color: T.grey }}>{td(c.env.cityVibe)}</div>
                      </div>
                    );
                  })}
                </div>
                <p className="text-xs mt-2" style={{ color: T.grey }}>{t("stats_note")}</p>
              </div>

              <div className="mt-5">
                <div className="text-xs uppercase tracking-widest mb-2" style={{ color: T.grey }}>{t("cmp_money")}</div>
                <div className="grid grid-cols-2 gap-3 md:gap-4">
                  {pair.map((c) => (
                    <div key={c.id} className="rounded-xl p-3 text-sm space-y-1" style={{ border: `1px solid ${T.line}`, ...mono }}>
                      <div>{t("cmp_fees", { n: c.costByIsee[profile.isee].toLocaleString() })}</div>
                      {awayFromHome && <div>{t("cmp_living", { city: c.city, r: cityCostBadge(c.city) || `~€${c.cityRent}/mo` })}</div>}
                      {profile.locationMode === "home" && homeCity && <div>{t("cmp_km", { n: haversineKm(homeCity.lat, homeCity.lon, c.lat, c.lon), city: homeCity.name })}</div>}
                      {(() => { const est = estimateMonthlyCost(c, envPrefs, profile.locationMode === "home" ? homeCity : null); const over = est.total - prefs.budget; return (
                        <div style={{ color: over > 0 ? T.amber : T.green, fontWeight: 700 }}>
                          {t("cmp_total", { n: est.total.toLocaleString(), b: prefs.budget.toLocaleString() })}
                        </div>
                      ); })()}
                      <div>{c.careerPay ? t("cmp_after_job", { n: c.careerPay.toLocaleString() }) : ""}</div>
                    </div>
                  ))}
                </div>
              </div>

              <p className="text-xs mt-5" style={{ color: T.grey }}>
                {t("cmp_sources_label")}: <a className="underline" href="https://www.almalaurea.it/news/rapporto-almalaurea-2025" target="_blank" rel="noreferrer">AlmaLaurea 2025</a> · <a className="underline" href="https://www.indire.it/2025/04/17/its-academy-ad-un-anno-dal-diploma-l84-dei-diplomati-trova-lavoro/" target="_blank" rel="noreferrer">INDIRE 2025</a> · {t("cmp_sources_official")}
              </p>

              <div className="mt-6">
                <button onClick={() => setNarrative(generateNarrative(pair, compareDims, profile, t))}
                  className="px-5 py-2.5 rounded-full font-semibold text-sm text-white transition-transform hover:scale-105" style={{ background: T.grad }}>
                  {t("cmp_explain")}
                </button>
                {narrative && (
                  <div className="cc-fade-up mt-3 rounded-xl p-4 text-sm whitespace-pre-wrap leading-relaxed" style={{ background: T.card2, border: `1.5px dashed ${T.violet}` }}>
                    {narrative}
                  </div>
                )}
              </div>

              {/* the final question */}
              <div className="mt-7 rounded-2xl p-4 md:p-5" style={{ background: T.wash || T.card2, border: `1.5px solid ${T.line}` }}>
                <h3 className="font-black text-lg mb-3" style={display}>{t("cmp_choose_q")}</h3>
                <div className="grid grid-cols-2 gap-3">
                  {pair.map((c) => {
                    const chosen = chosenId === c.id;
                    return (
                      <button key={c.id} onClick={() => chooseFinal(c.id)}
                        className="rounded-xl p-3 text-sm font-bold text-left transition-all"
                        style={{
                          border: `2px solid ${chosen ? T.green : T.line}`,
                          background: chosen ? T.greenSoft : "transparent",
                          color: chosen ? T.green : T.ink,
                        }}>
                        {chosen ? "✓ " : ""}{c.name}
                        <div className="text-xs font-normal mt-0.5" style={{ color: T.grey }}>{c.inst}</div>
                      </button>
                    );
                  })}
                </div>
                {chosenId && tourQueue == null && (
                  <p className="text-sm mt-3 font-semibold" style={{ color: T.green }}>{t("cmp_choose_done")}</p>
                )}
                {chosenId && tourQueue && tourQueue.length > 0 && (
                  <button onClick={() => nextRound(chosenId)}
                    className="mt-3 px-5 py-2.5 rounded-full font-bold text-sm text-white transition-transform hover:scale-105"
                    style={{ background: T.grad }}>
                    {t("cmp_next_round", { name: COURSES.find((x) => x.id === tourQueue[0])?.name || "…" })}
                  </button>
                )}
                {chosenId && tourQueue && tourQueue.length === 0 && champion?.courseId !== chosenId && (
                  <button onClick={() => crownChampion(chosenId)}
                    className="mt-3 px-5 py-2.5 rounded-full font-bold text-sm text-white transition-transform hover:scale-105"
                    style={{ background: T.grad }}>
                    🏆 {pair.find((c) => c.id === chosenId)?.name}
                  </button>
                )}
                {champion?.courseId && chosenId === champion.courseId && (
                  <p className="text-sm mt-3 font-semibold" style={{ color: T.green }}>{t("cmp_champion")}</p>
                )}
              </div>
            </Section>
          </>
    </>
  );
}
