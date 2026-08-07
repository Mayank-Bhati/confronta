import React from "react";

import { useApp } from "../context";
import { mono, display } from "../constants";
import { BackLink } from "../ui";

export default function Careers() {
  const { T, t, td, world, rankedCareers, setCareerId, setFinalists, go, scoreColor } = useApp();
  return (
    <>
            <BackLink label={t("career_all")} />
            <h2 className="cc-fade-up font-semibold" style={{ ...display, fontSize: "clamp(28px,4.6vw,42px)", letterSpacing: "-.01em", color: T.violet }}>
              {td(world.name)}
            </h2>
            <p className="text-sm -mt-2 cc-fade-up" style={{ color: T.grey }}>{td(world.tagline)}</p>
            <div className="cc-fade-up" style={{ borderTop: `1px solid ${T.line}` }}>
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
    </>
  );
}
