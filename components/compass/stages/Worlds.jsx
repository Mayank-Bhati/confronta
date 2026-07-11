import React from "react";

import { useApp } from "../context";
import { mono, display } from "../constants";
import { BackLink } from "../ui";

export default function Worlds() {
  const { T, t, td, rankedWorlds, setWorldId, setCareerId, go, identTitle, scoreColor } = useApp();
  return (
    <>
          <BackLink />
          <h2 className="cc-fade-up font-semibold" style={{ ...display, fontSize: "clamp(28px,4.6vw,42px)", letterSpacing: "-.01em" }}>
            {t("worlds_title", { t: identTitle })}
          </h2>
          <p className="text-sm -mt-2 cc-fade-up" style={{ color: T.grey }}>{t("worlds_sub")}</p>
          <div className="cc-fade-up" style={{ borderTop: `1px solid ${T.line}` }}>
            {rankedWorlds.map((w, i) => (
              <button key={w.id} onClick={() => { setWorldId(w.id); setCareerId(null); go("career"); }}
                className="w-full text-left flex items-baseline justify-between gap-4 py-5 transition-all hover:pl-3"
                style={{ borderBottom: `1px solid ${T.line}` }}>
                <span>
                  <span className="font-semibold block" style={{ ...display, fontSize: "clamp(22px,4.2vw,32px)", color: i < 2 ? T.violet : T.ink }}>
                    {td(w.name)}
                  </span>
                  <small className="block mt-0.5" style={{ color: T.grey, fontSize: 13 }}>{td(w.tagline)}</small>
                  {w.reasonDim && (
                    <small className="block mt-1 font-semibold" style={{ color: T.accent, fontSize: 12 }}>
                      {t("world_because", { dim: t(`dim_${w.reasonDim}`) })}
                    </small>
                  )}
                </span>
                <span className="shrink-0 font-semibold" style={{ ...mono, fontSize: 15, color: scoreColor(w.fit) }}>
                  {t("fit_you", { n: w.fit })}
                </span>
              </button>
            ))}
          </div>
    </>
  );
}
