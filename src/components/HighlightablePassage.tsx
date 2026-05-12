import { useEffect, useMemo, useRef, useState } from "react";
import {
  useHighlights,
  type Range as HRange,
  type HighlightColor,
  HIGHLIGHT_COLORS,
} from "@/stores/useHighlights";
import { cn } from "@/lib/utils";

const EMPTY_RANGES: HRange[] = [];

interface Props {
  day: number;
  passage: string;
  citation?: string;
}

interface Segment {
  text: string;
  color: HighlightColor | null;
  start: number;
  end: number;
}

/**
 * Build a flat list of contiguous segments where each segment is either
 * unhighlighted or carries one highlight color. Overlapping ranges of
 * different colors stack — the inner color wins (last one written).
 */
function segmentise(passage: string, ranges: HRange[]): Segment[] {
  if (ranges.length === 0) {
    return [{ text: passage, color: null, start: 0, end: passage.length }];
  }
  // Build a per-character color array (last writer wins on overlap).
  const colors: (HighlightColor | null)[] = new Array(passage.length).fill(null);
  for (const r of ranges) {
    for (let i = Math.max(0, r.start); i < Math.min(passage.length, r.end); i++) {
      colors[i] = r.color;
    }
  }
  const segs: Segment[] = [];
  let i = 0;
  while (i < passage.length) {
    const c = colors[i];
    let j = i + 1;
    while (j < passage.length && colors[j] === c) j++;
    segs.push({ text: passage.slice(i, j), color: c, start: i, end: j });
    i = j;
  }
  return segs;
}

function textOffset(root: HTMLElement, node: Node, offset: number): number {
  let pos = 0;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let current: Node | null = walker.nextNode();
  while (current) {
    if (current === node) return pos + offset;
    pos += (current.nodeValue ?? "").length;
    current = walker.nextNode();
  }
  return node.contains(root) || root.contains(node) ? pos : -1;
}

export function HighlightablePassage({ day, passage, citation }: Props) {
  const ranges = useHighlights((s) => s.byDay[day]) ?? EMPTY_RANGES;
  const toggle = useHighlights((s) => s.toggle);
  const lastColor = useHighlights((s) => s.lastColor);
  const containerRef = useRef<HTMLDivElement>(null);
  const [pending, setPending] = useState<{
    range: Omit<HRange, "color">;
    existingColor: HighlightColor | null;
    x: number;
    y: number;
  } | null>(null);

  const segments = useMemo(() => segmentise(passage, ranges), [passage, ranges]);

  useEffect(() => {
    function handleSelection() {
      const sel = window.getSelection();
      const root = containerRef.current;
      if (!sel || !root || sel.isCollapsed) {
        setPending(null);
        return;
      }
      const range = sel.getRangeAt(0);
      if (!root.contains(range.startContainer) || !root.contains(range.endContainer)) {
        setPending(null);
        return;
      }
      const start = textOffset(root, range.startContainer, range.startOffset);
      const end = textOffset(root, range.endContainer, range.endOffset);
      if (start < 0 || end < 0 || start === end) {
        setPending(null);
        return;
      }
      const [s, e] = start < end ? [start, end] : [end, start];
      // Detect if the selection is already covered by some highlight; if so,
      // we'll offer to remove (in that color) rather than apply another.
      const covering = ranges.find((r) => r.start <= s && r.end >= e);
      const rect = range.getBoundingClientRect();
      setPending({
        range: { start: s, end: e },
        existingColor: covering?.color ?? null,
        x: rect.left + rect.width / 2,
        y: rect.top - 10 + window.scrollY,
      });
    }

    function clear(e: Event) {
      const target = e.target as HTMLElement | null;
      if (target?.closest("[data-hl-action]")) return;
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed) setPending(null);
    }

    document.addEventListener("selectionchange", handleSelection);
    document.addEventListener("mousedown", clear);
    document.addEventListener("touchstart", clear);
    return () => {
      document.removeEventListener("selectionchange", handleSelection);
      document.removeEventListener("mousedown", clear);
      document.removeEventListener("touchstart", clear);
    };
  }, [ranges]);

  function applyColor(color: HighlightColor) {
    if (!pending) return;
    toggle(day, { ...pending.range, color });
    window.getSelection()?.removeAllRanges();
    setPending(null);
  }

  function removeExisting() {
    if (!pending || !pending.existingColor) return;
    toggle(day, { ...pending.range, color: pending.existingColor });
    window.getSelection()?.removeAllRanges();
    setPending(null);
  }

  async function copySelection() {
    if (!pending) return;
    const text = passage.slice(pending.range.start, pending.range.end);
    const cite = citation ? `\n— ${citation}` : "";
    try {
      await navigator.clipboard.writeText(`“${text}”${cite}`);
    } catch {
      // Clipboard may be unavailable (non-https, perms); ignore silently
    }
    window.getSelection()?.removeAllRanges();
    setPending(null);
  }

  return (
    <div className="relative">
      <div ref={containerRef} className="passage-text with-drop-cap">
        {segments.map((seg, i) =>
          seg.color ? (
            <mark key={i} className="user-hl" data-color={seg.color}>
              {seg.text}
            </mark>
          ) : (
            <span key={i}>{seg.text}</span>
          ),
        )}
      </div>
      {pending && (
        <div
          data-hl-action
          className="pointer-events-auto fixed z-50 -translate-x-1/2 -translate-y-full"
          style={{ left: pending.x, top: pending.y }}
        >
          <div className="flex items-center gap-1 rounded-full border border-ink-200/60 bg-parchment-50 px-1.5 py-1 shadow-lg dark:border-ink-700/60 dark:bg-ink-900">
            {HIGHLIGHT_COLORS.map((c) => (
              <button
                key={c.id}
                type="button"
                aria-label={`Highlight in ${c.label} — ${c.hint}`}
                title={`${c.label} — ${c.hint}`}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => applyColor(c.id)}
                className={cn(
                  "h-7 w-7 rounded-full border border-ink-200/60 transition-transform hover:scale-110 dark:border-ink-700/60",
                  c.id === "gold" && "bg-amber-200",
                  c.id === "rose" && "bg-rose-300",
                  c.id === "violet" && "bg-violet-300",
                  c.id === lastColor && "ring-2 ring-accent ring-offset-1 ring-offset-parchment-50 dark:ring-offset-ink-900",
                )}
              />
            ))}
            <span className="mx-0.5 h-5 w-px bg-ink-200/60 dark:bg-ink-700/60" />
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={copySelection}
              className="px-2 py-1 font-sans text-xs text-ink-600 hover:text-accent dark:text-ink-300 dark:hover:text-accent-muted"
            >
              Copy
            </button>
            {pending.existingColor && (
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={removeExisting}
                className="px-2 py-1 font-sans text-xs text-ink-600 hover:text-red-700 dark:text-ink-300 dark:hover:text-red-300"
              >
                Remove
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
