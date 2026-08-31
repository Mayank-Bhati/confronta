import React from "react";

import { AppCtx } from "./context";
import { NATURE_KEY, mono, display, natureStyleFor, DATE_LOCALE } from "./constants";
import { estimateMonthlyCost, realOutcomes } from "../../lib/fitEngine-v2";
import { outcomeNote, NO_TAX_AREA_SOURCE } from "../../lib/outcomeNote";
import { provenanceFor, classificationKey, classificationTone, lastVerified } from "../../lib/provenance";


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

// A figure never appears without its origin. The strip has room for a dot and
// one word; the rest of the record — year, scope, source link, verification
// date, method — opens below the strip on tap, so the card stays readable on a
// phone while nothing about the provenance is more than one tap away.
function ProvDot({ T, prov, t, open, onToggle }) {
  if (!prov) return null;
  const tone = classificationTone(prov.classification);
  const color = tone === "good" ? T.green : tone === "wide" ? T.accent : T.grey;
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onToggle(); }}
      aria-expanded={open}
      title={t("prov_open")}
      className="mt-0.5 flex items-center gap-1 text-left"
      style={{ fontSize: 10, color, ...mono }}>
      <span aria-hidden style={{
        width: 6, height: 6, borderRadius: 3, background: color,
        display: "inline-block", flex: "0 0 auto",
      }} />
      <span style={{ textDecoration: "underline", textDecorationStyle: "dotted" }}>
        {t(classificationKey(prov.classification))}
      </span>
    </button>
  );
}

// The full record the spec asks for: value already sits above this, so what is
// left is unit, year, scope, source, verification date, status and method.
export function ProvenancePanel({ T, t, prov, title }) {
  if (!prov) return null;
  const rows = [
    prov.scopeKey && [t("prov_scope"), t(prov.scopeKey, prov.scopeArgs || {})],
    prov.year && [t("prov_year"), String(prov.year)],
    [t("prov_status"), t(classificationKey(prov.classification))],
    prov.reliability && [t("prov_reliability"), t(`rel_${prov.reliability}`)],
    [t("prov_verified"), prov.verified],
    prov.noteKey && [t("prov_note"), t(prov.noteKey, prov.noteArgs || {})],
  ].filter(Boolean);
  return (
    <div className="mt-2 rounded-xl p-3" onClick={(e) => e.stopPropagation()}
      style={{ background: T.bgSoft || T.violetSoft, border: `1px solid ${T.line}`, fontSize: 11.5 }}>
      {title && <div className="font-semibold mb-1" style={{ color: T.ink }}>{title}</div>}
      <dl className="grid gap-x-3 gap-y-1" style={{ gridTemplateColumns: "auto 1fr" }}>
        {rows.map(([k, v]) => (
          <React.Fragment key={k}>
            <dt style={{ color: T.grey, ...mono, fontSize: 10.5, whiteSpace: "nowrap" }}>{k}</dt>
            <dd style={{ color: T.ink }}>{v}</dd>
          </React.Fragment>
        ))}
      </dl>
      {prov.url && (
        <a href={prov.url} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}
          className="inline-block mt-2" style={{ color: T.accent, fontSize: 11.5, textDecoration: "underline" }}>
          {t("prov_source_link")} ↗
        </a>
      )}
    </div>
  );
}

