// Where every number on a card comes from.
//
// The spec's rule is that a figure never appears without its provenance beside
// it — not in a footnote, not on a separate page. This module is the single
// place that decides, for one course and one field, what that provenance is.
// The UI asks; it never works it out for itself, because the moment two
// components reason about sources independently they start disagreeing.
//
// The hard rule underneath all of it: a national figure must never be dressed
// as a measurement of this course. AlmaLaurea publishes by university and
// subject group, INDIRE by ITS course or academy, and neither of those is "this
// degree". Each record therefore carries an explicit `scope` sentence naming
// the population the number actually describes, and the card shows it.

// The six classifications the spec allows. Nothing else may be returned.
export const OFFICIAL_INSTITUTION = "institution";
export const OFFICIAL_PUBLIC = "public";
export const NATIONAL_MONITORING = "national";
export const ESTIMATE = "estimate";
export const UNAVAILABLE = "unavailable";
export const UNCONFIRMED = "unconfirmed";

// When we last read each source, not when the source was published — those are
// different dates and conflating them would overstate freshness. These move
// only when the corresponding dataset is actually re-fetched.
export const VERIFIED = {
  almalaurea: "2026-08-17",
  indire: "2026-08-19",
  rents: "2026-08-29",
  fees: "2026-08-29",
};

// Reliability is about DISTANCE FROM THIS COURSE, not about how much we trust
// the publisher. An INDIRE national average is an excellent measurement of the
// wrong population; a rent estimate is a weak measurement of the right one.
// Collapsing those into one "quality" score is what makes data dashboards lie.
export const EXACT = "exact";         // the surveyed row IS this course
export const MEASURED = "measured";   // surveyed for this institution and subject
export const WIDER = "wider";         // real measurement, wider population
export const COMPOSED = "composed";   // assembled by us from other figures

const ALMALAUREA_HOME = "https://statistiche.almalaurea.it/";
const IMMOBILIARE_2025 =
  "https://www.immobiliare.it/info/ufficio-stampa/2025/stanze-prezzi-in-crescita-domanda-stabile-milano-supera-i-730-euro-mese-per-una-singola-2718/";

function rec(o) {
  return { url: null, note: null, year: null, unit: null, ...o };
}

/**
 * Provenance for one field of one course.
 *
 * @param course  a catalogue course, with its `outcomes` block
 * @param field   employment | pay | satisfaction | fees | living
 * @returns a record the UI renders verbatim, or null when the field does not
 *          apply to this course at all (as opposed to being unavailable, which
 *          is a real answer and gets a record of its own).
 */
