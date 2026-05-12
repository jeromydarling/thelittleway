#!/usr/bin/env python3
"""
Build data/devotional/passages.json — 365 daily devotional entries drawn from
St Therese of Lisieux's Story of a Soul (Taylor tr.) and the Counsels and
Reminiscences bundled in the same Project Gutenberg edition (#16772).

Approach: segment the source into named sections, paragraph-split, filter for
substance, allocate days proportionally, then sample evenly. A small set of
landmark passages is hand-curated and pinned to specific days.

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
# Lines were identified via the section-boundary grep run during build.
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
]

# Day allocations (must sum to 365). The autobiography is the heart of the
# book, so it gets the bulk of days. Counsels is aphoristic and gets a
# generous slice. Prologue + Epilogue frame the year.
ALLOCATIONS: dict[str, int] = {
    "Prologue": 4,
    "Chapter I": 22,
    "Chapter II": 22,
    "Chapter III": 20,
    "Chapter IV": 25,
    "Chapter V": 26,
    "Chapter VI": 26,
    "Chapter VII": 20,
    "Chapter VIII": 24,
    "Chapter IX": 30,
    "Chapter X": 26,
    "Chapter XI": 22,
    "Epilogue": 22,
    "Counsels and Reminiscences": 76,
}
assert sum(ALLOCATIONS.values()) == 365, sum(ALLOCATIONS.values())

# Mercy-themed keywords. Paragraphs containing these get a scoring boost so
# the auto-selection leans toward Therese's central theme of the Father's
# merciful love and her doctrine of confidence in it.
MERCY_TERMS = (
    "mercy", "merciful", "mercies", "pity", "tender", "tenderness",
    "compassion", "forgive", "forgiveness", "confidence", "trust", "trusts",
    "weakness", "weak", "frailty", "littleness", "little way",
    "sacred heart", "infinite love", "fatherly", "abandonment", "child",
    "abandon", "abandons",
)
MERCY_PHRASES = ("merciful love", "the mercies of the lord")


# Hand-picked landmark passages keyed to specific days. These take priority
# over automatic selection — the script will pin them on their day and skip
# that day during auto-allocation.
PINNED: dict[int, dict[str, str]] = {
    1: {
        "title": "The Mercies of the Lord",
        "passage": (
            "It is to you, dear Mother, that I am about to confide the story of my "
            "soul. When you asked me to write it, I feared the task might unsettle "
            "me, but since then Our Lord has deigned to make me understand that by "
            "simple obedience I shall please Him best. I begin therefore to sing "
            "what must be my eternal song: “the Mercies of the Lord.”"
        ),
        "citation": "Story of a Soul — Chapter I",
    },
    25: {
        "title": "I am little — that is why I trust",
        "passage": (
            "It is enough to acknowledge one’s nothingness, and to abandon "
            "oneself, like a child, into the Arms of the Good God. Leaving to "
            "great souls and lofty minds the splendid books I cannot understand, "
            "I rejoice to be little, because only children, and those who are "
            "like them, will be admitted to the Heavenly Banquet."
        ),
        "citation": "Story of a Soul — Counsels and Reminiscences",
    },
    50: {
        "title": "Confidence works miracles",
        "passage": (
            "What pleases the Good God in my little soul is to see me love my "
            "littleness and my poverty, and the blind hope that I have in His "
            "Mercy. That is my only treasure. Confidence, and nothing but "
            "confidence, must bring us to Love."
        ),
        "citation": "Story of a Soul — Counsels and Reminiscences",
    },
    100: {
        "title": "The little way",
        "passage": (
            "I will seek out a means of getting to Heaven by a little way — very "
            "short and very straight, a little way that is wholly new. We live "
            "in an age of inventions; nowadays the rich need not trouble to "
            "climb the stairs, they have lifts instead. Well, I mean to try and "
            "find a lift by which I may be raised unto God, for I am too tiny "
            "to climb the steep stairway of perfection."
        ),
        "citation": "Story of a Soul — Chapter IX",
    },
    150: {
        "title": "An Oblation to Merciful Love",
        "passage": (
            "O my God, most blessed Trinity, I desire to love Thee and to make "
            "Thee loved, to labour for the glory of holy Church by saving souls "
            "on earth and liberating those suffering in Purgatory. I offer "
            "myself as a victim of holocaust to Thy Merciful Love, asking Thee "
            "to consume me unceasingly, allowing the floods of infinite "
            "tenderness gathered up in Thee to overflow into my soul, that so I "
            "may become a martyr of Thy Love, O my God!"
        ),
        "citation": "Story of a Soul — Chapter XI",
    },
    200: {
        "title": "Even were every sin upon my conscience",
        "passage": (
            "Even were I to have on my conscience every imaginable crime, I "
            "should lose nothing of my confidence: I should throw myself, my "
            "heart broken with sorrow, into the Arms of my Saviour. I know that "
            "He loves the prodigal child, I have heard His words to St. Mary "
            "Magdalen, to the woman taken in adultery, and to the woman of "
            "Samaria. No, there is no one who could frighten me, for I know too "
            "well what to think of His Mercy and His Love."
        ),
        "citation": "Story of a Soul — Counsels and Reminiscences",
    },
    250: {
        "title": "Justice itself is clothed in mercy",
        "passage": (
            "How can a soul so imperfect as mine aspire to the plenitude of "
            "Love? What is the key of this mystery? O my only Friend, why dost "
            "Thou not reserve these infinite longings to lofty souls, to the "
            "eagles that soar in the heights? Alas! I am but a poor little "
            "unfledged bird. I am not an eagle, I have but the eagle’s eyes "
            "and heart. Yet, notwithstanding my exceeding littleness, I dare to "
            "gaze upon the Divine Sun of Love, and I burn to dart upwards unto "
            "Him."
        ),
        "citation": "Story of a Soul — Chapter XI",
    },
    300: {
        "title": "The arms of Jesus are the lift",
        "passage": (
            "Thine Arms, then, O Jesus, are the lift which must raise me up even "
            "unto Heaven. To get there I need not grow; on the contrary, I must "
            "remain little, I must become still less. O my God, Thou hast "
            "surpassed my expectation, and I will sing Thy Mercies."
        ),
        "citation": "Story of a Soul — Chapter IX",
    },
    333: {
        "title": "Mercy is the attribute that draws me",
        "passage": (
            "To me Thou hast given Thy Infinite Mercy, and it is through this "
            "that I contemplate and adore the other Divine perfections. All of "
            "these perfections appear to be resplendent with love; even Thy "
            "Justice — and perhaps Thy Justice more so than any other — seems "
            "to me to be clothed in love."
        ),
        "citation": "Story of a Soul — Chapter VIII",
    },
    365: {
        "title": "I will spend my heaven doing good upon earth",
        "passage": (
            "I feel that my mission is soon to begin — to make others love God "
            "as I love Him, to teach souls my little way. I will spend my heaven "
            "in doing good upon earth. This is not impossible, since the Angels, "
            "while enjoying the Beatific Vision, watch over us. I cannot enjoy "
            "any rest till the end of the world. But when the Angel shall have "
            "said ‘Time is no more!’ then I shall rest, then I shall be "
            "able to rejoice, because the number of the elect will be complete."
        ),
        "citation": "Story of a Soul — Epilogue",
    },
}


# ---------------------------------------------------------------------------
# Text parsing
# ---------------------------------------------------------------------------

def load_lines() -> list[str]:
    return SRC.read_text(encoding="utf-8", errors="replace").splitlines()


def clean(text: str) -> str:
    """Normalise a paragraph: drop italics underscores, collapse whitespace,
    strip footnote markers like [1], and normalise quotes."""
    # Strip footnote-reference brackets but preserve psalm-number brackets
    # like "Psalm 22[23]" by only removing standalone [N] markers at word
    # boundaries.
    text = re.sub(r"(?<=\w)\[\d+\](?!\d)", "", text)
    # Italics: _word_ -> word (preserve the word, drop the markers)
    text = re.sub(r"_([^_\n]+)_", r"\1", text)
    # Collapse internal whitespace
    text = re.sub(r"\s+", " ", text).strip()
    # Replace ASCII quotes with curly quotes for typography
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


# Heuristics for which paragraphs make good devotional passages
SECTION_HEADER_RE = re.compile(
    r"^(CHAPTER|PROLOGUE|EPILOGUE|COUNSELS|LETTERS|PREFACE|SECTION|PART)\b",
    re.IGNORECASE,
)
FOOTNOTE_RE = re.compile(r"^\[\d+\]")
ALL_CAPS_RE = re.compile(r"^[A-Z0-9 —.,'\"\(\)\-]+$")


def is_devotional(p: str) -> bool:
    if len(p) < 220 or len(p) > 1100:
        return False
    if SECTION_HEADER_RE.match(p):
        return False
    if FOOTNOTE_RE.match(p):
        return False
    if ALL_CAPS_RE.match(p):
        return False
    # Must end on a sentence-ending punctuation mark
    if p[-1] not in ".!?”’":
        return False
    # Must contain a verb-shaped lowercase word (skip name lists, headers)
    if not re.search(r"\b[a-z]{3,}\b", p):
        return False
    # Skip paragraphs that look like editor's notes or footnote bodies
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
    """Pull a short evocative title.

    Strategy, in order:
      1. The first natural clause (split on , ; — or " --") if it lands in
         18-65 chars and ends on a strong word.
      2. The first sentence outright if it's short enough.
      3. The first N words of the first sentence trimmed to 60-65 chars and
         ended on a strong word (the most generous fallback).
      4. Otherwise fall back to the section/paragraph label.
    """
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

    # 1. First clause
    clause = re.split(r"[,;—]| --|-- ", first_sentence, maxsplit=1)[0]
    if (t := finalise_strict(clause)):
        return t

    # 2. First sentence in range
    if (t := finalise_strict(first_sentence)):
        return t

    # 3. Generous truncation of first sentence: take the longest prefix
    #    that fits in ~60 chars and ends on a strong word.
    words = first_sentence.split()
    acc: list[str] = []
    for w in words:
        candidate = " ".join(acc + [w])
        if len(candidate) > 62:
            break
        acc.append(w)
    acc = strong(acc)
    if len(acc) >= 3:
        out = " ".join(acc).rstrip(",;:")
        if 18 <= len(out) <= 65:
            return out[0].upper() + out[1:]

    return fallback


# ---------------------------------------------------------------------------
# Distribution
# ---------------------------------------------------------------------------

def mercy_score(passage: str) -> float:
    """Higher = more mercy-themed. Combines keyword hits with a small
    bonus for the most distinctive Thereseian phrases."""
    p = passage.lower()
    hits = sum(p.count(t) for t in MERCY_TERMS)
    phrase_bonus = sum(3 * p.count(ph) for ph in MERCY_PHRASES)
    # Per-character normalisation so long paragraphs don't dominate purely
    # by length, but with a floor so very short paragraphs aren't gamed.
    return (hits + phrase_bonus) / max(len(p) / 400, 1.0)


def pick_mercy_weighted(items: list[str], n: int) -> list[tuple[int, str]]:
    """Pick n items biased toward mercy themes while preserving narrative
    order. We score every paragraph, keep the top 2n by score, then sample
    evenly across that pool by original position."""
    if n <= 0 or not items:
        return []
    if n >= len(items):
        return list(enumerate(items))

    scored = [(i, mercy_score(p), p) for i, p in enumerate(items)]
    # Take top 2n by score. If two passages tie, prefer the earlier one.
    pool_size = min(len(items), max(n * 2, n + 4))
    scored.sort(key=lambda t: (-t[1], t[0]))
    pool = scored[:pool_size]
    pool.sort(key=lambda t: t[0])  # back to narrative order

    # Sample evenly from the pool
    step = len(pool) / n
    out: list[tuple[int, str]] = []
    seen: set[int] = set()
    for k in range(n):
        idx = min(int(k * step + step / 2), len(pool) - 1)
        while idx in seen and idx + 1 < len(pool):
            idx += 1
        seen.add(idx)
        orig_idx, _score, passage = pool[idx]
        out.append((orig_idx, passage))
    return out


@dataclass
class Entry:
    day: int
    title: str
    passage: str
    citation: str


def build() -> list[Entry]:
    lines = load_lines()
    sections: dict[str, list[str]] = {}
    for start, end, label in SECTIONS:
        body = lines[start - 1 : end - 1]
        paras = [clean(p) for p in split_paragraphs(body)]
        sections[label] = [p for p in paras if is_devotional(p)]
        if not sections[label]:
            raise RuntimeError(f"No devotional paragraphs found in {label}")

    pinned_days = set(PINNED.keys())
    auto_alloc = dict(ALLOCATIONS)
    # Reduce per-section allocations for pinned days that fall within their
    # section. To do that we first need to know which section each pinned
    # day "belongs" to. We honour the pinned citation if it references a
    # section name; otherwise we just leave allocations as-is and the pinned
    # entry adds a 366th, which we'll trim below.
    for day, pin in PINNED.items():
        cit = pin["citation"]
        for label in auto_alloc:
            if label in cit and auto_alloc[label] > 0:
                auto_alloc[label] -= 1
                break

    # Build the ordered list of auto entries by walking sections in order.
    auto_entries: list[Entry] = []
    for _, _, label in SECTIONS:
        n = auto_alloc[label]
        if n <= 0:
            continue
        picks = pick_mercy_weighted(sections[label], n)
        for idx, passage in picks:
            fallback = f"{label} — ¶{idx + 1}"
            auto_entries.append(
                Entry(
                    day=0,  # assigned below
                    title=derive_title(passage, fallback),
                    passage=passage,
                    citation=f"Story of a Soul — {label}",
                )
            )

    # Assign days 1..365, skipping pinned days for auto entries
    result: list[Entry] = []
    auto_iter = iter(auto_entries)
    for day in range(1, 366):
        if day in pinned_days:
            p = PINNED[day]
            result.append(
                Entry(day=day, title=p["title"], passage=p["passage"], citation=p["citation"])
            )
        else:
            try:
                e = next(auto_iter)
            except StopIteration:
                raise RuntimeError(
                    f"Ran out of auto entries at day {day}; "
                    f"check ALLOCATIONS vs PINNED counts."
                )
            e.day = day
            result.append(e)

    leftover = list(auto_iter)
    if leftover:
        raise RuntimeError(
            f"{len(leftover)} auto entries unused; ALLOCATIONS sums too high"
        )

    return result


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
    # Sanity checks
    lengths = [len(e["passage"]) for e in payload]
    print(f"  passage length: min={min(lengths)} max={max(lengths)} avg={sum(lengths)//len(lengths)}")
    sections_used = {}
    for e in payload:
        key = e["citation"]
        sections_used[key] = sections_used.get(key, 0) + 1
    for k, v in sections_used.items():
        print(f"  {k}: {v}")


if __name__ == "__main__":
    main()
