import type { Metadata } from "next";
import { PlaygroundPage } from "@/features/playground/PlaygroundPage";

export const metadata: Metadata = { title: "Playground" };

export default function Page() {
  return <PlaygroundPage />;
}
