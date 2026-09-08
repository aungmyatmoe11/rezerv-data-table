"use client";

import Link from "next/link";
import { BoxIcon, Card, FlaskIcon, TableIcon, Tag } from "@/lib/ui";

const CARDS = [
  {
    href: "/timetable",
    icon: <TableIcon />,
    title: "Class timetable",
    body: "The real usage: classes as parent rows, attendees as child rows. Client and server modes, inline and on-demand expansion, every failure scenario.",
    tags: ["required features", "sticky column", "skeleton"],
  },
  {
    href: "/inventory",
    icon: <BoxIcon />,
    title: "Inventory",
    body: "A differently-shaped dataset — money, decimals, nullable dates, tree variants — proving the component is generic, with server-side sorting and paging.",
    tags: ["second dataset", "server mode", "tree data"],
  },
  {
    href: "/playground",
    icon: <FlaskIcon />,
    title: "Playground",
    body: "Toggle every configuration attribute live, read the generated <DataTable /> JSX, and watch the callbacks a real frontend would wire to an API.",
    tags: ["dynamic settings", "generated code", "event log"],
  },
] as const;

export function HomePage() {
  return (
    <div>
      <h1 className="page-title">A reusable DataTable, built from scratch.</h1>
      <p className="page-subtitle" style={{ maxWidth: 760 }}>
        No table library and no component library: the engine, the pagination, the virtual windowing — and every button, checkbox, menu and icon on this site —
        are written in this repository. One typed component drives all three screens below; the API uses the prop names a React developer already
        knows, so it reads familiar on day one.
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
        {CARDS.map((card) => (
          <Link key={card.href} href={card.href} className="home-card-link">
            <Card title={card.title} icon={card.icon} style={{ height: "100%" }}>
              <p style={{ marginTop: 0 }}>{card.body}</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                {card.tags.map((tag) => (
                  <Tag key={tag}>{tag}</Tag>
                ))}
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
