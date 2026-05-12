import { Link } from "react-router-dom";
import { useNotes } from "@/stores/useNotes";
import { getPassage } from "@/lib/passages";
import { Card, CardBody } from "@/components/ui/Card";

export function Notes() {
  const byDay = useNotes((s) => s.byDay);
  const entries = Object.entries(byDay)
    .map(([day, text]) => ({ day: Number(day), text }))
    .filter((e) => e.text.trim().length > 0)
    .sort((a, b) => a.day - b.day);

  if (entries.length === 0) {
    return (
      <div className="py-10 text-center text-ink-400 dark:text-ink-500">
        <p className="font-serif italic">No notes yet.</p>
        <p className="mt-2 font-sans text-sm">
          Write a thought below any day's passage.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-center font-serif text-2xl italic">Your notes</h1>
      {entries.map(({ day, text }) => {
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
              <p className="mt-3 whitespace-pre-wrap font-serif italic text-ink-800 dark:text-parchment-200">
                {text}
              </p>
            </CardBody>
          </Card>
        );
      })}
    </div>
  );
}
