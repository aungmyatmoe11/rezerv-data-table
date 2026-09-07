import type { Metadata } from "next";
import { TimetablePage } from "@/features/timetable/TimetablePage";

export const metadata: Metadata = { title: "Timetable" };

export default function Page() {
  return <TimetablePage />;
}
