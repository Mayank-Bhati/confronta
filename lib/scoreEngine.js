// scoreEngine — turns this-or-that answers into a six-dimension interest profile.
// Pure functions: same answers, same profile. Fully auditable.

export const DIMS = ["R", "I", "A", "S", "E", "C"];

export const DIM_INFO = {
  R: { name: "Maker", desc: "Hands, tools, machines, the physical world" },
  I: { name: "Thinker", desc: "Why things work, data, deep understanding" },
  A: { name: "Creator", desc: "Ideas, design, expression, originality" },
  S: { name: "Helper", desc: "People, care, teaching, connection" },
  E: { name: "Leader", desc: "Persuading, deciding, building ventures" },
  C: { name: "Organizer", desc: "Order, precision, plans that work" },
};

const PAIR_NAMES = {
  RI: "The Engineer at heart", RA: "The Craftsman-creator", RS: "The Hands-on helper",
  RE: "The Field commander", RC: "The Precision builder", IA: "The Curious inventor",
  IS: "The Insightful guide", IE: "The Strategist", IC: "The Analyst",
  AS: "The Storyteller", AE: "The Creative promoter", AC: "The Design perfectionist",
  SE: "The People leader", SC: "The Reliable backbone", EC: "The Operator",
};

// Canonical mapping between interest tags and RIASEC dimensions — used both to
// suggest tags after the survey and to blend edited tags back into scoring.
export const DIM_TO_TAGS = {
  R: ["Machines & hardware", "Building things", "Sport & movement"],
  I: ["Mathematics", "Science & research", "Programming"],
  A: ["Design & creativity", "Media & video", "Languages & writing"],
  S: ["People & communication", "Teaching & mentoring", "Health & body"],
  E: ["Economics & finance", "People & communication", "Law & society"],
  C: ["Economics & finance", "Mathematics"],
};

export function emptyVector() {
  return { R: 0, I: 0, A: 0, S: 0, E: 0, C: 0 };
}

// Turn the user's (possibly hand-edited) interest tags into a RIASEC vector.
export function interestsToVector(interests) {
  const v = emptyVector();
  for (const d of DIMS) {
    for (const tag of DIM_TO_TAGS[d]) {
      if (interests?.includes(tag)) v[d] += 1;
    }
  }
  return v;
}

export function applyAnswer(vector, weights) {
  const v = { ...vector };
  for (const d of Object.keys(weights || {})) v[d] += weights[d];
  return v;
}

export function topDimensions(vector, n = 2) {
  return [...DIMS].sort((a, b) => vector[b] - vector[a]).slice(0, n);
}

// Poor man's adaptive testing: after the broad phase, spend the remaining
// questions where uncertainty is highest — the two leading dimensions.
export function pickTargeted(vector, targetedPools, perDim = 4) {
  const [d1, d2] = topDimensions(vector, 2);
  const qs = [];
  for (let i = 0; i < perDim; i++) {
    if (targetedPools[d1]?.[i]) qs.push(targetedPools[d1][i]);
    if (targetedPools[d2]?.[i]) qs.push(targetedPools[d2][i]);
  }
  return qs;
}

export function normalize(vector) {
  const max = Math.max(1, ...DIMS.map((d) => vector[d]));
  const out = {};
  for (const d of DIMS) out[d] = Math.round((vector[d] / max) * 100);
  return out;
}

export function identity(vector) {
  const [a, b] = topDimensions(vector, 2);
  return {
    title: PAIR_NAMES[a + b] || PAIR_NAMES[b + a] || "The Explorer",
    primary: DIM_INFO[a],
    secondary: DIM_INFO[b],
    letters: `${a}${b}`,
  };
}

// ————— Survey v2: stratified random selection + mixed question types —————

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Stratified sampling: shuffle for freshness, then greedily prefer questions
// covering dimension-pairs not yet asked — every survey feels different,
// every survey still measures all six dimensions evenly.
export function buildSurvey(pools, nBinary = 10, nMulti = 5) {
  const shuffled = shuffle(pools.binary);
  const seenPairs = new Set();
  const binary = [];
  for (const q of shuffled) {
    if (binary.length >= nBinary) break;
    if (!seenPairs.has(q.pair)) { seenPairs.add(q.pair); binary.push(q); }
  }
  for (const q of shuffled) {
    if (binary.length >= nBinary) break;
    if (!binary.includes(q)) binary.push(q);
  }
  const multi = shuffle(pools.multi).slice(0, nMulti);
  return { binary, multi };
}

// Adaptive Likert phase: spend intensity questions on the two leading dims.
export function pickLikert(vector, likertPool, n = 5) {
  const [d1, d2] = topDimensions(vector, 2);
  const pool = shuffle(likertPool.filter((q) => q.dim === d1 || q.dim === d2));
  return pool.slice(0, n);
}

// Likert answers add signed intensity, floored at zero.
export const LIKERT_SCALE = [
  { label: "Definitely not me", v: -2 },
  { label: "Not really", v: -1 },
  { label: "Neutral", v: 0 },
  { label: "Like me", v: 1 },
  { label: "Very much me", v: 2 },
];

export function applyLikert(vector, dim, v) {
  const out = { ...vector };
  out[dim] = Math.max(0, out[dim] + v);
  return out;
}

export function applyMulti(vector, selectedOptions) {
  let v = { ...vector };
  for (const opt of selectedOptions) v = applyAnswer(v, opt.w);
  return v;
}
