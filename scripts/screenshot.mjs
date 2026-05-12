import { chromium } from "/opt/node22/lib/node_modules/playwright/index.mjs";

const browser = await chromium.launch({
  headless: true,
  executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
});
const ctx = await browser.newContext({
  viewport: { width: 800, height: 1200 },
  deviceScaleFactor: 2,
});
const page = await ctx.newPage();
await page.goto("http://localhost:5173/");
await page.waitForSelector("article");
await page.waitForTimeout(500);
await page.screenshot({ path: "/tmp/home.png", fullPage: true });
console.log("saved /tmp/home.png");
await browser.close();
