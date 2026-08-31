import React from "react";

import { useApp } from "../context";
import { display } from "../constants";

// Living compass from the approved mockup: journey line with a traveling dot,
// slowly rotating tick ring, needle that spring-settles then keeps breathing,
// radiating pulse. White/mint ink on the blue hero.
function LivingCompass() {
  const f = (v) => v.toFixed(2); // fixed precision — floats break hydration
  return (
    <svg viewBox="0 0 560 316" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: "100%", height: "auto", display: "block" }}>
      <path className="cc-route" d="M8 268 C 96 236 128 160 196 158 C 244 156 260 196 320 186" />
      <circle className="cc-traveler" r="5" fill="#8FE3C0" />
      <circle className="cc-pulse" cx="392" cy="158" r="104" stroke="#FFFFFF" strokeWidth="1.4" />
      <g className="cc-ringspin" stroke="#FFFFFF" strokeWidth="1.6" opacity=".85">
        {Array.from({ length: 60 }).map((_, i) => {
          const a = (i * 6 * Math.PI) / 180;
          const long = i % 15 === 0, mid = i % 5 === 0;
          const r1 = long ? 88 : mid ? 93 : 97, r2 = 104;
          return (
            <line key={i}
              x1={f(392 + r1 * Math.sin(a))} y1={f(158 - r1 * Math.cos(a))}
              x2={f(392 + r2 * Math.sin(a))} y2={f(158 - r2 * Math.cos(a))}
              strokeWidth={long ? 2.4 : mid ? 1.8 : 1} opacity={long ? 1 : mid ? 0.8 : 0.45} />
          );
        })}
      </g>
      <circle cx="392" cy="158" r="104" stroke="#FFFFFF" strokeWidth="2.6" />
      <circle cx="392" cy="158" r="84" stroke="#FFFFFF" strokeWidth="1.2" opacity=".55" />
      <g fontFamily="Fraunces,serif" fontSize="17" fill="#FFFFFF" textAnchor="middle">
        <text x="392" y="46">N</text>
        <text x="510" y="164">E</text>
        <text x="392" y="284">S</text>
        <text x="274" y="164">W</text>
      </g>
      <g className="cc-settle"><g className="cc-breathe">
        <path d="M392 76 L403 158 L392 180 L381 158 Z" fill="#8FE3C0" />
        <path d="M392 240 L403 158 L392 180 L381 158 Z" fill="#FFFFFF" opacity=".35" />
      </g></g>
      <circle cx="392" cy="158" r="6" fill="#FFFFFF" />
      <circle cx="392" cy="158" r="2.4" fill="#16255F" />
    </svg>
  );
}

export default function Welcome() {
  const { T, t, startSurvey } = useApp();
  return (
    <>
          <div className="cc-fade-up rounded-3xl overflow-hidden" style={{ background: "linear-gradient(168deg,#16255F,#2244BB 90%)", color: "#fff" }}>
            <div className="px-6 md:px-14 py-14 md:py-20">
              <div className="grid gap-9 items-center md:grid-cols-[1.08fr_.92fr]">
                <div>
                  <h1 className="font-bold" style={{ ...display, fontSize: "clamp(40px,7vw,76px)", lineHeight: 1.05, letterSpacing: "-.01em", maxWidth: "14ch" }}>
                    {t("welcome_title")}
                  </h1>
                  <p className="mt-5 leading-relaxed" style={{ color: "#D8DFF6", fontSize: "clamp(15px,2.2vw,18px)", maxWidth: "46ch" }}>
                    {t("welcome_body")}
                  </p>
                  <button onClick={startSurvey}
                    className="mt-8 px-8 py-4 rounded-full font-semibold transition-transform hover:scale-105"
                    style={{ background: "#fff", color: "#16255F", fontSize: 16 }}>
                    {t("welcome_start")}
                  </button>
                  <small className="block mt-4" style={{ color: "#AAB8E8", fontSize: 13 }}>{t("welcome_privacy_short")}</small>
                </div>
                <figure className="mt-4 md:mt-0 mx-auto md:mx-0 w-[min(74vw,320px)] md:w-full md:max-w-[440px]" aria-hidden>
                  <LivingCompass />
                  <figcaption className="mt-1.5 text-center italic" style={{ color: "#AAB8E8", fontSize: 13 }}>{t("welcome_caption")}</figcaption>
                </figure>
              </div>
            </div>
          </div>

          <section className="cc-fade-up pt-8 md:pt-12" style={{ animationDelay: "120ms" }}>
            <h2 className="font-semibold" style={{ ...display, fontSize: "clamp(26px,4.4vw,38px)", letterSpacing: "-.01em" }}>{t("how_title")}</h2>
            <div>
              {[t("feat_1"), t("feat_2"), t("feat_3")].map((f, i) => (
                <div key={i} className="grid items-baseline gap-4 py-6" style={{ gridTemplateColumns: "58px 1fr", borderBottom: i < 2 ? `1px solid ${T.line}` : "none" }}>
                  <b style={{ ...display, fontSize: 46, fontWeight: 400, color: T.violet, lineHeight: 1 }}>{i + 1}</b>
                  <p style={{ color: T.grey, fontSize: 15, maxWidth: "60ch" }}>{f}</p>
                </div>
              ))}
            </div>
          </section>

          <p className="text-xs pt-2" style={{ color: T.grey }}>{t("welcome_privacy")}</p>
          <p className="text-xs" style={{ color: T.grey }}>{t("welcome_sources")}</p>
          <p className="text-xs pt-1" style={{ color: T.grey }}>
            <a href="how-it-works/" className="underline">{t("footer_how")}</a>
            {" · "}
            <a href="data-sources/" className="underline">{t("footer_sources")}</a>
            {" · "}
            <a href="privacy/" className="underline">{t("footer_privacy")}</a>
            {" · "}
            <a href="terms/" className="underline">{t("footer_terms")}</a>
          </p>
    </>
  );
}
