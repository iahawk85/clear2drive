/** BAC units are g/100mL (%). Times are absolute Unix milliseconds. See docs/MODEL.md. */
export const HOUR = 3_600_000;
export type Composition = "higher" | "lower" | "uncertain";
export interface Person {
  weight: number;
  height: number;
  composition: Composition;
  age?: number;
}
export interface Drink {
  id: string;
  time: number;
  standardDrinks: number;
  label: string;
}
export interface Session {
  id: string;
  start: number;
  drinks: Drink[];
  stopped: boolean;
  approximate: boolean;
  person: Person;
}
export interface Parameters {
  r: number;
  beta: number;
  dose: number;
  lag: number;
  absorption: number;
}
export interface Point {
  time: number;
  bac: number;
}
export const factors = { higher: 0.68, lower: 0.55, uncertain: 0.55 };
export const DEFAULT_MARGIN_MINUTES = 90;
export function standardDrinks(volume: number, abv: number): number {
  if (
    !Number.isFinite(volume) ||
    !Number.isFinite(abv) ||
    volume <= 0 ||
    volume > 5000 ||
    abv <= 0 ||
    abv > 100
  )
    throw new Error(
      "Enter a volume from 1–5,000 mL and ABV above 0 and up to 100%.",
    );
  return (volume * (abv / 100) * 0.789) / 10;
}
export function validate(person: Person, drinks: Drink[], now: number) {
  if (!Number.isFinite(now)) throw new Error("Invalid current time.");
  if (
    !Number.isFinite(person.weight) ||
    person.weight < 30 ||
    person.weight > 300
  )
    throw new Error("Enter a weight between 30 and 300 kg.");
  if (
    !Number.isFinite(person.height) ||
    person.height < 100 ||
    person.height > 250
  )
    throw new Error("Enter a height between 100 and 250 cm.");
  if (!Object.hasOwn(factors, person.composition))
    throw new Error("Choose a body-composition option.");
  if (
    person.age !== undefined &&
    (!Number.isFinite(person.age) || person.age < 18 || person.age > 110)
  )
    throw new Error("This estimator is for adults aged 18 and over.");
  if (
    drinks.length > 500 ||
    drinks.reduce((sum, d) => sum + d.standardDrinks, 0) > 100
  )
    throw new Error(
      "This session exceeds the supported model range. Seek medical advice if needed.",
    );
  for (const drink of drinks) {
    if (
      !Number.isFinite(drink.standardDrinks) ||
      drink.standardDrinks <= 0 ||
      drink.standardDrinks > 30
    )
      throw new Error("Enter above 0 and up to 30 standard drinks per entry.");
    if (
      !Number.isFinite(drink.time) ||
      drink.time > now ||
      drink.time < now - 7 * 24 * HOUR
    )
      throw new Error(
        "Drink times must be in the past seven days, not in the future.",
      );
  }
}
export function centralParameters(person: Person): Parameters {
  return {
    r: factors[person.composition],
    beta: 0.015,
    dose: 1,
    lag: 0.25 * HOUR,
    absorption: HOUR,
  };
}
/** Piecewise-exact integration of constant absorption minus zero-order elimination, clamped at zero. */
export function curve(
  person: Person,
  drinks: Drink[],
  parameters: Parameters,
  end: number,
): Point[] {
  if (!drinks.length) return [{ time: end, bac: 0 }];
  const first = Math.min(...drinks.map((d) => d.time));
  const knots = new Set<number>([first, end]);
  for (let t = first; t < end; t += 5 * 60_000) knots.add(t);
  const doses = drinks.map((d) => ({
    start: d.time + parameters.lag,
    end: d.time + parameters.lag + parameters.absorption,
    rate:
      (d.standardDrinks * 10 * parameters.dose) /
      (person.weight * parameters.r * 10) /
      (parameters.absorption / HOUR),
  }));
  for (const d of doses) {
    if (d.start <= end) knots.add(d.start);
    if (d.end <= end) knots.add(d.end);
  }
  const times = [...knots]
    .filter((t) => t >= first && t <= end)
    .sort((a, b) => a - b);
  let bac = 0;
  const points: Point[] = [];
  times.forEach((time, i) => {
    if (i) {
      const previous = times[i - 1];
      const midpoint = (time + previous) / 2;
      const rate = doses.reduce(
        (sum, d) =>
          sum + (midpoint >= d.start && midpoint < d.end ? d.rate : 0),
        0,
      );
      const slope = rate - parameters.beta;
      const next = bac + (slope * (time - previous)) / HOUR;
      if (bac > 0 && next < 0)
        points.push({ time: previous + (bac / -slope) * HOUR, bac: 0 });
      bac = Math.max(0, next);
    }
    points.push({ time, bac });
  });
  return points;
}
export function valueAt(points: Point[], time: number): number {
  if (time <= points[0].time) return points[0].bac;
  for (let i = 1; i < points.length; i++)
    if (points[i].time >= time) {
      const a = points[i - 1],
        b = points[i];
      return a.bac + ((b.bac - a.bac) * (time - a.time)) / (b.time - a.time);
    }
  return points.at(-1)!.bac;
}
/** Final downward crossing only; never returns a pre-absorption lull as clearance. */
export function crossing(
  points: Point[],
  threshold: number,
  after: number,
): number {
  let result = after;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1],
      b = points[i];
    if (a.bac > threshold && b.bac <= threshold)
      result = Math.max(
        result,
        a.time + ((a.bac - threshold) / (a.bac - b.bac)) * (b.time - a.time),
      );
  }
  return result;
}
export type Status =
  | "DO NOT DRIVE"
  | "TOO CLOSE TO CALL"
  | "BAC MAY STILL RISE"
  | "ESTIMATE BELOW LIMIT"
  | "ZERO BAC NOT CONFIRMED";
