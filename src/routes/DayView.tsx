import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Heart, Focus, Printer } from "lucide-react";
import { getPassage, TOTAL_DAYS } from "@/lib/passages";
import { HighlightablePassage } from "@/components/HighlightablePassage";
import { ShareButton } from "@/components/ShareButton";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import { useNotes } from "@/stores/useNotes";
import { useFavorites } from "@/stores/useFavorites";
import { useSettings } from "@/stores/useSettings";
import { liturgicalHint } from "@/lib/liturgy";
import { metaForDay, teaserFromPassage } from "@/lib/seo";
import { cn } from "@/lib/utils";

interface Props {
  day: number;
  isToday: boolean;
  onChangeDay: (d: number) => void;
}

export function DayView({ day, isToday, onChangeDay }: Props) {
  const passage = getPassage(day);
  const setNote = useNotes((s) => s.setNote);
  const isFavorite = useFavorites((s) => Boolean(s.byDay[day]));
  const toggleFavorite = useFavorites((s) => s.toggle);
  const focusMode = useSettings((s) => s.focusMode);
  const setFocusMode = useSettings((s) => s.setFocusMode);
  const [draft, setDraft] = useState(
    () => useNotes.getState().byDay[day] ?? "",
  );
  const hint = isToday ? liturgicalHint() : null;

  // Load the stored note for this day exactly once per day change. We use
  // useNotes.getState() (not the `note` selector) so this effect doesn't
  // re-fire when autosave writes back — that would clobber active typing.
  useEffect(() => {
    setDraft(useNotes.getState().byDay[day] ?? "");
  }, [day]);

  // Autosave the note. Three triggers, each catching a different way a
  // user could lose work:
  //   1. A 400ms debounce after the last keystroke — typing in the
  //      textarea persists continuously without thrashing localStorage.
  //   2. visibilitychange + pagehide — mobile Safari (and Chrome under
  //      memory pressure) can discard the tab while it's backgrounded;
  //      we have to flush *before* that happens, because blur won't fire
  //      when the user just switches tabs.
  //   3. Unmount — covers in-app navigation to another day or route.
  const draftRef = useRef(draft);
  const dayRef = useRef(day);
  draftRef.current = draft;
  dayRef.current = day;

  useEffect(() => {
    const id = window.setTimeout(() => {
      const stored = useNotes.getState().byDay[day] ?? "";
      if (draft !== stored) setNote(day, draft);
    }, 400);
    return () => window.clearTimeout(id);
  }, [draft, day, setNote]);

  useEffect(() => {
    function flush() {
      const stored = useNotes.getState().byDay[dayRef.current] ?? "";
      if (draftRef.current !== stored) {
        setNote(dayRef.current, draftRef.current);
      }
    }
    window.addEventListener("visibilitychange", flush);
    window.addEventListener("pagehide", flush);
    return () => {
      flush();
      window.removeEventListener("visibilitychange", flush);
      window.removeEventListener("pagehide", flush);
    };
  }, [setNote]);

  const prev = day === 1 ? null : day - 1;
  const next = day === TOTAL_DAYS ? null : day + 1;

  return (
    <article className="animate-fade-in">
      <header className="mb-8 text-center">
        <p className="font-sans text-[0.7rem] uppercase tracking-[0.2em] text-accent-muted">
          Day {day} of {TOTAL_DAYS} {isToday && <span className="ml-2 text-accent">· Today</span>}
        </p>
        {hint && (
          <p className="mt-1 font-serif text-xs italic text-ink-400 dark:text-ink-500">
            {hint.label}
          </p>
        )}
        <h1 className="mt-3 font-serif text-3xl italic leading-snug text-ink-900 dark:text-parchment-100">
          {passage.title}
        </h1>
        <button
          type="button"
          onClick={() => toggleFavorite(day)}
          aria-label={isFavorite ? "Remove from favorites" : "Save to favorites"}
          aria-pressed={isFavorite}
          className={cn(
            "mt-4 inline-flex min-h-10 items-center gap-1.5 rounded-full px-4 py-2 font-sans text-[0.7rem] uppercase tracking-[0.18em] transition-colors print:hidden",
            isFavorite
              ? "bg-accent/10 text-accent dark:bg-accent-muted/15 dark:text-accent-muted"
              : "text-ink-300 hover:text-accent dark:text-ink-500 dark:hover:text-accent-muted",
          )}
        >
          <Heart
            className={cn("h-3.5 w-3.5", isFavorite && "fill-current")}
            aria-hidden
          />
          {isFavorite ? "Kept" : "Keep this day"}
        </button>
        <p className="ornament mt-4" aria-hidden>
          ✣
        </p>
      </header>

      <HighlightablePassage
        day={day}
        passage={passage.passage}
        citation={passage.citation}
      />

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
          placeholder="A line for today, a prayer, a remembrance…"
        />
      </section>

      <nav className="mt-10 flex items-center justify-between gap-1 print:hidden">
        <Button
          variant="ghost"
          size="sm"
          disabled={prev === null}
          onClick={() => prev !== null && onChangeDay(prev)}
          aria-label={prev !== null ? `Go to day ${prev}` : "No previous day"}
          className="min-h-11 px-2 sm:px-3"
        >
          <ChevronLeft className="h-4 w-4" />
          Day {prev ?? "—"}
        </Button>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setFocusMode(!focusMode)}
            title={focusMode ? "Exit focus mode" : "Focus mode"}
            aria-pressed={focusMode}
            className="h-11 w-11"
          >
            <Focus className="h-4 w-4" />
          </Button>
          <ShareButton
            url={metaForDay(day).url}
            title={`Day ${day} · ${passage.title} — The Little Way`}
            text={teaserFromPassage(passage.passage, 120)}
          />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => window.print()}
            title="Print this day"
            className="h-11 w-11"
          >
            <Printer className="h-4 w-4" />
          </Button>
        </div>
        <Button
          variant="ghost"
          size="sm"
          disabled={next === null}
          onClick={() => next !== null && onChangeDay(next)}
          aria-label={next !== null ? `Go to day ${next}` : "No next day"}
          className="min-h-11 px-2 sm:px-3"
        >
          Day {next ?? "—"}
          <ChevronRight className="h-4 w-4" />
        </Button>
      </nav>
    </article>
  );
}
