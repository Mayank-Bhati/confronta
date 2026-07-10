import React from "react";

import { useApp } from "../context";
import { mono, display } from "../constants";
import { ChipBtn, Section, InstitutionCard, BackLink } from "../ui";

export default function SavedPage() {
  const { T, t, savedEntries, filteredSavedEntries, savedFilter, setSavedFilter, savedResultIds, resultLabel, finalists, toggleFinalist, go, savedProfileFilter, setSavedProfileFilter, savedProfileIds, profileLabel } = useApp();
  return (
    <>
          <>
            <BackLink />
            <h2 className="font-black text-2xl md:text-3xl" style={display}>{t("saved_title", { n: filteredSavedEntries.length })}</h2>
            <p className="text-sm -mt-2" style={{ color: T.grey }}>{t("saved_sub")}</p>
            {savedEntries.length === 0 && <Section><p className="text-sm" style={{ color: T.grey }}>{t("saved_empty")}</p></Section>}
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
                <InstitutionCard key={`${s.courseId}::${s.careerId}`} c={s.course} chosen={finalists.includes(s.courseId)}
                  onCardClick={() => toggleFinalist(s.courseId)}
                  saveCtx={{ careerId: s.careerId, careerName: s.careerName, worldName: s.worldName }}
                  badge={s.careerName ? `${t("saved_from")}: ${s.worldName} → ${s.careerName}` : null} />
              ))}
            </div>
            {finalists.length === 2 && (
              <button onClick={() => go("compare")} className="cc-glow w-full px-6 py-3.5 rounded-full font-bold text-white transition-transform hover:scale-[1.01]" style={{ background: T.grad, ...display }}>
                {t("saved_compare")}
              </button>
            )}
          </>
    </>
  );
}
