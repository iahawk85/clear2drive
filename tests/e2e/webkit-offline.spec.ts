import { test, expect } from "@playwright/test";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { resolve, extname, sep } from "node:path";

// A separate local origin avoids affecting the preview or production server.
// WebKit's setOffline emulation fails SW navigation even for a literal cached
// response: https://github.com/microsoft/playwright/issues/42775.
test("WebKit cached PWA reloads and calculates when its origin is unavailable", async ({
  page,
}) => {
  const root = resolve("dist");
  const types: Record<string, string> = {
    ".html": "text/html",
    ".js": "application/javascript",
    ".css": "text/css",
    ".webmanifest": "application/manifest+json",
    ".png": "image/png",
    ".svg": "image/svg+xml",
    ".woff2": "font/woff2",
  };
  const server = createServer(async (req, res) => {
    const pathname = new URL(req.url || "/", "http://localhost").pathname;
    const file = resolve(
      root,
      `.${pathname === "/" ? "/index.html" : pathname}`,
    );
    if (!file.startsWith(root + sep)) {
      res.writeHead(403).end();
      return;
    }
    try {
      const contents = await readFile(file);
      res.writeHead(200, {
        "Content-Type": types[extname(file)] || "application/octet-stream",
        "Cache-Control": "no-store",
      });
      res.end(contents);
    } catch {
      res.writeHead(404).end();
    }
  });
  await new Promise<void>((done) => server.listen(0, "127.0.0.1", done));
  const address = server.address();
  if (!address || typeof address === "string")
    throw new Error("Test origin did not start.");
  try {
    await page.goto(`http://127.0.0.1:${address.port}`);
    await page.getByRole("button", { name: "Set up your estimate" }).click();
    await page.getByLabel("Weight · kg").fill("80");
    await page.getByLabel("Height · cm").fill("180");
    await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: "Start estimating" }).click();
    await page.getByRole("button", { name: "+ 1 drink", exact: true }).click();
    await page.evaluate(async () => {
      await navigator.serviceWorker.ready;
    });
    await page.reload();
    await expect
      .poll(() => page.evaluate(() => !!navigator.serviceWorker.controller))
      .toBe(true);
    server.closeAllConnections();
    await new Promise<void>((done, reject) =>
      server.close((error) => (error ? reject(error) : done())),
    );
    await page.reload();
    await expect(
      page.getByRole("button", { name: "Edit total standard drinks" }),
    ).toHaveText("1.0");
    await page.getByRole("button", { name: "+ 1.5", exact: true }).click();
    await expect(
      page.getByRole("button", { name: "Edit total standard drinks" }),
    ).toHaveText("2.5");
    await expect(
      page.getByText("This is an estimate, not a BAC measurement.", {
        exact: true,
      }),
    ).toBeVisible();
  } finally {
    if (server.listening) {
      server.closeAllConnections();
      server.close();
    }
  }
});