function StatCell({ T, value, label, color, href, prov, t, provOpen, onProv }) {
  const inner = (
    <>
      <div className="font-semibold" style={{ ...mono, fontSize: 21, color, letterSpacing: "-.02em" }}>{value}</div>
      <div style={{ fontSize: 11, color: T.grey, textDecoration: href ? "underline dotted" : "none" }}>
        {label}{href ? " \u2197" : ""}
      </div>
    </>
  );
  return (
    <div>
      {href
        ? <a href={href} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="block text-left">{inner}</a>
        : inner}
      {prov && <ProvDot T={T} prov={prov} t={t} open={provOpen} onToggle={onProv} />}
    </div>
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

// The spec requires every page carrying data to state when it was last checked
// and to offer a way to report an error. Both belong at the foot of the list
// rather than on each card: the date is a property of the dataset, and
// repeating it 40 times would turn a credibility signal into wallpaper.
export function DataFreshness() {
  const { T, t, lang } = React.useContext(AppCtx);
  const when = new Date(lastVerified() + "T00:00:00");
  const month = when.toLocaleDateString(DATE_LOCALE[lang] || "en-GB", { month: "long", year: "numeric" });
  return (
    <div className="mt-5 pt-3 text-center" style={{ borderTop: `1px solid ${T.line}` }}>
      <a href="data-sources/" style={{ fontSize: 11, color: T.grey, textDecoration: "underline", textDecorationStyle: "dotted", ...mono }}>
        {t("fresh_verified", { when: month })}
      </a>
      {" · "}
      <button
        onClick={() => window.dispatchEvent(new CustomEvent("cc:report-data"))}
        style={{ fontSize: 11, color: T.accent, textDecoration: "underline", ...mono }}>
        {t("fresh_report")}
      </button>
    </div>
  );
}

export function InstitutionCard({ c, showFit, chosen, onCardClick, saveCtx, badge }) {
  const { T, t, scoreColor, isSavedOn, toggleSave, profile, prefs, setPrefs, envPrefs, homeCity } = React.useContext(AppCtx);
  const fees = c.costByIsee?.[profile?.isee || "mid"];
  // cost stat is a 3-way toggle (tester feedback: "distinguish taxes from
  // living costs with a click"): fees/yr → living/mo → all-in/mo
  const real = realOutcomes(c);
  // AFAM: no survey covers the sector, but the annual contribution is fixed by
  // national law — zero below €22,000 ISEE at every state conservatorio and
  // academy — so that much is knowable and exact.
  const isAfam = c.outcomes?.status === "afam";
  // ITS is no longer a blank: INDIRE publishes a per-course national ranking,
  // so these cards carry this course's own figure where its row is
  // identifiable, and its academy's total otherwise — never a rank beside an
  // academy average, which would read as this course's rank.
  const its = c.outcomes?.status === "its" && c.outcomes.itsRate != null ? c.outcomes : null;
  // Where this university publishes nothing of its own — outside the AlmaLaurea
  // consortium, or a cell the consortium does not publish — the card carries
  // the national median for the same subject and level, computed from the same
  // verified rows. It describes the field, never this university, and the label
  // has to keep saying so.
  const nat = c.outcomes?.natRate != null ? c.outcomes : null;
  const lowIsee = (profile?.isee || "mid") === "low";
  // One panel open at a time per card. Opening a second closes the first, which
  // keeps the card from growing into a wall of provenance the moment a curious
  // student taps twice.
  const [openProv, setOpenProv] = React.useState(null);
  const prov = React.useMemo(() => ({
    employment: provenanceFor(c, "employment"),
    pay: provenanceFor(c, "pay"),
    satisfaction: provenanceFor(c, "satisfaction"),
    fees: provenanceFor(c, "fees"),
    living: provenanceFor(c, "living"),
  }), [c]);
  const provProps = (key) => ({
    t, prov: prov[key], provOpen: openProv === key,
    onProv: () => setOpenProv((p) => (p === key ? null : key)),
  });
  // The cost cell cycles through three views, so which record it should show
  // depends on what it is currently displaying. The combined view points at the
  // living record, because that is the estimated half — the fees half is an
  // official figure and the weaker of the two is the one worth surfacing.
  const costProvKey = () => (costView === "fees" ? "fees" : "living");
  const CostCell = () => (
    <div>
      <button onClick={cycleCost} className="text-left block" title={t("stat_cost_hint")}>
        <div className="font-semibold" style={{ ...mono, fontSize: 21, color: costView === "fees" && fees === 0 ? T.green : T.ink, letterSpacing: "-.02em" }}>{costStat.n}</div>
        <div style={{ fontSize: 11, color: T.accent, textDecoration: "underline", textDecorationStyle: "dotted" }}>{costStat.label} ↺</div>
      </button>
      <ProvDot T={T} t={t} prov={prov[costProvKey()]}
        open={openProv === costProvKey()}
        onToggle={() => setOpenProv((p) => (p === costProvKey() ? null : costProvKey()))} />
    </div>
  );
  const costView = prefs?.costView || "fees";
  const est = estimateMonthlyCost(c, envPrefs || { isee: profile?.isee, awayFromHome: true }, homeCity);
  const cycleCost = (e) => {
    e.stopPropagation();
    const next = { fees: "living", living: "total", total: "fees" }[costView];
    setPrefs?.((p) => ({ ...p, costView: next }));
  };
  // A range is written as a range. Where the two ends coincide (a catalogue
  // entry with no surveyed spread) it degrades to the single number rather
  // than printing "€620–620", which would look like a rendering fault.
  const span = (r) => (r.low === r.high
    ? `€${r.low.toLocaleString()}`
    : `€${r.low.toLocaleString()}–${r.high.toLocaleString()}`);
  const costStat = costView === "living"
    // The label carries the exclusion. "Living" on its own invites a student to
    // read it as everything they will pay, and tuition is the one thing most
    // likely to be assumed included.
    ? { n: span(est.living), label: est.estimated ? t("stat_living_est") : t("stat_living") }
    : costView === "total"
      // Fees and living costs are different kinds of number — one is set by law
      // against a family's ISEE, the other is a market. This view adds them
      // because students ask "what does a month cost", but the label has to say
      // that it is a sum and not a single measured figure.
      ? { n: span(est.total), label: t("stat_total") }
      // AFAM institutions set fees themselves and the registry carries none, so
      // there is nothing to show. "~€—" reads like a bug; a dash with a label
      // saying where to look reads like the truth.
      : fees == null
        ? { n: "—", label: t("stat_fees_unknown") }
        : { n: fees === 0 ? "€0" : `~€${fees.toLocaleString()}`, label: t("stat_fees") };
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
              <div className="text-sm font-bold" style={{ ...mono, color: c.envFit.scored === false ? T.grey : scoreColor(c.envFit.score) }}>
                {c.envFit.scored === false ? "—" : `${c.envFit.score}/100`}
              </div>
              <div className="text-xs" style={{ color: T.grey }}>{c.envFit.scored === false ? t("card_env_unscored") : t("card_env")}</div>
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
      {/* Statistics strip — big, scannable, per tester feedback.
          AFAM gets a different strip. No survey covers conservatori or
          accademie, so the three outcome cells could only ever be dashes there,
          and a row of dashes reads as a broken card rather than as an absence.
          What IS knowable for them goes in instead: the annual contribution,
          which national law fixes at zero below €22,000 ISEE, the real living
          costs for that city, and how you actually get in. */}
      {its ? (
        <div className="mt-3 pt-3 grid grid-cols-2 sm:grid-cols-4 gap-x-3 gap-y-2" style={{ borderTop: `1px solid ${T.line}` }}>
          <StatCell T={T} href={its.itsSource} color={T.green}
            value={`${its.itsRate}%`}
            label={its.itsScope === "course" ? t("stat_its_rate") : t("stat_its_rate_inst")}
            {...provProps("employment")} />
          <StatCell T={T} href={its.itsSource} color={T.ink}
            value={its.itsRank ? `${its.itsRank}°` : `${its.itsDiplomati}`}
            label={its.itsRank ? t("stat_its_rank", { n: its.itsOf })
              : its.itsSections ? t("stat_its_sections", { k: its.itsSections })
              : t("stat_its_diplomati")} />
          <StatCell T={T} label={t("stat_net_job")} color={T.ink}
            value={c.careerPay ? `~€${Math.round(c.careerPay / 100) / 10}k` : "—"} />
          <CostCell />
        </div>
      ) : isAfam ? (
        /* three cells, not four: with the contribution at zero the "all-in"
           figure is identical to the living figure, and printing the same
           number twice reads as carelessness rather than as thoroughness. */
        <div className="mt-3 pt-3 grid grid-cols-3 gap-x-3 gap-y-2" style={{ borderTop: `1px solid ${T.line}` }}>
          <StatCell T={T} href={NO_TAX_AREA_SOURCE}
            label={lowIsee ? t("stat_afam_contrib_free") : t("stat_afam_contrib_set")}
            value={lowIsee ? "€0" : "—"}
            color={lowIsee ? T.green : T.grey}
            {...provProps("fees")} />
          <StatCell T={T} color={T.ink} value={span(est.living)}
            label={est.estimated ? t("stat_living_est") : t("stat_living")}
            {...provProps("living")} />
          <StatCell T={T} label={t("stat_afam_entry")} color={T.ink}
            value={/audition/i.test(c.test || "") ? t("stat_afam_audition") : t("stat_afam_portfolio")} />
        </div>
      ) : (
      <div className="mt-3 pt-3 grid grid-cols-2 sm:grid-cols-4 gap-x-3 gap-y-2" style={{ borderTop: `1px solid ${T.line}` }}>
        <StatCell T={T} href={real?.employment1y != null ? real.sourceOcc : null}
          label={real?.employment1y != null ? t("stat_emp")
            : nat ? t("stat_nat_emp", { n: nat.natUniversities }) : t("stat_nodata")}
          value={real?.employment1y != null ? `${real.employment1y}%`
            : nat ? `${nat.natRate}%` : "—"}
          color={real?.employment1y != null ? T.green : T.grey}
          {...provProps("employment")} />
        <StatCell T={T} href={real?.netPay ? real.sourceOcc : null}
          label={real?.netPay ? t("stat_net_real") : t("stat_net_job")} color={T.ink}
          value={real?.netPay ? `~€${Math.round(real.netPay / 100) / 10}k`
            : c.careerPay ? `~€${Math.round(c.careerPay / 100) / 10}k` : "—"}
          {...provProps("pay")} />
        <StatCell T={T} href={real?.onTime != null ? real.sourceProf : null}
          label={real && real.onTime != null ? t("stat_ontime")
            : nat?.natAgain != null ? t("stat_nat_again") : t("stat_nodata")}
          value={real && real.onTime != null ? `${real.onTime}%`
            : nat?.natAgain != null ? `${nat.natAgain}%` : "—"}
          color={real && real.onTime < 65 ? T.amber : T.ink}
          {...provProps("satisfaction")} />
        <CostCell />
      </div>
      )}
      {/* The record for whichever figure the student tapped. It sits directly
          under the strip rather than in a modal so the number stays on screen
          beside its own provenance — which is the whole point of showing it. */}
      {openProv && prov[openProv] && (
        <ProvenancePanel T={T} t={t} prov={prov[openProv]} title={t(`prov_title_${openProv}`)} />
      )}
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
