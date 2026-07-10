// ————— Theme palettes: dark (cinematic) and light —————
export const PALETTES = {
  dark: {
    bg: "#07070E", card: "#12121D", card2: "#181826",
    line: "rgba(255,255,255,0.09)", lineStrong: "rgba(255,255,255,0.18)",
    ink: "#F2F3F8", grey: "#9CA3B8",
    violet: "#3B82F6", violetSoft: "rgba(59,130,246,0.16)", accent: "#60A5FA",
    pink: "#EC4899",
    green: "#34D399", greenSoft: "rgba(52,211,153,0.14)",
    amber: "#FBBF24", amberSoft: "rgba(251,191,36,0.13)",
    red: "#F87171", redSoft: "rgba(248,113,113,0.13)",
    grad: "linear-gradient(135deg,#2563EB,#EC4899)",
    track: "rgba(255,255,255,0.08)",
    headerBg: "rgba(7,7,14,0.82)",
    chipIdle: "transparent",
    rowBg: "rgba(255,255,255,0.04)",
  },
  light: {
    bg: "#F5F5FB", card: "#FFFFFF", card2: "#F1F1F8",
    line: "rgba(20,20,60,0.10)", lineStrong: "rgba(20,20,60,0.22)",
    ink: "#1A1B2E", grey: "#5D6470",
    violet: "#2244BB", violetSoft: "rgba(34,68,187,0.10)", accent: "#2244BB",
    pink: "#DB2777",
    green: "#0E9F6E", greenSoft: "rgba(14,159,110,0.12)",
    amber: "#B45309", amberSoft: "rgba(245,158,11,0.16)",
    red: "#DC2626", redSoft: "rgba(220,38,38,0.10)",
    grad: "linear-gradient(135deg,#2244BB,#DB2777)",
    track: "rgba(20,20,60,0.10)",
    headerBg: "rgba(245,245,251,0.85)",
    chipIdle: "#FFFFFF",
    rowBg: "rgba(20,20,60,0.04)",
  },
};

export const WORLD_HUES = ["#3B82F6", "#EC4899", "#38BDF8", "#FBBF24", "#34D399", "#F87171", "#A3E635"];

export const INTEREST_TAGS = [
  "Programming", "Mathematics", "Economics & finance", "Design & creativity",
  "Machines & hardware", "People & communication", "Science & research", "Building things",
  "Health & body", "Nature & environment", "Media & video", "Teaching & mentoring",
  "Languages & writing", "Law & society", "Sport & movement", "Food & hospitality",
];

export const DIM_TO_TAGS = {
  R: ["Machines & hardware", "Building things", "Sport & movement"],
  I: ["Mathematics", "Science & research", "Programming"],
  A: ["Design & creativity", "Media & video", "Languages & writing"],
  S: ["People & communication", "Teaching & mentoring", "Health & body"],
  E: ["Economics & finance", "People & communication", "Law & society"],
  C: ["Economics & finance", "Mathematics"],
};

export const NATURE_KEY = {
  scientific: "nat_scientific",
  classical: "nat_classical",
  mixed: "nat_mixed",
  "technical-practical": "nat_technical",
};

export const mono = { fontFamily: "'Space Mono', monospace" };
export const display = { fontFamily: "'Outfit', system-ui, sans-serif" };
export const DATE_LOCALE = { en: "en-GB", it: "it-IT", hi: "hi-IN" };

export const natureStyleFor = (T, nature) =>
  nature === "classical" ? { bg: T.amberSoft, fg: T.amber }
  : nature === "scientific" ? { bg: T.violetSoft, fg: T.accent }
  : { bg: T.greenSoft, fg: T.green };

