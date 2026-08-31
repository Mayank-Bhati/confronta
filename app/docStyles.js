// Shared look for the static reference pages — privacy, terms, how it works,
// data and sources. These are the pages a sceptical teacher or parent reads,
// and four near-identical copies of the same style object had already started
// drifting apart, so they live here instead.
//
// Plain inline styles rather than the app's theme: these pages render outside
// the React app shell, have no theme toggle, and must stay readable if the
// stylesheet never arrives.
export const S = {
  page: {
    maxWidth: 760, margin: "0 auto", padding: "40px 20px 80px",
    fontFamily: "Inter, system-ui, sans-serif", lineHeight: 1.65, color: "#14192E",
  },
  h1: { fontFamily: "Fraunces, Georgia, serif", fontSize: 34, fontWeight: 800, marginBottom: 6 },
  h2: { fontFamily: "Fraunces, Georgia, serif", fontSize: 22, fontWeight: 700, marginTop: 34, marginBottom: 8 },
  h3: { fontFamily: "Fraunces, Georgia, serif", fontSize: 17, fontWeight: 700, marginTop: 22, marginBottom: 6 },
  small: { color: "#5A6072", fontSize: 14 },
  hr: { border: 0, borderTop: "1px solid #E3E6EF", margin: "40px 0" },
  a: { color: "#2244BB" },
  // Wide content has to scroll inside its own box rather than pushing the page
  // sideways on a phone.
  tableWrap: { overflowX: "auto", margin: "12px 0" },
  table: { borderCollapse: "collapse", width: "100%", fontSize: 14, minWidth: 520 },
  th: {
    textAlign: "left", padding: "8px 10px", borderBottom: "2px solid #E3E6EF",
    fontFamily: "'IBM Plex Mono', ui-monospace, monospace", fontSize: 12,
    textTransform: "uppercase", letterSpacing: ".04em", color: "#5A6072", whiteSpace: "nowrap",
  },
  td: { padding: "8px 10px", borderBottom: "1px solid #E3E6EF", verticalAlign: "top" },
  note: {
    background: "#F4F6FD", border: "1px solid #E3E6EF", borderRadius: 12,
    padding: "14px 16px", margin: "16px 0",
  },
  mono: { fontFamily: "'IBM Plex Mono', ui-monospace, monospace", fontSize: 13 },
};

// Every reference page carries the same footer: how to get back, and how to
// tell us something is wrong.
export const CONTACT = "bhati.mayank842@gmail.com";

// Tailwind's preflight strips list markers site-wide, which is right for the
// app's chip and card lists and wrong for these pages: a reference page whose
// bullets have all been removed reads as run-on prose, and these are the pages
// someone sceptical reads closely. Restored only inside .cc-doc so nothing in
// the app changes.
export function DocStyle() {
  return (
    <style>{`
      .cc-doc ul { list-style: disc; padding-left: 1.35em; margin: 10px 0; }
      .cc-doc ol { list-style: decimal; padding-left: 1.35em; margin: 10px 0; }
      .cc-doc li { margin: 5px 0; }
      .cc-doc p { margin: 10px 0; }
      .cc-doc a { text-decoration: underline; }
    `}</style>
  );
}
