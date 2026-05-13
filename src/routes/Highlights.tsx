import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useHighlights, type HighlightColor } from "@/stores/useHighlights";
import { getPassage } from "@/lib/passages";
import { Card, CardBody } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { useDocumentMeta } from "@/hooks/useDocumentMeta";
import { metaForRoute } from "@/lib/seo";

const colorLabel: Record<HighlightColor, string> = {
  gold: "consolation",
  rose: "mercy",
  violet: "suffering",
};

export function Highlights() {
  useDocumentMeta(metaForRoute("highlights"));
  const byDay = useHighlights((s) => s.byDay);
  const [query, setQuery] = useState("");

  const entries = useMemo(() => {
    const list = Object.entries(byDay)
      .map(([day, ranges]) => ({ day: Number(day), ranges }))
      .filter((e) => e.ranges.length > 0)
      .sort((a, b) => a.day - b.day);

    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter(({ day, ranges }) => {
      const p = getPassage(day);
      if (p.title.toLowerCase().includes(q)) return true;
      return ranges.some((r) =>
        p.passage.slice(r.start, r.end).toLowerCase().includes(q),
      );
    });
  }, [byDay, query]);

  if (Object.keys(byDay).length === 0) {
    return (
      <div className="py-10 text-center text-ink-400 dark:text-ink-500">
        <p className="font-serif italic">No highlights yet.</p>
        <p className="mt-2 font-sans text-sm">
          Select any text on a daily passage to mark it.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-center font-serif text-2xl italic">Your highlights</h1>

      <Input
        type="search"
        placeholder="Search your highlights…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      {entries.length === 0 ? (
        <p className="py-6 text-center font-sans text-sm text-ink-400">
          No highlight matches "{query}".
        </p>
      ) : (
        entries.map(({ day, ranges }) => {
          const p = getPassage(day);
          return (
            <Card key={day}>
              <CardBody>
                <div className="mb-2 flex items-baseline justify-between gap-3">
                  <Link
                    to={`/day/${day}`}
                    className="font-sans text-xs uppercase tracking-wider text-accent hover:underline dark:text-accent-muted"
                  >
                    Day {day} · {p.title}
                  </Link>
                  <span className="font-sans text-xs text-ink-300">
                    {ranges.length} {ranges.length === 1 ? "passage" : "passages"}
                  </span>
                </div>
                <ul className="space-y-2">
                  {ranges.map((r, i) => (
                    <li key={i} className="passage-text break-words">
                      <mark className="user-hl" data-color={r.color}>
                        {p.passage.slice(r.start, r.end)}
                      </mark>
                      <span className="ml-2 align-middle font-sans text-[0.65rem] uppercase tracking-wider text-ink-300 dark:text-ink-500">
                        {colorLabel[r.color]}
                      </span>
                    </li>
                  ))}
                </ul>
              </CardBody>
            </Card>
          );
        })
      )}
    </div>
  );
}