export function provenanceFor(course, field) {
  const o = course?.outcomes || {};

  if (field === "employment" || field === "pay") {
    const isPay = field === "pay";
    // AlmaLaurea surveyed this university and subject group directly.
    if ((o.status === "ok" || o.status === "partial") && (isPay ? o.netPay != null : o.employment1y != null)) {
      return rec({
        classification: OFFICIAL_PUBLIC,
        reliability: MEASURED,
        year: o.occYear,
        url: o.sourceOcc || ALMALAUREA_HOME,
        verified: VERIFIED.almalaurea,
        unit: isPay ? "eur_month" : "percent",
        scopeKey: "scope_almalaurea",
        scopeArgs: { inst: course.inst, year: o.occYear },
      });
    }
    // INDIRE's national ITS monitoring. itsScope says whether the row we
    // matched is this course's own or its academy's total — a distinction the
    // card has to keep, because a rank beside an academy average reads as this
    // course's rank.
    if (o.status === "its" && o.itsRate != null) {
      return rec({
        classification: NATIONAL_MONITORING,
        reliability: o.itsScope === "course" ? EXACT : WIDER,
        year: 2026,
        url: o.itsSource,
        verified: VERIFIED.indire,
        unit: isPay ? "eur_month" : "percent",
        scopeKey: o.itsScope === "course" ? "scope_indire_course" : "scope_indire_inst",
        scopeArgs: { n: o.itsDiplomati, of: o.itsOf },
      });
    }
    // No survey covers this institution, so we show the national median for the
    // same subject and level. It describes the field. It is not this course.
    if (o.natRate != null) {
      return rec({
        classification: NATIONAL_MONITORING,
        reliability: WIDER,
        year: o.occYear || 2024,
        url: ALMALAUREA_HOME,
        verified: VERIFIED.almalaurea,
        unit: isPay ? "eur_month" : "percent",
        scopeKey: "scope_national_median",
        scopeArgs: { n: o.natUniversities },
        noteKey: o.status === "not_member" ? "note_not_member" : "note_no_survey",
        noteArgs: { inst: course.inst },
      });
    }
    // AFAM. No survey of conservatorio and academy outcomes exists in Italy, so
    // the honest record is that the data is absent and why — not a blank cell.
    return rec({
      classification: UNAVAILABLE,
      reliability: null,
      verified: VERIFIED.almalaurea,
      scopeKey: "scope_none",
      noteKey: o.status === "afam" ? "note_afam" : "note_absent",
    });
  }

  if (field === "satisfaction") {
    if ((o.status === "ok" || o.status === "partial") && o.onTime != null) {
      return rec({
        classification: OFFICIAL_PUBLIC,
        reliability: MEASURED,
        year: o.profYear,
        url: o.sourceProf || ALMALAUREA_HOME,
        verified: VERIFIED.almalaurea,
        unit: "percent",
        scopeKey: "scope_almalaurea_prof",
        scopeArgs: { inst: course.inst, year: o.profYear },
      });
    }
    return rec({
      classification: UNAVAILABLE, reliability: null,
      verified: VERIFIED.almalaurea, scopeKey: "scope_none", noteKey: "note_absent",
    });
  }

  if (field === "fees") {
    // AFAM institutions set their own fees and no registry carries them. The
    // spec has a label for exactly this state, and it is not "€0".
    if (!course.costByIsee) {
      return rec({
        classification: UNCONFIRMED,
        reliability: null,
        url: course.url || null,
        verified: VERIFIED.fees,
        scopeKey: "scope_none",
        noteKey: "note_fees_afam",
      });
    }
    return rec({
      classification: OFFICIAL_INSTITUTION,
      reliability: MEASURED,
      url: course.url || null,
      verified: VERIFIED.fees,
      unit: "eur_year",
      scopeKey: "scope_fees",
      noteKey: "note_fees_isee",
    });
  }

  if (field === "living") {
    // Ours, assembled from a market survey — never an official figure, and the
    // label has to say so even though the underlying rent data is solid.
    return rec({
      classification: ESTIMATE,
      reliability: COMPOSED,
      year: 2025,
      url: course.rentEstimated ? null : IMMOBILIARE_2025,
      verified: VERIFIED.rents,
      unit: "eur_month",
      scopeKey: course.rentEstimated ? "scope_rent_estimated" : "scope_rent_surveyed",
      scopeArgs: { city: course.city },
      noteKey: "note_living_components",
    });
  }

  return null;
}

// i18n key for the classification chip.
export function classificationKey(c) {
  return {
    [OFFICIAL_INSTITUTION]: "cls_institution",
    [OFFICIAL_PUBLIC]: "cls_public",
    [NATIONAL_MONITORING]: "cls_national",
    [ESTIMATE]: "cls_estimate",
    [UNAVAILABLE]: "cls_unavailable",
    [UNCONFIRMED]: "cls_unconfirmed",
  }[c] || "cls_unconfirmed";
}

// Colour role per classification, so a student can read the strip at a glance
// without having to read six different labels every time. Measured-and-specific
// is green; real-but-wider is the neutral accent; anything we assembled or
// cannot supply is grey — deliberately not amber, because a missing figure is
// not a warning about the course, it is a fact about the data.
export function classificationTone(c) {
  if (c === OFFICIAL_PUBLIC || c === OFFICIAL_INSTITUTION) return "good";
  if (c === NATIONAL_MONITORING) return "wide";
  return "soft";
}

// The freshness line every page carrying data has to show.
export function lastVerified() {
  return Object.values(VERIFIED).sort()[0];
}
