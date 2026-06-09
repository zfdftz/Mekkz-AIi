import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import sharp from "sharp";

const root = resolve(process.cwd());
const source = resolve(root, "public/logo.png");

function isBackgroundPixel(r, g, b, a) {
  if (a < 10) return true;
  const brightness = (r + g + b) / 3;
  if (brightness < 22) return true;
  if (r < 18 && g < 55 && b < 22 && brightness < 40) return true;
  return false;
}

async function transparentLogo() {
  const { data, info } = await sharp(source)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const pixels = Buffer.from(data);
  for (let i = 0; i < pixels.length; i += 4) {
    const r = pixels[i];
    const g = pixels[i + 1];
    const b = pixels[i + 2];
    if (isBackgroundPixel(r, g, b, pixels[i + 3])) {
      pixels[i + 3] = 0;
    }
  }

  return sharp(pixels, {
    raw: { width: info.width, height: info.height, channels: 4 }
  })
    .png()
    .trim({ threshold: 10 })
    .toBuffer();
}

async function writePng(buffer, path, size) {
  mkdirSync(dirname(path), { recursive: true });
  await sharp(buffer)
    .resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(path);
}

async function writeOgImage(logoBuffer) {
  const width = 1200;
  const height = 630;
  const logo = await sharp(logoBuffer)
    .resize(360, 360, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  const background = Buffer.from(
    `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#07140d"/>
          <stop offset="45%" stop-color="#120a1f"/>
          <stop offset="100%" stop-color="#050810"/>
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#bg)"/>
      <text x="620" y="300" fill="#ecfdf5" font-family="Arial, sans-serif" font-size="72" font-weight="700" letter-spacing="8">MEKKZ AI</text>
      <text x="620" y="370" fill="#a7f3d0" font-family="Arial, sans-serif" font-size="30">KI-Chat · Bilder erstellen · Fotos analysieren</text>
    </svg>`
  );

  await sharp(background)
    .composite([{ input: logo, top: 120, left: 120 }])
    .png()
    .toFile(resolve(root, "public/og-image.png"));

  await sharp(background)
    .composite([{ input: logo, top: 120, left: 120 }])
    .png()
    .toFile(resolve(root, "app/opengraph-image.png"));
}

async function main() {
  const transparent = await transparentLogo();

  await writePng(transparent, resolve(root, "public/icon-192.png"), 192);
  await writePng(transparent, resolve(root, "public/icon-512.png"), 512);
  await writePng(transparent, resolve(root, "public/apple-touch-icon.png"), 180);
  await writePng(transparent, resolve(root, "app/icon.png"), 512);
  await writePng(transparent, resolve(root, "app/apple-icon.png"), 180);

  await sharp(transparent)
    .resize(32, 32, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(resolve(root, "public/favicon.png"));

  await writeOgImage(transparent);
  console.log("Brand assets generated.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
