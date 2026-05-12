import { Link } from "react-router-dom";
import { useHighlights } from "@/stores/useHighlights";
import { getPassage } from "@/lib/passages";
import { Card, CardBody } from "@/components/ui/Card";

export function Highlights() {
  const byDay = useHighlights((s) => s.byDay);
  const entries = Object.entries(byDay)
    .map(([day, ranges]) => ({ day: Number(day), ranges }))
    .filter((e) => e.ranges.length > 0)
    .sort((a, b) => a.day - b.day);

  if (entries.length === 0) {
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
      {entries.map(({ day, ranges }) => {
        const p = getPassage(day);
        return (
          <Card key={day}>
            <CardBody>
              <div className="mb-2 flex items-baseline justify-between">
                <Link
                  to={`/day/${day}`}
                  className="font-sans text-xs uppercase tracking-wider text-accent dark:text-accent-muted hover:underline"
                >
                  Day {day} · {p.title}
                </Link>
                <span className="font-sans text-xs text-ink-300">
                  {ranges.length} {ranges.length === 1 ? "passage" : "passages"}
                </span>
              </div>
              <ul className="space-y-2">
                {ranges.map((r, i) => (
                  <li key={i} className="passage-text">
                    <mark className="user-hl">{p.passage.slice(r.start, r.end)}</mark>
                  </li>
                ))}
              </ul>
            </CardBody>
          </Card>
        );
      })}
    </div>
  );
}
