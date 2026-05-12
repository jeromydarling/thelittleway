import { useEffect, useMemo, useRef, useState } from "react";
import { useHighlights, type Range as HRange } from "@/stores/useHighlights";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

const EMPTY_RANGES: HRange[] = [];

interface Props {
  day: number;
  passage: string;
}

interface Segment {
  text: string;
  highlighted: boolean;
  start: number;
  end: number;
}

function segmentise(passage: string, ranges: HRange[]): Segment[] {
  if (ranges.length === 0) {
    return [{ text: passage, highlighted: false, start: 0, end: passage.length }];
  }
  const segs: Segment[] = [];
  let cursor = 0;
  for (const r of ranges) {
    const start = Math.max(0, r.start);
    const end = Math.min(passage.length, r.end);
    if (cursor < start) {
      segs.push({
        text: passage.slice(cursor, start),
        highlighted: false,
        start: cursor,
        end: start,
      });
    }
    segs.push({
      text: passage.slice(start, end),
      highlighted: true,
      start,
      end,
    });
    cursor = end;
  }
  if (cursor < passage.length) {
    segs.push({
      text: passage.slice(cursor),
      highlighted: false,
      start: cursor,
      end: passage.length,
    });
  }
  return segs;
}

/**
 * Walks descendants of `root` and returns the character offset of `node`'s
 * `offset` position into the concatenated text. Returns -1 if `node` is not
 * inside `root`.
 */
function textOffset(root: HTMLElement, node: Node, offset: number): number {
  let pos = 0;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let current: Node | null = walker.nextNode();
  while (current) {
    if (current === node) return pos + offset;
    pos += (current.nodeValue ?? "").length;
    current = walker.nextNode();
  }
  // The selection may end on an element node (e.g. a <mark>); treat that as
  // the start of the next text node.
  return node.contains(root) || root.contains(node) ? pos : -1;
}

export function HighlightablePassage({ day, passage }: Props) {
  const ranges = useHighlights((s) => s.byDay[day]) ?? EMPTY_RANGES;
  const toggle = useHighlights((s) => s.toggle);
  const containerRef = useRef<HTMLDivElement>(null);
  const [pending, setPending] = useState<{
    range: HRange;
    isExisting: boolean;
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
      const isExisting = ranges.some((r) => r.start <= s && r.end >= e);
      const rect = range.getBoundingClientRect();
      setPending({
        range: { start: s, end: e },
        isExisting,
        x: rect.left + rect.width / 2,
        y: rect.top - 8 + window.scrollY,
      });
    }

    function clear(e: Event) {
      // Don't clear when the user is tapping the action button itself.
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

  function commit() {
    if (!pending) return;
    toggle(day, pending.range);
    window.getSelection()?.removeAllRanges();
    setPending(null);
  }

  return (
    <div className="relative">
      <div ref={containerRef} className="passage-text">
        {segments.map((seg, i) =>
          seg.highlighted ? (
            <mark key={i} className="user-hl">
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
          <Button
            size="sm"
            variant="default"
            onMouseDown={(e) => e.preventDefault()}
            onClick={commit}
            className={cn("shadow-lg")}
          >
            {pending.isExisting ? "Remove highlight" : "Highlight"}
          </Button>
        </div>
      )}
    </div>
  );
}
