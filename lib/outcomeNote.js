// Why a course carries no employment figure.
//
// A bare dash reads as a broken page, and testers read it that way. The absence
// is never arbitrary — it has exactly four causes, and naming the cause turns
// the weakest-looking part of a card into the clearest evidence that we do not
// invent numbers.
//
// Where another real source exists we link it, but we never lift its figures
// into our own comparison grid: a university's self-published rate counts
// different things than AlmaLaurea's, and putting them side by side would make
// the comparison meaningless in exactly the way this product exists to avoid.

// Institution-published graduate data for the two universities outside the
// AlmaLaurea consortium. Verified reachable; both are the institution's own
// survey, on its own methodology.
export const OWN_REPORT = {
  polimi: "https://www.polimi.it/en/prospective-students/toward-the-world-of-careers/career-data",
  bocconi: "https://www.unibocconi.it/en/current-students/master-science-program/economic-and-social-sciences/placement-and-program-performance",
};

// INDIRE runs the official national monitoring of ITS Academy outcomes —
// AlmaLaurea surveys graduates of universities only, so ITS is a separate regime.
export const INDIRE_ITS =
  "https://www.indire.it/progetto/its-istituti-tecnologici-superiori/monitoraggio-nazionale/";

// From the 2026 national report (506 courses that ended in 2024): 9,991
// diplomates, 7,964 employed within a year, 92.8% of those in a field matching
// what they studied. Both figures cross-check against the report's own summary.
//
// This is deliberately NOT placed in the statistics strip. It is a national
// average across every ITS academy, and dropping it into the cell where a
// university shows its own measured rate would invite exactly the comparison
// it cannot support. It belongs in the explanation, labelled as national.
export const ITS_NATIONAL = { employed: 80, coherent: 93, year: 2026 };

// Legge 232/2016 created the "no-tax area": below €22,000 ISEE the annual
// contribution is zero. D.M. 295/2020 extended it to state AFAM institutions,
// and the fee tables at Brera and the conservatori match the same statutory
// scale. Normattiva rather than the ministry page: the latter refuses
// non-browser clients, and a source a student cannot open is not a source.
export const NO_TAX_AREA_SOURCE =
  "https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:legge:2016-12-11;232";

export function outcomeNote(course, t) {
  const status = course?.outcomes?.status;
  const slug = String(course?.id || "").replace(/-p\d+$/, "");
  switch (status) {
    case "its": {
      // With a per-course figure on the card, the national average is context
      // rather than the headline; without one, it is all we have.
      const o = course.outcomes || {};
      if (o.itsRate != null) {
        return {
          text: o.itsScope === "course"
            ? t("why_its_course", { n: o.itsDiplomati, y: ITS_NATIONAL.year, nat: ITS_NATIONAL.employed })
            : t("why_its_inst", { k: o.itsCourses, n: o.itsDiplomati, y: ITS_NATIONAL.year, nat: ITS_NATIONAL.employed }),
          href: INDIRE_ITS,
          link: t("why_its_link"),
        };
      }
      return {
        text: t("why_its_national", { p: ITS_NATIONAL.employed, c: ITS_NATIONAL.coherent, y: ITS_NATIONAL.year }),
        href: INDIRE_ITS,
        link: t("why_its_link"),
      };
    }
    case "not_member":
      return {
        // The university does publish its own figure, but Polimi's headline
        // 97% is for a Laurea Magistrale while these are three-year courses,
        // so putting it here would compare a master's outcome against every
        // other card's bachelor's one. The card shows the national median for
        // the subject instead, and links their report for the student to read
        // in its own context.
        text: course.outcomes?.natRate != null
          ? t("why_not_member_nat", { inst: course.inst, n: course.outcomes.natUniversities })
          : t("why_not_member", { inst: course.inst }),
        href: OWN_REPORT[slug] || null,
        link: t("why_own_report"),
      };
    case "afam":
      return { text: t("why_afam"), href: NO_TAX_AREA_SOURCE, link: t("why_afam_link") };
    case "partial":
      return { text: t("why_partial") };
    case "no_survey":
      return {
        text: course.outcomes?.natRate != null
          ? t("why_no_survey_nat", { n: course.outcomes.natUniversities })
          : t("why_no_survey"),
      };
    default:
      return null;
  }
}
