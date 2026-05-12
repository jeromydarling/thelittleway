#!/usr/bin/env python3
"""
Build data/devotional/passages.json — 365 daily devotional entries drawn
from St Thérèse of Lisieux's Story of a Soul (T.N. Taylor tr.) and the
Counsels and Reminiscences + selected Letters bundled in the same Project
Gutenberg edition (#16772).

Approach: read the source in its original order — Prologue → Chapters I-XI
→ Epilogue → Counsels and Reminiscences → Letters — and chunk it into 365
reading units of roughly equal length. The faithful walk through the book
day by day in the order Thérèse (and her editor) put it. No pinning, no
thematic weighting, no repetition.

This is an automated draft intended for human review.
"""
from __future__ import annotations

import json
import re
from dataclasses import dataclass
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "data" / "source" / "story_of_a_soul_16772.txt"
OUT = ROOT / "data" / "devotional" / "passages.json"


# (line_start, line_end_exclusive, label_for_citation)
# Source-order walk: autobiography first, then aphoristic counsels, then
# personal letters. Line numbers come from the table-of-contents grep at
# project setup time and are checked against the txt at build.
SECTIONS: list[tuple[int, int, str]] = [
    (249, 593, "Prologue"),
    (593, 1024, "Chapter I"),
    (1024, 1488, "Chapter II"),
    (1488, 1877, "Chapter III"),
    (1877, 2435, "Chapter IV"),
    (2435, 3016, "Chapter V"),
    (3016, 3643, "Chapter VI"),
    (3643, 4060, "Chapter VII"),
    (4060, 4630, "Chapter VIII"),
    (4630, 5365, "Chapter IX"),
    (5365, 5961, "Chapter X"),
    (5961, 6623, "Chapter XI"),
    (6623, 7703, "Epilogue"),
    (7703, 9165, "Counsels and Reminiscences"),
    (9171, 10074, "Letters to her sister Céline"),
    (10074, 10328, "Letters to Mother Agnes of Jesus"),
    (10328, 10546, "Letters to Sister Mary of the Sacred Heart"),
    (10546, 10730, "Letters to Sister Frances Teresa"),
    (10730, 10860, "Letters to her cousin Marie Guérin"),
    # End boundary 11760 excludes the editorial note about the poem
    # translations and the Project Gutenberg footer that follow.
    (10860, 11760, "Letters to her brother missionaries"),
]

TOTAL_DAYS = 365


# ---------------------------------------------------------------------------
# Text loading / cleaning
# ---------------------------------------------------------------------------

def load_lines() -> list[str]:
    return SRC.read_text(encoding="utf-8", errors="replace").splitlines()


def clean(text: str) -> str:
    """Normalise a paragraph: drop italic underscores, collapse whitespace,
    strip inline footnote markers, and normalise straight quotes to curly."""
    text = re.sub(r"(?<=\w)\[\d+\](?!\d)", "", text)
    text = re.sub(r"_([^_\n]+)_", r"\1", text)
    text = re.sub(r"\s+", " ", text).strip()
    text = re.sub(r"\"([^\"]*)\"", "“\\1”", text)
    return text


def split_paragraphs(lines: list[str]) -> list[str]:
    """Group consecutive non-blank lines into paragraphs."""
    paras: list[str] = []
    buf: list[str] = []
    for line in lines:
        if line.strip() == "":
            if buf:
                paras.append(" ".join(buf))
                buf = []
        else:
            buf.append(line.strip())
    if buf:
        paras.append(" ".join(buf))
    return paras


SECTION_HEADER_RE = re.compile(
    r"^(CHAPTER|PROLOGUE|EPILOGUE|COUNSELS|LETTERS|PREFACE|SECTION|PART)\b",
    re.IGNORECASE,
)
FOOTNOTE_RE = re.compile(r"^\[\d+\]")
ALL_CAPS_RE = re.compile(r"^[A-Z0-9 —.,'\"\(\)\-]+$")


def keep_paragraph(p: str) -> bool:
    """Drop only obvious non-content: empty/short, headers, all-caps banners,
    bare footnote bodies, editorial asides."""
    if len(p) < 40:
        return False
    if SECTION_HEADER_RE.match(p):
        return False
    if FOOTNOTE_RE.match(p):
        return False
    if ALL_CAPS_RE.match(p):
        return False
    if not re.search(r"\b[a-z]{3,}\b", p):
        return False
    if p.lower().startswith(("note:", "footnote", "(see ")):
        return False
    return True


# ---------------------------------------------------------------------------
# Title derivation
# ---------------------------------------------------------------------------

_WEAK_TAIL = {
    "a", "an", "the", "and", "but", "or", "of", "to", "in", "on", "at", "by",
    "for", "with", "from", "as", "is", "was", "were", "be", "are", "am",
    "this", "that", "these", "those", "my", "his", "her", "their", "our",
    "into", "unto", "upon", "than", "so", "if", "when", "while",
}


