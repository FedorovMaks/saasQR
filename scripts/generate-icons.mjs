import sharp from "sharp";
import { mkdirSync } from "fs";

mkdirSync("public/icons", { recursive: true });

function makeSvg(size) {
  const r = Math.round(size * 0.19);
  const fs = Math.round(size * 0.42);
  return `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${size}" height="${size}" rx="${r}" fill="#3c6e71"/>
  <text x="50%" y="54%" text-anchor="middle" dominant-baseline="middle"
        font-family="Arial,Helvetica,sans-serif" font-weight="900" font-size="${fs}"
        letter-spacing="${Math.round(size * -0.02)}" fill="white">TM</text>
</svg>`;
}

await sharp(Buffer.from(makeSvg(512))).resize(512, 512).png().toFile("public/icons/icon-512.png");
await sharp(Buffer.from(makeSvg(192))).resize(192, 192).png().toFile("public/icons/icon-192.png");

// Generate favicon as 32x32 PNG, then convert to ICO format
// ICO = header + directory entry + raw PNG
const pngBuf = await sharp(Buffer.from(makeSvg(64))).resize(32, 32).png().toBuffer();

// ICO file: 6-byte header + 16-byte directory entry + PNG data
const header = Buffer.alloc(6);
header.writeUInt16LE(0, 0);     // reserved
header.writeUInt16LE(1, 2);     // type: icon
header.writeUInt16LE(1, 4);     // count: 1

const dir = Buffer.alloc(16);
dir.writeUInt8(32, 0);          // width
dir.writeUInt8(32, 1);          // height
dir.writeUInt8(0, 2);           // color palette
dir.writeUInt8(0, 3);           // reserved
dir.writeUInt16LE(1, 4);        // color planes
dir.writeUInt16LE(32, 6);       // bits per pixel
dir.writeUInt32LE(pngBuf.length, 8);  // image size
dir.writeUInt32LE(22, 12);      // offset (6 + 16 = 22)

const { writeFileSync } = await import("fs");
writeFileSync("src/app/favicon.ico", Buffer.concat([header, dir, pngBuf]));

console.log("Done: icon-512.png, icon-192.png, favicon.ico");
