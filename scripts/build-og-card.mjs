// Render the social share card (1200x630) to public/og-card.png.
//
// We compose the card as plain HTML (parchment background, the rose SVG, the
// brand and tagline) and then screenshot it with Playwright. That gives us a
// crisp, real PNG that every social platform accepts — no SVG quirks, no
// font-rendering surprises.
//
// Run on demand with `npm run build:og` whenever the card design changes.
import { chromium } from "/opt/node22/lib/node_modules/playwright/index.mjs";
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");

const rose = await readFile(resolve(root, "public/hero-rose.svg"), "utf8");

const html = `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,400;0,500;1,400&family=Inter:wght@400;500&display=swap">
<style>
  html, body { margin: 0; padding: 0; }
  body {
    width: 1200px;
    height: 630px;
    background:
      radial-gradient(ellipse at 30% 30%, #fdfaf3 0%, #f3ede0 70%, #e7dcc4 100%);
    color: #2a241d;
    font-family: 'EB Garamond', Georgia, serif;
    display: grid;
    grid-template-columns: 480px 1fr;
    align-items: center;
    overflow: hidden;
    position: relative;
  }
  .rose {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    padding-left: 60px;
  }
  .rose svg { width: 360px; height: auto; filter: drop-shadow(0 8px 24px rgba(107,66,38,0.18)); }
  .copy { padding-right: 96px; }
  .eyebrow {
    font-family: 'Inter', system-ui, sans-serif;
    font-size: 22px;
    letter-spacing: 0.32em;
    text-transform: uppercase;
    color: #6b4226;
    margin-bottom: 32px;
  }
  h1 {
    font-family: 'EB Garamond', serif;
    font-style: italic;
    font-size: 96px;
    font-weight: 500;
    line-height: 1.02;
    margin: 0 0 28px 0;
    color: #2a241d;
    letter-spacing: -0.005em;
  }
  .tagline {
    font-size: 30px;
    line-height: 1.45;
    color: #5f5340;
    margin: 0 0 36px 0;
    font-style: italic;
    max-width: 560px;
  }
  .footer {
    font-family: 'Inter', system-ui, sans-serif;
    font-size: 18px;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: #7c6f59;
  }
  .footer .dot { display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: #6b4226; margin: 0 14px 4px; vertical-align: middle; }
  .ornament {
    position: absolute;
    bottom: 36px;
    left: 50%;
    transform: translateX(-50%);
    color: #6b4226;
    opacity: 0.35;
    font-size: 28px;
  }
</style>
</head>
<body>
  <div class="rose">${rose}</div>
  <div class="copy">
    <div class="eyebrow">A daily devotional</div>
    <h1>The Little Way</h1>
    <p class="tagline">
      Story of a Soul in 365 days, paired with the Gospels — from St Thérèse of Lisieux.
    </p>
    <div class="footer">
      Read free <span class="dot"></span> No account <span class="dot"></span> Public domain
    </div>
  </div>
  <div class="ornament">✣</div>
</body>
</html>`;

const browser = await chromium.launch({
  headless: true,
  executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
});
const ctx = await browser.newContext({
  viewport: { width: 1200, height: 630 },
  deviceScaleFactor: 1,
});
const page = await ctx.newPage();
await page.setContent(html, { waitUntil: "networkidle" });
// Tiny pause for webfont swap-in.
await page.waitForTimeout(400);
const buf = await page.screenshot({ type: "png", fullPage: false });
const out = resolve(root, "public/og-card.png");
await writeFile(out, buf);
console.log(`wrote ${out} (${buf.length.toLocaleString()} bytes)`);
await browser.close();
