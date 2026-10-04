import { afterEach, describe, expect, it, vi } from "vitest";
import { EMPTY, KEY, load, type Stored } from "../src/storage";
const now = Date.now();
const good: Stored = {
  version: 1,
  settings: {
    person: { weight: 80, height: 180, composition: "higher" },
    jurisdiction: "NSW",
    licence: "full",
    threshold: 0.05,
    margin: 90,
    accepted: true,
  },
  active: null,
  history: [],
};
afterEach(() => vi.unstubAllGlobals());
function saved(value: string | null) {
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => (key === KEY ? value : null),
  });
}
describe("local storage schema", () => {
  it("no data is an empty device, without sample sessions", () => {
    saved(null);
    expect(load()).toEqual(EMPTY);
  });
  it("valid saved profile loads", () => {
    saved(JSON.stringify(good));
    expect(load()).toEqual(good);
  });
  it.each([
    "{bad",
    JSON.stringify({ ...good, version: 2 }),
    JSON.stringify({
      ...good,
      settings: { ...good.settings, threshold: 0.08 },
    }),
  ])("rejects corrupt data without overwriting it", (raw) => {
    saved(raw);
    expect(() => load()).toThrow();
  });
  it("rejects future drink records", () => {
    saved(
      JSON.stringify({
        ...good,
        active: {
          id: "test",
          start: now,
          person: good.settings!.person,
          stopped: false,
          approximate: false,
          drinks: [
            { id: "d", time: now + 86400000, standardDrinks: 1, label: "test" },
          ],
        },
      }),
    );
    expect(() => load()).toThrow();
  });
  it("rejects corrupted licence limits and nonnumeric margins", () => {
    for (const changes of [
      { licence: "learner", threshold: 0.05 },
      { licence: "toString" },
      { margin: "invalid" },
    ]) {
      saved(
        JSON.stringify({ ...good, settings: { ...good.settings, ...changes } }),
      );
      expect(() => load()).toThrow();
    }
  });
});
