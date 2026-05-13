import { getPassage, TOTAL_DAYS } from "@/lib/passages";

/**
 * Build a one-line teaser from a passage: the first sentence (or first ~160
 * chars) with smart-quote cleanup. Crawlers and OG previews show ~155 chars,
 * so we keep meta descriptions just under that.
 */
export function teaserFromPassage(passage: string, max = 155): string {
  // Strip drop-cap-friendly leading whitespace, normalise quotes for previews.
  const trimmed = passage.replace(/\s+/g, " ").trim();
  if (trimmed.length <= max) return trimmed;
  // Cut at a sentence boundary if one exists in the window.
  const window = trimmed.slice(0, max);
  const lastStop = Math.max(
    window.lastIndexOf(". "),
    window.lastIndexOf("! "),
    window.lastIndexOf("? "),
  );
  if (lastStop > max * 0.5) return window.slice(0, lastStop + 1);
  // Otherwise cut at a word boundary and add an ellipsis.
  const lastSpace = window.lastIndexOf(" ");
  return (lastSpace > 0 ? window.slice(0, lastSpace) : window) + "…";
}

export interface PageMeta {
  title: string;
  description: string;
  url: string;
  type: "website" | "article";
  /**
   * JSON-LD structured data ready to drop into a <script type="application/
   * ld+json"> tag.
   */
  jsonLd: object;
}

/**
 * Resolve the canonical site origin + base path at runtime so dev, preview,
 * and Pages all give the right canonical URLs. SITE_URL beats everything;
 * otherwise we use the deployed origin or the Vite base.
 */
export function siteOrigin(): string {
  // The build script injects SITE_URL via import.meta.env when prerendering.
  const env = (import.meta as { env?: Record<string, string> }).env;
  if (env?.VITE_SITE_URL) return env.VITE_SITE_URL.replace(/\/$/, "");
  if (typeof window !== "undefined") {
    return `${window.location.origin}${env?.BASE_URL ?? "/"}`.replace(/\/$/, "");
  }
  return "";
}

const SITE_NAME = "The Little Way";
const SITE_TAGLINE =
  "A daily devotional from St Thérèse of Lisieux — read Story of a Soul in 365 days, paired with the Gospels.";
const OG_IMAGE = "og-card.png";

function urlFor(path: string): string {
  const origin = siteOrigin();
  const clean = path.replace(/^\//, "");
  return `${origin}/${clean}`.replace(/\/$/, "") || origin;
}

export function metaForDay(day: number): PageMeta {
  const p = getPassage(day);
  const description = teaserFromPassage(p.passage);
  return {
    title: `Day ${day} · ${p.title} — ${SITE_NAME}`,
    description,
    url: urlFor(`day/${day}`),
    type: "article",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: p.title,
      description,
      datePublished: undefined,
      author: {
        "@type": "Person",
        name: "St Thérèse of Lisieux",
      },
      publisher: {
        "@type": "Organization",
        name: SITE_NAME,
      },
      isPartOf: {
        "@type": "Book",
        name: "Story of a Soul",
        author: { "@type": "Person", name: "St Thérèse of Lisieux" },
        translator: { "@type": "Person", name: "T. N. Taylor" },
      },
      position: day,
      // Total run of the devotional, for crawlers that ingest series.
      pagination: { "@type": "PropertyValue", value: TOTAL_DAYS },
      url: urlFor(`day/${day}`),
      image: urlFor(OG_IMAGE),
    },
  };
}

const STATIC_ROUTES: Record<
  string,
  { title: string; description: string; path: string }
> = {
  home: {
    title: `${SITE_NAME} — ${SITE_TAGLINE}`,
    description: SITE_TAGLINE,
    path: "",
  },
  favorites: {
    title: `Kept days — ${SITE_NAME}`,
    description:
      "The days you've kept along your year with St Thérèse of Lisieux.",
    path: "favorites",
  },
  highlights: {
    title: `Highlights — ${SITE_NAME}`,
    description:
      "Passages you've marked along your reading of Story of a Soul.",
    path: "highlights",
  },
  notes: {
    title: `Notes — ${SITE_NAME}`,
    description:
      "Your reflections, prayers, and remembrances kept beside Thérèse's words.",
    path: "notes",
  },
  settings: {
    title: `Settings — ${SITE_NAME}`,
    description:
      "Reminders, theme, and backup options for The Little Way devotional.",
    path: "settings",
  },
};

export function metaForRoute(key: keyof typeof STATIC_ROUTES): PageMeta {
  const r = STATIC_ROUTES[key];
  return {
    title: r.title,
    description: r.description,
    url: urlFor(r.path),
    type: "website",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": key === "home" ? "WebSite" : "WebPage",
      name: r.title,
      description: r.description,
      url: urlFor(r.path),
      ...(key === "home"
        ? {
            inLanguage: "en",
            about: {
              "@type": "Book",
              name: "Story of a Soul",
              author: { "@type": "Person", name: "St Thérèse of Lisieux" },
              translator: { "@type": "Person", name: "T. N. Taylor" },
              datePublished: "1898",
            },
          }
        : {}),
    },
  };
}

export const SEO_CONSTANTS = {
  SITE_NAME,
  SITE_TAGLINE,
  OG_IMAGE,
};
