import { useEffect } from "react";
import { useSettings } from "@/stores/useSettings";
import { currentDay, today } from "@/lib/day";
import { getPassage } from "@/lib/passages";
import { scheduleNext, showReminder } from "@/lib/notifications";

/**
 * Schedules the next daily reminder while the app is open. When it fires we
 * show a notification and mark today as completed so we don't fire again.
 * Re-runs whenever the relevant settings change.
 */
export function useDailyReminder() {
  const enabled = useSettings((s) => s.reminderEnabled);
  const time = useSettings((s) => s.reminderTime);
  const startDate = useSettings((s) => s.startDate);
  const lastShown = useSettings((s) => s.lastReminderShown);
  const markShown = useSettings((s) => s.markReminderShown);

  useEffect(() => {
    if (!enabled) return;
    const fire = () => {
      const todayDate = today();
      const day = currentDay(startDate, todayDate);
      const p = getPassage(day);
      showReminder({
        title: `Day ${day} · ${p.title}`,
        body: p.passage.slice(0, 140) + (p.passage.length > 140 ? "…" : ""),
        url: "/",
      }).catch(() => {});
      markShown(todayDate);
    };
    return scheduleNext({
      enabled,
      time,
      lastShown,
      todayDate: today(),
      onFire: fire,
    });
  }, [enabled, time, startDate, lastShown, markShown]);
}
