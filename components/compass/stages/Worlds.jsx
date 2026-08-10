import React, { useEffect, useState } from "react";

import { useApp } from "../context";
import { mono, display } from "../constants";
import { BackLink, ChipBtn } from "../ui";

// Worlds as tabs: pick a world without leaving the page, its careers render
// right below (the vertical list read as "dispersive" in testing).
export default function Worlds() {
  const { T, t, td, rankedWorlds, world, setWorldId, rankedCareers, setCareerId, setFinalists, go, identTitle, scoreColor, allCareers } = useApp();
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState("fit");   // fit | pay | demand

  // Until the student picks a tab themselves, the open tab follows the top of
  // the ranking — otherwise editing interests re-orders the tabs while the
  // panel below still shows the world that used to be first.
  const [picked, setPicked] = useState(false);
  useEffect(() => {
    if (picked || !rankedWorlds.length) return;
    if (world?.id !== rankedWorlds[0].id) setWorldId(rankedWorlds[0].id);
  }, [picked, world, rankedWorlds, setWorldId]);

  const DEMAND_RANK = { high: 3, growing: 2, stable: 1, competitive: 0, "n/a": 0 };
  const sortCareers = (list) => [...list].sort((a, b) => {
    if (sortBy === "pay") return (b.netMonthly || 0) - (a.netMonthly || 0);
    if (sortBy === "demand") return (DEMAND_RANK[b.demand] ?? 0) - (DEMAND_RANK[a.demand] ?? 0);
    return (b.fit ?? 0) - (a.fit ?? 0);
  });

  // Someone who already knows the job they want should not have to hunt for it
  // through the worlds: typing the name searches every career on the site.
  const q = query.trim().toLowerCase();
  const searchHits = q
    ? sortCareers(allCareers.filter((c) =>
        (td(c.name) || "").toLowerCase().includes(q) ||
        (c.name || "").toLowerCase().includes(q) ||
        (td(c.day) || "").toLowerCase().includes(q)))
    : [];

  const selected = world || rankedWorlds[0];
  const shown = sortCareers(rankedCareers);
  return (
    <>
          <BackLink />
          <h2 className="cc-fade-up font-semibold" style={{ ...display, fontSize: "clamp(28px,4.6vw,42px)", letterSpacing: "-.01em" }}>
            {t("worlds_title", { t: identTitle })}
          </h2>
          <p className="text-sm -mt-2 cc-fade-up" style={{ color: T.grey }}>{t("worlds_sub")}</p>

          <div className="cc-fade-up flex gap-2 flex-wrap">
            {rankedWorlds.map((w) => {
              const on = selected && w.id === selected.id;
              return (
                <button key={w.id} onClick={() => { setPicked(true); setWorldId(w.id); setCareerId(null); }}
                  className="px-3.5 py-2 rounded-full text-sm font-semibold transition-all"
                  style={{
                    border: `1.5px solid ${on ? T.violet : T.line}`,
                    background: on ? T.violet : "transparent",
                    color: on ? "#fff" : T.ink,
                  }}>
                  {td(w.name)} <span style={{ ...mono, fontSize: 12, color: on ? "#D9E0F8" : scoreColor(w.fit) }}>{w.fit}%</span>
                </button>
              );
            })}
          </div>

          {/* search + sort + filter */}
          <div className="cc-fade-up space-y-2">
            <input
              type="search" value={query} onChange={(e) => setQuery(e.target.value)}
              placeholder={t("careers_search_ph")}
              className="w-full rounded-xl px-3 py-2.5 text-sm"
              style={{ border: `1.5px solid ${T.line}`, background: T.card2, color: T.ink }}
            />
            <div className="flex gap-2 flex-wrap items-center">
              <span className="text-xs uppercase tracking-widest" style={{ color: T.grey }}>{t("sort_label")}</span>
              {[["fit", t("sort_fit")], ["pay", t("sort_pay")], ["demand", t("sort_demand")]].map(([v, l]) => (
                <ChipBtn key={v} active={sortBy === v} onClick={() => setSortBy(v)}>{l}</ChipBtn>
              ))}
            </div>
          </div>

          {q && (
            <div className="cc-fade-up">
              <div className="text-xs uppercase tracking-widest mb-1" style={{ color: T.grey }}>
                {t("search_results", { n: searchHits.length })}
              </div>
              {searchHits.length === 0 && <p className="text-sm" style={{ color: T.grey }}>{t("search_none")}</p>}
              <div style={{ borderTop: searchHits.length ? `1px solid ${T.line}` : "none" }}>
                {searchHits.map((c) => (
                  <div key={c.id} className="py-5 flex items-start justify-between gap-4 flex-wrap" style={{ borderBottom: `1px solid ${T.line}` }}>
                    <div className="min-w-0" style={{ maxWidth: "62ch" }}>
                      <div className="font-semibold" style={{ ...display, fontSize: "clamp(18px,3vw,23px)" }}>{td(c.name)}</div>
                      <div className="text-xs mt-1 font-semibold" style={{ color: T.accent }}>
                        {t("search_in_world", { w: td(c.worldName) })}
                      </div>
                      <div className="text-sm mt-1" style={{ color: T.grey }}>{td(c.day)}</div>
                      <div className="text-xs mt-2" style={{ ...mono, color: T.grey }}>
                        {c.netMonthly ? t("career_net", { n: c.netMonthly.toLocaleString() }) : t("career_var")} · {t("career_demand")}: {t(`demand_${c.demand}`)} · {t("career_via")} {c.pathTypes.join(" / ")}
                      </div>
                    </div>
                    <button onClick={() => { setWorldId(c.worldId); setCareerId(c.id); go("filter"); }}
                      className="px-4 py-2 rounded-full text-sm font-semibold text-white transition-transform hover:scale-105 shrink-0" style={{ background: T.violet }}>
                      {t("career_explore")}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!q && selected && (
            <div className="cc-fade-up" key={selected.id}>
              <p className="text-sm" style={{ color: T.grey }}>{td(selected.tagline)}</p>
              {/* Name the interests that actually drive the match; the old
                  "strong {dim} side" line read the same under every world. */}
              {selected.reasonTags?.length ? (
                <p className="text-xs mt-1 font-semibold" style={{ color: T.accent }}>
                  {t("world_because_tags", { tags: selected.reasonTags.map((tg) => td(tg)).join(", ") })}
                </p>
              ) : selected.reasonDim ? (
                <p className="text-xs mt-1 font-semibold" style={{ color: T.accent }}>
                  {t("world_because", { dim: t(`dim_${selected.reasonDim}`) })}
                </p>
              ) : null}
              <div className="mt-2" style={{ borderTop: `1px solid ${T.line}` }}>
                {shown.map((c) => (
                  <div key={c.id} className="py-6 flex items-start justify-between gap-4 flex-wrap" style={{ borderBottom: `1px solid ${T.line}` }}>
                    <div className="min-w-0" style={{ maxWidth: "62ch" }}>
                      <div className="font-semibold" style={{ ...display, fontSize: "clamp(19px,3.4vw,25px) " }}>{td(c.name)}</div>
                      <div className="text-sm mt-1" style={{ color: T.grey }}>{td(c.day)}</div>
                      <div className="text-xs mt-2.5" style={{ ...mono, color: T.grey }}>
                        {c.netMonthly ? t("career_net", { n: c.netMonthly.toLocaleString() }) : t("career_var")} · {t("career_demand")}: {t(`demand_${c.demand}`)} · {t("career_via")} {c.pathTypes.join(" / ")}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <span className="text-xs font-semibold" style={{ ...mono, color: scoreColor(c.fit) }}>{t("fit_you", { n: c.fit })}</span>
                      <button onClick={() => { setCareerId(c.id); go("filter"); }}
                        className="px-4 py-2 rounded-full text-sm font-semibold text-white transition-transform hover:scale-105" style={{ background: T.violet }}>
                        {t("career_explore")}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
    </>
  );
}
