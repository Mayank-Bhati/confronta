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

export function outcomeNote(course, t) {
  const status = course?.outcomes?.status;
  const slug = String(course?.id || "").replace(/-p\d+$/, "");
  switch (status) {
    case "its":
      return { text: t("why_its"), href: INDIRE_ITS, link: t("why_its_link") };
    case "not_member":
      return {
        text: t("why_not_member", { inst: course.inst }),
        href: OWN_REPORT[slug] || null,
        link: t("why_own_report"),
      };
    case "partial":
      return { text: t("why_partial") };
    case "no_survey":
      return { text: t("why_no_survey") };
    default:
      return null;
  }
}
