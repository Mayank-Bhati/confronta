import React from "react";

import { useApp } from "../context";
import { WORLD_HUES, mono, display } from "../constants";
import { BackLink } from "../ui";
import WORLDS_DATA from "../../../data/worlds.json";

export default function Worlds() {
  const { T, t, td, rankedWorlds, setWorldId, setCareerId, go, identTitle, scoreColor } = useApp();
  return (
    <>
          <>
            <BackLink />
            <h2 className="font-black text-2xl md:text-4xl cc-fade-up" style={display}>
              {t("worlds_title", { t: identTitle })}
            </h2>
            <p className="text-sm -mt-2 cc-fade-up" style={{ color: T.grey }}>{t("worlds_sub")}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {rankedWorlds.map((w, i) => {
                const hue = WORLD_HUES[WORLDS_DATA.worlds.findIndex((x) => x.id === w.id) % WORLD_HUES.length];
                return (
                  <button key={w.id} onClick={() => { setWorldId(w.id); setCareerId(null); go("career"); }}
                    className="cc-card cc-shine cc-fade-up relative overflow-hidden text-left rounded-2xl p-5 min-h-[150px]"
                    style={{ background: T.card, border: `1.5px solid ${i < 2 ? hue : T.line}`, animationDelay: `${i * 70}ms` }}>
                    <div className="absolute -top-16 -right-16 w-44 h-44 rounded-full pointer-events-none" style={{ background: `radial-gradient(circle, ${hue}33, transparent 70%)` }} />
                    <div className="flex items-center justify-between relative">
                      <span className="font-extrabold text-lg" style={{ ...display, color: hue }}>{td(w.name)}</span>
                      <span className="text-xs font-bold shrink-0" style={{ ...mono, color: scoreColor(w.fit) }}>{t("fit_you", { n: w.fit })}</span>
                    </div>
                    <div className="text-xs mt-2 relative" style={{ color: T.grey }}>{td(w.tagline)}</div>
                  </button>
                );
              })}
            </div>
          </>
    </>
  );
}
