import React from "react";

import { useApp } from "../context";
import { mono, display } from "../constants";
import { ChipBtn, Section, InstitutionCard, BackLink } from "../ui";

export default function SavedPage() {
  const { T, t, savedEntries, filteredSavedEntries, savedFilter, setSavedFilter, savedResultIds, resultLabel, finalists, toggleFinalist, go, savedProfileFilter, setSavedProfileFilter, savedProfileIds, profileLabel, td, startTournament, champion, clearChampion, toggleSave } = useApp();
  const championCourse = champion?.courseId ? savedEntries.find((s) => s.course.id === champion.courseId)?.course : null;
  return (
    <>
          <>
            <BackLink />
            <h2 className="font-black text-2xl md:text-3xl" style={display}>{t("saved_title", { n: filteredSavedEntries.length })}</h2>
            <p className="text-sm -mt-2" style={{ color: T.grey }}>{t("saved_sub")}</p>
            {savedEntries.length === 0 && <Section><p className="text-sm" style={{ color: T.grey }}>{t("saved_empty")}</p></Section>}
            {championCourse && (
              <div className="rounded-2xl p-4 flex items-baseline justify-between gap-3 flex-wrap" style={{ background: T.greenSoft, border: `1.5px solid ${T.green}` }}>
                <div>
                  <span className="text-xs uppercase tracking-widest font-bold" style={{ color: T.green }}>{t("saved_champion")}</span>
                  <div className="font-bold mt-0.5" style={display}>{championCourse.name} — {championCourse.inst}</div>
                </div>
                <button onClick={clearChampion} className="text-xs underline" style={{ color: T.grey }}>{t("saved_champion_clear")}</button>
              </div>
            )}
            {savedEntries.length >= 3 && (
              <button onClick={startTournament}
                className="px-5 py-2.5 rounded-full font-bold text-sm text-white transition-transform hover:scale-105"
                style={{ background: T.grad }}>
                {t("saved_tournament")}
              </button>
            )}
            {savedProfileIds.length > 1 && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs uppercase tracking-widest" style={{ color: T.grey }}>{t("saved_profile_label")}</span>
                <ChipBtn active={savedProfileFilter === "all"} onClick={() => setSavedProfileFilter("all")}>{t("saved_filter_all")}</ChipBtn>
                {savedProfileIds.map((pid) => (
                  <ChipBtn key={pid} active={savedProfileFilter === pid} onClick={() => setSavedProfileFilter(pid)}>{profileLabel(pid)}</ChipBtn>
                ))}
              </div>
            )}
            {savedResultIds.length > 1 && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs uppercase tracking-widest" style={{ color: T.grey }}>{t("saved_filter_label")}</span>
                <ChipBtn active={savedFilter === "all"} onClick={() => setSavedFilter("all")}>{t("saved_filter_all")}</ChipBtn>
                {savedResultIds.map((rid) => (
                  <ChipBtn key={rid} active={savedFilter === rid} onClick={() => setSavedFilter(rid)}>{resultLabel(rid === "none" ? null : rid)}</ChipBtn>
                ))}
              </div>
            )}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {filteredSavedEntries.map((s) => (
                <div key={`${s.courseId}::${s.careerId}`} className="relative">
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleSave(s.course, { careerId: s.careerId, careerName: s.careerName, worldName: s.worldName }); }}
                    aria-label={t("saved_remove")} title={t("saved_remove")}
                    className="absolute top-2 right-2 z-10 w-7 h-7 rounded-full text-sm flex items-center justify-center transition-opacity opacity-60 hover:opacity-100"
                    style={{ color: T.grey, background: T.card, border: `1px solid ${T.line}` }}>
                    ✕
                  </button>
                  <InstitutionCard c={s.course} chosen={finalists.includes(s.courseId)}
                    onCardClick={() => toggleFinalist(s.courseId)}
                    saveCtx={{ careerId: s.careerId, careerName: s.careerName, worldName: s.worldName }}
                    badge={s.careerName ? `${t("saved_from")}: ${s.worldName} → ${td(s.careerName)}` : null} />
                </div>
              ))}
            </div>

          </>
    </>
  );
}
