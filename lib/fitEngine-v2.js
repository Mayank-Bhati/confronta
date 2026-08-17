// fitEngine v2 — two layers, matching the two dropout causes:
//   PATH fit: does this course match who you are and where you want to go
//   ENVIRONMENT fit: will you thrive in this place (quality, city, cost, distance)
// Soft filters: near-misses drop in rank but stay visible with a reason —
// a hidden best answer is the failure mode we exist to prevent.
//
// All user-facing strings are i18n keys resolved through the injected `t`,
// so every reason/note renders in the active language.

const idT = (k) => k; // fallback when no translator is provided (tests)

export function haversineKm(lat1, lon1, lat2, lon2) {
  const toRad = (x) => (x * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

export function fitInterests(course, interests, t = idT) {
  if (!interests?.length) return { score: 50, note: t("fi_none") };
  const overlap = course.subjects.filter((s) => interests.includes(s)).length;
  const union = new Set([...course.subjects, ...interests]).size;
  const score = Math.min(100, Math.round((overlap / Math.max(1, union)) * 100 + overlap * 12));
  return {
    score,
    note: score >= 60 ? t("fi_strong") : score >= 35 ? t("fi_partial") : t("fi_limited"),
  };
}

// Real, sourced graduate-survey figures for this course — or null when
// AlmaLaurea publishes none (non-member university, or an ITS academy).
// Nothing in this engine may invent a measured value.
export function realOutcomes(course) {
  // "partial" is a real survey with the employment figure suppressed (AlmaLaurea
  // withholds it for groups with too few respondents). Every consumer already
  // null-checks each field, so the satisfaction numbers that do exist are worth
  // showing rather than discarding the whole row.
  const s = course?.outcomes?.status;
  return s === "ok" || s === "partial" ? course.outcomes : null;
}

// How work-ready the qualification is BY DESIGN (an ITS is a two-year
// vocational course, a triennale is a stepping stone). This is a structural
// property of the qualification, not a measurement of this university.
function structuralWorkFit(course) {
  return Math.min(100, (course.handsOn || 2) * 16 + 20);
}

function singleGoalFit(course, goal, t) {
  const real = realOutcomes(course);
  let score, note;
  if (goal === "work") {
    // a partial row has satisfaction but no employment figure — score it
    // structurally rather than inventing a number out of a null
    if (real && real.employment1y != null) {
      score = Math.round(real.employment1y * 0.7 + structuralWorkFit(course) * 0.3);
      note = t("fo_work_real", { p: real.employment1y, y: real.occYear });
    } else {
      score = structuralWorkFit(course);
      note = t("fo_work_nodata");
    }
  } else if (goal === "salary") {
    // Career-level market pay (approximate, same for every course leading to
    // this job) — never presented as a figure for this specific university.
    const pay = course.careerPay;
    score = pay ? Math.round(Math.min(100, (pay / 2200) * 100)) : 50;
    note = pay ? t("fo_salary_approx", { n: pay.toLocaleString() }) : t("fo_salary_unknown");
  } else {
    score = (course.mastersAccess || 3) * 20;
    note = (course.mastersAccess || 3) >= 4 ? t("fo_study_yes") : t("fo_study_rare");
  }
  return { score: Math.min(100, score), note };
}

// Accepts one goal or several ("work"+"salary" is a valid combo); the score is
// the average across selected goals so no single ambition dominates.
export function fitOutcome(course, goals, t = idT) {
  const list = (Array.isArray(goals) ? goals : [goals]).filter(Boolean).filter((g) => g !== "salary");
  if (!list.length || list.includes("unsure")) {
    const parts = ["work", "study"].map((g) => singleGoalFit(course, g, t));
    const score = Math.round(parts.reduce((s, p) => s + p.score, 0) / parts.length);
    return { score: Math.min(100, score), note: t("fo_unsure") };
  }
  const parts = list.map((g) => singleGoalFit(course, g, t));
  const score = Math.round(parts.reduce((s, p) => s + p.score, 0) / parts.length);
  return { score, note: parts.map((p) => p.note).join(" ") };
}

// Monthly cost model (verified 2025 living costs — see research workbook):
//   fees: annual tuition for the student's ISEE band, spread over 12 months
//   away from home: single room rent + utilities (€100) + food (€190) + transport (€25)
//   living at home: personal costs (€100) + commuting that grows with distance
export function estimateMonthlyCost(course, prefs, homeCity) {
  // AFAM institutions publish no fee band, so this is null for them. Treating
  // null as zero would quietly understate the cost of a conservatorio; the card
  // says "see official page" instead, and the budget score below is driven by
  // living costs alone rather than by an invented fee.
  const feeYr = course.costByIsee?.[prefs.isee || "mid"] ?? null;
  const fees = feeYr == null ? 0 : Math.round(feeYr / 12);
  let living;
  if (prefs.awayFromHome) {
    living = course.cityRent + 100 + 190 + 25;
  } else {
    const km = homeCity ? haversineKm(homeCity.lat, homeCity.lon, course.lat, course.lon) : 20;
    living = 100 + Math.min(300, Math.max(0, km - 15) * 4);
  }
  return { fees, living: Math.round(living), total: fees + Math.round(living) };
}

// ENVIRONMENT fit: quality + city + cost + distance, each soft.
export function fitEnvironment(course, prefs, homeCity, t = idT) {
  const reasons = [];
  let score = 0;
  let weights = 0;

  // Teaching quality (AlmaLaurea-style satisfaction + regret index)
  const real = realOutcomes(course);
  let quality = null;
  if (real) {
    quality = Math.round((real.teachSat ?? 80) * 0.35 + (real.wouldChooseAgain ?? 70) * 0.4 + (real.onTime ?? 65) * 0.25);
    score += quality * 3; weights += 3;
    if (real.onTime != null && real.onTime < 65) reasons.push(t("env_ontime_low", { p: real.onTime, y: real.profYear }));
    else reasons.push(t("env_again_real", { p: real.wouldChooseAgain, y: real.profYear }));
  } else {
    // no survey for this institution — say so instead of scoring a guess
    reasons.push(t("env_nodata"));
  }

  // Budget: full monthly cost model, both living modes (soft)
  if (prefs.monthlyBudget > 0) {
    const est = estimateMonthlyCost(course, prefs, homeCity);
    const over = est.total - prefs.monthlyBudget;
    const costScore = over <= 0 ? 100 : Math.max(0, 100 - (over / prefs.monthlyBudget) * 150);
    score += costScore * 3; weights += 3;
    const feesYr = (course.costByIsee?.[prefs.isee || "mid"] || 0).toLocaleString();
    if (over <= 0) {
      reasons.push(t("env_budget_fit", {
        total: est.total.toLocaleString(), fees: est.fees, living: est.living, feesYr,
        budget: prefs.monthlyBudget.toLocaleString(),
      }));
    } else {
      const hint = (prefs.isee || "mid") === "low" ? t("env_budget_dsu") : t("env_budget_sch");
      reasons.push(t("env_budget_over", {
        total: est.total.toLocaleString(), over: over.toLocaleString(), living: est.living, feesYr,
      }) + hint);
    }
  }

  // Distance from home (soft)
  if (homeCity && prefs.maxDistance) {
    const km = haversineKm(homeCity.lat, homeCity.lon, course.lat, course.lon);
    const distScore = km <= prefs.maxDistance ? 100 : Math.max(0, 100 - ((km - prefs.maxDistance) / prefs.maxDistance) * 100);
    score += distScore * 2; weights += 2;
    if (km > prefs.maxDistance) reasons.push(t("env_km_far", { km, city: homeCity.name, max: prefs.maxDistance }));
    else reasons.push(t("env_km", { km, city: homeCity.name }));
  }

  // City size preference (soft)
  if (prefs.citySize && prefs.citySize !== "any") {
    const match = course.citySize === prefs.citySize ? 100 : 55;
    score += match; weights += 1;
    if (match < 100) reasons.push(t("env_size", { city: course.city }));
  }

  return { score: Math.round(score / Math.max(1, weights)), reasons, quality };
}

// Hard filters: only for genuinely binary facts.
export function passesHardFilters(course, prefs) {
  if (prefs.language && prefs.language !== "any") {
    if (course.env.language !== prefs.language && course.env.language !== "both") return false;
  }
  if (prefs.pathType && prefs.pathType !== "any" && course.type !== prefs.pathType) return false;
  // An ITS is a two-year vocational qualification and does not lead to a
  // master's, so it cannot answer "master's & beyond".
  if (prefs.goals?.includes("study") && course.type === "ITS") return false;
  if (prefs.ownership && prefs.ownership !== "any" && (course.ownership || "public") !== prefs.ownership) return false;
  return true;
}

// Grades flipped: never a gate, always a preparation plan.
export function prepList(course, profile, t = idT) {
  const items = [];
  if (course.selectivity >= 75) items.push(t("prep_hard", { test: course.test }));
  else if (course.test && course.type === "University") items.push(t("prep_uni", { test: course.test }));
  else items.push(t("prep_interview"));
  if (course.mathLoad >= 4 && (profile.mathStrength || 3) < course.mathLoad) items.push(t("prep_math"));
  if ((profile.isee || "mid") === "low") items.push(t("prep_dsu"));
  const _r = realOutcomes(course);
  if (_r && _r.onTime != null && _r.onTime < 65) items.push(t("prep_drop"));
  return items;
}

export function generateNarrative(pair, dims, profile, t = idT) {
  const gaps = dims
    .map((d) => ({ label: d.label, a: d.scores[0], b: d.scores[1], gap: Math.abs(d.scores[0] - d.scores[1]) }))
    .sort((x, y) => y.gap - x.gap)
    .slice(0, 3);
  const bullets = gaps.map((g) => {
    if (g.gap < 8) return "• " + t("nar_even", { label: g.label });
    const lead = g.a > g.b ? pair[0] : pair[1];
    const key = g.gap >= 30 ? "nar_better_clear" : "nar_better_mod";
    return "• " + t(key, { label: g.label, name: lead.name, inst: lead.inst });
  });
  return `${t("nar_intro")}\n\n${bullets.join("\n")}\n\n${t("nar_outro")}`;
}
