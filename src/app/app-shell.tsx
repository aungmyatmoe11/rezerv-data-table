"use client";

import { MoonOutlined, SunOutlined } from "@ant-design/icons";
import { Button, Tooltip } from "antd";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useColorMode } from "./providers";

const NAV = [
  { href: "/", label: "Overview" },
  { href: "/timetable", label: "Timetable" },
  { href: "/inventory", label: "Inventory" },
  { href: "/playground", label: "Playground" },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { mode, toggle } = useColorMode();
  return (
    <div className="app-shell">
      <header className="app-header">
        <Link href="/" className="app-brand" aria-label="Rezerv DataTable home">
          <span className="app-brand-mark" aria-hidden="true">
            R
          </span>
          <span>DataTable</span>
        </Link>
        <nav className="app-nav" aria-label="Primary">
          {NAV.map((item) => (
            <Link key={item.href} href={item.href} aria-current={pathname === item.href ? "page" : undefined}>
              {item.label}
            </Link>
          ))}
        </nav>
        <Tooltip title={mode === "dark" ? "Switch to light" : "Switch to dark"}>
          <Button type="text" shape="circle" aria-label="Toggle colour mode" icon={mode === "dark" ? <SunOutlined /> : <MoonOutlined />} onClick={toggle} />
        </Tooltip>
      </header>
      <main className="app-main">{children}</main>
      <footer className="app-footer">Rezerv Frontend Assessment — Part 2 · built from scratch, no table library.</footer>
    </div>
  );
}
