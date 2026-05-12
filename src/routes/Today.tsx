import { useNavigate } from "react-router-dom";
import { useSettings } from "@/stores/useSettings";
import { currentDay } from "@/lib/day";
import { DayView } from "@/routes/DayView";

export function Today() {
  const startDate = useSettings((s) => s.startDate);
  const day = currentDay(startDate);
  const nav = useNavigate();
  return <DayView day={day} onChangeDay={(d) => nav(`/day/${d}`)} isToday />;
}
