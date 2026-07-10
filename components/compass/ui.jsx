import React from "react";

import { AppCtx } from "./context";
import { NATURE_KEY, mono, display, natureStyleFor } from "./constants";


export function PeopleIcon({ size = 18, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} aria-hidden>
      <circle cx="9" cy="8.3" r="3.4" />
      <path d="M2.8 19.2c0-3.1 2.8-5.2 6.2-5.2s6.2 2.1 6.2 5.2V20H2.8z" />
      <circle cx="16.6" cy="6.9" r="2.7" opacity="0.75" />
      <path d="M15.9 13.7c2.7.3 4.9 2.1 4.9 4.6V20h-3.4v-.8c0-2.1-.5-3.9-1.5-5.5z" opacity="0.75" />
    </svg>
  );
}

export function Bar({ score, color }) {
  const { T, scoreColor } = React.useContext(AppCtx);
  return (
    <div className="w-full h-2 rounded-full" style={{ background: T.track }}>
      <div className="h-2 rounded-full transition-all duration-500" style={{ width: `${score}%`, background: color || scoreColor(score) }} />
    </div>
  );
}

export function ChipBtn({ active, onClick, children }) {
  const { T } = React.useContext(AppCtx);
  return (
    <button onClick={onClick} className="px-3.5 py-1.5 rounded-full text-sm transition-all"
      style={{
        border: `1.5px solid ${active ? T.violet : T.line}`,
        background: active ? T.grad : T.chipIdle,
        color: active ? "#fff" : T.ink,
        boxShadow: active ? "0 4px 18px rgba(59,130,246,0.35)" : "none",
      }}>
      {children}
    </button>
  );
}

export function Section({ children, className = "" }) {
  const { T } = React.useContext(AppCtx);
  return (
    <section className={`rounded-2xl p-5 md:p-7 cc-fade-up ${className}`}
      style={{ background: T.card, border: `1px solid ${T.line}` }}>
      {children}
    </section>
  );
}

export function NatureBadge({ c, full = false }) {
  const { T, t } = React.useContext(AppCtx);
  const n = natureStyleFor(T, c.nature);
  const text = t(NATURE_KEY[c.nature]);
  return (
    <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: n.bg, color: n.fg }}>
      {full ? text : text.split(" — ")[0]}
    </span>
  );
}

export function GoogleLink({ c }) {
  const { T, t } = React.useContext(AppCtx);
  return (
    <a href={`https://www.google.com/search?q=${c.googleQuery}`} target="_blank" rel="noreferrer"
      onClick={(e) => e.stopPropagation()}
      className="text-xs font-semibold underline whitespace-nowrap" style={{ color: T.accent }}>
      {t("card_google")}
    </a>
  );
}

export function OfficialLink({ c }) {
  const { T, t } = React.useContext(AppCtx);
  if (!c.url) return null;
  return (
    <a href={c.url} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}
      className="inline-block mt-1 text-xs font-semibold underline" style={{ color: T.accent }}>
      {t("card_official")}
    </a>
  );
}

export function InstitutionCard({ c, showFit, chosen, onCardClick, saveCtx, badge }) {
  const { T, t, scoreColor, isSavedOn, toggleSave } = React.useContext(AppCtx);
  return (
    <div onClick={onCardClick} className={`cc-card cc-shine w-full text-left rounded-2xl p-4 md:p-5 ${onCardClick ? "cursor-pointer" : ""}`}
      style={{ background: chosen ? T.violetSoft : T.card, border: `1.5px solid ${chosen ? T.violet : T.line}` }}>
      {badge && (
        <div className="mb-2 text-xs px-2.5 py-1 rounded-full inline-block" style={{ background: T.violetSoft, color: T.accent }}>
          {badge}
        </div>
      )}
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: c.type === "ITS" ? T.greenSoft : T.violetSoft, color: c.type === "ITS" ? T.green : T.accent, ...mono }}>
              {c.type} · {c.years}y · {c.city}
            </span>
            <NatureBadge c={c} />
            <GoogleLink c={c} />
          </div>
          <div className="font-bold mt-2" style={display}>{c.name}</div>
          <div className="text-sm" style={{ color: T.grey }}>{c.inst}</div>
          <OfficialLink c={c} />
          {c.dataSource && (
            <a href={c.dataSource} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}
              className="inline-block mt-1 ml-2 text-xs underline" style={{ color: T.grey }}>
              {t("card_source")}
            </a>
          )}
        </div>
        <div className="text-right shrink-0">
          {showFit && c.envFit && (
            <>
              <div className="text-sm font-bold" style={{ ...mono, color: scoreColor(c.envFit.score) }}>{c.envFit.score}/100</div>
              <div className="text-xs" style={{ color: T.grey }}>{t("card_env")}</div>
            </>
          )}
          <button onClick={(e) => { e.stopPropagation(); toggleSave(c, saveCtx); }}
            className="mt-2 px-3 py-1 rounded-full text-xs font-bold transition-all"
            style={{
              border: `1.5px solid ${isSavedOn(c.id, saveCtx?.careerId ?? null) ? T.green : T.lineStrong}`,
              background: isSavedOn(c.id, saveCtx?.careerId ?? null) ? T.greenSoft : "transparent",
              color: isSavedOn(c.id, saveCtx?.careerId ?? null) ? T.green : T.ink,
            }}>
            {isSavedOn(c.id, saveCtx?.careerId ?? null) ? t("card_saved") : t("card_save")}
          </button>
          {chosen && <div className="mt-1 text-xs font-bold" style={{ color: T.accent }}>{t("card_finalist")}</div>}
        </div>
      </div>
      {showFit && c.envFit && (
        <div className="mt-2 text-xs space-y-0.5" style={{ color: T.grey }}>
          {c.envFit.reasons.slice(0, 2).map((r, i) => <div key={i}>· {r}</div>)}
        </div>
      )}
    </div>
  );
}

export function BackLink({ onClick, label }) {
  const { T, t, goBack } = React.useContext(AppCtx);
  return (
    <button onClick={onClick ?? goBack} className="text-sm font-semibold transition-colors hover:opacity-80" style={{ color: T.accent }}>
      ← {label ?? t("back")}
    </button>
  );
}

export function Logo({ size = 34 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden>
      <defs>
        <linearGradient id="ccLogoGrad" x1="0" y1="0" x2="48" y2="48">
          <stop stopColor="#2563EB" />
          <stop offset="1" stopColor="#EC4899" />
        </linearGradient>
      </defs>
      <circle cx="24" cy="24" r="20.5" stroke="url(#ccLogoGrad)" strokeWidth="3.5" />
      <path d="M32.5 15.5 L26.8 26.8 L15.5 32.5 L21.2 21.2 Z" fill="url(#ccLogoGrad)" />
      <circle cx="24" cy="24" r="2.4" fill="#07070E" />
    </svg>
  );
}
