/**
 * Small liturgical-day hint: a one-line note shown under the day badge on
 * the Today page when today is a Sunday or a feast of St Thérèse.
 *
 * Feast dates honoured here:
 *   - Oct 1 — Feast of St Thérèse of the Child Jesus (current calendar)
 *   - Oct 3 — Traditional feast (pre-1969 calendar)
 *   - Aug 19 — Patronage of missions (USA)
 *   - Sep 30 — Anniversary of her death (1897)
 *   - Apr 28 — Her birthday (1873)
 *   - Apr 8 — Her First Communion (1884)
 */

interface Feast {
  month: number; // 1-12
  day: number;
  label: string;
}

const FEASTS: Feast[] = [
  { month: 10, day: 1, label: "Feast of St Thérèse of the Child Jesus" },
  { month: 10, day: 3, label: "Traditional feast of St Thérèse" },
  { month: 9, day: 30, label: "Anniversary of her death (1897)" },
  { month: 8, day: 19, label: "Patronage of the missions" },
  { month: 4, day: 28, label: "Her birthday (1873)" },
  { month: 1, day: 2, label: "Her baptism (1873)" },
  { month: 12, day: 25, label: "The Nativity of the Lord" },
  { month: 1, day: 1, label: "Solemnity of Mary, Mother of God" },
];

export interface LiturgicalHint {
  label: string;
  kind: "feast" | "sunday";
}

export function liturgicalHint(date: Date = new Date()): LiturgicalHint | null {
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const feast = FEASTS.find((f) => f.month === month && f.day === day);
  if (feast) return { label: feast.label, kind: "feast" };
  if (date.getDay() === 0) return { label: "Sunday", kind: "sunday" };
  return null;
}
