// Render 365 per-day social cards (1200×630 JPG) into public/og/.
//
// One Playwright browser, one page, setContent per day, screenshot. Cards
// are JPG @ q90 — visually indistinguishable from PNG for this design and
// roughly 8× smaller (≈40–80 KB instead of ≈400 KB), so all 365 fit in the
// repo without bloat.
//
// Re-run with `npm run build:og:all` after any card design change.
import { chromium } from "/opt/node22/lib/node_modules/playwright/index.mjs";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");

const passages = JSON.parse(
  await readFile(resolve(root, "data/devotional/passages.json"), "utf8"),
);
const rose = await readFile(resolve(root, "public/hero-rose.svg"), "utf8");

const outDir = resolve(root, "public/og");
await mkdir(outDir, { recursive: true });

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Short teaser from a passage: first sentence-bounded ~140 chars. Cards have
 * less room than meta descriptions, so we go a bit tighter and prefer a
 * clean stop.
 */
function teaser(passage, max = 140) {
  const trimmed = passage.replace(/\s+/g, " ").trim();
  if (trimmed.length <= max) return trimmed;
  const window = trimmed.slice(0, max);
  const lastStop = Math.max(
    window.lastIndexOf(". "),
    window.lastIndexOf("! "),
    window.lastIndexOf("? "),
  );
  if (lastStop > max * 0.5) return window.slice(0, lastStop + 1);
  const lastSpace = window.lastIndexOf(" ");
  return (lastSpace > 0 ? window.slice(0, lastSpace) : window) + "…";
}

function cardHtml(day, passage) {
  const title = passage.title;
  const summary = teaser(passage.passage);
  const cite = passage.citation;
  // Title length tunes its font-size so long titles still fit two lines.
  const titleSize = title.length > 60 ? 60 : title.length > 38 ? 72 : 88;
  return `<!doctype html>
<html><head><meta charset="utf-8" />
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,400;0,500;1,400;1,500&family=Inter:wght@400;500;600&display=swap">
<style>
  html, body { margin: 0; padding: 0; }
  body {
    width: 1200px; height: 630px;
    background: radial-gradient(ellipse at 25% 28%, #fdfaf3 0%, #f3ede0 70%, #e7dcc4 100%);
    color: #2a241d;
    font-family: 'EB Garamond', Georgia, serif;
    position: relative;
    overflow: hidden;
  }
  .frame {
    position: absolute; inset: 56px;
    border: 1px solid rgba(107,66,38,0.18);
    border-radius: 6px;
    padding: 56px 72px;
    display: flex; flex-direction: column;
    background:
      linear-gradient(135deg, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0) 60%);
  }
  .top {
    display: flex; align-items: center; justify-content: space-between;
    margin-bottom: 32px;
  }
  .brand {
    font-family: 'EB Garamond', serif; font-style: italic;
    font-size: 26px; color: #6b4226;
    letter-spacing: 0.005em;
  }
  .day-pill {
    font-family: 'Inter', system-ui, sans-serif;
    font-size: 17px; letter-spacing: 0.28em; text-transform: uppercase;
    color: #6b4226;
    padding: 6px 14px;
    border: 1px solid rgba(107,66,38,0.35);
    border-radius: 999px;
    background: rgba(255,255,255,0.4);
  }
  .body {
    flex: 1;
    display: grid;
    grid-template-columns: 120px 1fr;
    gap: 40px;
    align-items: center;
  }
  .rose { display: flex; align-items: center; justify-content: center; }
  .rose svg { width: 110px; height: auto; opacity: 0.92;
    filter: drop-shadow(0 6px 18px rgba(107,66,38,0.18)); }
  .text { min-width: 0; }
  h1 {
    font-family: 'EB Garamond', serif;
    font-style: italic;
    font-weight: 500;
    font-size: ${titleSize}px;
    line-height: 1.04;
    margin: 0 0 28px 0;
    color: #2a241d;
    letter-spacing: -0.005em;
    /* Two-line clamp for very long titles. */
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .summary {
    font-size: 28px; line-height: 1.45;
    color: #5f5340; font-style: italic;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    margin: 0;
  }
  .bottom {
    display: flex; align-items: center; justify-content: space-between;
    margin-top: 32px;
    font-family: 'Inter', system-ui, sans-serif;
    font-size: 16px; letter-spacing: 0.16em; text-transform: uppercase;
    color: #7c6f59;
  }
  .ornament { color: #6b4226; opacity: 0.45; font-size: 22px; }
</style></head>
<body>
  <div class="frame">
    <div class="top">
      <div class="brand">The Little Way</div>
      <div class="day-pill">Day ${day} · of 365</div>
    </div>
    <div class="body">
      <div class="rose">${rose}</div>
      <div class="text">
        <h1>${escapeHtml(title)}</h1>
        <p class="summary">${escapeHtml(summary)}</p>
      </div>
    </div>
    <div class="bottom">
      <span>${escapeHtml(cite)}</span>
      <span class="ornament">✣</span>
    </div>
  </div>
</body></html>`;
}

const browser = await chromium.launch({
  headless: true,
  executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
});
const ctx = await browser.newContext({
  viewport: { width: 1200, height: 630 },
  deviceScaleFactor: 1,
});
const page = await ctx.newPage();

// Warm the page once so webfonts are already cached before the loop.
await page.setContent(cardHtml(1, passages[0]), { waitUntil: "networkidle" });
await page.waitForTimeout(400);

const t0 = Date.now();
let bytes = 0;
for (let day = 1; day <= 365; day++) {
  const p = passages[day - 1];
  await page.setContent(cardHtml(day, p), { waitUntil: "load" });
  // Brief settle for layout — fonts are cached, so this is enough.
  await page.evaluate(() => document.fonts.ready);
  const buf = await page.screenshot({
    type: "jpeg",
    quality: 90,
    fullPage: false,
  });
  bytes += buf.length;
  await writeFile(resolve(outDir, `day-${day}.jpg`), buf);
  if (day % 30 === 0 || day === 365) {
    const secs = ((Date.now() - t0) / 1000).toFixed(1);
    process.stdout.write(`  ${day}/365 · ${secs}s · ${(bytes / 1024 / 1024).toFixed(1)} MB total\n`);
  }
}
await browser.close();

console.log(
  `\ndone · 365 cards · ${(bytes / 1024 / 1024).toFixed(1)} MB · avg ${Math.round(bytes / 365 / 1024)} KB/card`,
);
