import React, { useEffect, useState } from "react";

import { useApp } from "../context";
import { mono, display } from "../constants";
import { BackLink } from "../ui";

// Worlds as tabs: pick a world without leaving the page, its careers render
// right below (the vertical list read as "dispersive" in testing).
export default function Worlds() {
  const { T, t, td, rankedWorlds, world, setWorldId, rankedCareers, setCareerId, setFinalists, go, identTitle, scoreColor } = useApp();

  // Until the student picks a tab themselves, the open tab follows the top of
  // the ranking — otherwise editing interests re-orders the tabs while the
  // panel below still shows the world that used to be first.
  const [picked, setPicked] = useState(false);
  useEffect(() => {
    if (picked || !rankedWorlds.length) return;
    if (world?.id !== rankedWorlds[0].id) setWorldId(rankedWorlds[0].id);
  }, [picked, world, rankedWorlds, setWorldId]);

  const selected = world || rankedWorlds[0];
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

          {selected && (
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
                {rankedCareers.map((c) => (
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
