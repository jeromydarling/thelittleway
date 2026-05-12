import { create } from "zustand";
import { persist } from "zustand/middleware";

interface FavoritesState {
  /** day -> ISO date the user starred it (purely informational) */
  byDay: Record<number, string>;
  toggle: (day: number) => void;
  isFavorite: (day: number) => boolean;
}

export const useFavorites = create<FavoritesState>()(
  persist(
    (set, get) => ({
      byDay: {},
      toggle: (day) =>
        set((s) => {
          const next = { ...s.byDay };
          if (next[day]) delete next[day];
          else next[day] = new Date().toISOString();
          return { byDay: next };
        }),
      isFavorite: (day) => Boolean(get().byDay[day]),
    }),
    { name: "littleway.favorites", version: 1 },
  ),
);
