import { Link } from "react-router-dom";
import { useFavorites } from "@/stores/useFavorites";
import { useHighlights } from "@/stores/useHighlights";
import { useNotes } from "@/stores/useNotes";
import { useSettings } from "@/stores/useSettings";
import { currentDay } from "@/lib/day";
import { TOTAL_DAYS } from "@/lib/passages";
import { cn } from "@/lib/utils";

/**
 * 365-cell heatmap arranged as a 53-column × 7-row grid (the github
 * contributions look). Each cell represents one day of the user's
 * year-with-Thérèse and is shaded by intensity of activity:
 *
 *   0 = no annotation
 *   1 = highlight OR note
 *   2 = both highlight and note
 *   3 = also a kept (favorite) day
 *
 * Clicking a cell jumps to that day. Days past `today` are dimmed so the
 * user can see how far they've walked.
 */
export function YearHeatmap() {
  const notes = useNotes((s) => s.byDay);
  const highlights = useHighlights((s) => s.byDay);
  const favorites = useFavorites((s) => s.byDay);
  const startDate = useSettings((s) => s.startDate);
  const today = currentDay(startDate);

  function intensity(day: number): number {
    const hasNote = Boolean(notes[day]?.trim());
    const hasHl = (highlights[day]?.length ?? 0) > 0;
    const isFav = Boolean(favorites[day]);
    if (isFav && (hasNote || hasHl)) return 3;
    if (hasNote && hasHl) return 2;
    if (hasNote || hasHl || isFav) return 1;
    return 0;
  }

  return (
    <div className="overflow-x-auto py-2">
      <div
        className="grid auto-cols-min grid-flow-col gap-[3px]"
        style={{ gridTemplateRows: "repeat(7, minmax(0, 1fr))" }}
      >
        {Array.from({ length: TOTAL_DAYS }, (_, i) => {
          const day = i + 1;
          const level = intensity(day);
          const future = day > today;
          return (
            <Link
              key={day}
              to={`/day/${day}`}
              title={`Day ${day}${level > 0 ? " · annotated" : ""}`}
              className={cn(
                "h-3 w-3 rounded-[2px] transition-colors",
                future && "opacity-50",
                level === 0 &&
                  "bg-ink-200/60 hover:bg-ink-300 dark:bg-ink-700/60 dark:hover:bg-ink-600",
                level === 1 &&
                  "bg-accent/30 hover:bg-accent/50 dark:bg-accent-muted/30 dark:hover:bg-accent-muted/50",
                level === 2 &&
                  "bg-accent/60 hover:bg-accent/80 dark:bg-accent-muted/60 dark:hover:bg-accent-muted/80",
                level === 3 &&
                  "bg-accent hover:bg-accent-dark dark:bg-accent-muted dark:hover:bg-accent",
              )}
            />
          );
        })}
      </div>
      <div className="mt-3 flex items-center gap-3 font-sans text-[0.65rem] uppercase tracking-wider text-ink-400 dark:text-ink-500">
        <span>Less</span>
        <span className="h-3 w-3 rounded-[2px] bg-ink-200/60 dark:bg-ink-700/60" />
        <span className="h-3 w-3 rounded-[2px] bg-accent/30 dark:bg-accent-muted/30" />
        <span className="h-3 w-3 rounded-[2px] bg-accent/60 dark:bg-accent-muted/60" />
        <span className="h-3 w-3 rounded-[2px] bg-accent dark:bg-accent-muted" />
        <span>More</span>
      </div>
    </div>
  );
}
