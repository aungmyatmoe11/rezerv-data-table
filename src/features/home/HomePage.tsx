"use client";

import { ApiOutlined, ExperimentOutlined, TableOutlined } from "@ant-design/icons";
import { Card, Tag } from "antd";
import Link from "next/link";

const CARDS = [
  {
    href: "/timetable",
    icon: <TableOutlined />,
    title: "Class timetable",
    body: "The real usage: classes as parent rows, attendees as child rows. Client and server modes, inline and on-demand expansion, every failure scenario.",
    tags: ["required features", "sticky column", "skeleton"],
  },
  {
    href: "/inventory",
    icon: <ApiOutlined />,
    title: "Inventory",
    body: "A differently-shaped dataset — money, decimals, nullable dates, tree variants — proving the component is generic, with server-side sorting and paging.",
    tags: ["second dataset", "server mode", "tree data"],
  },
  {
    href: "/playground",
    icon: <ExperimentOutlined />,
    title: "Playground",
    body: "Toggle every configuration attribute live, read the generated <DataTable /> JSX, and watch the callbacks a real frontend would wire to an API.",
    tags: ["dynamic settings", "generated code", "event log"],
  },
] as const;

export function HomePage() {
  return (
    <div>
      <h1 className="page-title">A DataTable built from scratch, configured like Ant Design.</h1>
      <p className="page-subtitle" style={{ maxWidth: 760 }}>
        No TanStack Table, AG Grid or Ant Design Table underneath — the engine, pagination and virtual windowing are hand-written. Ant Design supplies only
        non-table primitives (buttons, checkboxes, tags, empty states), and the public API mirrors its vocabulary so the component feels familiar on day one.
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
        {CARDS.map((card) => (
          <Link key={card.href} href={card.href}>
            <Card
              hoverable
              title={
                <span style={{ display: "inline-flex", gap: 10, alignItems: "center" }}>
                  {card.icon} {card.title}
                </span>
              }
              style={{ height: "100%" }}
            >
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
