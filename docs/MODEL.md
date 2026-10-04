# Calculation model and sources

Reviewed 4 October 2026. This software is an educational harm-reduction estimator; it has not undergone clinical or forensic validation. The uncertainty envelope is a set of deliberately varied scenarios, not a confidence interval or a guarantee of an upper bound.

## Units and Widmark basis

BAC is expressed as g/100 mL, commonly written as percent. One Australian standard drink contains 10 g ethanol. The fully distributed increment is:

```
BAC increment (%) = ethanol grams / (weight kg × r × 10)
```

The classic Widmark relation subtracts elimination, beta × elapsed hours, from distributed concentration. Here, each drink is absorbed gradually and elimination acts once on the combined concentration. BAC is clamped at zero, so an alcohol-free gap cannot accrue negative BAC or future elimination credit.

Central distribution factor r = 0.68 for the typically male body-water average and 0.55 for the typically female average. Unsure uses 0.55. These are conventional approximate coefficients, not measured body composition or an identity classification. They do not capture all bodies. Height and optional age are retained as requested but not used; the UI says so.

Central assumptions: 15-minute absorption delay, constant absorption over 60 minutes, beta = 0.015 percentage points per hour, labelled alcohol amount taken as entered. All ethanol is eventually counted; the model does not apply a food-related dose discount.

For each interval between absorption starts/ends, alcohol input rate is constant. The engine solves `max(0, BAC + (sum(input rates) − beta) × elapsed hours)` exactly for that interval. It inserts the exact zero crossing before clamping and samples every five minutes for plotting. This is not a validated gastric absorption curve; it is a transparent temporal approximation to the Widmark model. Absorption timing may be different in reality.

## Uncertainty and waiting

Sixteen scenarios combine distribution factors ±15% and inversely paired dose variation ±20%, beta = 0.010/0.020 per hour, delays of 0/30 minutes, and absorption periods of 30/120 minutes. The high dose/lower distribution combination and low dose/higher distribution combination bound all independent dose/distribution combinations under the same temporal assumptions. Current illustrative bounds include the centre estimate.

These percentages, absorption windows and additional margin are product safety choices informed by documented variability, not individually measured parameters. They are not universal biological limits. Actual BAC can exceed the displayed upper scenario. Near-zero clearance is particularly uncertain because zero-order elimination can break down at very low concentrations.

- Centre threshold and near-zero times are final downward crossings, never an early pre-absorption lull, and never earlier than the centre absorption completion.
- Near zero means centre BAC <= 0.001%; it does not establish a measured zero.
- Conservative time uses the latest exact modelled zero across all scenarios, never earlier than the final possible absorption completion, plus the configured 90/120/180-minute buffer. It is independent of the selected licence threshold and thus never gets earlier for a higher selected threshold.
- Displayed times are rounded **up** to 15 minutes. BAC centre uses two decimals with `~`; interval edges round outward to two decimals. The underlying computation retains precision only to avoid arithmetic error.
- Above the selected threshold in the centre estimate or all scenarios: DO NOT DRIVE. Range reaching within 0.005 percentage points of a nonzero limit: TOO CLOSE TO CALL. Pending absorption: BAC MAY STILL RISE. Below limit wording never establishes fitness to drive.
- For threshold zero, an estimate cannot certify sobriety: ZERO BAC NOT CONFIRMED persists even once the model reaches zero.
- Empty sessions return zero numerically and render an empty state, not a driving recommendation.
- No food, coffee, water, exercise, shower or sleep adjustment exists.

## Session timing

Drink timestamps are Unix milliseconds, so elapsed time survives midnight, timezone changes and DST offset changes. Dates are shown in the device's local timezone. Datetime-local entry is parsed in the device timezone and rejects invalid/nonexistent local dates. Repeated autumn local times are rejected to avoid silently assuming the wrong offset; exact current-instant quick-add remains available. Approximate sessions distribute total alcohol evenly between start and last-drink timestamps. That assumption is displayed, and does not capture a late drinking burst.

## Independent reference cases

80 kg, r = .68:

1. One 10 g drink after complete central absorption (75 minutes): `10/(80*.68*10) − .015*1 = .00338235294%`.
2. Four simultaneous drinks, two hours after entry: `40/(80*.68*10) − .015*1.75 = .04727941176%`.
3. Two drinks at time zero, two at +30 minutes, at +2 h: same total and uninterrupted elimination as reference 2.
4. Slow scenario, four simultaneous drinks: dose = 48 g, r = .578, beta=.010, delay=.5h. Modelled zero occurs `.5 + (48/(80*.578*10))/.010 = 10.88062284h` after entry. Additional 1.5h yields `12.38062284h` before display rounding.
5. 375 mL at 4.8%: `375*.048*.789/10 = 1.4202` Australian standard drinks.

These equations are independently encoded in tests; they establish correct implementation of stated assumptions, not medical accuracy.

## Legal configuration

NSW full unrestricted default: under .05; learner/provisional: zero; specified public passenger, dangerous goods and large heavy vehicles: under .02. Professional/special and unsure start at zero as a precaution and professional users explicitly select the applicable category. Other jurisdictions start at zero pending the user's local-rule check and configuration. The app does not assert that every driver in these locations has a zero limit. Local rules, interlocks and special conditions can differ. Users must check the rules that apply to their licence and location. Sources link directly from the profile, with verified automatic defaults limited to NSW.

## Primary sources

- [Australian Government standard drinks guide](https://www.health.gov.au/topics/alcohol/about-alcohol/standard-drinks-guide) — 10 g standard and serving variation.
- [NSW Government alcohol limits, drugs and medicines](https://www.nsw.gov.au/driving-boating-and-transport/driving-nsw/roads-safety-and-rules/safe-driving/alcohol-and-drugs) — current licence/vehicle limits and inability to determine BAC from self-estimation.
- [Searle, The estimation of blood alcohol concentration: Widmark revisited (2015)](https://pubmed.ncbi.nlm.nih.gov/25868887/) — estimation models and absorption.
- [Jones, Evidence-based survey of elimination rates (2010)](https://pubmed.ncbi.nlm.nih.gov/20304569/) — physiological variability in ethanol elimination; DOI 10.1016/j.forsciint.2010.02.021.
- [Jones, Role of variability in ethanol pharmacokinetics (2003)](https://pubmed.ncbi.nlm.nih.gov/12489977/) — absorption, distribution and elimination variability, and limitations of zero-order kinetics.
- [Healthdirect poisoning guidance](https://www.healthdirect.gov.au/swallowed-substances) — emergency symptoms and calling 000.
