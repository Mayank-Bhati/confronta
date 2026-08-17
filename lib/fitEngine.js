// ————————————————————————————————————————————
// FIT ENGINE — deterministic, explainable, per-dimension.
// fit(course, student) → { score 0-100, note }
// Pure functions: same input, same output. No API, no server.
// ————————————————————————————————————————————

export function fitAdmission(course, p) {
  const markScore = Math.max(0, Math.min(100, 100 - (course.selectivity - (p.avgMark - 10)) * 1.6));
  const mathGap = course.mathLoad - p.mathStrength;
  const mathScore = Math.max(0, 100 - Math.max(0, mathGap) * 28);
  const score = Math.round(markScore * 0.5 + mathScore * 0.5);
  let note;
  if (score >= 75) note = "Your marks and math level sit comfortably above this bar.";
  else if (score >= 50) note = "Reachable, but the entry test will need targeted prep.";
  else note = "This admission bar is a real stretch from your current profile.";
  return { score, note };
}

export function fitAffordability(course, p) {
  const cost = course.costByIsee?.[p.isee] ?? 0;
  const yearly = cost + course.cityRent * 12 * (p.awayFromHome ? 1 : 0);
  const budget = p.isee === "low" ? 4000 : p.isee === "mid" ? 9000 : 18000;
  const ratio = yearly / budget;
  const score = Math.round(Math.max(0, Math.min(100, 100 - (ratio - 0.4) * 120)));
  const note =
    score >= 75
      ? "Fits your ISEE band without financial strain."
      : score >= 50
      ? "Doable, but a DSU scholarship would matter here."
      : "This path is expensive for your ISEE band — scholarships are essential.";
  return { score, note, yearly };
}

export function fitInterests(course, p) {
  if (!p.interests.length) return { score: 50, note: "Add interests to your profile to score this." };
  const overlap = course.subjects.filter((s) => p.interests.includes(s)).length;
  const union = new Set([...course.subjects, ...p.interests]).size;
  const capped = Math.min(100, Math.round((overlap / Math.max(1, union)) * 100 + overlap * 12));
  const note =
    capped >= 60
      ? "Strong overlap with what you say you enjoy."
      : capped >= 35
      ? "Partial overlap — some core subjects match, others don't."
      : "Little overlap with your declared interests.";
  return { score: capped, note };
}

export function fitOutcome(course, p) {
  let score, note;
  if (p.goal === "work") {
    score = Math.round(course.employment1y * 0.6 + course.handsOn * 8);
    note =
      course.handsOn >= 4
        ? "Built to put you in a job fast, with heavy practical training."
        : "Good employment stats, but the route to work passes through theory first.";
  } else if (p.goal === "salary") {
    score = Math.round(Math.min(100, (course.salary / 40000) * 100));
    note = `Median entry salary here is €${course.salary.toLocaleString()}.`;
  } else {
    score = course.mastersAccess * 20;
    note =
      course.mastersAccess >= 4
        ? "Natural runway into a master's and research."
        : "Further academic study from here is unusual and harder.";
  }
  return { score: Math.min(100, score), note };
}

export const DIMENSIONS = [
  { key: "admission", label: "Admission", fn: fitAdmission },
  { key: "afford", label: "Affordability", fn: fitAffordability },
  { key: "interest", label: "Interest match", fn: fitInterests },
  { key: "outcome", label: "Outcome fit", fn: fitOutcome },
];

// ————————————————————————————————————————————
// NARRATIVE GENERATOR — derives the "explain it to me" text
// directly from the fit scores. Deterministic, auditable, free.
// (Static hosting has no server to hide an API key behind, so the
// explanation is computed, not generated. Swap in an AI proxy later
// via AI_PROXY_URL in components/Confronta.jsx if desired.)
// ————————————————————————————————————————————

export function generateNarrative(pair, fits, profile) {
  const [a, b] = pair;
  const gaps = DIMENSIONS.map((d) => ({
    label: d.label,
    key: d.key,
    aScore: fits[0][d.key].score,
    bScore: fits[1][d.key].score,
    gap: Math.abs(fits[0][d.key].score - fits[1][d.key].score),
  })).sort((x, y) => y.gap - x.gap);

  const bullets = gaps.slice(0, 3).map((g) => {
    const leader = g.aScore >= g.bScore ? a : b;
    const other = g.aScore >= g.bScore ? b : a;
    const diff = g.gap;
    if (diff < 8) {
      return `• ${g.label}: essentially even between the two for your profile — this dimension shouldn't drive your decision.`;
    }
    const strength = diff >= 30 ? "clearly" : "moderately";
    return `• ${g.label}: ${leader.name} (${leader.inst}) fits you ${strength} better here (${Math.max(g.aScore, g.bScore)} vs ${Math.min(g.aScore, g.bScore)} for you).`;
  });

  const goalText =
    profile.goal === "work"
      ? "start working quickly"
      : profile.goal === "salary"
      ? "maximize early salary"
      : "continue to a master's";

  return (
    `Based on your profile (goal: ${goalText}, ISEE band: ${profile.isee}, math ${profile.mathStrength}/5, average mark ${profile.avgMark}):\n\n` +
    bullets.join("\n") +
    `\n\nNo path is objectively better — these are the trade-offs as they apply to you. The choice is yours.`
  );
}
