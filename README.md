# Clear2Drive

A private, mobile-first alcohol clearance estimator for Australian adults. React + strict TypeScript, Vite, an isolated Widmark-based engine, and an installable offline PWA. Personal details and drinking history remain in browser storage; no account, analytics or personal-data backend.

**This is an estimate, not a BAC measurement. Never rely on this app to decide whether to drive. If in doubt, don't drive.**

## Run

Requires Node 24 and npm.

```sh
npm ci
npm run dev
```

```sh
npm run lint
npm test
npm run build
npx playwright install chromium webkit
npm run test:e2e
npm run preview
```

Core engine: `src/engine.ts`. Model, uncertainty and reference calculations: [docs/MODEL.md](docs/MODEL.md). Release evidence: [docs/QA.md](docs/QA.md). Deployment: [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

## Experience

- Required weight, height and body-water calculation choice; optional age. Height and age are explicitly excluded from this model.
- Australian standard drinks (10 g alcohol), direct entries with 0.1 increments, timestamped drinks, volume/ABV conversion, editable example servings.
- Gradual absorption and one elimination process across a session; midnight dates and absolute timestamps.
- Illustrative BAC range, selected threshold, final downward crossing, near-zero centre estimate, latest modelled zero plus configurable buffer of at least 90 minutes.
- Morning-after approximation, session history, local persistence, explicit deletion, optional countdown with persistent sobriety disclaimer.
- Profile-specific thresholds, verified NSW defaults, conservative zero precaution for other locations pending local-rule confirmation. Professional categories require explicit threshold selection.
- Offline precaching includes the app, font and icons. Update prompt preserves sessions and refreshes to new assets.
- Native modal focus management, labelled controls, reduced motion, safe-area mobile navigation, responsive desktop layout.

## Storage and limits

Schema version 1 is stored under `clear2drive.v1` in localStorage. History retains the latest 100 sessions and each session's original body details. Saved data is validated on read. Unsupported or corrupt data is left untouched until explicit deletion; storage failure is visible. No real or demo sessions ship with the application.

Supported adults: weight 30–300 kg, height 100–250 cm, optional age 18–110. Entries: above zero up to 30 standard drinks per entry, maximum 100 per session and 500 entries; entered timestamps within the last seven days. These are software guardrails, not medically validated population boundaries. The model is not clinically validated. Estimates can fall outside the illustrative range.

Server access logs may record ordinary HTTP connection metadata. Personal details and drinks never leave the app. Clearing browser data removes local sessions. Installed-app storage may be distinct from browser-tab storage on iOS.

## Assets

Icons are original vector artwork rendered to PNG. Manrope is self-hosted under its SIL Open Font License (`public/fonts/LICENSE.txt`). No runtime dependency on a font CDN. Run `node scripts/assets.mjs` to regenerate icons and copy the installed font.

## Safety

The app cannot establish zero BAC, legal permission or fitness to drive. A reliable breathalyser or alcohol test is the appropriate way to obtain a current reading. Body composition, absorption, food, medicines, health, measurement error and individual metabolism matter. Coffee, exercise, water, showers and brief sleep do not shorten the calculation. Emergency guidance directs Australian users to 000 when severe intoxication symptoms occur.
