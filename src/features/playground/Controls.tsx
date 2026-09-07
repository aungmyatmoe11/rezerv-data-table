"use client";

import { Button, Collapse, ColorInput, NumberInput, Segmented, Select, Switch, Text } from "@/lib/ui";
import type { ReactNode } from "react";
import type { PaginationPosition, TableSize } from "@/lib/table";
import type { ExpansionMode, LoadingMode, PlaygroundConfig, RowsPreset, ScrollY, SelectionMode } from "./config";

interface ControlsProps {
  config: PlaygroundConfig;
  onChange: <K extends keyof PlaygroundConfig>(key: K, value: PlaygroundConfig[K]) => void;
}

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="pg-field">
      <span className="pg-field-label">
        {label}
        {hint !== undefined ? <Text tone="secondary"> {hint}</Text> : null}
      </span>
      {children}
    </label>
  );
}

const POSITIONS: { label: string; value: PaginationPosition | "topAndBottom" }[] = [
  { label: "Bottom right", value: "bottomRight" },
  { label: "Bottom center", value: "bottomCenter" },
  { label: "Bottom left", value: "bottomLeft" },
  { label: "Top right", value: "topRight" },
  { label: "Top center", value: "topCenter" },
  { label: "Top left", value: "topLeft" },
  { label: "Top + bottom", value: "topAndBottom" },
];

