import React from "react";

import { AppCtx } from "./context";
import { NATURE_KEY, mono, display, natureStyleFor } from "./constants";
import { estimateMonthlyCost, realOutcomes } from "../../lib/fitEngine-v2";
import { outcomeNote } from "../../lib/outcomeNote";


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

// A statistic that carries its own source: click the number, land on the exact
// AlmaLaurea page it came from. Tester ask — "let me check the figure myself".
function StatCell({ T, value, label, color, href }) {
  const inner = (
    <>
      <div className="font-semibold" style={{ ...mono, fontSize: 21, color, letterSpacing: "-.02em" }}>{value}</div>
      <div style={{ fontSize: 11, color: T.grey, textDecoration: href ? "underline dotted" : "none" }}>
        {label}{href ? " \u2197" : ""}
      </div>
    </>
  );
  if (!href) return <div>{inner}</div>;
  return (
    <a href={href} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="block text-left">
      {inner}
    </a>
  );
}

// Scroll to the top, whatever the browser supports. Some environments (and
// "reduce motion" settings) ignore the object form of scrollTo entirely, which
// silently made the button do nothing — so fall back to a plain jump if the
// smooth call has not moved the page.
export function scrollToTop() {
  const start = window.scrollY;
  if (start === 0) return;
  try { window.scrollTo({ top: 0, behavior: "smooth" }); } catch { /* older browsers */ }
  setTimeout(() => { if (window.scrollY === start) window.scrollTo(0, 0); }, 400);
}

// Comparison and results pages get long; a student who has read to the bottom
// should not have to swipe all the way back. Appears only once scrolled.
export function ScrollTop() {
  const { T, t } = React.useContext(AppCtx);
  const [show, setShow] = React.useState(false);
  React.useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 350);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  if (!show) return null;
  return (
    <button onClick={() => scrollToTop()}
      aria-label={t("scroll_top")} title={t("scroll_top")}
      className="fixed right-4 bottom-20 z-30 w-11 h-11 rounded-full font-bold shadow-lg transition-transform hover:scale-110"
      style={{ background: T.card, color: T.ink, border: `1.5px solid ${T.lineStrong}` }}>
      ↑
    </button>
  );
}

export function InstitutionCard({ c, showFit, chosen, onCardClick, saveCtx, badge }) {
  const { T, t, scoreColor, isSavedOn, toggleSave, profile, prefs, setPrefs, envPrefs, homeCity } = React.useContext(AppCtx);
  const fees = c.costByIsee?.[profile?.isee || "mid"];
  // cost stat is a 3-way toggle (tester feedback: "distinguish taxes from
  // living costs with a click"): fees/yr → living/mo → all-in/mo
  const real = realOutcomes(c);
  const costView = prefs?.costView || "fees";
  const est = estimateMonthlyCost(c, envPrefs || { isee: profile?.isee, awayFromHome: true }, homeCity);
  const cycleCost = (e) => {
    e.stopPropagation();
    const next = { fees: "living", living: "total", total: "fees" }[costView];
    setPrefs?.((p) => ({ ...p, costView: next }));
  };
  const costStat = costView === "living"
    ? { n: `~€${est.living.toLocaleString()}`, label: t("stat_living") }
    : costView === "total"
      ? { n: `~€${est.total.toLocaleString()}`, label: t("stat_total") }
      : { n: fees === 0 ? "€0" : `~€${fees?.toLocaleString?.() ?? "—"}`, label: t("stat_fees") };
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
              {c.type} · {c.years}y · {c.city}{c.distKm != null ? ` · ${c.distKm} km` : ""}
            </span>
            <NatureBadge c={c} />
            {c.admission && (
              // The generic type label is not always true of the course. Since
              // the 2025 reform Medicina, Odontoiatria and Veterinaria have no
              // entrance test at all — you enrol, sit the first-semester exams
              // and are ranked on those — so a badge reading "national
              // admission test" would send a student to the wrong preparation.
              // Where the course states its own route, that wins.
              <span className="text-xs px-2 py-0.5 rounded-full" title={c.test || undefined}
                style={{
                  background: c.admission === "open" ? T.greenSoft : c.admission === "selection" ? T.violetSoft : T.amberSoft,
                  color: c.admission === "open" ? T.green : c.admission === "selection" ? T.accent : T.amber,
                }}>
                {t(`adm_${c.admission}`)}
              </span>
            )}
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
      {/* Statistics strip — big, scannable, per tester feedback */}
      <div className="mt-3 pt-3 grid grid-cols-2 sm:grid-cols-4 gap-x-3 gap-y-2" style={{ borderTop: `1px solid ${T.line}` }}>
        <StatCell T={T} href={real?.employment1y != null ? real.sourceOcc : null}
          label={real?.employment1y != null ? t("stat_emp") : t("stat_nodata")}
          value={real?.employment1y != null ? `${real.employment1y}%` : "—"}
          color={real?.employment1y != null ? T.green : T.grey} />
        <StatCell T={T} href={real?.netPay ? real.sourceOcc : null}
          label={real?.netPay ? t("stat_net_real") : t("stat_net_job")} color={T.ink}
          value={real?.netPay ? `~€${Math.round(real.netPay / 100) / 10}k`
            : c.careerPay ? `~€${Math.round(c.careerPay / 100) / 10}k` : "—"} />
        <StatCell T={T} href={real?.onTime != null ? real.sourceProf : null}
          label={real && real.onTime != null ? t("stat_ontime") : t("stat_nodata")}
          value={real && real.onTime != null ? `${real.onTime}%` : "—"}
          color={real && real.onTime < 65 ? T.amber : T.ink} />
        <button onClick={cycleCost} className="text-left" title={t("stat_cost_hint")}>
          <div className="font-semibold" style={{ ...mono, fontSize: 21, color: costView === "fees" && fees === 0 ? T.green : T.ink, letterSpacing: "-.02em" }}>{costStat.n}</div>
          <div style={{ fontSize: 11, color: T.accent, textDecoration: "underline", textDecorationStyle: "dotted" }}>{costStat.label} ↺</div>
        </button>
      </div>
      {real?.continuingMasters != null && (
        <div className="mt-2 text-xs" style={{ color: T.accent }}>
          {t("stat_masters_note", { p: real.continuingMasters })}
        </div>
      )}
      {/* Name the reason a figure is missing, rather than leaving a dash that
          reads like a bug. */}
      {(() => {
        const why = outcomeNote(c, t);
        if (!why) return null;
        return (
          <div className="mt-2 text-xs" style={{ color: T.grey }}>
            {why.text}
            {why.href && (
              <>
                {" "}
                <a href={why.href} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}
                  className="underline" style={{ color: T.accent }}>
                  {why.link} ↗
                </a>
              </>
            )}
          </div>
        );
      })()}
      {showFit && c.envFit && (
        <div className="mt-2.5 text-xs space-y-0.5" style={{ color: T.grey }}>
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

export function Logo({ size = 34, color = "#2244BB" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden>
      <circle cx="24" cy="24" r="20.5" stroke={color} strokeWidth="3.5" />
      <path d="M32.5 15.5 L26.8 26.8 L15.5 32.5 L21.2 21.2 Z" fill={color} />
      <circle cx="24" cy="24" r="2.4" fill="#FAF9F6" />
    </svg>
  );
}
