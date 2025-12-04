import sharp from 'sharp';
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, '..', 'public');

// SVG content for the archery target icon
const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <circle cx="50" cy="50" r="48" fill="#3b82f6"/>
  <circle cx="50" cy="50" r="35" fill="none" stroke="white" stroke-width="3"/>
  <circle cx="50" cy="50" r="22" fill="none" stroke="white" stroke-width="3"/>
  <circle cx="50" cy="50" r="9" fill="none" stroke="white" stroke-width="3"/>
  <circle cx="50" cy="50" r="3" fill="#ffd700"/>
</svg>`;

const sizes = [192, 512];

async function generateIcons() {
  for (const size of sizes) {
    const outputPath = join(publicDir, `pwa-${size}x${size}.png`);

    await sharp(Buffer.from(svgContent))
      .resize(size, size)
      .png()
      .toFile(outputPath);

    console.log(`Generated: pwa-${size}x${size}.png`);
  }

  // Also generate apple-touch-icon
  const appleIconPath = join(publicDir, 'apple-touch-icon.png');
  await sharp(Buffer.from(svgContent))
    .resize(180, 180)
    .png()
    .toFile(appleIconPath);
  console.log('Generated: apple-touch-icon.png');
}

generateIcons().catch(console.error);
