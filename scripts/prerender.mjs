// Post-build pass that turns the SPA into a crawler-friendly static site.
//
// For every route we know about (homepage + day/1..365 + side pages) we emit
// a copy of dist/index.html with day-specific <title>, meta description,
// canonical URL, Open Graph + Twitter tags, and JSON-LD article structured
// data swapped in. We also write sitemap.xml, robots.txt, and an Atom feed
// of the last 30 days so readers can subscribe.
//
// The browser-side router still drives navigation after first paint; this
// pass is only about what social cards, Google, and the link previews show
// before any JS runs.
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const distDir = resolve(root, "dist");

// SITE_URL is the canonical origin including base path (no trailing slash).
// In CI this is set from the GitHub Pages URL.
const SITE_URL = (
  process.env.SITE_URL ?? "https://jeromydarling.github.io/thelittleway"
).replace(/\/$/, "");

const passages = JSON.parse(
  await readFile(resolve(root, "data/devotional/passages.json"), "utf8"),
);
const TOTAL_DAYS = 365;
const SITE_NAME = "The Little Way";
const SITE_TAGLINE =
  "A daily devotional from St Thérèse of Lisieux — read Story of a Soul in 365 days, paired with the Gospels.";
const OG_IMAGE = `${SITE_URL}/og-card.png`;

const indexHtml = await readFile(resolve(distDir, "index.html"), "utf8");

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function teaser(passage, max = 155) {
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

/**
 * Swap a single tag in the index.html template. We match by the identifying
 * attribute pair (e.g. property="og:title") rather than parsing HTML — the
 * source is ours, the format is stable.
 */
function setTag(html, identifier, replacement) {
  const re = new RegExp(
    `<(meta|link)[^>]*${identifier.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\\\$&")}[^>]*>`,
    "i",
  );
  if (re.test(html)) return html.replace(re, replacement);
  // Fall back: insert before </head>
  return html.replace("</head>", `    ${replacement}\n  </head>`);
}

function setTitle(html, title) {
  return html.replace(
    /<title>[\s\S]*?<\/title>/,
    `<title>${escapeHtml(title)}</title>`,
  );
}

function setJsonLd(html, obj) {
  const block = `<script type="application/ld+json">\n${JSON.stringify(obj, null, 2)}\n</script>`;
  if (/<script type="application\/ld\+json">[\s\S]*?<\/script>/.test(html)) {
    return html.replace(
      /<script type="application\/ld\+json">[\s\S]*?<\/script>/,
      block,
    );
  }
  return html.replace("</head>", `    ${block}\n  </head>`);
}

function renderHtml({ title, description, url, type, jsonLd }) {
  let h = indexHtml;
  const t = escapeHtml(title);
  const d = escapeHtml(description);
  const u = escapeHtml(url);
  h = setTitle(h, title);
  h = setTag(h, 'name="description"', `<meta name="description" content="${d}" />`);
  h = setTag(h, 'rel="canonical"', `<link rel="canonical" href="${u}" />`);
  h = setTag(h, 'property="og:type"', `<meta property="og:type" content="${type}" />`);
  h = setTag(h, 'property="og:title"', `<meta property="og:title" content="${t}" />`);
  h = setTag(h, 'property="og:description"', `<meta property="og:description" content="${d}" />`);
  h = setTag(h, 'property="og:url"', `<meta property="og:url" content="${u}" />`);
  h = setTag(h, 'property="og:image"', `<meta property="og:image" content="${OG_IMAGE}" />`);
  h = setTag(h, 'name="twitter:title"', `<meta name="twitter:title" content="${t}" />`);
  h = setTag(h, 'name="twitter:description"', `<meta name="twitter:description" content="${d}" />`);
  h = setTag(h, 'name="twitter:image"', `<meta name="twitter:image" content="${OG_IMAGE}" />`);
  h = setJsonLd(h, jsonLd);
  return h;
}

function metaForDay(day) {
  const p = passages[day - 1];
  const description = teaser(p.passage);
  return {
    title: `Day ${day} · ${p.title} — ${SITE_NAME}`,
    description,
    url: `${SITE_URL}/day/${day}`,
    type: "article",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: p.title,
      description,
      author: { "@type": "Person", name: "St Thérèse of Lisieux" },
      publisher: { "@type": "Organization", name: SITE_NAME },
      isPartOf: {
        "@type": "Book",
        name: "Story of a Soul",
        author: { "@type": "Person", name: "St Thérèse of Lisieux" },
        translator: { "@type": "Person", name: "T. N. Taylor" },
      },
      position: day,
      url: `${SITE_URL}/day/${day}`,
      image: OG_IMAGE,
    },
  };
}

