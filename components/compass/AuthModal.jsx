import React from "react";

import { useApp } from "./context";
import { display } from "./constants";

export default function AuthModal() {
  const { T, t, showAuth, setShowAuth, session, accountPanel } = useApp();
  if (!showAuth || session) return null;
  return (
        <div className="cc-fade-in fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.72)", backdropFilter: "blur(6px)" }}
          onClick={() => setShowAuth(false)}>
          <div className="cc-fade-up w-full max-w-md rounded-2xl p-6" style={{ background: T.card, border: `1px solid ${T.lineStrong}` }}
            onClick={(e) => e.stopPropagation()}>
            <h3 className="font-black text-xl" style={display}>{t("acct_modal_title")}</h3>
            <p className="text-xs mt-1.5 mb-3" style={{ color: T.grey }}>{t("acct_modal_sub")}</p>
            {accountPanel}
            <button onClick={() => setShowAuth(false)} className="mt-3 text-xs font-semibold underline" style={{ color: T.grey }}>
              {t("acct_skip")}
            </button>
          </div>
        </div>
  );
}
