import { create } from "zustand";
import { persist } from "zustand/middleware";

export type HighlightColor = "gold" | "rose" | "violet";

export const HIGHLIGHT_COLORS: { id: HighlightColor; label: string; hint: string }[] = [
  { id: "gold", label: "Gold", hint: "consolation, joy, light" },
  { id: "rose", label: "Rose", hint: "mercy, love, the little way" },
  { id: "violet", label: "Violet", hint: "suffering, cross, longing" },
];

/**
 * Highlights are stored as character ranges within the day's passage text.
 * Ranges of the *same color* may merge on insert; ranges of different colors
 * are kept separate so overlapping color choices don't bleed into each other.
 */
export interface Range {
  start: number;
  end: number;
  color: HighlightColor;
}

interface HighlightsState {
  /** day -> sorted, non-overlapping ranges */
  byDay: Record<number, Range[]>;
  /** Last color the user picked; used as the default on next highlight. */
  lastColor: HighlightColor;
  toggle: (day: number, range: Range) => void;
  setColor: (color: HighlightColor) => void;
  clear: (day: number) => void;
  replaceAll: (next: Record<number, Range[]>) => void;
}

function mergeIn(existing: Range[], next: Range): Range[] {
  if (next.end <= next.start) return existing;
  const merged: Range[] = [];
  let { start, end } = next;
  const sameColor: Range[] = [];
  for (const r of existing) {
    if (r.color !== next.color) {
      merged.push(r);
      continue;
    }
    if (r.end < start || r.start > end) {
      sameColor.push(r);
    } else {
      start = Math.min(start, r.start);
      end = Math.max(end, r.end);
    }
  }
  sameColor.push({ start, end, color: next.color });
  return [...merged, ...sameColor].sort((a, b) => a.start - b.start);
}

function subtract(existing: Range[], cut: Range): Range[] {
  const out: Range[] = [];
  for (const r of existing) {
    // Different-color ranges aren't affected by the cut
    if (r.color !== cut.color) {
      out.push(r);
      continue;
    }
    if (cut.end <= r.start || cut.start >= r.end) {
      out.push(r);
      continue;
    }
    if (cut.start > r.start) out.push({ start: r.start, end: cut.start, color: r.color });
    if (cut.end < r.end) out.push({ start: cut.end, end: r.end, color: r.color });
  }
  return out;
}

export const useHighlights = create<HighlightsState>()(
  persist(
    (set) => ({
      byDay: {},
      lastColor: "gold",
      setColor: (color) => set({ lastColor: color }),
      toggle: (day, range) =>
        set((s) => {
          const cur = s.byDay[day] ?? [];
          // If the requested range is fully covered by an existing range of
          // the same color, treat the gesture as a removal.
          const fully = cur.some(
            (r) =>
              r.color === range.color &&
              r.start <= range.start &&
              r.end >= range.end,
          );
          const updated = fully ? subtract(cur, range) : mergeIn(cur, range);
          return {
            byDay: { ...s.byDay, [day]: updated },
            lastColor: range.color,
          };
        }),
      clear: (day) =>
        set((s) => {
          const next = { ...s.byDay };
          delete next[day];
          return { byDay: next };
        }),
      replaceAll: (next) => set({ byDay: next }),
    }),
    {
      name: "littleway.highlights",
      version: 2,
      // Migrate v1 ranges (no color) by stamping them all gold so existing
      // user highlights survive the upgrade.
      migrate: (persisted: unknown, version: number) => {
        if (version >= 2) return persisted;
        const p = persisted as { byDay?: Record<string, { start: number; end: number }[]> };
        const byDay: Record<number, Range[]> = {};
        for (const [day, ranges] of Object.entries(p?.byDay ?? {})) {
          byDay[Number(day)] = ranges.map((r) => ({
            ...r,
            color: "gold" as HighlightColor,
          }));
        }
        return { byDay, lastColor: "gold" };
      },
    },
  ),
);
