// matchEngine — ranks worlds and careers by similarity between the student's
// interest vector and each item's RIASEC tags. Cosine-style, deterministic.

import { DIMS } from "./scoreEngine";

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

export function rankWorlds(studentVec, worlds) {
  return worlds
    .map((w) => ({ ...w, fit: Math.round(similarity(studentVec, w.riasec) * 100) }))
    .sort((a, b) => b.fit - a.fit);
}

export function rankCareers(studentVec, world) {
  return world.careers
    .map((c) => ({ ...c, fit: Math.round(similarity(studentVec, c.riasec) * 100) }))
    .sort((a, b) => b.fit - a.fit);
}
