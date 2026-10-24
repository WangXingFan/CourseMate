// Regenerate the selected 同频伙伴 symbol and outlined 课知伴 wordmark.
// Canonical SVG sources live in docs/branding; no API or font download is needed.
import { createRequire } from "node:module";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const web = join(root, "apps/web");
const publicDir = join(web, "public");
const desktopIcons = join(root, "apps/desktop/src-tauri/icons");
const webRequire = createRequire(join(web, "package.json"));
const sharp = createRequire(webRequire.resolve("next/package.json"))("sharp");
const symbol = readFileSync(join(root, "docs/branding/symbol.svg"), "utf8");
const wordmark = readFileSync(join(root, "docs/branding/wordmark.svg"), "utf8");
const inner = (svg) => svg.replace(/^[\s\S]*?<svg\b[^>]*>/, "").replace(/<\/svg>\s*$/, "").trim();
const recolor = (svg, color) => svg.replace(/fill="#[0-9a-f]{3,8}"/gi, `fill="${color}"`);
const symbolPaths = inner(symbol);
const wordmarkPaths = inner(wordmark);
const svg = (content, width = 1024, height = width) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${content}</svg>\n`;
const scaledSymbol = (x, y, size, paths = symbolPaths) =>
  `<g transform="translate(${x} ${y}) scale(${size / 1024})">${paths}</g>`;
const lockup = (paths, color) => svg(
  `${scaledSymbol(-6, -21, 202, paths)}<g transform="translate(182 31) scale(1.035)">${recolor(wordmarkPaths, color)}</g>`,
  520, 160,
);
const colorLogo = lockup(symbolPaths, "#143D4D");
const darkLogo = lockup(symbolPaths.replaceAll("#143D4D", "#EAF4F2"), "#F4F8F5");
const blackLogo = lockup(recolor(symbolPaths, "#143D4D"), "#143D4D");
writeFileSync(join(publicDir, "logo.svg"), colorLogo);
writeFileSync(join(publicDir, "logo-color.svg"), colorLogo);
writeFileSync(join(publicDir, "logo-black.svg"), blackLogo);
writeFileSync(join(publicDir, "logo-white.svg"), darkLogo);

const icon = svg(`<rect x="48" y="48" width="928" height="928" rx="218" fill="#F4F8F5"/>${symbolPaths}`);
const maskable = svg(`<rect width="1024" height="1024" fill="#F4F8F5"/>${scaledSymbol(82, 82, 860)}`);
const monochrome = svg(recolor(symbolPaths, "#000000"));
writeFileSync(join(publicDir, "pwa/icon.svg"), icon);
writeFileSync(join(publicDir, "pwa/icon-maskable.svg"), maskable);
writeFileSync(join(publicDir, "vendor/signal-lab/assets/favicon.svg"), icon);
writeFileSync(join(desktopIcons, "source.svg"), icon);
writeFileSync(join(desktopIcons, "mark.svg"), monochrome);
await Promise.all([
  ["pwa/icon-192.png", icon, 192],
  ["pwa/icon-512.png", icon, 512],
  ["pwa/icon-maskable-512.png", maskable, 512],
  ["pwa/apple-touch-icon.png", maskable, 180],
].map(([name, source, size]) => sharp(Buffer.from(source)).resize(size, size).png().toFile(join(publicDir, name))));
await Promise.all([
  ["source.png", icon, 1024],
  ["mark.png", monochrome, 1024],
  ["tray.png", monochrome, 64],
].map(([name, source, size]) => sharp(Buffer.from(source)).resize(size, size).png().toFile(join(desktopIcons, name))));

// A PNG-backed multi-resolution ICO, supported by current browsers and Windows.
const sizes = [16, 32, 48, 64, 128, 256];
const images = await Promise.all(sizes.map((size) => sharp(Buffer.from(icon)).resize(size, size).png().toBuffer()));
const header = Buffer.alloc(6 + sizes.length * 16);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(sizes.length, 4);
let offset = header.length;
images.forEach((image, index) => {
  const entry = 6 + index * 16;
  header[entry] = sizes[index] % 256;
  header[entry + 1] = sizes[index] % 256;
  header.writeUInt16LE(1, entry + 4);
  header.writeUInt16LE(32, entry + 6);
  header.writeUInt32LE(image.length, entry + 8);
  header.writeUInt32LE(offset, entry + 12);
  offset += image.length;
});
writeFileSync(join(publicDir, "favicon.ico"), Buffer.concat([header, ...images]));

const previewDir = join(root, "outputs/branding/ke-zhi-ban");
mkdirSync(previewDir, { recursive: true });
const preview = svg(
  `<rect width="1200" height="760" fill="#F2F5F1"/>
   <g transform="translate(80 30) scale(2)">${inner(colorLogo)}</g>
   <rect y="380" width="1200" height="380" fill="#142B38"/>
   <g transform="translate(80 410) scale(2)">${inner(darkLogo)}</g>`,
  1200, 760,
);
writeFileSync(join(previewDir, "brand-preview.svg"), preview);
await sharp(Buffer.from(preview)).png().toFile(join(previewDir, "brand-preview.png"));
console.log("Generated 课知伴 logo variants, PWA icons, favicon, desktop source and preview.");
