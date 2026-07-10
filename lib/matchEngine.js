// matchEngine — ranks worlds and careers against the student.
//
// Score v2: worlds blend the survey vector (70%) with the user's interest
// tags (30%), so editing interests visibly moves the percentages, two people
// with the same survey letters but different interests get different numbers,
// and every world can explain WHY it matches (reasonDim). Fits keep one
// decimal internally for stable, tie-free ordering.

import { DIMS, interestsToVector, normalize } from "./scoreEngine";

export const SCORE_VERSION = 2;

function similarity(studentVec, itemVec) {
  let dot = 0, sMag = 0, iMag = 0;
  for (const d of DIMS) {
    const s = studentVec[d] || 0;
    const i = itemVec[d] || 0;
    dot += s * i;
    sMag += s * s;
    iMag += i * i;
  }
  if (!sMag || !iMag) return 0;
  return dot / (Math.sqrt(sMag) * Math.sqrt(iMag));
}

export function blendedVector(studentVec, interests) {
  const nv = normalize(studentVec);
  const iv = interests?.length ? normalize(interestsToVector(interests)) : nv;
  const out = {};
  for (const d of DIMS) out[d] = 0.7 * nv[d] + 0.3 * iv[d];
  return out;
}

// The dimension that explains the match: the world's strongest requirement
// where the student is also strong.
function reasonDim(blended, itemVec) {
  let best = null, bestScore = -1;
  for (const d of DIMS) {
    const w = itemVec[d] || 0;
    if (w <= 0) continue;
    const s = w * (blended[d] || 0);
    if (s > bestScore) { bestScore = s; best = d; }
  }
  return best;
}

export function rankWorlds(studentVec, worlds, interests) {
  const blended = blendedVector(studentVec, interests);
  return worlds
    .map((w) => ({
      ...w,
      fitExact: Math.round(similarity(blended, w.riasec) * 1000) / 10,
      fit: Math.round(similarity(blended, w.riasec) * 100),
      reasonDim: reasonDim(blended, w.riasec),
    }))
    .sort((a, b) => b.fitExact - a.fitExact);
}

export function rankCareers(studentVec, world, interests) {
  const blended = blendedVector(studentVec, interests);
  return world.careers
    .map((c) => ({
      ...c,
      fitExact: Math.round(similarity(blended, c.riasec) * 1000) / 10,
      fit: Math.round(similarity(blended, c.riasec) * 100),
      reasonDim: reasonDim(blended, c.riasec),
    }))
    .sort((a, b) => b.fitExact - a.fitExact);
}
