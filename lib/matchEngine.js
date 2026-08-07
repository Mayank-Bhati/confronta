// matchEngine — ranks worlds and careers against the student.
//
// Score v3 (tester feedback, 2026-07-13): v2 blended the interest tags into
// the survey vector and scored with plain cosine similarity. Two problems
// showed up in testing:
//   · editing interests moved every percentage in the SAME direction (adding
//     tags across many dimensions flattens the blended vector, which lowers
//     the cosine against every world at once), and
//   · the ranking almost never re-ordered, so interests felt decorative.
// v3 scores two things separately and adds them:
//   · alignment  — cosine between the survey profile and the world (55%)
//   · affinity   — how much of what you actually ticked this world uses (45%)
// Affinity is per-world, so ticking "Health & body" lifts Health & care
// without touching Business & money: the order really moves, and the
// percentages stop drifting together.

import { DIMS, DIM_TO_TAGS, interestsToVector, normalize } from "./scoreEngine";

export const SCORE_VERSION = 3;

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

// Kept for compatibility (used by fit explanations elsewhere).
export function blendedVector(studentVec, interests) {
  const nv = normalize(studentVec);
  const iv = interests?.length ? normalize(interestsToVector(interests)) : nv;
  const out = {};
  for (const d of DIMS) out[d] = 0.7 * nv[d] + 0.3 * iv[d];
  return out;
}

// Which dimensions does this tag belong to? ("Mathematics" → I and C)
function dimsOfTag(tag) {
  return DIMS.filter((d) => DIM_TO_TAGS[d].includes(tag));
}

// Affinity: of the interests the student ticked, how many does this world
// genuinely run on? 1.0 = every ticked interest sits in one of the world's
// strongest dimensions. Independent per world — that is the whole point.
function tagAffinity(interests, itemVec) {
  if (!interests?.length) return null;
  const maxDim = Math.max(...DIMS.map((d) => itemVec[d] || 0));
  if (!maxDim) return 0;
  let sum = 0;
  for (const tag of interests) {
    let best = 0;
    for (const d of dimsOfTag(tag)) best = Math.max(best, (itemVec[d] || 0) / maxDim);
    sum += best;
  }
  return sum / interests.length;
}

// The interests that explain this match — named back to the student instead of
// the abstract "strong Leader side" line testers found meaningless.
function reasonTags(interests, itemVec, limit = 2) {
  if (!interests?.length) return [];
  const maxDim = Math.max(...DIMS.map((d) => itemVec[d] || 0)) || 1;
  return interests
    .map((tag) => {
      let w = 0;
      for (const d of dimsOfTag(tag)) w = Math.max(w, (itemVec[d] || 0) / maxDim);
      return { tag, w };
    })
    .filter((x) => x.w >= 0.5)
    .sort((a, b) => b.w - a.w)
    .slice(0, limit)
    .map((x) => x.tag);
}

// Fallback explanation when no interests are set: the world's strongest
// requirement where the student is also strong.
function reasonDim(studentVec, itemVec) {
  const nv = normalize(studentVec);
  let best = null, bestScore = -1;
  for (const d of DIMS) {
    const w = itemVec[d] || 0;
    if (w <= 0) continue;
    const s = w * (nv[d] || 0);
    if (s > bestScore) { bestScore = s; best = d; }
  }
  return best;
}

function scoreItem(studentVec, itemVec, interests) {
  const nv = normalize(studentVec);
  const align = Math.max(0, similarity(nv, itemVec));
  const aff = tagAffinity(interests, itemVec);
  // No interests ticked yet: the survey carries the whole score.
  const raw = aff == null ? align : 0.55 * align + 0.45 * aff;
  return Math.round(raw * 1000) / 10;
}

export function rankWorlds(studentVec, worlds, interests) {
  return worlds
    .map((w) => {
      const fitExact = scoreItem(studentVec, w.riasec, interests);
      return {
        ...w,
        fitExact,
        fit: Math.round(fitExact),
        reasonTags: reasonTags(interests, w.riasec),
        reasonDim: reasonDim(studentVec, w.riasec),
      };
    })
    .sort((a, b) => b.fitExact - a.fitExact);
}

export function rankCareers(studentVec, world, interests) {
  return world.careers
    .map((c) => {
      const fitExact = scoreItem(studentVec, c.riasec, interests);
      return {
        ...c,
        fitExact,
        fit: Math.round(fitExact),
        reasonTags: reasonTags(interests, c.riasec),
        reasonDim: reasonDim(studentVec, c.riasec),
      };
    })
    .sort((a, b) => b.fitExact - a.fitExact);
}
