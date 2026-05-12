import { Routes, Route } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { Today } from "@/routes/Today";
import { DayRoute } from "@/routes/DayRoute";
import { Highlights } from "@/routes/Highlights";
import { Notes } from "@/routes/Notes";
import { Favorites } from "@/routes/Favorites";
import { Settings } from "@/routes/Settings";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Today />} />
        <Route path="day/:day" element={<DayRoute />} />
        <Route path="favorites" element={<Favorites />} />
        <Route path="highlights" element={<Highlights />} />
        <Route path="notes" element={<Notes />} />
        <Route path="settings" element={<Settings />} />
        <Route path="*" element={<Today />} />
      </Route>
    </Routes>
  );
}
