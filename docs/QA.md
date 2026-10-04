# Release QA

Unit reference cases, input validation and absolute-time/DST checks are in `tests/engine.test.ts`. Browser journeys are in `tests/e2e/app.spec.ts`, exercising desktop Chromium, iPhone-size Chromium, Android-size Chromium, and iPhone-size WebKit. Release evidence is updated after the final run.

Tests exercise personal profile creation, timestamped dynamic additions, BAC threshold configuration, reload persistence, offline reload and addition, stopped-drinking countdown language, archiving/history/deletion, morning-after times crossing midnight, volume/ABV conversion, zero-BAC advice, horizontal overflow and axe accessibility checks. Test data lives in isolated browser contexts and is never included as production session data.

No automated test can establish medical accuracy, real breath alcohol concentration, or permission to drive. Physical iPhone and Android installation requires device testing; browser emulation is reported separately.
