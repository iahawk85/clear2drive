export type Licence =
  "full" | "learner" | "provisional" | "professional" | "unsure";
export const jurisdictions = [
  "NSW",
  "VIC",
  "QLD",
  "WA",
  "SA",
  "TAS",
  "ACT",
  "NT",
] as const;
export type Jurisdiction = (typeof jurisdictions)[number];
export const ruleLinks: Record<Jurisdiction, string> = {
  NSW: "https://www.nsw.gov.au/driving-boating-and-transport/driving-nsw/roads-safety-and-rules/safe-driving/alcohol-and-drugs",
  VIC: "https://transport.vic.gov.au/road-rules-and-safety",
  QLD: "https://www.qld.gov.au/transport/safety/road-safety/drink-driving",
  WA: "https://www.wa.gov.au/organisation/road-safety-commission/drink-driving",
  SA: "https://www.mylicence.sa.gov.au/road-rules/the-drivers-handbook/alcohol",
  TAS: "https://www.transport.tas.gov.au/road_safety_and_rules",
  ACT: "https://www.accesscanberra.act.gov.au/driving-transport-and-parking",
  NT: "https://nt.gov.au/driving/safety/drink-driving",
};
/** Automatic defaults only for verified NSW categories. Other locations require explicit confirmation. */
export function suggestedThreshold(
  jurisdiction: Jurisdiction,
  licence: Licence,
): number {
  return jurisdiction === "NSW" && licence === "full" ? 0.05 : 0;
}
export const licences: Record<Licence, string> = {
  full: "Full licence",
  learner: "Learner",
  provisional: "Provisional",
  professional: "Professional / special",
  unsure: "Unsure",
};
