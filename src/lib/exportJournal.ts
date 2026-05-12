import { passages, type Passage } from "@/lib/passages";
import { type Range, type HighlightColor } from "@/stores/useHighlights";

export interface JournalData {
  notes: Record<number, string>;
  highlights: Record<number, Range[]>;
  favorites: Record<number, string>;
  startDate: string;
}

export interface JournalBackup {
  version: 1;
  app: "the-little-way";
  exportedAt: string;
  data: JournalData;
}

const colorLabel: Record<HighlightColor, string> = {
  gold: "consolation",
  rose: "mercy",
  violet: "suffering",
};

/**
 * Build a single Markdown document containing the user's entire journal:
 * favorites first (as a top-of-document index), then a section per day
 * that has any annotation — highlights with color label, then the note.
 * Days with no annotations are skipped, so the file stays focused on
 * what the user has actually written.
 */
export function buildJournalMarkdown(data: JournalData): string {
  const lines: string[] = [];
  const today = new Date().toISOString().slice(0, 10);

  lines.push("# The Little Way — A devotional journal");
  lines.push("");
  lines.push(`*A year walking with St Thérèse of Lisieux*`);
  lines.push("");
  lines.push(`Exported ${today}. Started ${data.startDate}.`);
  lines.push("");

  const favoriteDays = Object.keys(data.favorites)
    .map(Number)
    .sort((a, b) => a - b);
  if (favoriteDays.length > 0) {
    lines.push("## Kept days");
    lines.push("");
    for (const day of favoriteDays) {
      const p = byDay(day);
      if (p) lines.push(`- **Day ${day}** — ${p.title}`);
    }
    lines.push("");
  }

  const annotated = new Set<number>([
    ...favoriteDays,
    ...Object.keys(data.notes).map(Number),
    ...Object.keys(data.highlights).map(Number),
  ]);
  const annotatedDays = [...annotated].sort((a, b) => a - b);

  if (annotatedDays.length === 0) {
    lines.push("*(No highlights, notes, or favorites yet.)*");
    return lines.join("\n");
  }

  for (const day of annotatedDays) {
    const p = byDay(day);
    if (!p) continue;
    lines.push("---");
    lines.push("");
    lines.push(`## Day ${day} — ${p.title}`);
    lines.push("");
    lines.push(`> ${p.citation}`);
    if (data.favorites[day]) lines.push("> ★ Kept");
    lines.push("");

    const ranges = data.highlights[day] ?? [];
    if (ranges.length > 0) {
      lines.push("### Highlights");
      lines.push("");
      const sorted = [...ranges].sort((a, b) => a.start - b.start);
      for (const r of sorted) {
        const text = p.passage.slice(r.start, r.end).trim();
        lines.push(`- _(${colorLabel[r.color]})_ "${text}"`);
      }
      lines.push("");
    }

    const note = data.notes[day];
    if (note && note.trim()) {
      lines.push("### Note");
      lines.push("");
      lines.push(note.trim());
      lines.push("");
    }

    lines.push(`*Gospel pairing — ${p.gospel.ref} (${p.gospel.translation})*: "${p.gospel.text}"`);
    lines.push("");
  }

  return lines.join("\n");
}

function byDay(day: number): Passage | undefined {
  return passages.find((p) => p.day === day);
}

export function downloadJournalMarkdown(data: JournalData): void {
  triggerDownload(
    buildJournalMarkdown(data),
    `the-little-way-journal-${new Date().toISOString().slice(0, 10)}.md`,
    "text/markdown;charset=utf-8",
  );
}

export function downloadJournalBackup(data: JournalData): void {
  const backup: JournalBackup = {
    version: 1,
    app: "the-little-way",
    exportedAt: new Date().toISOString(),
    data,
  };
  triggerDownload(
    JSON.stringify(backup, null, 2),
    `the-little-way-backup-${new Date().toISOString().slice(0, 10)}.json`,
    "application/json;charset=utf-8",
  );
}

/**
 * Parse a backup file. Returns the data payload or throws with a
 * user-readable error. We require the app marker so users can't accidentally
 * import an unrelated JSON and clobber their journal.
 */
export function parseJournalBackup(text: string): JournalData {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("Not a valid JSON file.");
  }
  const b = parsed as Partial<JournalBackup>;
  if (b?.app !== "the-little-way" || b?.version !== 1 || !b?.data) {
    throw new Error("Not a Little Way backup file.");
  }
  const d = b.data;
  if (typeof d.startDate !== "string") {
    throw new Error("Missing or invalid startDate in backup.");
  }
  return {
    notes: d.notes ?? {},
    highlights: d.highlights ?? {},
    favorites: d.favorites ?? {},
    startDate: d.startDate,
  };
}

function triggerDownload(content: string, filename: string, mime: string): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
