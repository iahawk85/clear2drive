import { describe, it, expect } from "vitest";
import {
  estimate,
  curve,
  centralParameters,
  valueAt,
  standardDrinks,
  approximateDrinks,
  HOUR,
  classify,
  crossing,
  validate,
  type Drink,
  type Person,
} from "../src/engine";
import { suggestedThreshold } from "../src/legal";
import { localInput, parseLocal } from "../src/time";
const person: Person = { weight: 80, height: 180, composition: "higher" };
const t = Date.parse("2026-10-03T17:00:00+10:00");
const drink = (amount: number, time = t): Drink => ({
  id: String(time) + String(amount),
  time,
  standardDrinks: amount,
  label: "Test",
});
describe("independent analytic references", () => {
  it("one drink fully absorbed: 10/(80 × .68 × 10) − .015 × 1h", () => {
    const points = curve(
      person,
      [drink(1)],
      centralParameters(person),
      t + 2 * HOUR,
    );
    expect(valueAt(points, t + 1.25 * HOUR)).toBeCloseTo(
      10 / (80 * 0.68 * 10) - 0.015,
      10,
    );
  });
  it("four simultaneous drinks at two hours", () => {
    const e = estimate(person, [drink(4)], t + 2 * HOUR, 0.05);
    // Elimination is active only from t + 15 min: 1.75 h.
    expect(e.current).toBeCloseTo(40 / (80 * 0.68 * 10) - 0.015 * 1.75, 10);
  });
  it("integrates overlapping drink absorption once, without double elimination", () => {
    const d = [drink(2), drink(2, t + 0.5 * HOUR)];
    expect(estimate(person, d, t + 2 * HOUR, 0.05).current).toBeCloseTo(
      40 / (80 * 0.68 * 10) - 0.015 * 1.75,
      10,
    );
  });
  it("slow elimination reference gives latest model zero plus margin", () => {
    const e = estimate(person, [drink(4)], t + 2 * HOUR, 0.05);
    const theoreticalZero =
      t + 0.5 * HOUR + (48 / (80 * 0.68 * 0.85 * 10) / 0.01) * HOUR;
    expect(e.conservative).toBeCloseTo(theoreticalZero + 1.5 * HOUR, 2);
  });
  it("standard drinks independently match ethanol mass", () => {
    expect(standardDrinks(375, 4.8)).toBeCloseTo(1.4202, 6);
    expect(standardDrinks(150, 13)).toBeCloseTo(1.53855, 6);
    expect(standardDrinks(30, 40)).toBeCloseTo(0.9468, 6);
  });
});
describe("session behaviour and safety", () => {
  it("zero drinks yields finite empty timeline and zero BAC", () => {
    const e = estimate(person, [], t, 0.05);
    expect(e.current).toBe(0);
    expect(e.conservative).toBe(t);
    expect(e.timeline.length).toBe(2);
  });
  it("absorption is delayed and a zero reading before absorption is not clearance", () => {
    const e = estimate(person, [drink(2)], t, 0.05);
    expect(e.current).toBe(0);
    expect(e.pending).toBe(true);
    expect(e.conservative).toBeGreaterThan(t + 4 * HOUR);
    expect(e.status).not.toBe("ESTIMATE BELOW LIMIT");
  });
  it("spread sessions have less current BAC than simultaneous doses", () => {
    const spread = [drink(1), drink(1, t + 2 * HOUR), drink(1, t + 4 * HOUR)];
    expect(estimate(person, spread, t + 6 * HOUR, 0.05).current).toBeLessThan(
      estimate(person, [drink(3, t + 4 * HOUR)], t + 6 * HOUR, 0.05).current,
    );
  });
  it("adding another drink extends waiting time", () => {
    const e = estimate(person, [drink(4)], t + 3 * HOUR, 0.05);
    const f = estimate(
      person,
      [drink(4), drink(1.4, t + 3 * HOUR)],
      t + 3 * HOUR,
      0.05,
    );
    expect(f.conservative).toBeGreaterThan(e.conservative);
  });
  it("last downward crossing ignores an early lull", () => {
    expect(
      crossing(
        [
          { time: 0, bac: 0.06 },
          { time: 100, bac: 0 },
          { time: 200, bac: 0.1 },
          { time: 300, bac: 0 },
        ],
        0.05,
        0,
      ),
    ).toBe(250);
  });
  it("midnight crossing is based on elapsed time", () => {
    const start = Date.parse("2026-10-03T23:30:00+10:00");
    const e = estimate(person, [drink(4, start)], start + 2 * HOUR, 0.05);
    expect(e.current).toBeCloseTo(
      estimate(person, [drink(4)], t + 2 * HOUR, 0.05).current,
    );
  });
  it("morning after heavy session retains alcohol", () => {
    const ds = approximateDrinks(10, t, t + 6 * HOUR);
    const e = estimate(person, ds, t + 13 * HOUR, 0.05);
    expect(e.high).toBeGreaterThan(0);
    expect(e.conservative).toBeGreaterThan(t + 13 * HOUR);
  });
  it("zero BAC profile cannot confirm sobriety", () => {
    expect(estimate(person, [drink(1)], t + 20 * HOUR, 0).status).toBe(
      "ZERO BAC NOT CONFIRMED",
    );
    expect(estimate(person, [drink(4)], t + 2 * HOUR, 0).status).toBe(
      "DO NOT DRIVE",
    );
  });
  it("borderline scenario receives too close to call", () => {
    expect(classify(0.04, 0.06, 0.05, false)).toBe("TOO CLOSE TO CALL");
    expect(classify(0.06, 0.08, 0.05, false)).toBe("DO NOT DRIVE");
  });
  it("threshold is configurable and exact threshold counts as above", () => {
    expect(classify(0.02, 0.03, 0.02, false)).toBe("DO NOT DRIVE");
    expect(suggestedThreshold("NSW", "full")).toBe(0.05);
    expect(suggestedThreshold("NSW", "learner")).toBe(0);
    expect(suggestedThreshold("VIC", "full")).toBe(0);
  });
  it("higher weight reduces modeled concentration", () => {
    expect(
      estimate({ ...person, weight: 200 }, [drink(4)], t + 2 * HOUR, 0.05)
        .current,
    ).toBeLessThan(
      estimate({ ...person, weight: 40 }, [drink(4)], t + 2 * HOUR, 0.05)
        .current,
    );
  });
  it("height and age do not spuriously improve precision", () => {
    expect(
      estimate(
        { ...person, height: 150, age: 70 },
        [drink(4)],
        t + 2 * HOUR,
        0.05,
      ).current,
    ).toBe(estimate(person, [drink(4)], t + 2 * HOUR, 0.05).current);
  });
  it("larger margin never moves the waiting time earlier", () => {
    expect(
      estimate(person, [drink(4)], t + 2 * HOUR, 0.05, 180).conservative -
        estimate(person, [drink(4)], t + 2 * HOUR, 0.05, 90).conservative,
    ).toBe(90 * 60_000);
  });
  it("maximum supported dose has a complete clearance horizon", () => {
    const e = estimate(
      { ...person, weight: 30 },
      [drink(25), drink(25), drink(25), drink(25)],
      t + 2 * HOUR,
      0.05,
    );
    expect(e.conservative).toBeGreaterThan(t + 120 * HOUR);
  });
  it("uncertainty encloses the centre, finite and nonnegative", () => {
    for (const amount of [1, 4, 12]) {
      const e = estimate(person, [drink(amount)], t + 2 * HOUR, 0.05);
      expect(e.low).toBeLessThanOrEqual(e.current);
      expect(e.high).toBeGreaterThanOrEqual(e.current);
      expect(
        e.timeline.every((p) => Number.isFinite(p.bac) && p.bac >= 0),
      ).toBe(true);
    }
  });
});
describe("invalid inputs", () => {
  it.each([0, -1, NaN, Infinity, 301])("rejects weight %s", (weight) =>
    expect(() => estimate({ ...person, weight }, [], t, 0.05)).toThrow(),
  );
  it.each([0, -1, NaN, Infinity, 31])("rejects drink %s", (n) =>
    expect(() => estimate(person, [drink(n)], t, 0.05)).toThrow(),
  );
  it("rejects future timestamps", () =>
    expect(() => estimate(person, [drink(1, t + 1)], t, 0.05)).toThrow());
  it("rejects invalid timestamps, ages, thresholds and shortened margins", () => {
    expect(() => estimate(person, [drink(1, NaN)], t, 0.05)).toThrow();
    expect(() => validate({ ...person, age: 17 }, [], t)).toThrow();
    expect(() => estimate(person, [], t, 0.08)).toThrow();
    expect(() => estimate(person, [], t, 0.05, 0)).toThrow();
  });
  it("rejects invalid beverages", () => {
    expect(() => standardDrinks(0, 5)).toThrow();
    expect(() => standardDrinks(375, 101)).toThrow();
  });
  it("rejects reversed morning-after times", () =>
    expect(() => approximateDrinks(4, t + HOUR, t)).toThrow());
});
describe("absolute timestamps across timezone and DST changes", () => {
  it("rejects nonexistent and repeated local daylight saving times in Sydney", () => {
    const previous = process.env.TZ;
    process.env.TZ = "Australia/Sydney";
    try {
      expect(() => parseLocal("2026-10-04T02:30")).toThrow();
      expect(() => parseLocal("2026-04-05T02:30")).toThrow();
    } finally {
      if (previous === undefined) delete process.env.TZ;
      else process.env.TZ = previous;
    }
  });
  it("spring forward is one elapsed hour", () => {
    const a = Date.parse("2026-10-04T01:30:00+10:00"),
      b = Date.parse("2026-10-04T03:30:00+11:00");
    expect(b - a).toBe(HOUR);
    expect(estimate(person, [drink(2, a)], b, 0.05).current).toBeCloseTo(
      estimate(person, [drink(2)], t + HOUR, 0.05).current,
    );
  });
  it("fall back repeated times are distinct absolute moments", () => {
    expect(
      Date.parse("2026-04-05T02:30:00+10:00") -
        Date.parse("2026-04-05T02:30:00+11:00"),
    ).toBe(HOUR);
  });
  it("equivalent timezone offsets give identical estimates", () => {
    expect(Date.parse("2026-10-03T17:00:00+10:00")).toBe(
      Date.parse("2026-10-03T07:00:00Z"),
    );
  });
  it("local input roundtrips a real time and rejects invalid dates", () => {
    const value = localInput(t);
    expect(localInput(parseLocal(value))).toBe(value);
    expect(() => parseLocal("2026-02-30T10:00")).toThrow();
  });
});
