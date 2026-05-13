import { Link } from "react-router-dom";
import { useFavorites } from "@/stores/useFavorites";
import { getPassage } from "@/lib/passages";
import { Card, CardBody } from "@/components/ui/Card";
import { useDocumentMeta } from "@/hooks/useDocumentMeta";
import { metaForRoute } from "@/lib/seo";

export function Favorites() {
  useDocumentMeta(metaForRoute("favorites"));
  const byDay = useFavorites((s) => s.byDay);
  const entries = Object.entries(byDay)
    .map(([day]) => ({ day: Number(day) }))
    .sort((a, b) => a.day - b.day);

  if (entries.length === 0) {
    return (
      <div className="py-10 text-center text-ink-400 dark:text-ink-500">
        <p className="font-serif italic">No favorites yet.</p>
        <p className="mt-2 font-sans text-sm">
          Tap the heart on any day to keep it close.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-center font-serif text-2xl italic">Your favorites</h1>
      {entries.map(({ day }) => {
        const p = getPassage(day);
        return (
          <Card key={day}>
            <CardBody>
              <Link
                to={`/day/${day}`}
                className="font-sans text-xs uppercase tracking-wider text-accent dark:text-accent-muted hover:underline"
              >
                Day {day} · {p.title}
              </Link>
              <p className="mt-3 line-clamp-3 font-serif italic text-ink-700 dark:text-parchment-200">
                {p.passage.slice(0, 280)}…
              </p>
            </CardBody>
          </Card>
        );
      })}
    </div>
  );
}
