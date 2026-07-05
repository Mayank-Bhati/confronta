// fitEngine v2 — two layers, matching the two dropout causes:
//   PATH fit: does this course match who you are and where you want to go
//   ENVIRONMENT fit: will you thrive in this place (quality, city, cost, distance)
// Soft filters: near-misses drop in rank but stay visible with a reason —
// a hidden best answer is the failure mode we exist to prevent.

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

export function fitInterests(course, interests) {
  if (!interests?.length) return { score: 50, note: "No interests set." };
  const overlap = course.subjects.filter((s) => interests.includes(s)).length;
  const union = new Set([...course.subjects, ...interests]).size;
  const score = Math.min(100, Math.round((overlap / Math.max(1, union)) * 100 + overlap * 12));
  return {
    score,
    note:
      score >= 60 ? "Strong overlap with what you enjoy."
      : score >= 35 ? "Partial overlap with your interests."
      : "Limited overlap with your interests.",
  };
}

export function fitOutcome(course, goal) {
  let score, note;
  if (goal === "work") {
    score = Math.round(course.employment1y * 0.6 + course.handsOn * 8);
    note = course.handsOn >= 4
      ? "Built to put you in a job fast — heavy practical training."
      : "Good employment, but the route to work passes through theory first.";
  } else if (goal === "salary") {
    score = Math.round(Math.min(100, (course.salary / 40000) * 100));
    note = `Median entry salary ~€${course.salary.toLocaleString()}.`;
  } else {
    score = course.mastersAccess * 20;
    note = course.mastersAccess >= 4
      ? "Natural runway into a master's and beyond."
      : "Continuing to a master's from here is unusual.";
  }
  return { score: Math.min(100, score), note };
}

// ENVIRONMENT fit: quality + city + cost + distance, each soft.
export function fitEnvironment(course, prefs, homeCity) {
  const reasons = [];
  let score = 0;
  let weights = 0;

  // Teaching quality (AlmaLaurea-style satisfaction + regret index)
  const quality = Math.round(course.env.teachSat * 0.4 + course.env.wouldChooseAgain * 0.4 + (100 - course.env.dropout * 2) * 0.2);
  score += quality * 3; weights += 3;
  if (course.env.dropout >= 22) reasons.push(`${course.env.dropout}% don't finish on time — check the workload honestly`);
  else reasons.push(`${course.env.wouldChooseAgain}% of graduates would choose it again`);

  // Cost vs budget (soft)
  if (prefs.budget) {
    const yearly = course.costByIsee[prefs.isee || "mid"] + (prefs.awayFromHome ? course.cityRent * 12 : 0);
    const over = yearly - prefs.budget;
    const costScore = over <= 0 ? 100 : Math.max(0, 100 - (over / prefs.budget) * 150);
    score += costScore * 2; weights += 2;
    if (over > 0) reasons.push(`~€${over.toLocaleString()}/y over your budget — scholarships could close the gap`);
  }

  // Distance from home (soft)
  if (homeCity && prefs.maxDistance) {
    const km = haversineKm(homeCity.lat, homeCity.lon, course.lat, course.lon);
    const distScore = km <= prefs.maxDistance ? 100 : Math.max(0, 100 - ((km - prefs.maxDistance) / prefs.maxDistance) * 100);
    score += distScore * 2; weights += 2;
    if (km > prefs.maxDistance) reasons.push(`${km} km from ${homeCity.name} — beyond your ${prefs.maxDistance} km preference`);
    else reasons.push(`${km} km from ${homeCity.name}`);
  }

  // City size preference (soft)
  if (prefs.citySize && prefs.citySize !== "any") {
    const match = course.citySize === prefs.citySize ? 100 : 55;
    score += match; weights += 1;
    if (match < 100) reasons.push(`${course.city} is a ${course.citySize} city; you preferred ${prefs.citySize}`);
  }

  return { score: Math.round(score / Math.max(1, weights)), reasons, quality };
}

// Hard filters: only for genuinely binary facts.
export function passesHardFilters(course, prefs) {
  if (prefs.language && prefs.language !== "any") {
    if (course.env.language !== prefs.language && course.env.language !== "both") return false;
  }
  if (prefs.pathType && prefs.pathType !== "any" && course.type !== prefs.pathType) return false;
  return true;
}

// Grades flipped: never a gate, always a preparation plan.
export function prepList(course, profile) {
  const items = [];
  if (course.selectivity >= 75) items.push(`Competitive admission (${course.test}) — start test prep 3–4 months early`);
  else if (course.test && course.type === "University") items.push(`Admission via ${course.test} — a few weeks of focused prep is enough`);
  else items.push("Admission via internal test + motivational interview — prepare to tell your story");
  if (course.mathLoad >= 4 && (profile.mathStrength || 3) < course.mathLoad) items.push("Heavy maths load — strengthen fundamentals the summer before");
  if ((profile.isee || "mid") === "low") items.push("You likely qualify for a DSU scholarship — apply the moment the regional call opens (usually July)");
  if (course.env.dropout >= 22) items.push("High off-schedule rate here — plan a sustainable study routine from week one");
  return items;
}

export function generateNarrative(pair, dims, profile) {
  const gaps = dims
    .map((d) => ({ label: d.label, a: d.scores[0], b: d.scores[1], gap: Math.abs(d.scores[0] - d.scores[1]) }))
    .sort((x, y) => y.gap - x.gap)
    .slice(0, 3);
  const bullets = gaps.map((g) => {
    if (g.gap < 8) return `• ${g.label}: essentially even for your profile — don't let this drive the decision.`;
    const lead = g.a > g.b ? pair[0] : pair[1];
    return `• ${g.label}: ${lead.name} (${lead.inst}) fits you ${g.gap >= 30 ? "clearly" : "moderately"} better here.`;
  });
  return `Based on your profile:\n\n${bullets.join("\n")}\n\nNo path is objectively better — these are your trade-offs. The choice is yours.`;
}
