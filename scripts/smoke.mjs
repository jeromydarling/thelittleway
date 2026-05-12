// Smoke test: drive the golden path through the dev server in a real browser.
// Verifies Day 1 renders, highlighting works, notes persist, and Settings
// renders with notification controls.
import { chromium } from "/opt/node22/lib/node_modules/playwright/index.mjs";

const BASE = process.env.BASE_URL ?? "http://localhost:5173";

const browser = await chromium.launch({
  headless: true,
  executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
});
const ctx = await browser.newContext({
  permissions: ["notifications"],
  baseURL: BASE,
});
const page = await ctx.newPage();

const errors = [];
// Network errors for Google Fonts / external CSS are sandbox noise, not app
// bugs — ignore them.
const IGNORED = [/ERR_CERT_AUTHORITY_INVALID/, /Failed to load resource/];
function ignored(text) {
  return IGNORED.some((re) => re.test(text));
}
page.on("pageerror", (e) => {
  if (ignored(e.message)) return;
  errors.push(`pageerror: ${e.message}`);
  console.log("[browser pageerror]", e.message);
});
page.on("console", (msg) => {
  if (msg.type() !== "error") return;
  const text = msg.text();
  if (ignored(text)) return;
  errors.push(`console.error: ${text}`);
  console.log("[browser]", text);
});

function check(label, cond) {
  if (cond) console.log(`  ✓ ${label}`);
  else {
    console.log(`  ✗ ${label}`);
    process.exitCode = 1;
  }
}

console.log("→ load /");
await page.goto("/");
await page.waitForSelector("article", { timeout: 10000 });

const title = await page.locator("article h1").textContent();
check("Day 1 title is 'The Mercies of the Lord'", title === "The Mercies of the Lord");

const heroImg = await page.locator("figure img").count();
check("homepage hero illustration present", heroImg === 1);
const heroCaption = await page.locator("figure figcaption").textContent();
check("hero caption is the shower of roses", /shower of roses/.test(heroCaption ?? ""));

const dayBadge = await page.locator("article header p").first().textContent();
check("Day badge mentions Day 1", /Day 1 of 365/.test(dayBadge ?? ""));

const citation = await page.locator("article >> text=Story of a Soul — Chapter I").count();
check("citation rendered", citation >= 1);

console.log("→ select & highlight a span of the passage");
const passageBox = await page.locator(".passage-text").first();
await passageBox.evaluate((el) => {
  const text = el.firstChild;
  const r = document.createRange();
  r.setStart(text.firstChild ?? text, 0);
  // pick the first 60 chars
  let node = el;
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  const first = walker.nextNode();
  if (!first) throw new Error("no text node");
  r.setStart(first, 0);
  r.setEnd(first, Math.min(60, first.nodeValue?.length ?? 0));
  const sel = window.getSelection();
  sel?.removeAllRanges();
  sel?.addRange(r);
  document.dispatchEvent(new Event("selectionchange"));
});
// Wait for the floating Highlight button
await page.waitForSelector("[data-hl-action] button", { timeout: 5000 });
await page.locator("[data-hl-action] button").click();
await page.waitForSelector(".passage-text mark.user-hl", { timeout: 5000 });
const markCount = await page.locator(".passage-text mark.user-hl").count();
check("highlight rendered as <mark>", markCount === 1);

console.log("→ write a note and verify it persists across reload");
const noteText = "Today: trust, not effort.";
await page.locator("textarea").first().fill(noteText);
await page.locator("textarea").first().blur();
await page.waitForTimeout(200);
await page.reload();
await page.waitForSelector("textarea");
const reloaded = await page.locator("textarea").first().inputValue();
check("note persists across reload", reloaded === noteText);

console.log("→ navigate to Day 2 via Next button");
await page.locator("button:has-text('Day 2')").click();
await page.waitForURL("**/day/2");
const day2Badge = await page.locator("article header p").first().textContent();
check("Day 2 badge", /Day 2 of 365/.test(day2Badge ?? ""));

console.log("→ visit /highlights");
await page.goto("/highlights");
await page.waitForSelector("h1:has-text('Your highlights')");
const hlEntries = await page.locator("article, .container-narrow >> a >> text=Day 1").count();
check("Day 1 highlight visible in /highlights", hlEntries > 0);

console.log("→ visit /notes");
await page.goto("/notes");
await page.waitForSelector("h1:has-text('Your notes')");
const noteBody = await page.locator(`text=${noteText}`).count();
check("note visible in /notes", noteBody > 0);

console.log("→ visit /settings — toggle reminder");
await page.goto("/settings");
await page.waitForSelector("h1:has-text('Settings')");
const reminderInput = page.locator("#reminder-toggle");
// The visible switch widget is the wrapping <label>; clicking the input
// directly is blocked by overlay spans (which is fine — users click the
// label).
await page.locator("label:has(#reminder-toggle)").click();
await page.waitForTimeout(200);
const isChecked = await reminderInput.isChecked();
check("reminder toggle enables (permission granted)", isChecked === true);

console.log("→ change theme to dark");
await page.locator("button:has-text('dark')").click();
await page.waitForTimeout(150);
const isDark = await page.evaluate(() =>
  document.documentElement.classList.contains("dark"),
);
check("dark theme applied", isDark);

await browser.close();

if (errors.length) {
  console.log("\nBrowser errors:");
  for (const e of errors) console.log("  " + e);
  process.exitCode = 1;
}

if (process.exitCode) {
  console.log("\n✗ smoke test FAILED");
} else {
  console.log("\n✓ smoke test passed");
}
