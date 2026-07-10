import React from "react";

import { useApp } from "./context";
import { mono, display } from "./constants";

export default function ProfileModal() {
  const { T, t, showProfiles, setShowProfiles, store, newName, setNewName, createProfile, switchProfile, deleteProfile, accountPanel } = useApp();
  if (!showProfiles) return null;
  return (
        <div className="cc-fade-in fixed inset-0 z-50 flex items-start md:items-center justify-center p-4 overflow-y-auto"
          style={{ background: "rgba(0,0,0,0.72)", backdropFilter: "blur(6px)" }}
          onClick={() => setShowProfiles(false)}>
          <div className="cc-fade-up w-full max-w-lg rounded-2xl p-6 my-8" style={{ background: T.card, border: `1px solid ${T.lineStrong}` }}
            onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-black text-xl" style={display}>{t("pf_title")}</h3>
              <button onClick={() => setShowProfiles(false)} className="w-8 h-8 rounded-full hover:opacity-70 transition-opacity" aria-label="Close">✕</button>
            </div>
            <p className="text-xs mt-1.5" style={{ color: T.grey }}>{t("pf_note")}</p>

            {accountPanel}

            <div className="mt-4 flex gap-2">
              <input value={newName} onChange={(e) => setNewName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && createProfile()}
                placeholder={t("pf_new_ph")}
                className="flex-1 rounded-xl px-3 py-2.5 text-sm outline-none"
                style={{ background: T.card2, border: `1.5px solid ${T.line}`, color: T.ink }} />
              <button onClick={createProfile} className="px-4 py-2 rounded-xl text-sm font-bold text-white transition-transform hover:scale-105" style={{ background: T.grad }}>
                {t("pf_add")}
              </button>
            </div>

            {store.profiles.length === 0 && <p className="text-xs mt-4" style={{ color: T.grey }}>{t("pf_none_active")}</p>}

            <div className="mt-4 space-y-2">
              {store.profiles.map((p) => (
                <div key={p.id} className="rounded-xl p-3" style={{ background: T.card2, border: `1.5px solid ${p.id === store.activeId ? T.violet : T.line}` }}>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm shrink-0" style={{ background: p.color, color: "#07070E" }}>
                      {p.name[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-sm truncate">{p.name}</div>
                      {p.id === store.activeId && <div className="text-xs" style={{ color: T.accent }}>{t("pf_active")}</div>}
                    </div>
                    {p.id !== store.activeId && (
                      <button onClick={() => switchProfile(p.id)} className="px-3 py-1 rounded-full text-xs font-bold" style={{ border: `1.5px solid ${T.violet}`, color: T.accent }}>
                        {t("pf_use")}
                      </button>
                    )}
                    <button onClick={() => deleteProfile(p.id)} className="px-3 py-1 rounded-full text-xs font-bold" style={{ border: `1.5px solid ${T.line}`, color: T.grey }}>
                      {t("pf_del")}
                    </button>
                  </div>

                </div>
              ))}
            </div>
          </div>
        </div>
  );
}
