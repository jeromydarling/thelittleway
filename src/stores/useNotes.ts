import { create } from "zustand";
import { persist } from "zustand/middleware";

interface NotesState {
  byDay: Record<number, string>;
  setNote: (day: number, text: string) => void;
  clear: (day: number) => void;
  replaceAll: (next: Record<number, string>) => void;
}

export const useNotes = create<NotesState>()(
  persist(
    (set) => ({
      byDay: {},
      setNote: (day, text) =>
        set((s) => {
          const next = { ...s.byDay };
          if (text.trim().length === 0) {
            delete next[day];
          } else {
            next[day] = text;
          }
          return { byDay: next };
        }),
      clear: (day) =>
        set((s) => {
          const next = { ...s.byDay };
          delete next[day];
          return { byDay: next };
        }),
      replaceAll: (next) => set({ byDay: next }),
    }),
    { name: "littleway.notes", version: 1 },
  ),
);
