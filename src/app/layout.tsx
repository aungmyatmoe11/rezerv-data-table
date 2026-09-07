import { AntdRegistry } from "@ant-design/nextjs-registry";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AppShell } from "./app-shell";
import "./globals.css";
import { AppProviders } from "./providers";

export const metadata: Metadata = {
  title: { default: "Rezerv DataTable", template: "%s · Rezerv DataTable" },
  description: "A from-scratch, fully typed, config-driven DataTable with an Ant Design-shaped API — Rezerv Frontend Assessment, Part 2.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <AntdRegistry>
          <AppProviders>
            <AppShell>{children}</AppShell>
          </AppProviders>
        </AntdRegistry>
      </body>
    </html>
  );
}
