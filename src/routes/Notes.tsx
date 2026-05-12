import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useNotes } from "@/stores/useNotes";
import { getPassage } from "@/lib/passages";
import { Card, CardBody } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/utils";

const TAG_RE = /(^|\s)#([a-zA-Z][\w-]*)/g;

function extractTags(text: string): string[] {
  const set = new Set<string>();
  for (const m of text.matchAll(TAG_RE)) set.add(m[2].toLowerCase());
  return [...set];
}

function renderWithTagsHighlighted(text: string) {
  const parts = text.split(/(\s#[a-zA-Z][\w-]*)/g);
  return parts.map((part, i) => {
    if (/^\s#[a-zA-Z]/.test(part)) {
      const tag = part.trim();
      return (
        <span
          key={i}
          className="inline-flex items-center rounded-sm bg-accent/10 px-1 font-sans text-[0.85em] text-accent dark:bg-accent-muted/15 dark:text-accent-muted"
        >
          {tag}
        </span>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

export function Notes() {
  const byDay = useNotes((s) => s.byDay);
  const [query, setQuery] = useState("");
  const [activeTag, setActiveTag] = useState<string | null>(null);

  const allEntries = useMemo(() => {
    return Object.entries(byDay)
      .map(([day, text]) => ({ day: Number(day), text, tags: extractTags(text) }))
      .filter((e) => e.text.trim().length > 0)
      .sort((a, b) => a.day - b.day);
  }, [byDay]);

  const tagCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const e of allEntries) {
      for (const t of e.tags) m.set(t, (m.get(t) ?? 0) + 1);
    }
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [allEntries]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return allEntries.filter((e) => {
      if (activeTag && !e.tags.includes(activeTag)) return false;
      if (!q) return true;
      const p = getPassage(e.day);
      return (
        e.text.toLowerCase().includes(q) ||
        p.title.toLowerCase().includes(q) ||
        p.passage.toLowerCase().includes(q)
      );
    });
  }, [allEntries, query, activeTag]);

  if (allEntries.length === 0) {
    return (
      <div className="py-10 text-center text-ink-400 dark:text-ink-500">
        <p className="font-serif italic">No notes yet.</p>
        <p className="mt-2 font-sans text-sm">
          Write a thought below any day's passage. Type{" "}
          <span className="font-mono">#prayer</span> or{" "}
          <span className="font-mono">#cross</span> to tag.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-center font-serif text-2xl italic">Your notes</h1>

      <Input
        type="search"
        placeholder="Search your notes…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      {tagCounts.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setActiveTag(null)}
            className={cn(
              "rounded-full border px-2.5 py-0.5 font-sans text-xs",
              activeTag === null
                ? "border-accent bg-accent/10 text-accent dark:border-accent-muted dark:bg-accent-muted/15 dark:text-accent-muted"
                : "border-ink-200/60 text-ink-500 dark:border-ink-700/60 dark:text-ink-300",
            )}
          >
            All
          </button>
          {tagCounts.map(([tag, count]) => (
            <button
              key={tag}
              type="button"
              onClick={() => setActiveTag(activeTag === tag ? null : tag)}
              className={cn(
                "rounded-full border px-2.5 py-0.5 font-sans text-xs",
                activeTag === tag
                  ? "border-accent bg-accent/10 text-accent dark:border-accent-muted dark:bg-accent-muted/15 dark:text-accent-muted"
                  : "border-ink-200/60 text-ink-500 dark:border-ink-700/60 dark:text-ink-300",
              )}
            >
              #{tag} <span className="ml-1 text-ink-300">{count}</span>
            </button>
          ))}
        </div>
      )}

      {filtered.length === 0 ? (
        <p className="py-6 text-center font-sans text-sm text-ink-400">
          No notes match those filters.
        </p>
      ) : (
        filtered.map(({ day, text }) => {
          const p = getPassage(day);
          return (
            <Card key={day}>
              <CardBody>
                <Link
                  to={`/day/${day}`}
                  className="font-sans text-xs uppercase tracking-wider text-accent hover:underline dark:text-accent-muted"
                >
                  Day {day} · {p.title}
                </Link>
                <p className="mt-3 whitespace-pre-wrap font-serif italic text-ink-800 dark:text-parchment-200">
                  {renderWithTagsHighlighted(text)}
                </p>
              </CardBody>
            </Card>
          );
        })
      )}
    </div>
  );
}
