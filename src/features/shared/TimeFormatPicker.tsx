"use client";

import { Select, Text, TextInput } from "@/lib/ui";
import { TIME_FORMAT_PRESETS, formatSample, resolveTimePattern, type TimeFormat } from "./format";

const CUSTOM = "__custom__";

/** Every option is labelled by running the format itself, so a label can never drift from a cell. */
const OPTIONS = [...TIME_FORMAT_PRESETS.map((preset) => ({ value: preset as string, label: formatSample(preset), title: preset })), { value: CUSTOM, label: "Custom pattern…" }];

interface TimeFormatPickerProps {
  value: TimeFormat;
  onChange: (value: TimeFormat) => void;
  size?: "middle" | "small";
  width?: number;
}

/**
 * One control for `column.formatter`, shared by the timetable and the playground: pick a named
 * pattern, or type a dayjs one. Choosing "Custom" seeds the field with the pattern currently on
 * screen, so editing starts from what the user can see rather than from an empty box.
 */
export function TimeFormatPicker({ value, onChange, size = "middle", width = 184 }: TimeFormatPickerProps) {
  const preset = TIME_FORMAT_PRESETS.find((key) => key === value);
  return (
    <span className="fmt-picker" style={{ width }}>
      <Select<string> size={size} aria-label="time format" value={preset ?? CUSTOM} onChange={(next) => onChange(next === CUSTOM ? resolveTimePattern(value) : next)} options={OPTIONS} style={{ width: "100%" }} />
      {preset === undefined ? (
        <>
          <TextInput size={size} aria-label="time pattern" value={value} onChange={onChange} placeholder="DD-MM-YYYY" style={{ width: "100%" }} />
          <Text tone="secondary" style={{ fontSize: 12 }}>
            {formatSample(value)}
          </Text>
        </>
      ) : null}
    </span>
  );
}
