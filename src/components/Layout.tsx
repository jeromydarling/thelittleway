import { NavLink, Outlet } from "react-router-dom";
import { useEffect } from "react";
import { useSettings } from "@/stores/useSettings";
import { cn } from "@/lib/utils";
import { useDailyReminder } from "@/hooks/useDailyReminder";
import { ProgressStrip } from "@/components/ProgressStrip";

const links = [
  { to: "/", label: "Today", end: true },
  { to: "/favorites", label: "Favorites" },
  { to: "/highlights", label: "Highlights" },
  { to: "/notes", label: "Notes" },
  { to: "/settings", label: "Settings" },
];

export function Layout() {
  const theme = useSettings((s) => s.theme);
  const focusMode = useSettings((s) => s.focusMode);

  useEffect(() => {
    const root = document.documentElement;
    function apply() {
      const prefersDark = window.matchMedia(
        "(prefers-color-scheme: dark)",
      ).matches;
      const dark = theme === "dark" || (theme === "system" && prefersDark);
      root.classList.toggle("dark", dark);
    }
    apply();
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [theme]);

  useEffect(() => {
    document.documentElement.classList.toggle("focus-mode", focusMode);
  }, [focusMode]);

  useDailyReminder();

  return (
    <div className="min-h-dvh">
      <header className="border-b border-ink-200/40 print:hidden dark:border-ink-700/40">
        <div className="container-narrow flex items-center justify-between py-4">
          <NavLink to="/" className="font-serif text-lg italic text-accent dark:text-accent-muted">
            The Little Way
          </NavLink>
          <nav className="flex items-center gap-1 text-xs uppercase tracking-wider">
            {links.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.end}
                className={({ isActive }) =>
                  cn(
                    "rounded px-2 py-1 font-sans transition-colors",
                    isActive
                      ? "text-accent dark:text-accent-muted"
                      : "text-ink-500 hover:text-ink-800 dark:text-ink-300 dark:hover:text-parchment-200",
                  )
                }
              >
                {l.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>
      <ProgressStrip />
      <main className="container-narrow py-10">
        <Outlet />
      </main>
      <footer className="container-narrow pb-12 text-center text-xs text-ink-400 print:hidden dark:text-ink-500">
        <p className="font-sans">
          Source · <em>Story of a Soul</em>, tr. T.N. Taylor · Project Gutenberg #16772 · public domain
        </p>
      </footer>
    </div>
  );
}
