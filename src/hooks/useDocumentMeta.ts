import { useEffect } from "react";
import type { PageMeta } from "@/lib/seo";
import { SEO_CONSTANTS } from "@/lib/seo";

const MANAGED = "data-managed-by-app";

function setMeta(selector: string, attrs: Record<string, string>): void {
  let el = document.head.querySelector<HTMLMetaElement | HTMLLinkElement>(
    selector,
  );
  if (!el) {
    const tag = selector.startsWith("link") ? "link" : "meta";
    el = document.createElement(tag) as HTMLMetaElement | HTMLLinkElement;
    el.setAttribute(MANAGED, "");
    // Set the identifying attribute (name/property/rel) so the selector finds
    // it on the next render.
    const m = selector.match(/\[([^=]+)="([^"]+)"\]/);
    if (m) el.setAttribute(m[1], m[2]);
    document.head.appendChild(el);
  }
  for (const [k, v] of Object.entries(attrs)) {
    el.setAttribute(k, v);
  }
}

function setJsonLd(jsonLd: object): void {
  let el = document.head.querySelector<HTMLScriptElement>(
    `script[type="application/ld+json"][${MANAGED}]`,
  );
  if (!el) {
    el = document.createElement("script");
    el.type = "application/ld+json";
    el.setAttribute(MANAGED, "");
    document.head.appendChild(el);
  }
  el.textContent = JSON.stringify(jsonLd);
}

/**
 * Sync document.title, the meta description, OG + Twitter cards, the
 * canonical link, and JSON-LD with the current route. Runs on every nav so
 * users with the SPA loaded still get correct browser titles and history
 * entries (and so social-card debuggers work after JS hydrates).
 *
 * Note: the *crawler*-visible meta comes from the prerendered HTML at
 * dist/day/N/index.html. This hook is for the live document.
 */
export function useDocumentMeta(meta: PageMeta): void {
  useEffect(() => {
    document.title = meta.title;
    setMeta('meta[name="description"]', { content: meta.description });
    setMeta('link[rel="canonical"]', { href: meta.url });

    // Open Graph
    setMeta('meta[property="og:title"]', { content: meta.title });
    setMeta('meta[property="og:description"]', { content: meta.description });
    setMeta('meta[property="og:url"]', { content: meta.url });
    setMeta('meta[property="og:type"]', { content: meta.type });
    setMeta('meta[property="og:site_name"]', {
      content: SEO_CONSTANTS.SITE_NAME,
    });
    setMeta('meta[property="og:image"]', {
      content: `${meta.url.split("/").slice(0, 3).join("/")}/${SEO_CONSTANTS.OG_IMAGE}`,
    });
    setMeta('meta[property="og:image:width"]', { content: "1200" });
    setMeta('meta[property="og:image:height"]', { content: "630" });

    // Twitter
    setMeta('meta[name="twitter:card"]', { content: "summary_large_image" });
    setMeta('meta[name="twitter:title"]', { content: meta.title });
    setMeta('meta[name="twitter:description"]', { content: meta.description });
    setMeta('meta[name="twitter:image"]', {
      content: `${meta.url.split("/").slice(0, 3).join("/")}/${SEO_CONSTANTS.OG_IMAGE}`,
    });

    setJsonLd(meta.jsonLd);
  }, [meta]);
}
