import { useParams, useNavigate, Navigate } from "react-router-dom";
import { TOTAL_DAYS } from "@/lib/passages";
import { DayView } from "./DayView";
import { useSettings } from "@/stores/useSettings";
import { currentDay } from "@/lib/day";
import { useDocumentMeta } from "@/hooks/useDocumentMeta";
import { metaForDay } from "@/lib/seo";

export function DayRoute() {
  const { day: rawDay } = useParams();
  const nav = useNavigate();
  const startDate = useSettings((s) => s.startDate);
  const day = Number(rawDay);
  const valid = Number.isInteger(day) && day >= 1 && day <= TOTAL_DAYS;
  useDocumentMeta(metaForDay(valid ? day : 1));
  if (!valid) return <Navigate to="/" replace />;
  const todayNumber = currentDay(startDate);
  return (
    <DayView
      day={day}
      onChangeDay={(d) => nav(`/day/${d}`)}
      isToday={day === todayNumber}
    />
  );
}
