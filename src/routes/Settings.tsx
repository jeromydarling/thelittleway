import { useEffect, useState, useRef } from "react";
import { Switch } from "@/components/ui/Switch";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { useSettings } from "@/stores/useSettings";
import { passages } from "@/lib/passages";
import { useNotes } from "@/stores/useNotes";
import { useHighlights } from "@/stores/useHighlights";
import { useFavorites } from "@/stores/useFavorites";
import {
  downloadJournalMarkdown,
  downloadJournalBackup,
  parseJournalBackup,
} from "@/lib/exportJournal";
import { YearHeatmap } from "@/components/YearHeatmap";
import {
  permissionState,
  requestPermission,
  type PermissionState,
} from "@/lib/notifications";
import { useDocumentMeta } from "@/hooks/useDocumentMeta";
import { metaForRoute } from "@/lib/seo";

export function Settings() {
  useDocumentMeta(metaForRoute("settings"));
  const {
    reminderEnabled,
    setReminderEnabled,
    reminderTime,
    setReminderTime,
    theme,
    setTheme,
    focusMode,
    setFocusMode,
    startDate,
    resetProgress,
  } = useSettings();
  const notes = useNotes((s) => s.byDay);
  const replaceNotes = useNotes((s) => s.replaceAll);
  const highlights = useHighlights((s) => s.byDay);
  const replaceHighlights = useHighlights((s) => s.replaceAll);
  const favorites = useFavorites((s) => s.byDay);
  const replaceFavorites = useFavorites((s) => s.replaceAll);
  const hasJournal =
    Object.keys(notes).length + Object.keys(highlights).length + Object.keys(favorites).length > 0;

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importStatus, setImportStatus] = useState<string | null>(null);

  async function handleImport(file: File) {
    setImportStatus(null);
    try {
      const text = await file.text();
      const data = parseJournalBackup(text);
      const counts =
        Object.keys(data.notes).length +
        Object.keys(data.highlights).length +
        Object.keys(data.favorites).length;
      const proceed = confirm(
        `Restore ${counts} journal entries from this backup? ` +
          `Your current notes, highlights, and favorites will be replaced.`,
      );
      if (!proceed) return;
      replaceNotes(data.notes);
      replaceHighlights(data.highlights);
      replaceFavorites(data.favorites);
      setImportStatus(`Restored ${counts} entries.`);
    } catch (err) {
      setImportStatus((err as Error).message);
    }
  }

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
          <div>
            <p className="mb-2 font-sans text-sm text-ink-500 dark:text-ink-400">
              Theme
            </p>
            <div className="flex gap-2">
              {(["light", "dark", "system"] as const).map((t) => (
                <Button
                  key={t}
                  variant={theme === t ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTheme(t)}
                  className="min-h-11 flex-1 capitalize sm:min-h-0 sm:flex-initial"
                >
                  {t}
                </Button>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-sans text-sm">Focus mode</p>
              <p className="font-sans text-xs text-ink-400 dark:text-ink-500">
                Hide navigation and dim chrome for deep reading.
              </p>
            </div>
            <Switch
              checked={focusMode}
              onChange={(e) => setFocusMode(e.target.checked)}
            />
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardBody className="space-y-4">
          <h2 className="font-serif text-lg italic">Year at a glance</h2>
          <p className="font-sans text-sm text-ink-500 dark:text-ink-400">
            Each cell is a day. Darker = more annotated. Tap to jump.
          </p>
          <YearHeatmap />
        </CardBody>
      </Card>

      <Card>
        <CardBody className="space-y-3">
          <h2 className="font-serif text-lg italic">Your journal</h2>
          <p className="font-sans text-sm text-ink-500 dark:text-ink-400">
            Download every kept day, highlight, and note as a single Markdown
            file. Your writing is yours — keep a copy anywhere you like.
          </p>
          <div className="grid grid-cols-1 gap-2 sm:flex sm:flex-wrap">
            <Button
              variant="outline"
              size="sm"
              disabled={!hasJournal}
              onClick={() =>
                downloadJournalMarkdown({
                  notes,
                  highlights,
                  favorites,
                  startDate,
                })
              }
              className="min-h-11 sm:min-h-0"
            >
              Download as Markdown
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!hasJournal}
              onClick={() =>
                downloadJournalBackup({
                  notes,
                  highlights,
                  favorites,
                  startDate,
                })
              }
              className="min-h-11 sm:min-h-0"
            >
              Download backup (JSON)
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              className="min-h-11 sm:min-h-0"
            >
              Restore backup
            </Button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleImport(f);
              e.target.value = "";
            }}
          />
          {importStatus && (
            <p className="font-sans text-xs text-ink-500 dark:text-ink-400">
              {importStatus}
            </p>
          )}
          {!hasJournal && (
            <p className="font-sans text-xs text-ink-400 dark:text-ink-500">
              Markdown is your readable keepsake. JSON is the lossless backup
              that another device can restore.
            </p>
          )}
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
            365 sequential passages from <em>Story of a Soul</em> (T.N. Taylor
            tr., 1922), the <em>Counsels and Reminiscences</em>, and her
            <em> letters</em> — drawn from Project Gutenberg ebook #16772 and
            read in the order Thérèse wrote them. Each day is paired with a
            saying of Christ from the Gospels ({passages[0]?.gospel.translation ?? "ASV"}),
            chosen by thematic resonance with the day's reading.
          </p>
        </CardBody>
      </Card>
    </div>
  );
}
