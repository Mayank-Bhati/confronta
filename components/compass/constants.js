export { DIM_TO_TAGS } from "../../lib/scoreEngine";

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
    grad: "linear-gradient(135deg,#2563EB,#4D3FB8)",
    track: "rgba(255,255,255,0.08)",
    headerBg: "rgba(7,7,14,0.82)",
    chipIdle: "transparent",
    rowBg: "rgba(255,255,255,0.04)",
  },
  light: {
    bg: "#FAF9F6", card: "#FFFFFF", card2: "#F4F3EE",
    line: "#E4E2DA", lineStrong: "#CBC8BC",
    ink: "#14192E", grey: "#5A6072",
    violet: "#2244BB", violetSoft: "#EEF1FB", accent: "#2244BB",
    pink: "#16255F",
    green: "#0E7C5B", greenSoft: "rgba(14,124,91,0.10)",
    amber: "#B45309", amberSoft: "rgba(180,83,9,0.12)",
    red: "#C2410C", redSoft: "rgba(194,65,12,0.10)",
    grad: "linear-gradient(135deg,#16255F,#2244BB)",
    track: "#E7E5DC",
    headerBg: "rgba(250,249,246,0.92)",
    chipIdle: "#FFFFFF",
    rowBg: "#F4F3EE",
  },
};

export const WORLD_HUES = ["#3B82F6", "#EC4899", "#38BDF8", "#FBBF24", "#34D399", "#F87171", "#A3E635"];

export const INTEREST_TAGS = [
  "Programming", "Mathematics", "Economics & finance", "Design & creativity",
  "Machines & hardware", "People & communication", "Science & research", "Building things",
  "Health & body", "Nature & environment", "Media & video", "Teaching & mentoring",
  "Languages & writing", "Law & society", "Sport & movement", "Food & hospitality",
];


export const NATURE_KEY = {
  scientific: "nat_scientific",
  classical: "nat_classical",
  mixed: "nat_mixed",
  "technical-practical": "nat_technical",
};

export const mono = { fontFamily: "'IBM Plex Mono', monospace" };
export const display = { fontFamily: "'Fraunces', Georgia, serif" };
export const DATE_LOCALE = { en: "en-GB", it: "it-IT", hi: "hi-IN" };

export const natureStyleFor = (T, nature) =>
  nature === "classical" ? { bg: T.amberSoft, fg: T.amber }
  : nature === "scientific" ? { bg: T.violetSoft, fg: T.accent }
  : { bg: T.greenSoft, fg: T.green };

