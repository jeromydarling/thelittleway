import { TOTAL_DAYS } from "./passages";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** ISO date string `YYYY-MM-DD` in the user's local timezone. */
export function today(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function parseLocalDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/**
 * Given the user's start date and today's date, return the current day
 * number (1..365), wrapping after 365 so the user can keep reading.
 */
export function currentDay(startDate: string, now: string = today()): number {
  const start = parseLocalDate(startDate).getTime();
  const today_ = parseLocalDate(now).getTime();
  const diff = Math.floor((today_ - start) / MS_PER_DAY);
  if (diff < 0) return 1;
  return (diff % TOTAL_DAYS) + 1;
}
