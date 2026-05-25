import sharp from "sharp";
import { mkdirSync } from "fs";

mkdirSync("public/icons", { recursive: true });

async function createIcon(size, filename) {
  const r = Math.round(size * 0.2);
  const fs = Math.round(size * 0.35);
  const svg = `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#2563eb"/>
      <stop offset="100%" style="stop-color:#1d4ed8"/>
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" rx="${r}" fill="url(#bg)"/>
  <text x="50%" y="54%" text-anchor="middle" dominant-baseline="middle"
        font-family="Arial,sans-serif" font-weight="900" font-size="${fs}"
        fill="white">QR</text>
</svg>`;

  await sharp(Buffer.from(svg)).resize(size, size).png().toFile(filename);
  console.log("Created", filename);
}

await createIcon(192, "public/icons/icon-192.png");
await createIcon(512, "public/icons/icon-512.png");
console.log("Done!");
