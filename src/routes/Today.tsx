import { useNavigate } from "react-router-dom";
import { useSettings } from "@/stores/useSettings";
import { currentDay } from "@/lib/day";
import { DayView } from "@/routes/DayView";
import { Hero } from "@/components/Hero";
import { useDocumentMeta } from "@/hooks/useDocumentMeta";
import { metaForDay, metaForRoute } from "@/lib/seo";

export function Today() {
  const startDate = useSettings((s) => s.startDate);
  const day = currentDay(startDate);
  const nav = useNavigate();
  // The home page identity for crawlers; the live day's metadata for the
  // user's tab/title and OG cards once JS hydrates.
  const meta = day === 1 ? metaForRoute("home") : metaForDay(day);
  useDocumentMeta(meta);
  return (
    <>
      <Hero />
      <DayView day={day} onChangeDay={(d) => nav(`/day/${d}`)} isToday />
    </>
  );
}
