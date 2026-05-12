/**
 * Best-effort daily reminders. Browsers without persistent background sync
 * can only fire notifications while the page is open or while the SW is
 * activated. We use the Notifications API directly when granted, and rely on
 * the service worker to render the notification so it shows even if the tab
 * is in the background.
 */
export type PermissionState = "default" | "granted" | "denied" | "unsupported";

export function permissionState(): PermissionState {
  if (typeof Notification === "undefined") return "unsupported";
  return Notification.permission as PermissionState;
}

export async function requestPermission(): Promise<PermissionState> {
  if (typeof Notification === "undefined") return "unsupported";
  try {
    const result = await Notification.requestPermission();
    return result as PermissionState;
  } catch {
    return "denied";
  }
}

interface ShowOpts {
  title: string;
  body: string;
  url?: string;
}

export async function showReminder(opts: ShowOpts): Promise<void> {
  if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
  const data = { url: opts.url ?? "/" };
  // Prefer the service worker so the OS shows it even when the tab is hidden.
  if ("serviceWorker" in navigator) {
    const reg = await navigator.serviceWorker.getRegistration();
    if (reg) {
      await reg.showNotification(opts.title, {
        body: opts.body,
        icon: "/icon-192.png",
        badge: "/icon-192.png",
        tag: "littleway-daily",
        data,
      });
      return;
    }
  }
  new Notification(opts.title, { body: opts.body, icon: "/icon-192.png" });
}

interface ScheduleArgs {
  enabled: boolean;
  /** "HH:MM" in 24h local time */
  time: string;
  lastShown: string | null;
  /** YYYY-MM-DD */
  todayDate: string;
  onFire: () => void;
}

/**
 * Schedules a single setTimeout for the next firing of `time`. Caller is
 * responsible for re-scheduling after firing or when settings change. Returns
 * a cleanup fn that clears the timer.
 *
 * If the scheduled time for today has already passed AND no reminder has
 * been shown today, we fire immediately so the user still gets today's
 * reminder (mirroring how a "missed alarm" should announce itself).
 */
export function scheduleNext({
  enabled,
  time,
  lastShown,
  todayDate,
  onFire,
}: ScheduleArgs): () => void {
  if (!enabled) return () => {};

  const [hh, mm] = time.split(":").map(Number);
  if (Number.isNaN(hh) || Number.isNaN(mm)) return () => {};

  const now = new Date();
  const target = new Date(now);
  target.setHours(hh, mm, 0, 0);

  const shouldCatchUp =
    target.getTime() <= now.getTime() && lastShown !== todayDate;
  if (shouldCatchUp) {
    onFire();
    // Re-schedule for tomorrow.
    target.setDate(target.getDate() + 1);
  } else if (target.getTime() <= now.getTime()) {
    target.setDate(target.getDate() + 1);
  }

  const delay = target.getTime() - now.getTime();
  // setTimeout max is ~24.8 days; this is well within that.
  const id = window.setTimeout(onFire, delay);
  return () => window.clearTimeout(id);
}
