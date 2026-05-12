import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * Highlights are stored as character ranges within the day's passage text.
 * Ranges are inclusive of `start` and exclusive of `end`. Overlapping
 * ranges are merged on insert.
 */
export interface Range {
  start: number;
  end: number;
}

interface HighlightsState {
  /** day -> sorted, non-overlapping ranges */
  byDay: Record<number, Range[]>;
  toggle: (day: number, range: Range) => void;
  remove: (day: number, range: Range) => void;
  clear: (day: number) => void;
}

function mergeIn(existing: Range[], next: Range): Range[] {
  if (next.end <= next.start) return existing;
  const merged: Range[] = [];
  let { start, end } = next;
  for (const r of existing) {
    if (r.end < start || r.start > end) {
      merged.push(r);
    } else {
      start = Math.min(start, r.start);
      end = Math.max(end, r.end);
    }
  }
  merged.push({ start, end });
  merged.sort((a, b) => a.start - b.start);
  return merged;
}

function subtract(existing: Range[], cut: Range): Range[] {
  const out: Range[] = [];
  for (const r of existing) {
    if (cut.end <= r.start || cut.start >= r.end) {
      out.push(r);
      continue;
    }
    if (cut.start > r.start) out.push({ start: r.start, end: cut.start });
    if (cut.end < r.end) out.push({ start: cut.end, end: r.end });
  }
  return out;
}

export const useHighlights = create<HighlightsState>()(
  persist(
    (set) => ({
      byDay: {},
      toggle: (day, range) =>
        set((s) => {
          const cur = s.byDay[day] ?? [];
          // If the range is fully inside an existing highlight, remove it
          const fully = cur.some(
            (r) => r.start <= range.start && r.end >= range.end,
          );
          const updated = fully ? subtract(cur, range) : mergeIn(cur, range);
          return { byDay: { ...s.byDay, [day]: updated } };
        }),
      remove: (day, range) =>
        set((s) => ({
          byDay: { ...s.byDay, [day]: subtract(s.byDay[day] ?? [], range) },
        })),
      clear: (day) =>
        set((s) => {
          const next = { ...s.byDay };
          delete next[day];
          return { byDay: next };
        }),
    }),
    { name: "littleway.highlights", version: 1 },
  ),
);