export function Controls({ config, onChange }: ControlsProps) {
  const set = onChange;
  return (
    <Collapse
      defaultOpenKeys={["data", "chrome", "pagination", "selection", "expansion", "layout", "sorting"]}
      items={[
        {
          key: "data",
          label: "Data & states",
          children: (
            <>
              <Field label="Rows">
                <Segmented<RowsPreset> value={config.rows} onChange={(v) => set("rows", v)} options={[{ label: "12", value: 12 }, { label: "200", value: 200 }, { label: "10,000", value: 10_000 }]} />
              </Field>
              <Field label="loading" hint="attribute">
                <Segmented<LoadingMode> value={config.loading} onChange={(v) => set("loading", v)} options={[{ label: "off", value: "off" }, { label: "skeleton", value: "skeleton" }, { label: "overlay", value: "overlay" }, { label: "custom", value: "custom" }]} />
              </Field>
              <Field label="Empty dataset">
                <Switch checked={config.empty} onChange={(v) => set("empty", v)} />
              </Field>
              <Field label="error + onRetry">
                <Switch checked={config.error} onChange={(v) => set("error", v)} />
              </Field>
            </>
          ),
        },
        {
          key: "chrome",
          label: "Chrome",
          children: (
            <>
              <Field label="bordered">
                <Switch checked={config.bordered} onChange={(v) => set("bordered", v)} />
              </Field>
              <Field label="size">
                <Segmented<TableSize> value={config.size} onChange={(v) => set("size", v)} options={[{ label: "small", value: "small" }, { label: "middle", value: "middle" }, { label: "large", value: "large" }]} />
              </Field>
              <Field label="rowHeight" hint="px, overrides size">
                <NumberInput size="small" aria-label="rowHeight" min={28} max={96} step={2} value={config.rowHeight} placeholder="auto" onChange={(v) => set("rowHeight", v)} style={{ width: 110 }} />
              </Field>
              <Field label="title">
                <Switch checked={config.title} onChange={(v) => set("title", v)} />
              </Field>
              <Field label="footer">
                <Switch checked={config.footer} onChange={(v) => set("footer", v)} />
              </Field>
              <Field label="summary">
                <Switch checked={config.summary} onChange={(v) => set("summary", v)} />
              </Field>
              <Field label="showHeader">
                <Switch checked={config.showHeader} onChange={(v) => set("showHeader", v)} />
              </Field>
              <Field label="rowHoverable">
                <Switch checked={config.hoverable} onChange={(v) => set("hoverable", v)} />
              </Field>
            </>
          ),
        },
        {
          key: "pagination",
          label: "Pagination",
          children: (
            <>
              <Field label="pagination">
                <Switch checked={config.pagination} onChange={(v) => set("pagination", v)} />
              </Field>
              <Field label="pageSize">
                <NumberInput size="small" aria-label="pageSize" min={1} max={100} value={config.pageSize} onChange={(v) => set("pageSize", v ?? 5)} style={{ width: 90 }} disabled={!config.pagination} />
              </Field>
              <Field label="position">
                <Select size="small" aria-label="pagination position" value={config.paginationPosition} onChange={(v) => set("paginationPosition", v)} options={POSITIONS} style={{ width: 160 }} disabled={!config.pagination} />
              </Field>
              <Field label="showSizeChanger">
                <Switch checked={config.showSizeChanger} onChange={(v) => set("showSizeChanger", v)} disabled={!config.pagination} />
              </Field>
              <Field label="showQuickJumper">
                <Switch checked={config.showQuickJumper} onChange={(v) => set("showQuickJumper", v)} disabled={!config.pagination} />
              </Field>
              <Field label="showTotal">
                <Switch checked={config.showTotal} onChange={(v) => set("showTotal", v)} disabled={!config.pagination} />
              </Field>
              <Field label="simple">
                <Switch checked={config.simplePagination} onChange={(v) => set("simplePagination", v)} disabled={!config.pagination} />
              </Field>
            </>
          ),
        },
        {
          key: "selection",
          label: "Row selection",
          children: (
            <>
              <Field label="rowSelection">
                <Segmented<SelectionMode> value={config.selection} onChange={(v) => set("selection", v)} options={[{ label: "off", value: "off" }, { label: "checkbox", value: "checkbox" }, { label: "radio", value: "radio" }]} />
              </Field>
              <Field label="selections menu" hint="all / invert / none">
                <Switch checked={config.selectionsMenu} onChange={(v) => set("selectionsMenu", v)} disabled={config.selection !== "checkbox"} />
              </Field>
              <Field label="getCheckboxProps" hint="disable cancelled">
                <Switch checked={config.disableCancelled} onChange={(v) => set("disableCancelled", v)} disabled={config.selection === "off"} />
              </Field>
            </>
          ),
        },
        {
          key: "expansion",
          label: "Expansion",
          children: (
            <>
              <Field label="expandable">
                <Segmented<ExpansionMode> value={config.expansion} onChange={(v) => set("expansion", v)} options={[{ label: "off", value: "off" }, { label: "inline", value: "inline" }, { label: "on-demand", value: "on-demand" }, { label: "tree", value: "tree" }]} />
              </Field>
              <Field label="expandRowByClick">
                <Switch checked={config.expandRowByClick} onChange={(v) => set("expandRowByClick", v)} disabled={config.expansion === "off"} />
              </Field>
            </>
          ),
        },
        {
          key: "layout",
          label: "Layout & columns",
          children: (
            <>
              <Field label="fixed: left" hint="Class column">
                <Switch checked={config.fixedLeft} onChange={(v) => set("fixedLeft", v)} />
              </Field>
              <Field label="fixed: right" hint="Actions column">
                <Switch checked={config.fixedRight} onChange={(v) => set("fixedRight", v)} />
              </Field>
              <Field label="fixed gap" hint="theme.fixedColumnGap">
                <Switch checked={config.fixedGap} onChange={(v) => set("fixedGap", v)} />
              </Field>
              <Field label="scroll.x">
                <Switch checked={config.scrollX} onChange={(v) => set("scrollX", v)} />
              </Field>
              <Field label="scroll.y" hint="fixed header">
                <Segmented<ScrollY> value={config.scrollY} onChange={(v) => set("scrollY", v)} options={[{ label: "off", value: "off" }, { label: "420px", value: "fixed" }, { label: "auto", value: "auto" }]} />
              </Field>
              <Field label="sticky header" hint="page scroll">
                <Switch checked={config.stickyHeader} onChange={(v) => set("stickyHeader", v)} />
              </Field>
              <Field label="hidden column">
                <Select size="small" aria-label="hidden column" value={config.hideColumn} onChange={(v) => set("hideColumn", v)} options={[{ value: "none", label: "none" }, { value: "instructor", label: "Instructor" }, { value: "location", label: "Location" }]} style={{ width: 130 }} />
              </Field>
              <Field label="ellipsis">
                <Switch checked={config.ellipsis} onChange={(v) => set("ellipsis", v)} />
              </Field>
              <Field label="responsive" hint="hide on small screens">
                <Switch checked={config.responsive} onChange={(v) => set("responsive", v)} />
              </Field>
              <Field label="colSpan / rowSpan" hint="merge instructors">
                <Switch checked={config.spans} onChange={(v) => set("spans", v)} />
              </Field>
              <Field label="virtual" hint="needs scroll.y">
                <Switch checked={config.virtual} onChange={(v) => set("virtual", v)} />
              </Field>
            </>
          ),
        },
        {
          key: "sorting",
          label: "Sorting & filtering",
          children: (
            <>
              <Field label="multi-sort" hint="sorter.multiple">
                <Switch checked={config.multiSort} onChange={(v) => set("multiSort", v)} />
              </Field>
              <Field label="sorted highlight">
                <Switch checked={config.sortedHighlight} onChange={(v) => set("sortedHighlight", v)} />
              </Field>
              <Field label="sorted colour" hint="theme.sortedColumnBg">
                <span style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
                  <ColorInput aria-label="sorted column colour" value={config.sortedColor === "" ? "#e6f4ff" : config.sortedColor} onChange={(color) => set("sortedColor", color)} />
                  {config.sortedColor === "" ? null : (
                    <Button size="small" variant="link" onClick={() => set("sortedColor", "")}>
                      reset
                    </Button>
                  )}
                </span>
              </Field>
              <Field label="column filters" hint="Status">
                <Switch checked={config.filters} onChange={(v) => set("filters", v)} />
              </Field>
            </>
          ),
        },
      ]}
    />
  );
}
