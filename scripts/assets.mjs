import sharp from "sharp";
import { mkdir, readFile, copyFile } from "node:fs/promises";
await mkdir("public/icons", { recursive: true });
const svg = await readFile("public/favicon.svg");
for (const [name, size] of [
  ["icon-192", 192],
  ["icon-512", 512],
  ["apple-touch-icon", 180],
])
  await sharp(svg).resize(size, size).png().toFile(`public/icons/${name}.png`);
const mask = Buffer.from(
  '<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512"><rect width="512" height="512" fill="#121817"/><path d="M156 341V220a100 100 0 0 1 200 0v121M203 303v-81a53 53 0 0 1 106 0v81M156 345h200" fill="none" stroke="#dfecb9" stroke-width="32" stroke-linecap="round"/></svg>',
);
await sharp(mask).png().toFile("public/icons/maskable-512.png");
await mkdir("public/splash", { recursive: true });
for (const [width, height] of [
  [1125, 2436],
  [1170, 2532],
  [1179, 2556],
  [1290, 2796],
]) {
  const artwork = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="100%" height="100%" fill="#121817"/><g transform="translate(${width / 2 - 110},${height / 2 - 175})"><path d="M20 165V70a90 90 0 0 1 180 0v95M65 140V70a45 45 0 0 1 90 0v70M20 170h180" fill="none" stroke="#dfecb9" stroke-width="20" stroke-linecap="round"/></g><text x="50%" y="${height / 2 + 120}" fill="#edf0e9" font-family="sans-serif" font-size="46" font-weight="bold" text-anchor="middle" letter-spacing="3">CLEAR2DRIVE</text><text x="50%" y="${height / 2 + 190}" fill="#a6afa8" font-family="sans-serif" font-size="25" text-anchor="middle">An estimate. Never a green light.</text></svg>`,
  );
  await sharp(artwork).png().toFile(`public/splash/${width}x${height}.png`);
}
await copyFile(
  "node_modules/@fontsource-variable/manrope/files/manrope-latin-wght-normal.woff2",
  "public/fonts/manrope-latin.woff2",
);
await copyFile(
  "node_modules/@fontsource-variable/manrope/LICENSE",
  "public/fonts/LICENSE.txt",
);
