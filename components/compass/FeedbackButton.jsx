import React, { useState } from "react";

import { useApp } from "./context";
import { display } from "./constants";
import { getSupabase } from "../../lib/supabaseClient";
import { track } from "../../lib/track";

// A way for students to tell us a number is wrong or a course is missing.
// Testers found things no amount of our own clicking would — this gives every
// user the same channel. Feedback lands in the `feedback` table, which allows
// anonymous inserts and no reads, so nobody can mine what others wrote.
export default function FeedbackButton() {
  const { T, t, lang, stage, career, world } = useApp();
  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState("");
  const [contact, setContact] = useState("");
  const [state, setState] = useState("idle"); // idle | sending | sent | error

  // The "report incorrect data" link that sits under every data page opens this
  // same dialog. An event rather than lifted state: the dialog's business is
  // entirely its own, and threading a setter through the app context so a
  // footnote can call it would spread this component across three files.
  React.useEffect(() => {
    const open = () => setOpen(true);
    window.addEventListener("cc:report-data", open);
    return () => window.removeEventListener("cc:report-data", open);
  }, []);

  async function send() {
    if (msg.trim().length < 3) return;
    setState("sending");
    try {
      const sb = getSupabase();
      if (!sb) throw new Error("no client");
      const { error } = await sb.from("feedback").insert({
        message: msg.trim().slice(0, 4000),
        contact: contact.trim().slice(0, 200) || null,
        // where they were when something looked wrong — the first thing we
        // would otherwise have to ask them
        page: [stage, world?.name, career?.name].filter(Boolean).join(" › ").slice(0, 200),
        lang,
        user_agent: (navigator.userAgent || "").slice(0, 200),
      });
      if (error) throw error;
      track("feedback_sent");
      setState("sent");
      setMsg(""); setContact("");
      setTimeout(() => { setOpen(false); setState("idle"); }, 1800);
    } catch {
      setState("error");
    }
  }

  return (
    <>
      <button onClick={() => setOpen(true)}
        className="fixed left-4 bottom-4 z-30 px-3.5 py-2 rounded-full text-xs font-bold shadow-lg transition-transform hover:scale-105"
        style={{ background: T.card, color: T.ink, border: `1.5px solid ${T.lineStrong}` }}>
        {t("fb_button")}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
          style={{ background: "rgba(6,8,20,0.55)" }} onClick={() => setOpen(false)}>
          <div className="w-full max-w-md rounded-2xl p-5" onClick={(e) => e.stopPropagation()}
            style={{ background: T.card, border: `1.5px solid ${T.line}` }}>
            <h3 className="font-black text-lg" style={display}>{t("fb_title")}</h3>
            <p className="text-xs mt-1" style={{ color: T.grey }}>{t("fb_sub")}</p>

            <textarea value={msg} onChange={(e) => setMsg(e.target.value)} rows={5}
              placeholder={t("fb_placeholder")} maxLength={4000}
              className="w-full mt-3 rounded-xl px-3 py-2.5 text-sm"
              style={{ border: `1.5px solid ${T.line}`, background: T.card2, color: T.ink }} />

            <input value={contact} onChange={(e) => setContact(e.target.value)}
              placeholder={t("fb_contact_ph")} maxLength={200}
              className="w-full mt-2 rounded-xl px-3 py-2.5 text-sm"
              style={{ border: `1.5px solid ${T.line}`, background: T.card2, color: T.ink }} />

            {state === "error" && (
              <p className="text-xs mt-2" style={{ color: T.amber }}>
                {t("fb_error")}{" "}
                <a className="underline" style={{ color: T.accent }}
                  href={`mailto:bhati.mayank842@gmail.com?subject=${encodeURIComponent("CareerCompass feedback")}&body=${encodeURIComponent(msg)}`}>
                  {t("fb_error_mail")}
                </a>
              </p>
            )}
            {state === "sent" && <p className="text-sm mt-2 font-semibold" style={{ color: T.green }}>{t("fb_thanks")}</p>}

            <div className="mt-3 flex gap-2 justify-end">
              <button onClick={() => setOpen(false)} className="px-4 py-2 rounded-full text-sm" style={{ color: T.grey }}>
                {t("fb_close")}
              </button>
              <button onClick={send} disabled={state === "sending" || msg.trim().length < 3}
                className="px-5 py-2 rounded-full text-sm font-bold text-white disabled:opacity-40"
                style={{ background: T.grad }}>
                {state === "sending" ? t("fb_sending") : t("fb_send")}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
