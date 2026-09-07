import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AppShell } from "./app-shell";
import "./globals.css";
import { AppProviders } from "./providers";

export const metadata: Metadata = {
  title: { default: "Rezerv DataTable", template: "%s · Rezerv DataTable" },
  description: "A from-scratch, fully typed, config-driven DataTable with an Ant Design-shaped API — Rezerv Frontend Assessment, Part 2.",
};

/**
 * Applies the stored / system colour mode before first paint, so a dark-mode visitor never sees
 * a white flash. It runs ahead of hydration and only touches `data-theme`, which React does not
 * render on the server (hence `suppressHydrationWarning` on <html>).
 */
const COLOR_MODE_SCRIPT = `(function(){try{var s=localStorage.getItem("rezerv-dt-theme");var m=s==="dark"||s==="light"?s:(matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light");document.documentElement.dataset.theme=m;document.documentElement.style.colorScheme=m;}catch(e){}})();`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: COLOR_MODE_SCRIPT }} />
      </head>
      <body>
        <AppProviders>
          <AppShell>{children}</AppShell>
        </AppProviders>
      </body>
    </html>
  );
}
