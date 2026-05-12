import raw from "@data/devotional/passages.json";

export interface GospelPairing {
  ref: string;
  text: string;
}

export interface Passage {
  day: number;
  title: string;
  passage: string;
  citation: string;
  gospel: GospelPairing;
}

export const passages: Passage[] = raw as Passage[];
export const TOTAL_DAYS = 365;

export function getPassage(day: number): Passage {
  const idx = ((day - 1) % TOTAL_DAYS + TOTAL_DAYS) % TOTAL_DAYS;
  return passages[idx];
}
