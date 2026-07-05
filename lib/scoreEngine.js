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

export function emptyVector() {
  return { R: 0, I: 0, A: 0, S: 0, E: 0, C: 0 };
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