const STATIC = {
  home: {
    title: `${SITE_NAME} — ${SITE_TAGLINE}`,
    description: SITE_TAGLINE,
    url: SITE_URL,
    type: "website",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: SITE_NAME,
      url: SITE_URL,
      description: SITE_TAGLINE,
      inLanguage: "en",
      about: {
        "@type": "Book",
        name: "Story of a Soul",
        author: { "@type": "Person", name: "St Thérèse of Lisieux" },
        translator: { "@type": "Person", name: "T. N. Taylor" },
        datePublished: "1898",
      },
    },
  },
  favorites: {
    title: `Kept days — ${SITE_NAME}`,
    description: "The days you've kept along your year with St Thérèse of Lisieux.",
    url: `${SITE_URL}/favorites`,
    type: "website",
  },
  highlights: {
    title: `Highlights — ${SITE_NAME}`,
    description: "Passages you've marked along your reading of Story of a Soul.",
    url: `${SITE_URL}/highlights`,
    type: "website",
  },
  notes: {
    title: `Notes — ${SITE_NAME}`,
    description:
      "Your reflections, prayers, and remembrances kept beside Thérèse's words.",
    url: `${SITE_URL}/notes`,
    type: "website",
  },
  settings: {
    title: `Settings — ${SITE_NAME}`,
    description:
      "Reminders, theme, and backup options for The Little Way devotional.",
    url: `${SITE_URL}/settings`,
    type: "website",
  },
};
for (const k of Object.keys(STATIC)) {
  if (!STATIC[k].jsonLd) {
    STATIC[k].jsonLd = {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: STATIC[k].title,
      description: STATIC[k].description,
      url: STATIC[k].url,
    };
  }
}

// Write the prerendered HTML for the home + side pages (overwriting
// index.html, then writing aliases for the SPA routes that exist).
await writeFile(resolve(distDir, "index.html"), renderHtml(STATIC.home));
for (const k of ["favorites", "highlights", "notes", "settings"]) {
  const dir = resolve(distDir, k);
  await mkdir(dir, { recursive: true });
  await writeFile(resolve(dir, "index.html"), renderHtml(STATIC[k]));
}

// Per-day pages.
for (let day = 1; day <= TOTAL_DAYS; day++) {
  const dir = resolve(distDir, "day", String(day));
  await mkdir(dir, { recursive: true });
  await writeFile(resolve(dir, "index.html"), renderHtml(metaForDay(day)));
}

// 404 mirrors index.html so GH Pages routing into a deep link still hydrates.
// We also use the home meta there — a 404 doesn't deserve a misleading OG.
await writeFile(resolve(distDir, "404.html"), renderHtml(STATIC.home));

// sitemap.xml — every prerendered URL with a sensible priority.
const today = new Date().toISOString().slice(0, 10);
const sitemapEntries = [
  { loc: SITE_URL + "/", priority: "1.0", changefreq: "daily" },
  ...["favorites", "highlights", "notes", "settings"].map((k) => ({
    loc: `${SITE_URL}/${k}`,
    priority: "0.5",
    changefreq: "monthly",
  })),
  ...Array.from({ length: TOTAL_DAYS }, (_, i) => ({
    loc: `${SITE_URL}/day/${i + 1}`,
    priority: "0.8",
    changefreq: "yearly",
  })),
];
const sitemap =
  `<?xml version="1.0" encoding="UTF-8"?>\n` +
  `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
  sitemapEntries
    .map(
      (e) =>
        `  <url>\n    <loc>${e.loc}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>${e.changefreq}</changefreq>\n    <priority>${e.priority}</priority>\n  </url>`,
    )
    .join("\n") +
  `\n</urlset>\n`;
await writeFile(resolve(distDir, "sitemap.xml"), sitemap);

// robots.txt — allow everything, point at sitemap.
const robots =
  `User-agent: *\nAllow: /\n\nSitemap: ${SITE_URL}/sitemap.xml\n`;
await writeFile(resolve(distDir, "robots.txt"), robots);

// Atom feed of the most recent 30 days (relative to the canonical start
// date 2026-01-01 — readers can subscribe to follow along anytime). We use
// Atom rather than RSS because date handling and content escaping are
// cleaner in Atom 1.0.
const FEED_START = new Date("2026-01-01T08:00:00Z");
const feedItems = [];
for (let day = 1; day <= TOTAL_DAYS; day++) {
  const date = new Date(FEED_START.getTime() + (day - 1) * 24 * 3600 * 1000);
  const p = passages[day - 1];
  feedItems.push({
    day,
    date: date.toISOString(),
    title: p.title,
    summary: teaser(p.passage),
  });
}
// Show last 30 days up to today, oldest first inside the feed but
// chronologically descending across the feed list.
const feed30 = feedItems.slice(-30).reverse();
const atom =
  `<?xml version="1.0" encoding="UTF-8"?>\n` +
  `<feed xmlns="http://www.w3.org/2005/Atom">\n` +
  `  <title>${SITE_NAME}</title>\n` +
  `  <subtitle>${escapeHtml(SITE_TAGLINE)}</subtitle>\n` +
  `  <link href="${SITE_URL}/" />\n` +
  `  <link href="${SITE_URL}/feed.xml" rel="self" type="application/atom+xml" />\n` +
  `  <id>${SITE_URL}/</id>\n` +
  `  <updated>${new Date().toISOString()}</updated>\n` +
  `  <author><name>St Thérèse of Lisieux</name></author>\n` +
  `  <rights>Public domain</rights>\n` +
  feed30
    .map(
      (e) =>
        `  <entry>\n    <id>${SITE_URL}/day/${e.day}</id>\n    <title>Day ${e.day} · ${escapeHtml(e.title)}</title>\n    <link href="${SITE_URL}/day/${e.day}" />\n    <updated>${e.date}</updated>\n    <summary>${escapeHtml(e.summary)}</summary>\n  </entry>`,
    )
    .join("\n") +
  `\n</feed>\n`;
await writeFile(resolve(distDir, "feed.xml"), atom);

console.log(
  `prerendered: ${TOTAL_DAYS} day pages + 5 routes + sitemap.xml + robots.txt + feed.xml`,
);
