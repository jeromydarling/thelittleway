import { useSettings } from "@/stores/useSettings";
import { currentDay } from "@/lib/day";
import { TOTAL_DAYS } from "@/lib/passages";

/**
 * Thin strip under the header showing how far through the year the user has
 * walked. Reads from settings.startDate so it tracks user-relative day
 * mapping. Hidden in print and focus mode (via CSS classes on body).
 */
export function ProgressStrip() {
  const startDate = useSettings((s) => s.startDate);
  const day = currentDay(startDate);
  const percent = Math.round((day / TOTAL_DAYS) * 100);

  return (
    <div
      data-progress-strip
      className="border-b border-ink-200/40 print:hidden dark:border-ink-700/40"
      aria-label={`Day ${day} of ${TOTAL_DAYS}`}
    >
      <div className="container-narrow flex items-center gap-3 py-2 font-sans text-[0.7rem] uppercase tracking-[0.2em] text-ink-400 dark:text-ink-500">
        <span className="tabular-nums">
          Day {day} of {TOTAL_DAYS}
        </span>
        <span
          className="relative h-[2px] flex-1 overflow-hidden rounded-full bg-ink-200/50 dark:bg-ink-700/50"
          aria-hidden
        >
          <span
            className="absolute inset-y-0 left-0 bg-accent/70 dark:bg-accent-muted/70"
            style={{ width: `${percent}%` }}
          />
        </span>
        <span className="tabular-nums">{percent}%</span>
      </div>
    </div>
  );
}