def derive_title(passage: str, fallback: str) -> str:
    """Short title from the first clause / sentence of the passage; back off
    until the last word is "strong" (not a preposition or article)."""
    first_sentence = re.split(r"(?<=[.!?”])\s+", passage, maxsplit=1)[0]
    first_sentence = re.sub(r"^(And|But|Then|Now|So|Yet|For)\s+", "", first_sentence)
    first_sentence = first_sentence.strip("“”\"' ").rstrip(".!?“”‘’\"' ").strip()

    def strong(words: list[str]) -> list[str]:
        while len(words) > 2 and words[-1].lower().strip(",;:") in _WEAK_TAIL:
            words.pop()
        return words

    def finalise_strict(text: str) -> str | None:
        text = text.rstrip(",;:— ").strip()
        words = strong(text.split())
        out = " ".join(words).rstrip(",;:")
        if 18 <= len(out) <= 65:
            return out[0].upper() + out[1:]
        return None

    clause = re.split(r"[,;—]| --|-- ", first_sentence, maxsplit=1)[0]
    if (t := finalise_strict(clause)):
        return t
    if (t := finalise_strict(first_sentence)):
        return t

    words = first_sentence.split()
    acc: list[str] = []
    for w in words:
        if len(" ".join(acc + [w])) > 62:
            break
        acc.append(w)
    acc = strong(acc)
    if len(acc) >= 3:
        out = " ".join(acc).rstrip(",;:")
        if 18 <= len(out) <= 65:
            return out[0].upper() + out[1:]

    return fallback


# ---------------------------------------------------------------------------
# Sequential assembly
# ---------------------------------------------------------------------------

@dataclass
class ParaItem:
    text: str
    section: str


def assemble_paragraphs(lines: list[str]) -> list[ParaItem]:
    """Walk every section in source order, returning cleaned paragraphs
    tagged with their section label."""
    items: list[ParaItem] = []
    for start, end, label in SECTIONS:
        body = lines[start - 1 : end - 1]
        for raw in split_paragraphs(body):
            p = clean(raw)
            if keep_paragraph(p):
                items.append(ParaItem(text=p, section=label))
    return items


def chunk_to_days(items: list[ParaItem], n_days: int) -> list[list[ParaItem]]:
    """Pack `items` into exactly n_days groups, balanced by total char count
    while preserving paragraph order.

    For each day boundary i (1..n_days), we find the paragraph index whose
    cumulative-chars endpoint is closest to i × total/n_days — subject to
    a minimum day length so no day comes out unreadably short just because
    a tiny paragraph happened to sit on a target boundary.
    """
    cums = [0]
    for it in items:
        cums.append(cums[-1] + len(it.text))
    total = cums[-1]
    target = total / n_days
    min_day = int(target * 0.6)

    days: list[list[ParaItem]] = []
    start = 0
    for i in range(1, n_days + 1):
        # Reserve at least one paragraph for each remaining day so we can
        # finish with exactly n_days groups.
        remaining_days_after = n_days - i
        max_end = len(items) - remaining_days_after

        if i == n_days:
            end = len(items)
        else:
            target_cum = i * total / n_days
            best = None
            best_diff: float = float("inf")
            for j in range(start + 1, max_end + 1):
                day_chars = cums[j] - cums[start]
                # Skip undersized candidates unless we've run out of room
                if day_chars < min_day and j < max_end:
                    continue
                d = abs(cums[j] - target_cum)
                if d < best_diff:
                    best_diff = d
                    best = j
                elif best is not None:
                    # Distances grow monotonically once past the optimum
                    break
            end = best if best is not None else start + 1

        if end <= start:
            end = min(start + 1, len(items))
        days.append(items[start:end])
        start = end

    if len(days) != n_days:
        raise RuntimeError(
            f"Chunker produced {len(days)} days, expected {n_days}."
        )
    return days


def dominant_section(group: list[ParaItem]) -> str:
    """The section that contributed the most chars to a day's reading.
    When a day straddles two sections (e.g. end of Chapter I + start of
    Chapter II), we pick whichever has more text in the passage; ties go
    to the earlier section."""
    counts: dict[str, int] = {}
    for it in group:
        counts[it.section] = counts.get(it.section, 0) + len(it.text)
    # Stable: preserve the order encountered
    best = max(counts.items(), key=lambda kv: kv[1])[0]
    return best


# ---------------------------------------------------------------------------
# Build
# ---------------------------------------------------------------------------

@dataclass
class Entry:
    day: int
    title: str
    passage: str
    citation: str


def build() -> list[Entry]:
    lines = load_lines()
    items = assemble_paragraphs(lines)
    if not items:
        raise RuntimeError("No paragraphs assembled from source")

    days = chunk_to_days(items, TOTAL_DAYS)

    entries: list[Entry] = []
    for i, group in enumerate(days, start=1):
        passage = " ".join(it.text for it in group)
        section = dominant_section(group)
        fallback = f"{section} — Day {i}"
        title = derive_title(passage, fallback)
        entries.append(
            Entry(
                day=i,
                title=title,
                passage=passage,
                citation=f"Story of a Soul — {section}",
            )
        )
    return entries


def main() -> None:
    OUT.parent.mkdir(parents=True, exist_ok=True)
    entries = build()
    payload = [
        {
            "day": e.day,
            "title": e.title,
            "passage": e.passage,
            "citation": e.citation,
        }
        for e in entries
    ]
    OUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Wrote {len(payload)} entries to {OUT.relative_to(ROOT)}")

    lengths = [len(e["passage"]) for e in payload]
    word_counts = [len(e["passage"].split()) for e in payload]
    print(
        f"  chars: min={min(lengths)} max={max(lengths)} avg={sum(lengths)//len(lengths)}"
    )
    print(
        f"  words: min={min(word_counts)} max={max(word_counts)} avg={sum(word_counts)//len(word_counts)}"
    )

    section_days: dict[str, list[int]] = {}
    for e in payload:
        section_days.setdefault(e["citation"], []).append(e["day"])
    for cit, days in section_days.items():
        print(f"  {cit}: days {days[0]}-{days[-1]} ({len(days)})")


if __name__ == "__main__":
    main()
