import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date("2026-10-04T08:10:00+11:00") });
});
async function setup(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "Set up your estimate" }).click();
  await page.getByLabel("Weight · kg").fill("80");
  await page.getByLabel("Height · cm").fill("180");
  await page.getByLabel("Body-composition calculation").selectOption("higher");
  await page.getByLabel("Licence", { exact: true }).selectOption("full");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Start estimating" }).click();
}
test("real session, immediate updates, persistence, offline, history and deletion", async ({
  page,
  context,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await setup(page);
  await page.getByRole("button", { name: "+ 1 drink", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Edit total standard drinks" }),
  ).toHaveText("1.0");
  await page
    .getByRole("button", { name: "Add drink", exact: true })
    .first()
    .click();
  await page.getByLabel("Australian standard drinks").fill("1.4");
  await page
    .getByRole("button", { name: "Add drink & update estimate" })
    .click();
  await expect(
    page.getByRole("button", { name: "Edit total standard drinks" }),
  ).toHaveText("2.4");
  await expect(page.getByRole("status")).toContainText(
    "Waiting estimate moved",
  );
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Edit total standard drinks" }),
  ).toHaveText("2.4");
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await expect
    .poll(() => page.evaluate(() => !!navigator.serviceWorker.controller))
    .toBe(true);
  await context.setOffline(true);
  if (
    test.info().project.name !== "webkit-iphone" ||
    process.platform !== "win32"
  )
    await page.reload();
  else
    test.info().annotations.push({
      type: "limitation",
      description:
        "Windows WebKit offline navigation raises an internal browser error; offline calculation tested in loaded app.",
    });
  await expect(
    page.getByText("Offline. Calculations and saved sessions still work."),
  ).toBeVisible();
  await page.getByRole("button", { name: "+ 1.5", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Edit total standard drinks" }),
  ).toHaveText("3.9");
  await context.setOffline(false);
  await page.getByRole("button", { name: "I’ve stopped drinking" }).click();
  await expect(
    page.getByText(
      "This countdown is an estimate. Reaching zero is not confirmation of sobriety.",
    ),
  ).toBeVisible();
  await page.clock.fastForward("24:00:00");
  await expect(page.locator(".countdown strong")).toHaveText("00:00:00");
  await expect(
    page.getByText(
      "Waiting estimate reached. BAC and fitness to drive remain unconfirmed. Use a reliable breath test.",
    ),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Save & start fresh", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Save & start fresh" })
    .click();
  if (
    test.info().project.name.includes("iphone") ||
    test.info().project.name === "android"
  )
    await page.getByRole("button", { name: "History", exact: true }).click();
  else
    await page
      .getByRole("button", { name: "Session history", exact: true })
      .click();
  await expect(
    page.getByRole("heading", { name: "3.9 standard drinks" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Delete all data", exact: true })
    .first()
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Delete all data", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "No saved sessions yet." }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
test("morning after, midnight, beverage conversion, zero profile and accessibility", async ({
  page,
}) => {
  await setup(page);
  await page.getByRole("button", { name: "Drank last night?" }).click();
  await page
    .getByLabel("When did you start drinking?")
    .fill("2026-10-03T19:00");
  await page.getByLabel("Last drink", { exact: true }).fill("2026-10-04T01:15");
  await page.getByLabel("Total standard drinks", { exact: true }).fill("8.2");
  await page.getByRole("button", { name: "Calculate session" }).click();
  await expect(
    page.getByRole("button", { name: "Edit total standard drinks" }),
  ).toHaveText("8.2");
  await page
    .getByRole("button", { name: "Add drink", exact: true })
    .first()
    .click();
  await page.getByRole("button", { name: "Volume + ABV" }).click();
  await page.getByRole("button", { name: "Wine", exact: true }).click();
  await expect(page.locator(".conversion")).toContainText("~1.5");
  await page
    .getByRole("button", { name: "Add drink & update estimate" })
    .click();
  await expect(
    page.getByRole("button", { name: "Edit total standard drinks" }),
  ).toHaveText("9.7");
  await page.getByRole("button", { name: "Edit your profile" }).click();
  await page.getByLabel("Licence", { exact: true }).selectOption("learner");
  await page.getByRole("button", { name: "Save profile" }).click();
  await expect(page.getByText("ZERO-BAC PROFILE")).toBeVisible();
  await expect(page.getByText("Cannot confirm", { exact: true })).toBeVisible();
  const a11y = await new AxeBuilder({ page }).analyze();
  expect(a11y.violations).toEqual([]);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(await page.locator("body").innerText()).not.toMatch(
    /you are safe to drive/i,
  );
  await page.screenshot({
    path: `qa-artifacts/${test.info().project.name}.png`,
    fullPage: true,
  });
});
