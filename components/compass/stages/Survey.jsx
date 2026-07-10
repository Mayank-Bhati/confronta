import React from "react";

import { useApp } from "../context";
import { mono, display } from "../constants";
import { Section, BackLink } from "../ui";

export default function Survey() {
  const { T, t, td, survey, phase, qIndex, multiSel, setMultiSel, likertQs, answered, totalQ, answerBinary, submitMulti, answerLikert, goBackQuestion } = useApp();
  return (
    <>
          <div className="max-w-3xl mx-auto">
            <Section>
              <div className="flex items-center justify-between mb-2">
                <BackLink onClick={goBackQuestion} />
                <span className="text-xs" style={{ color: T.grey, ...mono }}>{answered + 1} / {totalQ}</span>
              </div>
              {phase === "multi" && qIndex === 0 && <div className="text-xs font-semibold mb-1" style={{ color: T.accent }}>{t("q_multi_round")}</div>}
              {phase === "likert" && qIndex === 0 && <div className="text-xs font-semibold mb-1" style={{ color: T.accent }}>{t("q_likert_round")}</div>}
              <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: T.track }}>
                <div className="cc-progress h-2 rounded-full transition-all duration-500" style={{ width: `${Math.round((answered / totalQ) * 100)}%` }} />
              </div>

              <div key={`${phase}-${qIndex}`} className="cc-fade-up">
                {phase === "binary" && survey.binary[qIndex] && (
                  <>
                    <h2 className="mt-6 text-xl font-bold" style={display}>{t("q_binary_title")}</h2>
                    <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {[survey.binary[qIndex].a, survey.binary[qIndex].b].map((opt, i) => (
                        <button key={i} onClick={() => answerBinary(opt.w)}
                          className="cc-card text-left rounded-2xl p-5"
                          style={{ background: T.card2, border: `1.5px solid ${T.line}`, color: T.ink }}>
                          <span className="text-base leading-snug">{td(opt.text)}</span>
                        </button>
                      ))}
                    </div>
                    <p className="mt-4 text-xs" style={{ color: T.grey }}>{t("q_binary_hint")}</p>
                  </>
                )}

                {phase === "multi" && survey.multi[qIndex] && (
                  <>
                    <h2 className="mt-6 text-xl font-bold" style={display}>{td(survey.multi[qIndex].prompt)}</h2>
                    <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {survey.multi[qIndex].options.map((opt, i) => (
                        <button key={i} onClick={() => setMultiSel((s) => (s.includes(i) ? s.filter((x) => x !== i) : [...s, i]))}
                          className="text-left rounded-xl p-3.5 text-sm transition-all"
                          style={{ background: multiSel.includes(i) ? T.violetSoft : T.card2, border: `1.5px solid ${multiSel.includes(i) ? T.violet : T.line}`, color: T.ink }}>
                          {multiSel.includes(i) ? "✓ " : ""}{td(opt.text)}
                        </button>
                      ))}
                    </div>
                    <button onClick={submitMulti} className="mt-5 px-6 py-2.5 rounded-full font-bold text-white transition-transform hover:scale-105"
                      style={{ background: multiSel.length ? T.grad : T.grey }}>
                      {multiSel.length ? t("q_continue", { n: multiSel.length }) : t("q_skip")}
                    </button>
                  </>
                )}

                {phase === "likert" && likertQs[qIndex] && (
                  <>
                    <h2 className="mt-6 text-xl font-bold leading-snug" style={display}>"{td(likertQs[qIndex].text)}"</h2>
                    <div className="mt-4 flex flex-col gap-2">
                      {[["lik_m2", -2], ["lik_m1", -1], ["lik_0", 0], ["lik_p1", 1], ["lik_p2", 2]].map(([k, v]) => (
                        <button key={k} onClick={() => answerLikert(v)}
                          className="cc-card text-left rounded-xl px-4 py-3 text-sm"
                          style={{ background: T.card2, border: `1.5px solid ${T.line}`, color: T.ink }}>
                          {t(k)}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </Section>
          </div>
    </>
  );
}
