import { useEffect, useState } from "react";
import { Switch } from "@/components/ui/Switch";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { useSettings } from "@/stores/useSettings";
import {
  permissionState,
  requestPermission,
  type PermissionState,
} from "@/lib/notifications";

export function Settings() {
  const {
    reminderEnabled,
    setReminderEnabled,
    reminderTime,
    setReminderTime,
    theme,
    setTheme,
    startDate,
    resetProgress,
  } = useSettings();

  const [perm, setPerm] = useState<PermissionState>("default");
  useEffect(() => {
    setPerm(permissionState());
  }, []);

  async function handleToggle(next: boolean) {
    if (next) {
      const p = await requestPermission();
      setPerm(p);
      if (p !== "granted") return;
    }
    setReminderEnabled(next);
  }

  return (
    <div className="space-y-8">
      <h1 className="text-center font-serif text-2xl italic">Settings</h1>

      <Card>
        <CardBody className="space-y-5">
          <header>
            <h2 className="font-serif text-lg italic">Daily reminder</h2>
            <p className="mt-1 font-sans text-sm text-ink-400 dark:text-ink-500">
              A gentle notification at your chosen hour. Install the app to your
              home screen for the most reliable delivery.
            </p>
          </header>

          <div className="flex items-center justify-between">
            <label className="font-sans text-sm" htmlFor="reminder-toggle">
              Enable reminders
            </label>
            <Switch
              id="reminder-toggle"
              checked={reminderEnabled}
              onChange={(e) => handleToggle(e.target.checked)}
            />
          </div>

          <div className="flex items-center justify-between gap-4">
            <label className="font-sans text-sm" htmlFor="reminder-time">
              Time
            </label>
            <Input
              id="reminder-time"
              type="time"
              value={reminderTime}
              onChange={(e) => setReminderTime(e.target.value)}
              className="w-32"
            />
          </div>

          {perm === "denied" && (
            <p className="font-sans text-xs text-red-700 dark:text-red-300">
              Notifications were blocked in your browser. Re-enable them in
              site settings to receive reminders.
            </p>
          )}
          {perm === "unsupported" && (
            <p className="font-sans text-xs text-ink-400">
              This browser does not support notifications.
            </p>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardBody className="space-y-4">
          <h2 className="font-serif text-lg italic">Appearance</h2>
          <div className="flex gap-2">
            {(["light", "dark", "system"] as const).map((t) => (
              <Button
                key={t}
                variant={theme === t ? "default" : "outline"}
                size="sm"
                onClick={() => setTheme(t)}
                className="capitalize"
              >
                {t}
              </Button>
            ))}
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardBody className="space-y-3">
          <h2 className="font-serif text-lg italic">Progress</h2>
          <p className="font-sans text-sm text-ink-500 dark:text-ink-400">
            You began on{" "}
            <span className="font-medium text-ink-800 dark:text-parchment-200">
              {startDate}
            </span>
            . Notes and highlights will be kept.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (confirm("Restart your daily reading from Day 1?")) resetProgress();
            }}
          >
            Restart from Day 1
          </Button>
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <h2 className="font-serif text-lg italic">About</h2>
          <p className="mt-2 font-sans text-sm text-ink-500 dark:text-ink-400">
            365 passages from <em>Story of a Soul</em> (T.N. Taylor tr., 1922)
            and the <em>Counsels and Reminiscences</em> bundled with it, drawn
            from Project Gutenberg ebook #16772. The selection leans toward
            St Thérèse's central theme: the merciful love of the Father, and
            her little way of confidence in it.
          </p>
        </CardBody>
      </Card>
    </div>
  );
}
