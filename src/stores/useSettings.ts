import { create } from "zustand";
import { persist } from "zustand/middleware";
import { today } from "@/lib/day";

interface SettingsState {
  startDate: string;
  reminderEnabled: boolean;
  reminderTime: string; // HH:MM 24h
  lastReminderShown: string | null; // YYYY-MM-DD
  theme: "light" | "dark" | "system";
  setReminderEnabled: (v: boolean) => void;
  setReminderTime: (v: string) => void;
  setTheme: (t: "light" | "dark" | "system") => void;
  markReminderShown: (date: string) => void;
  resetProgress: () => void;
}

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      startDate: today(),
      reminderEnabled: false,
      reminderTime: "07:00",
      lastReminderShown: null,
      theme: "system",
      setReminderEnabled: (v) => set({ reminderEnabled: v }),
      setReminderTime: (v) => set({ reminderTime: v }),
      setTheme: (t) => set({ theme: t }),
      markReminderShown: (date) => set({ lastReminderShown: date }),
      resetProgress: () => set({ startDate: today(), lastReminderShown: null }),
    }),
    {
      name: "littleway.settings",
      version: 1,
    },
  ),
);
