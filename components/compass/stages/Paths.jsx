import React from "react";

import { useApp } from "../context";
import { mono, display } from "../constants";
import { ChipBtn, Section, InstitutionCard, BackLink } from "../ui";
import CITIES from "../../../data/cities-v2.json";

export default function Paths() {
  const { T, t, td, career, world, prefs, setPrefs, profile, setProfile, homeCity, institutions, finalists, toggleFinalist, go, awayFromHome } = useApp();
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
                  <div className="text-xs uppercase tracking-widest mb-2" style={{ color: T.grey }}>{t("isee_label")}</div>
                  <div className="flex gap-2">
                    {[["low", "≤ €22k (no-tax area)"], ["mid", "€22–30k"], ["high", "> €30k"]].map(([v, l]) => (
                      <ChipBtn key={v} active={profile.isee === v} onClick={() => setProfile((p) => ({ ...p, isee: v }))}>{l}</ChipBtn>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-widest mb-2" style={{ color: T.grey }}>{t("budget_label", { n: prefs.budget.toLocaleString() })}</div>
                  <input type="range" min={awayFromHome ? 400 : 100} max="2000" step="50" value={prefs.budget} onChange={(e) => setPrefs((p) => ({ ...p, budget: +e.target.value }))} className="w-full" />
                  <p className="text-xs mt-1" style={{ color: T.grey }}>{t(awayFromHome ? "budget_hint_away" : "budget_hint_home")}</p>
                </div>
                {profile.locationMode === "home" && homeCity && (
                  <div>
                    <div className="text-xs uppercase tracking-widest mb-2" style={{ color: T.grey }}>{t("dist_label", { city: homeCity.name, n: prefs.maxDistance })}</div>
                    <input type="range" min="10" max="500" step="10" value={prefs.maxDistance} onChange={(e) => setPrefs((p) => ({ ...p, maxDistance: +e.target.value }))} className="w-full" />
                    <div className="flex gap-2 mt-1.5 flex-wrap">
                      {[[30, t("preset_prov")], [120, t("preset_reg")], [500, t("preset_all")]].map(([v, l]) => (
                        <ChipBtn key={v} active={prefs.maxDistance === v} onClick={() => setPrefs((p) => ({ ...p, maxDistance: v }))}>{l}</ChipBtn>
                      ))}
                    </div>
                  </div>
                )}
                {profile.locationMode === "cities" && profile.relocationCities.length > 0 && (
                  <div>
                    <div className="text-xs uppercase tracking-widest mb-2" style={{ color: T.grey }}>{t("radius_label", { n: prefs.cityRadius })}</div>
                    <input type="range" min="10" max="500" step="10" value={prefs.cityRadius} onChange={(e) => setPrefs((p) => ({ ...p, cityRadius: +e.target.value }))} className="w-full" />
                    <div className="flex gap-2 mt-1.5 flex-wrap">
                      {[[30, t("preset_prov")], [120, t("preset_reg")], [500, t("preset_all")]].map(([v, l]) => (
                        <ChipBtn key={v} active={prefs.cityRadius === v} onClick={() => setPrefs((p) => ({ ...p, cityRadius: v }))}>{l}</ChipBtn>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              {profile.locationMode === "cities" && profile.relocationCities.length > 0 && (
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
    </>
  );
}
