import React from "react";

import { useApp } from "./context";
import { Logo, PeopleIcon } from "./ui";
import { mono, display } from "./constants";
import { LANGS } from "../../lib/i18n";

export default function Header() {
  const { T, t, lang, theme, stage, goHome, goInsights, startSurvey, saved, go, updateStore, activeProfile, setShowProfiles } = useApp();
  return (
      <header className="sticky top-0 z-40" style={{ background: T.headerBg, backdropFilter: "blur(14px)", borderBottom: `1px solid ${T.line}` }}>
        <div className="max-w-[1500px] mx-auto px-3 md:px-10 py-2 md:py-3 flex items-center justify-between gap-2 md:gap-3 flex-wrap">
          <button onClick={goHome} className="flex items-center gap-2.5 group">
            <Logo color={T.violet} />
            <span className="hidden sm:inline text-lg md:text-xl font-semibold tracking-tight" style={{ color: T.ink }}>
              CareerCompass
            </span>
            <span className="hidden lg:inline text-xs ml-1" style={{ color: T.grey, ...mono }}>{t("tagline")}</span>
          </button>

          <nav className="flex items-center gap-1 md:gap-2.5 flex-wrap">
            <button onClick={goHome} className="hidden sm:block px-3 py-1.5 rounded-full text-sm font-semibold transition-colors hover:opacity-75"
              style={{ color: stage === "welcome" ? T.accent : T.ink }}>
              {t("nav_home")}
            </button>
            <button onClick={goInsights} className="px-3 py-1.5 rounded-full text-sm font-semibold transition-colors hover:opacity-75"
              style={{ color: stage === "reveal" ? T.accent : T.ink }}>
              {t("nav_insights")}
            </button>
            <button onClick={startSurvey} aria-label={t("nav_retake")} title={t("nav_retake")}
              className="px-2 sm:px-3 py-1.5 rounded-full text-sm font-semibold transition-colors hover:opacity-75" style={{ color: T.ink }}>
              <span className="sm:hidden">↻</span>
              <span className="hidden sm:inline">{t("nav_retake")}</span>
            </button>
            {saved.length > 0 && (
              <button onClick={() => go("saved")}
                className="px-3.5 py-1.5 rounded-full text-sm font-bold transition-all"
                style={{ background: T.greenSoft, color: T.green, border: `1.5px solid ${T.green}` }}>
                <span className="sm:hidden">☆ {saved.length}</span>
                <span className="hidden sm:inline">☆ {t("nav_saved")} ({saved.length})</span>
              </button>
            )}
            <button onClick={() => updateStore((s) => ({ ...s, theme: theme === "dark" ? "light" : "dark" }))}
              aria-label="Toggle theme"
              className="w-9 h-9 rounded-full text-base flex items-center justify-center transition-transform hover:scale-105"
              style={{ background: T.card2, border: `1.5px solid ${T.line}` }}>
              {theme === "dark" ? "☀️" : "🌙"}
            </button>
            <select value={lang} onChange={(e) => updateStore((s) => ({ ...s, lang: e.target.value }))}
              aria-label="Language"
              className="sm:hidden rounded-full px-1.5 py-1.5 text-xs font-semibold cursor-pointer"
              style={{ background: T.card2, color: T.ink, border: `1.5px solid ${T.line}` }}>
              {LANGS.map((l) => <option key={l.id} value={l.id}>{l.id.toUpperCase()}</option>)}
            </select>
            <select value={lang} onChange={(e) => updateStore((s) => ({ ...s, lang: e.target.value }))}
              aria-label="Language"
              className="hidden sm:block rounded-full px-2.5 py-1.5 text-sm font-semibold cursor-pointer"
              style={{ background: T.card2, color: T.ink, border: `1.5px solid ${T.line}` }}>
              {LANGS.map((l) => <option key={l.id} value={l.id}>{l.label}</option>)}
            </select>
            <button onClick={() => setShowProfiles(true)} aria-label={t("nav_profile")}
              className="w-9 h-9 rounded-full font-bold text-sm flex items-center justify-center transition-transform hover:scale-105"
              style={{ background: activeProfile ? activeProfile.color : T.card2, color: activeProfile ? "#07070E" : T.grey, border: `1.5px solid ${activeProfile ? "transparent" : T.lineStrong}` }}>
              {activeProfile ? activeProfile.name[0].toUpperCase() : <PeopleIcon color={T.grey} />}
            </button>
          </nav>
        </div>
      </header>
  );
}
