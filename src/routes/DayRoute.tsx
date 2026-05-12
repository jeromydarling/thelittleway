import { useParams, useNavigate, Navigate } from "react-router-dom";
import { TOTAL_DAYS } from "@/lib/passages";
import { DayView } from "./DayView";
import { useSettings } from "@/stores/useSettings";
import { currentDay } from "@/lib/day";

export function DayRoute() {
  const { day: rawDay } = useParams();
  const nav = useNavigate();
  const startDate = useSettings((s) => s.startDate);
  const day = Number(rawDay);
  if (!Number.isInteger(day) || day < 1 || day > TOTAL_DAYS) {
    return <Navigate to="/" replace />;
  }
  const todayNumber = currentDay(startDate);
  return (
    <DayView
      day={day}
      onChangeDay={(d) => nav(`/day/${d}`)}
      isToday={day === todayNumber}
    />
  );
}
