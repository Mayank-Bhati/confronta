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

// Monthly cost model. Living cost is a RANGE, never a single number, because
// the underlying thing genuinely is one and a midpoint hides the decision that
// drives it.
//
//   fees:  annual tuition for the student's ISEE band, spread over 12 months.
//          Kept separate from living costs the whole way through so the card
//          can say "excluding tuition" and have that be literally true.
//   away:  livingRange from the catalogue — rent + utilities + food + transport,
//          where the low end is a bed in a shared room and the high end a
//          private single, both from the Immobiliare.it Insights survey.
//   home:  personal costs plus commuting. The span here is the student
//          transport concession: Italian regions sell under-26 season tickets
//          at roughly half the full fare, so the low end assumes the student
//          qualifies and the high end assumes they pay full price.
export function estimateMonthlyCost(course, prefs, homeCity) {
  // AFAM institutions publish no fee band, so this is null for them. Treating
  // null as zero would quietly understate the cost of a conservatorio; the card
  // says "see official page" instead, and the budget score below is driven by
  // living costs alone rather than by an invented fee.
  const feeYr = course.costByIsee?.[prefs.isee || "mid"] ?? null;
  const fees = feeYr == null ? 0 : Math.round(feeYr / 12);
  let low, high;
  if (prefs.awayFromHome) {
    // Older exports carry only cityRent. Rather than fabricate a spread around
    // it, collapse to a point and let `spread` below report that there is none,
    // so the UI shows one number instead of a range it cannot justify.
    const r = course.livingRange;
    if (Array.isArray(r) && r.length === 2) {
      [low, high] = r;
    } else {
      low = high = course.cityRent + 100 + 190 + 25;
    }
  } else {
    const km = homeCity ? haversineKm(homeCity.lat, homeCity.lon, course.lat, course.lon) : 20;
    const commute = Math.min(300, Math.max(0, km - 15) * 4);
    low = Math.round(100 + commute * 0.5);
    high = Math.round(100 + commute);
  }
  return {
    fees,
    living: { low: Math.round(low), high: Math.round(high) },
    total: { low: fees + Math.round(low), high: fees + Math.round(high) },
    // A range built from an unsurveyed city is still a guess; the card labels
    // it differently rather than letting it pass as a measurement.
    estimated: !!course.rentEstimated,
    spread: Math.round(high) > Math.round(low),
  };
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
    const B = prefs.monthlyBudget;
    // Scored against the range rather than a point. A course the budget covers
    // even at its most expensive is unambiguously affordable; one it covers
    // only at the cheap end is reachable but dictates how the student lives —
    // shared room, no slack. Scoring a midpoint called both of those "fits".
    const costScore = B >= est.total.high ? 100
      : B >= est.total.low ? 70 + 30 * ((B - est.total.low) / Math.max(1, est.total.high - est.total.low))
        : Math.max(0, 100 - ((est.total.low - B) / B) * 150);
    score += costScore * 3; weights += 3;
    const feesYr = (course.costByIsee?.[prefs.isee || "mid"] || 0).toLocaleString();
    const args = {
      low: est.total.low.toLocaleString(), high: est.total.high.toLocaleString(),
      livingLow: est.living.low.toLocaleString(), livingHigh: est.living.high.toLocaleString(),
      fees: est.fees, feesYr, budget: B.toLocaleString(),
    };
    if (B >= est.total.high) {
      reasons.push(t("env_budget_fit", args));
    } else if (B >= est.total.low) {
      // The case a single number erased: affordable, but only one way.
      reasons.push(t("env_budget_tight", args));
    } else {
      const hint = (prefs.isee || "mid") === "low" ? t("env_budget_dsu") : t("env_budget_sch");
      reasons.push(t("env_budget_over", { ...args, over: (est.total.low - B).toLocaleString() }) + hint);
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

  // Maths tolerance (soft). Every course carries a mathLoad of 1-5 and the
  // constraint survey asks what a student can live with; abandoning a course
  // over its maths is one of the commonest reasons people drop out, so a
  // mismatch should cost a course rank rather than be discovered in October.
  // Only scored when the student actually said — 0 means no preference.
  if (prefs.mathTolerance > 0 && course.mathLoad) {
    const over = course.mathLoad - prefs.mathTolerance;
    const mathScore = over <= 0 ? 100 : Math.max(0, 100 - over * 30);
    score += mathScore * 2; weights += 2;
    if (over > 0) reasons.push(t("env_math_heavy", { n: course.mathLoad }));
  }

  // City size preference (soft)
  if (prefs.citySize && prefs.citySize !== "any") {
    const match = course.citySize === prefs.citySize ? 100 : 55;
    score += match; weights += 1;
    if (match < 100) reasons.push(t("env_size", { city: course.city }));
  }

  // Nothing measurable (no survey, no budget set, no distance set) is not the
  // same as scoring zero. Every conservatorio hit this and displayed a damning
  // 0/100. Rank such courses neutrally so they are neither promoted nor buried,
  // and let the card show a dash rather than a number it did not earn.
  return {
    score: weights ? Math.round(score / weights) : 50,
    scored: weights > 0,
    reasons, quality,
  };
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
