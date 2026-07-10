import React from "react";

import { useApp } from "../context";
import { mono, display } from "../constants";

export default function Welcome() {
  const { T, t, theme, startSurvey } = useApp();
  return (
    <>
          <div className="relative overflow-hidden rounded-3xl cc-fade-up" style={{ border: `1px solid ${T.line}`, background: T.card }}>
            <div className="cc-blob absolute -top-32 -left-24 w-[480px] h-[480px] rounded-full pointer-events-none" style={{ background: "radial-gradient(circle, rgba(37,99,235,0.30), transparent 65%)", filter: "blur(40px)" }} />
            <div className="cc-blob absolute -bottom-40 -right-24 w-[520px] h-[520px] rounded-full pointer-events-none" style={{ background: "radial-gradient(circle, rgba(236,72,153,0.24), transparent 65%)", filter: "blur(40px)", animationDelay: "-7s" }} />
            {/* The compass finds its north as the page opens */}
            <div className="absolute right-4 md:right-10 top-1/2 -translate-y-1/2 pointer-events-none hidden sm:block" aria-hidden
              style={{ width: "clamp(220px, 34vw, 470px)" }}>
              <svg viewBox="0 0 200 200" fill="none" style={{ width: "100%", height: "auto", display: "block", opacity: theme === "dark" ? 0.22 : 0.14 }}>
                <defs>
                  <linearGradient id="ccHeroGrad" x1="0" y1="0" x2="200" y2="200">
                    <stop stopColor="#2563EB" />
                    <stop offset="1" stopColor="#EC4899" />
                  </linearGradient>
                </defs>
                <circle cx="100" cy="100" r="92" stroke="url(#ccHeroGrad)" strokeWidth="2.5" />
                <circle cx="100" cy="100" r="76" stroke="url(#ccHeroGrad)" strokeWidth="1" opacity="0.6" />
                {Array.from({ length: 24 }).map((_, i) => {
                  const a = (i * 15 * Math.PI) / 180;
                  const long = i % 6 === 0;
                  const r1 = long ? 82 : 87, r2 = 92;
                  // fixed precision: float formatting differs between prerender
                  // and browser engines and would break hydration
                  const f = (v) => v.toFixed(2);
                  return (
                    <line key={i}
                      x1={f(100 + r1 * Math.sin(a))} y1={f(100 - r1 * Math.cos(a))}
                      x2={f(100 + r2 * Math.sin(a))} y2={f(100 - r2 * Math.cos(a))}
                      stroke="url(#ccHeroGrad)" strokeWidth={long ? 2 : 1} opacity={long ? 0.9 : 0.5} />
                  );
                })}
                <text x="100" y="24" textAnchor="middle" fill="url(#ccHeroGrad)" fontSize="12" fontWeight="700" fontFamily="Outfit, sans-serif">N</text>
                <g className="cc-needle">
                  <path d="M100 30 L108 100 L100 114 L92 100 Z" fill="url(#ccHeroGrad)" />
                  <path d="M100 170 L108 100 L100 114 L92 100 Z" fill="url(#ccHeroGrad)" opacity="0.35" />
                </g>
                <circle cx="100" cy="100" r="5" fill="url(#ccHeroGrad)" />
              </svg>
            </div>
            <div className="relative px-6 md:px-16 py-16 md:py-24">
              <div className="text-xs uppercase tracking-[0.25em] mb-4" style={{ color: T.accent, ...mono }}>{t("welcome_kicker")}</div>
              <h2 className="text-4xl md:text-6xl font-black leading-tight max-w-3xl" style={display}>
                <span style={{ backgroundImage: T.grad, WebkitBackgroundClip: "text", backgroundClip: "text", WebkitTextFillColor: "transparent" }}>{t("welcome_title")}</span>
              </h2>
              <p className="mt-5 text-base md:text-lg leading-relaxed max-w-2xl" style={{ color: T.grey }}>
                {t("welcome_body")}
              </p>
              <button onClick={startSurvey} className="cc-glow mt-8 px-8 py-4 rounded-full font-bold text-white text-lg transition-transform hover:scale-105" style={{ background: T.grad, ...display }}>
                {t("welcome_start")}
              </button>
              <div className="mt-10 space-y-3 max-w-2xl">
                {[t("feat_1"), t("feat_2"), t("feat_3")].map((f, i) => (
                  <div key={i} className="flex items-center gap-3 cc-fade-up" style={{ animationDelay: `${200 + i * 120}ms` }}>
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: T.grad }} />
                    <span className="text-sm md:text-base" style={{ color: T.grey }}>{f}</span>
                  </div>
                ))}
              </div>
              <p className="mt-10 text-xs max-w-xl" style={{ color: T.grey }}>{t("welcome_privacy")}</p>
              <p className="mt-2 text-xs max-w-xl" style={{ color: T.grey }}>{t("welcome_sources")}</p>
            </div>
          </div>
    </>
  );
}
