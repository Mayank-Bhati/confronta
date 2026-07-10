import React from "react";

import { useApp } from "../context";
import { mono, display } from "../constants";
import { BackLink } from "../ui";

export default function Careers() {
  const { T, t, td, world, rankedCareers, setCareerId, setFinalists, go, scoreColor } = useApp();
  return (
    <>
          <>
            <BackLink label={t("career_all")} />
            <h2 className="font-black text-2xl md:text-3xl" style={{ ...display, color: T.accent }}>{td(world.name)}</h2>
            <p className="text-sm -mt-2" style={{ color: T.grey }}>{td(world.tagline)}</p>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {rankedCareers.map((c, i) => (
                <div key={c.id} className="cc-card cc-shine cc-fade-up rounded-2xl p-5" style={{ background: T.card, border: `1px solid ${T.line}`, animationDelay: `${i * 60}ms` }}>
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div>
                      <div className="font-bold text-lg" style={display}>{c.name}</div>
                      <div className="text-sm mt-1" style={{ color: T.grey }}>{c.day}</div>
                      <div className="text-xs mt-2" style={{ ...mono, color: T.grey }}>
                        {c.netMonthly ? t("career_net", { n: c.netMonthly.toLocaleString() }) : t("career_var")} · {t("career_demand")}: {c.demand} · {t("career_via")} {c.pathTypes.join(" / ")}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span className="text-xs font-bold" style={{ ...mono, color: scoreColor(c.fit) }}>{t("fit_you", { n: c.fit })}</span>
                      <button onClick={() => { setCareerId(c.id); setFinalists([]); go("filter"); }}
                        className="px-4 py-2 rounded-full text-sm font-bold text-white transition-transform hover:scale-105" style={{ background: T.grad }}>
                        {t("career_explore")}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
    </>
  );
}
