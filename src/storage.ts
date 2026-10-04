import type { Session, Person } from "./engine";
import { validate } from "./engine";
import {
  jurisdictions,
  licences,
  type Jurisdiction,
  type Licence,
} from "./legal";
export interface Settings {
  person: Person;
  jurisdiction: Jurisdiction;
  licence: Licence;
  threshold: number;
  margin: number;
  accepted: boolean;
}
export interface Stored {
  version: 1;
  settings: Settings | null;
  active: Session | null;
  history: Session[];
}
export const KEY = "clear2drive.v1";
export const EMPTY: Stored = {
  version: 1,
  settings: null,
  active: null,
  history: [],
};
export function load(): Stored {
  const raw = localStorage.getItem(KEY);
  if (!raw) return EMPTY;
  const data = JSON.parse(raw) as Stored;
  if (
    data.version !== 1 ||
    !Array.isArray(data.history) ||
    data.history.length > 100
  )
    throw new Error("Unsupported saved data.");
  if (data.settings) {
    const s = data.settings;
    validate(s.person, [], Date.now());
    if (
      !jurisdictions.includes(s.jurisdiction) ||
      !Object.hasOwn(licences, s.licence) ||
      ![0, 0.02, 0.05].includes(s.threshold) ||
      !Number.isFinite(s.margin) ||
      s.margin < 90 ||
      s.margin > 720 ||
      s.accepted !== true ||
      (["learner", "provisional", "unsure"].includes(s.licence) &&
        s.threshold !== 0)
    )
      throw new Error("Invalid saved settings.");
  }
  for (const session of [
    ...data.history,
    ...(data.active ? [data.active] : []),
  ]) {
    if (
      !session.person ||
      !Number.isFinite(session.start) ||
      session.start > Date.now() ||
      !Array.isArray(session.drinks) ||
      typeof session.stopped !== "boolean" ||
      session.drinks.some((d) => d.time < session.start || d.time > Date.now())
    )
      throw new Error("Invalid saved session.");
    const reference = Math.max(
      session.start,
      ...session.drinks.map((d) => d.time),
    );
    validate(session.person, session.drinks, reference);
  }
  return data;
}
