import { useEffect, useState } from "react";

const PORTRAIT_PATHS = ["/portrait.jpg", "/portrait.png", "/portrait.webp"];

/**
 * Hero shown above the daily passage on the Today route.
 *
 * Prefers a real portrait at /portrait.{jpg,png,webp} if one is present in
 * /public; otherwise renders an SVG rose ("I will let fall a shower of
 * roses"). Drop a public-domain photograph of St Thérèse into public/ to
 * replace the illustration — no code changes required.
 */
export function Hero() {
  const base = import.meta.env.BASE_URL.replace(/\/$/, "");
  const [portrait, setPortrait] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      for (const p of PORTRAIT_PATHS) {
        const url = `${base}${p}`;
        try {
          const res = await fetch(url, { method: "HEAD" });
          // Vite (and most SPA hosts) serve index.html for any missing path,
          // so a 200 alone doesn't mean the asset exists. Confirm it's an
          // image by content-type.
          const type = res.headers.get("content-type") ?? "";
          if (!cancelled && res.ok && type.startsWith("image/")) {
            setPortrait(url);
            return;
          }
        } catch {
          // try next
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [base]);

  return (
    <figure className="mx-auto mb-6 max-w-[200px] text-center sm:mb-10 sm:max-w-[260px]">
      {portrait ? (
        <img
          src={portrait}
          alt="Portrait of St Thérèse of Lisieux"
          className="mx-auto h-auto w-full rounded-full object-cover shadow-[0_2px_24px_rgba(107,66,38,0.18)] ring-1 ring-accent/20 dark:ring-accent-muted/30"
          width={220}
          height={220}
          loading="eager"
        />
      ) : (
        <img
          src={`${base}/hero-rose.svg`}
          alt="A rose, in memory of St Thérèse of Lisieux"
          className="mx-auto h-auto w-full"
          width={220}
          height={300}
          loading="eager"
        />
      )}
      <figcaption className="mt-3 font-serif text-sm italic text-ink-500 dark:text-ink-400">
        “I will let fall a shower of roses.”
      </figcaption>
    </figure>
  );
}
