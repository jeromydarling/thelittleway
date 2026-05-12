import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { getPassage, TOTAL_DAYS } from "@/lib/passages";
import { HighlightablePassage } from "@/components/HighlightablePassage";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import { useNotes } from "@/stores/useNotes";

interface Props {
  day: number;
  isToday: boolean;
  onChangeDay: (d: number) => void;
}

export function DayView({ day, isToday, onChangeDay }: Props) {
  const passage = getPassage(day);
  const note = useNotes((s) => s.byDay[day] ?? "");
  const setNote = useNotes((s) => s.setNote);
  const [draft, setDraft] = useState(note);

  useEffect(() => {
    setDraft(note);
  }, [day, note]);

  const prev = day === 1 ? null : day - 1;
  const next = day === TOTAL_DAYS ? null : day + 1;

  return (
    <article className="animate-fade-in">
      <header className="mb-8 text-center">
        <p className="font-sans text-[0.7rem] uppercase tracking-[0.2em] text-accent-muted">
          Day {day} of {TOTAL_DAYS} {isToday && <span className="ml-2 text-accent">· Today</span>}
        </p>
        <h1 className="mt-3 font-serif text-3xl italic leading-snug text-ink-900 dark:text-parchment-100">
          {passage.title}
        </h1>
        <p className="ornament mt-4" aria-hidden>
          ✣
        </p>
      </header>

      <HighlightablePassage day={day} passage={passage.passage} />

      <p className="mt-8 text-right font-sans text-xs italic text-ink-400 dark:text-ink-500">
        {passage.citation}
      </p>

      <aside className="mt-10 rounded border-l-2 border-accent/40 bg-parchment-50/60 px-5 py-4 dark:border-accent-muted/40 dark:bg-ink-800/40">
        <p className="mb-2 font-sans text-[0.7rem] uppercase tracking-[0.2em] text-accent dark:text-accent-muted">
          From the Gospels
        </p>
        <blockquote className="font-serif italic leading-relaxed text-ink-700 dark:text-parchment-200">
          “{passage.gospel.text}”
        </blockquote>
        <p className="mt-2 text-right font-sans text-xs text-ink-400 dark:text-ink-500">
          — {passage.gospel.ref} ({passage.gospel.translation})
        </p>
      </aside>

      <section className="mt-12">
        <h2 className="mb-3 font-sans text-xs uppercase tracking-wider text-ink-400 dark:text-ink-500">
          Your note
        </h2>
        <Textarea
          rows={4}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => {
            if (draft !== note) setNote(day, draft);
          }}
          placeholder="A line for today, a prayer, a remembrance…"
        />
      </section>

      <nav className="mt-10 flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          disabled={prev === null}
          onClick={() => prev !== null && onChangeDay(prev)}
        >
          <ChevronLeft className="h-4 w-4" /> Day {prev ?? "—"}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          disabled={next === null}
          onClick={() => next !== null && onChangeDay(next)}
        >
          Day {next ?? "—"} <ChevronRight className="h-4 w-4" />
        </Button>
      </nav>
    </article>
  );
}
