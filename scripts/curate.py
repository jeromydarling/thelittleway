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
# Per-section day allocations. With longer (~1000-1800 char) reading
# units the available pool is ~317 distinct passages; some sections
# allocate slightly above their unit count so the year completes — those
# units are repeated once, spaced widely apart. See pick_mercy_weighted.
ALLOCATIONS: dict[str, int] = {
    "Prologue": 8,
    "Chapter I": 20,
    "Chapter II": 22,
    "Chapter III": 18,
    "Chapter IV": 24,
    "Chapter V": 24,
    "Chapter VI": 26,
    "Chapter VII": 18,
    "Chapter VIII": 22,
    "Chapter IX": 26,
    "Chapter X": 24,
    "Chapter XI": 22,
    "Epilogue": 36,
    "Counsels and Reminiscences": 75,
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
            "It is to you, dear Mother, that I am about to confide the story of my soul. "
            "When you asked me to write it, I feared the task might unsettle me, but "
            "since then Our Lord has deigned to make me understand that by simple "
            "obedience I shall please Him best. I begin therefore to sing what must be "
            "my eternal song: “the Mercies of the Lord.” "
            "Before setting about my task I knelt before the statue of Our Lady which "
            "had given my family so many proofs of Our Heavenly Mother’s loving care. "
            "As I knelt I begged of that dear Mother to guide my hand, and thus ensure "
            "that only what was pleasing to her should find place here. "
            "Then opening the Gospels, my eyes fell on these words: “Jesus, going up "
            "into a mountain, called unto Him whom He would Himself.” "
            "They threw a clear light upon the mystery of my vocation and of my entire "
            "life, and above all upon the favours which Our Lord has granted to my "
            "soul. He does not call those who are worthy, but those whom He will. As "
            "St. Paul says: “God will have mercy on whom He will have mercy. So then "
            "it is not of him that willeth, nor of him that runneth, but of God that "
            "showeth mercy.”"
        ),
        "citation": "Story of a Soul — Chapter I",
    },
    25: {
        "title": "I am little — that is why I trust",
        "passage": (
            "It is enough to acknowledge one’s nothingness, and to abandon oneself, "
            "like a child, into the Arms of the Good God. Leaving to great souls and "
            "lofty minds the splendid books I cannot understand, I rejoice to be "
            "little, because only children, and those who are like them, will be "
            "admitted to the Heavenly Banquet. "
            "Fortunately, there are many mansions in my Father’s house, as Jesus has "
            "told us; and that is why I continue to walk in my little way. I am not "
            "disappointed: I hope one day to be received by Our Lord, the Divine "
            "Beggar of love. To attain this end, no great deeds are needed: nothing "
            "but to surrender oneself, like a child reposing in the Arms of its "
            "Father. The works and merits of all the Saints are at my disposal: do "
            "you not think that the Heavenly Father, charmed by my loving confidence, "
            "would refuse me what I ask?"
        ),
        "citation": "Story of a Soul — Counsels and Reminiscences",
    },
    50: {
        "title": "Confidence, and nothing but confidence",
        "passage": (
            "What pleases the Good God in my little soul is to see me love my "
            "littleness and my poverty, and the blind hope that I have in His Mercy. "
            "That is my only treasure. Confidence, and nothing but confidence, must "
            "bring us to Love. "
            "Does not fear lead to Justice? — to that strict Justice which is shown to "
            "the demons, but not to that of which Jesus will give proof to those who "
            "love Him. If you wish to feel nothing, to have no consolation, and yet "
            "to be faithful, what an act of confidence! Even should we have committed "
            "all imaginable crimes, we should always retain the same confidence, for "
            "we feel that such a multitude of offences would be but a drop of water "
            "cast into a flaming furnace."
        ),
        "citation": "Story of a Soul — Counsels and Reminiscences",
    },
    100: {
        "title": "The little way of confidence",
        "passage": (
            "Instead of being discouraged, I concluded that God would not inspire "
            "desires which could not be realised, and that I may aspire to sanctity in "
            "spite of my littleness. For me to become great is impossible. I must "
            "bear with myself and my many imperfections; but I will seek out a means "
            "of getting to Heaven by a little way — very short and very straight, a "
            "little way that is wholly new. "
            "We live in an age of inventions; nowadays the rich need not trouble to "
            "climb the stairs, they have lifts instead. Well, I mean to try and find "
            "a lift by which I may be raised unto God, for I am too tiny to climb the "
            "steep stairway of perfection. I have sought to find in Holy Scripture "
            "some suggestion as to what this lift might be which I so much desired, "
            "and I read these words uttered by the Eternal Wisdom Itself: “Whosoever "
            "is a little one, let him come to Me.” Then I drew near to God, feeling "
            "sure that I had discovered what I sought."
        ),
        "citation": "Story of a Soul — Chapter IX",
    },
    150: {
        "title": "An Oblation to Merciful Love",
        "passage": (
            "O my God, O Most Blessed Trinity, I desire to love Thee and to make Thee "
            "loved — to labour for the glory of Holy Church by saving souls here upon "
            "earth and by delivering those suffering in Purgatory. I desire to fulfill "
            "perfectly Thy Holy Will, and to reach the degree of glory Thou hast "
            "prepared for me in Thy Kingdom. In a word, I wish to be holy, but, "
            "knowing how helpless I am, I beseech Thee, my God, to be Thyself my "
            "holiness. "
            "In order that my life may be one Act of perfect Love, I offer myself as a "
            "Victim of Holocaust to Thy Merciful Love, imploring Thee to consume me "
            "unceasingly, and to allow the floods of infinite tenderness gathered up "
            "in Thee to overflow into my soul, that so I may become a very martyr of "
            "Thy Love, O my God! May this martyrdom, after having prepared me to "
            "appear in Thy Presence, free me from this life at the last, and may my "
            "soul take its flight — without delay — into the eternal embrace of Thy "
            "Merciful Love!"
        ),
        "citation": "Story of a Soul — Chapter XI",
    },
    200: {
        "title": "Even were every crime upon my conscience",
        "passage": (
            "It is not because I have been preserved from mortal sin that I lift up my "
            "heart to God in trust and love. I feel that even had I on my conscience "
            "every crime one could commit, I should lose nothing of my confidence: my "
            "heart broken with sorrow, I would throw myself into the Arms of my "
            "Saviour. "
            "I know that He loves the Prodigal Son, I have heard His words to St. Mary "
            "Magdalen, to the woman taken in adultery, and to the woman of Samaria. "
            "No one could frighten me, for I know what to believe concerning His Mercy "
            "and His Love. And I know that all that multitude of sins would disappear "
            "in an instant, even as a drop of water cast into a flaming furnace. "
            "Dearest Mother, if weak and imperfect souls like mine felt what I feel, "
            "none would despair of reaching the summit of the Mountain of Love, since "
            "Jesus does not ask for great deeds, but only for gratitude and "
            "self-surrender."
        ),
        "citation": "Story of a Soul — Chapter X",
    },
    250: {
        "title": "His Justice clothed with Love",
        "passage": (
            "Yet all souls cannot be alike. It is necessary that they should differ "
            "from one another in order that each Divine Perfection may receive its "
            "special honour. To me, He has given His Infinite Mercy, and it is in "
            "this ineffable mirror that I contemplate his other attributes. Therein "
            "all appear to me radiant with Love. His Justice, even more perhaps than "
            "the rest, seems to me to be clothed with Love. "
            "What joy to think that Our Lord is just, that is to say, that He takes "
            "our weakness into account, that He knows perfectly the frailty of our "
            "nature! Of what, then, need I be afraid? Will not the God of Infinite "
            "Justice, Who deigns so lovingly to pardon the sins of the Prodigal Son, "
            "be also just to me who am always with Him?"
        ),
        "citation": "Story of a Soul — Chapter VIII",
    },
    300: {
        "title": "Thine arms, O Jesus, are the lift",
        "passage": (
            "Never have I been consoled by words more tender and sweet. Thine Arms, "
            "then, O Jesus, are the lift which must raise me up even unto Heaven. To "
            "get there I need not grow; on the contrary, I must remain little, I must "
            "become still less. O my God, Thou hast gone beyond my expectation, and "
            "I will sing Thy mercies. Thou hast taught me, O Lord, from my youth, "
            "and till now I have declared Thy wonderful works, and thus unto old age "
            "and grey hairs. "
            "What will this old age be for me? It seems to me that it could as well be "
            "now as later: two thousand years are no more in the Eyes of the Lord than "
            "twenty years — than a single day! To please Jesus is what I really value "
            "and desire above all things."
        ),
        "citation": "Story of a Soul — Chapter IX",
    },
    333: {
        "title": "Has not Thy Merciful Love also need of victims?",
        "passage": (
            "In the year 1895 I received the grace to understand, more than ever, how "
            "much Jesus desires to be loved. Thinking one day of those who offer "
            "themselves as victims to the Justice of God, in order to turn aside the "
            "punishment reserved for sinners by taking it upon themselves, I felt this "
            "offering to be noble and generous, but was very far from feeling myself "
            "drawn to make it. "
            "“O my Divine Master,” I cried from the bottom of my heart, “shall Thy "
            "Justice alone receive victims of holocaust? Has not Thy Merciful Love "
            "also need thereof? On all sides it is ignored, rejected — the hearts on "
            "which Thou wouldst lavish it turn to creatures, there to seek their "
            "happiness in the miserable satisfaction of a moment, instead of casting "
            "themselves into Thine Arms, into the unfathomable furnace of Thine "
            "Infinite Love. If Thy Justice — which is of earth — must needs be "
            "satisfied, how much more must Thy Merciful Love desire to inflame souls, "
            "since Thy mercy reacheth even to the Heavens?”"
        ),
        "citation": "Story of a Soul — Chapter VIII",
    },
    365: {
        "title": "I will spend my heaven doing good upon earth",
        "passage": (
            "I feel that my mission is soon to begin — to make others love God as I "
            "love Him, to teach souls my little way. I will spend my heaven in doing "
            "good upon earth. This is not impossible, since the Angels, while enjoying "
            "the Beatific Vision, watch over us. I cannot enjoy any rest till the end "
            "of the world. But when the Angel shall have said ‘Time is no more!’ "
            "then I shall rest, then I shall be able to rejoice, because the number "
            "of the elect will be complete. "
            "What attracts me to the home of the Father is the call of Our Lord, the "
            "hope of loving Him as I have so much desired, and the thought that I "
            "shall be able to make Him loved by a great multitude who will bless Him "
            "for ever."
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

# Target reading-unit length (in characters). Roughly 90-300 words —
# a substantial daily passage of 1-4 paragraphs, well above the
# original "stray sentence" failure mode but short enough that 365
# distinct units fit inside the available source material.
UNIT_MIN_CHARS = 450
UNIT_TARGET_CHARS = 1000
UNIT_MAX_CHARS = 1900


def keep_paragraph(p: str) -> bool:
    """Permissive filter applied before paragraphs are merged into units.
    Drops only obvious non-content: empty, section headers, all-caps lines,
    bare footnotes, editorial asides."""
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


def merge_into_units(paragraphs: list[str]) -> list[str]:
    """Group consecutive paragraphs into reading units around the target
    length. A new unit starts when the current accumulator reaches
    UNIT_MIN_CHARS; we keep adding while the next paragraph still fits
    under UNIT_MAX_CHARS, otherwise we close the unit. Paragraphs longer
    than UNIT_MAX_CHARS on their own become their own unit."""
    units: list[str] = []
    buf: list[str] = []
    buf_len = 0

    def flush() -> None:
        nonlocal buf, buf_len
        if buf:
            units.append(" ".join(buf).strip())
            buf = []
            buf_len = 0

    for p in paragraphs:
        if not keep_paragraph(p):
            # Treat skipped paragraphs as a soft break so adjacent kept
            # ones still join, but very long gaps don't accumulate.
            if buf_len >= UNIT_MIN_CHARS:
                flush()
            continue
        if buf_len >= UNIT_MIN_CHARS and buf_len + 1 + len(p) > UNIT_MAX_CHARS:
            flush()
        # If a single paragraph is gigantic, emit it on its own.
        if not buf and len(p) > UNIT_MAX_CHARS:
            units.append(p)
            continue
        if buf:
            buf.append(p)
            buf_len += 1 + len(p)
        else:
            buf.append(p)
            buf_len = len(p)
        if buf_len >= UNIT_TARGET_CHARS:
            flush()
    flush()
    return units


def is_devotional(unit: str) -> bool:
    """Validation pass applied AFTER paragraphs are merged into units."""
    if len(unit) < UNIT_MIN_CHARS or len(unit) > UNIT_MAX_CHARS + 500:
        return False
    if unit[-1] not in ".!?”’":
        return False
    # Must contain at least two sentences so it reads as a complete passage
    if len(re.findall(r"[.!?][”’]?\s+[A-Z]", unit)) < 2:
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
    order.

    Two regimes:
      - n <= len(items): score, keep the top ~2n, sample evenly without
        repeats. Mercy-rich passages win.
      - n > len(items): walk all items in narrative order, then loop —
        each unit appears ceil(n/len) times, spaced len positions apart.
        This is intentional repetition: a devotional re-encountered
        months later is read with new ears.
    """
    if n <= 0 or not items:
        return []

    scored = [(i, mercy_score(p), p) for i, p in enumerate(items)]

    if n <= len(items):
        pool_size = min(len(items), max(n * 2, n + 4))
        scored.sort(key=lambda t: (-t[1], t[0]))
        pool = scored[:pool_size]
        pool.sort(key=lambda t: t[0])  # back to narrative order

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

    # n > len(items): controlled repetition
    scored.sort(key=lambda t: t[0])  # narrative order
    out = []
    for k in range(n):
        orig_idx, _score, passage = scored[k % len(scored)]
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
        # Merge adjacent paragraphs into substantial reading units, then
        # validate each unit as a coherent passage.
        units = merge_into_units(paras)
        sections[label] = [u for u in units if is_devotional(u)]
        if not sections[label]:
            raise RuntimeError(f"No devotional units found in {label}")

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