export function classify(
  low: number,
  high: number,
  threshold: number,
  pending: boolean,
): Status {
  if (threshold === 0)
    return high > 0.00001 ? "DO NOT DRIVE" : "ZERO BAC NOT CONFIRMED";
  if (low >= threshold) return "DO NOT DRIVE";
  if (high >= threshold - 0.005) return "TOO CLOSE TO CALL";
  if (pending) return "BAC MAY STILL RISE";
  return "ESTIMATE BELOW LIMIT";
}
export function estimate(
  person: Person,
  drinks: Drink[],
  now: number,
  threshold: number,
  marginMinutes = DEFAULT_MARGIN_MINUTES,
) {
  validate(person, drinks, now);
  if (
    ![0, 0.02, 0.05].includes(threshold) ||
    !Number.isFinite(marginMinutes) ||
    marginMinutes < 90 ||
    marginMinutes > 720
  )
    throw new Error("Invalid threshold or safety margin.");
  const last = drinks.length ? Math.max(...drinks.map((d) => d.time)) : now;
  const maximumDose =
    (drinks.reduce((sum, d) => sum + d.standardDrinks, 0) * 10 * 1.2) /
    (person.weight * factors[person.composition] * 0.85 * 10);
  const end = Math.max(now, last) + (maximumDose / 0.01 + 4) * HOUR;
  const central = curve(person, drinks, centralParameters(person), end);
  const r = factors[person.composition];
  const scenarios: Point[][] = [];
  for (const scale of [0.85, 1.15])
    for (const beta of [0.01, 0.02])
      for (const lag of [0, 0.5 * HOUR])
        for (const absorption of [0.5 * HOUR, 2 * HOUR]) {
          scenarios.push(
            curve(
              person,
              drinks,
              {
                r: r * scale,
                beta,
                dose: scale === 0.85 ? 1.2 : 0.8,
                lag,
                absorption,
              },
              end,
            ),
          );
        }
  const current = drinks.length ? valueAt(central, now) : 0;
  const values = scenarios.map((c) => valueAt(c, now));
  const low = Math.min(current, ...values),
    high = Math.max(current, ...values);
  const pending = drinks.length > 0 && now < last + 2.5 * HOUR;
  const below = crossing(
    central,
    threshold === 0 ? 0.001 : threshold,
    last + 1.25 * HOUR,
  );
  const nearZero = crossing(central, 0.001, last + 1.25 * HOUR);
  const conservative = drinks.length
    ? Math.max(...scenarios.map((c) => crossing(c, 0, last + 2.5 * HOUR))) +
      marginMinutes * 60_000
    : now;
  const start = drinks.length
    ? Math.min(...drinks.map((d) => d.time))
    : now - HOUR;
  const chartEnd = Math.max(start + 4 * HOUR, conservative + HOUR, now + HOUR);
  const timeline = drinks.length
    ? central.filter((p) => p.time <= chartEnd)
    : [
        { time: start, bac: 0 },
        { time: chartEnd, bac: 0 },
      ];
  if (timeline.length === 1) timeline.push({ time: chartEnd, bac: 0 });
  return {
    current,
    low,
    high,
    pending,
    below,
    nearZero,
    conservative,
    timeline,
    status:
      threshold > 0 && current >= threshold
        ? "DO NOT DRIVE"
        : classify(low, high, threshold, pending),
    total: drinks.reduce((sum, d) => sum + d.standardDrinks, 0),
  };
}
export function approximateDrinks(
  total: number,
  start: number,
  last: number,
): Drink[] {
  if (
    !Number.isFinite(total) ||
    total <= 0 ||
    total > 100 ||
    !Number.isFinite(start) ||
    !Number.isFinite(last) ||
    last < start
  )
    throw new Error("Check the total and the start/last-drink times.");
  const count = Math.max(1, Math.ceil(total));
  return Array.from({ length: count }, (_, i) => ({
    id: crypto.randomUUID(),
    standardDrinks: total / count,
    time: count === 1 ? last : start + ((last - start) * i) / (count - 1),
    label: "Approximate drink",
  }));
}
