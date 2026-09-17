// Generates versioned PWA icons from public/iwacumo_pwa.jpeg.
// - Flattens the artwork onto a black background (the source JPEG has
//   light corners and JPEGs carry no transparency).
// - `any` icons fill the full square with the emblem (cover fit).
// - `maskable` icons (192, 512) keep the emblem inside the ~80% safe zone,
//   centered on black, per the maskable-icon spec.
// - Also refreshes src/app/icon.png (Next.js favicon/app-icon source).
//
// Usage: node scripts/generate-pwa-icons.mjs

import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const source = join(root, "public", "iwacumo_pwa.jpeg");
const outDir = join(root, "public", "icons", "v2");

const ANY_SIZES = [72, 96, 128, 144, 152, 384];
// Maskable icons keep content inside the central ~80% safe zone.
const MASKABLE_SIZES = [192, 512];

function circleMask(size) {
  const r = size / 2;
  return Buffer.from(
    `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">` +
      `<circle cx="${r}" cy="${r}" r="${r}" fill="white"/>` +
      `</svg>`
  );
}

// Source is a circular badge on a light background, so cut the artwork to
// the circle itself and flatten the corners onto black.
async function emblem(size) {
  const resized = await sharp(source)
    .resize(size, size, { fit: "cover", position: "centre" })
    .png()
    .toBuffer();

  return sharp(resized)
    .composite([{ input: circleMask(size), blend: "dest-in" }])
    .flatten({ background: "#000000" })
    .png()
    .toBuffer();
}

async function fullBleed(size) {
  return sharp(await emblem(size)).toFile(
    join(outDir, `icon-${size}x${size}.png`)
  );
}

async function maskable(size) {
  // Emblem occupies ~80% of the canvas, centered on black.
  const emblemSize = Math.round(size * 0.8);
  const art = await emblem(emblemSize);

  return sharp({
    create: {
      width: size,
      height: size,
      channels: 3,
      background: "#000000",
    },
  })
    .composite([{ input: art, gravity: "centre" }])
    .png()
    .toFile(join(outDir, `icon-${size}x${size}.png`));
}

mkdirSync(outDir, { recursive: true });

for (const size of ANY_SIZES) {
  await fullBleed(size);
  console.log(`wrote icon-${size}x${size}.png (any)`);
}

for (const size of MASKABLE_SIZES) {
  await maskable(size);
  console.log(`wrote icon-${size}x${size}.png (maskable)`);
}

// Refresh the Next.js app-icon/favicon source from the same artwork.
await sharp(await emblem(512)).toFile(join(root, "src", "app", "icon.png"));
console.log("wrote src/app/icon.png");
