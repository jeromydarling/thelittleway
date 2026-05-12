// Mobile-viewport screenshot pass: capture every route at iPhone 13 width
// so we can see what actually breaks for a real user.
import { chromium, devices } from "/opt/node22/lib/node_modules/playwright/index.mjs";
import { mkdir } from "node:fs/promises";

const BASE = process.env.BASE_URL ?? "http://localhost:5173";
const OUT = process.env.OUT ?? "/tmp/mobile";
await mkdir(OUT, { recursive: true });

const browser = await chromium.launch({
  headless: true,
  executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
});
const ctx = await browser.newContext({
  ...devices["iPhone 13"],
  baseURL: BASE,
});
const page = await ctx.newPage();

const routes = [
  ["today", "/"],
  ["day-5", "/day/5"],
  ["favorites", "/favorites"],
  ["highlights", "/highlights"],
  ["notes", "/notes"],
  ["settings", "/settings"],
];

for (const [name, path] of routes) {
  await page.goto(path);
  await page.waitForLoadState("networkidle");
  // Seed some data on day 5 the first time
  if (name === "day-5") {
    await page.evaluate(() => {
      // pre-fill a note + a tag so the Notes page has content
      const ta = document.querySelector("textarea");
      if (ta) {
        ta.value = "Trust, not effort. #prayer A line carried into the morning.";
        ta.dispatchEvent(new Event("input", { bubbles: true }));
        ta.dispatchEvent(new Event("blur", { bubbles: true }));
      }
    });
    await page.waitForTimeout(200);
  }
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: true });
  console.log(`captured ${name}`);
}

// Also: trigger a text selection on day 5 to capture the floating color picker
await page.goto("/day/5");
await page.waitForSelector(".passage-text");
await page.evaluate(() => {
  const el = document.querySelector(".passage-text");
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  const first = walker.nextNode();
  const r = document.createRange();
  r.setStart(first, 0);
  r.setEnd(first, Math.min(40, first.nodeValue.length));
  const sel = window.getSelection();
  sel.removeAllRanges();
  sel.addRange(r);
  document.dispatchEvent(new Event("selectionchange"));
});
await page.waitForTimeout(300);
await page.screenshot({ path: `${OUT}/day-5-selection.png`, fullPage: false });
console.log("captured day-5-selection");

await browser.close();
console.log(`\nshots in ${OUT}`);
