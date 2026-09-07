"use client";

import type { CSSProperties, KeyboardEvent } from "react";
import "./ui.css";

interface NumberInputProps {
  value: number | null;
  onChange: (value: number | null) => void;
  min?: number;
  max?: number;
  step?: number;
  placeholder?: string;
  size?: "middle" | "small";
  disabled?: boolean;
  style?: CSSProperties;
  onKeyDown?: (event: KeyboardEvent<HTMLInputElement>) => void;
  "aria-label"?: string;
}

/** Native number input with our chrome; empty means `null` so "auto" stays expressible. */
export function NumberInput({ value, onChange, min, max, step, placeholder, size = "middle", disabled = false, style, onKeyDown, ...aria }: NumberInputProps) {
  return (
    <input
      type="number"
      className="ui-input"
      data-size={size}
      value={value === null ? "" : value}
      disabled={disabled}
      placeholder={placeholder}
      aria-label={aria["aria-label"]}
      style={{ width: 96, ...style }}
      {...(min === undefined ? {} : { min })}
      {...(max === undefined ? {} : { max })}
      {...(step === undefined ? {} : { step })}
      {...(onKeyDown === undefined ? {} : { onKeyDown })}
      onChange={(event) => {
        const raw = event.target.value;
        if (raw === "") {
          onChange(null);
          return;
        }
        const parsed = Number(raw);
        if (Number.isNaN(parsed)) return;
        const clamped = Math.min(max ?? Infinity, Math.max(min ?? -Infinity, parsed));
        onChange(clamped);
      }}
    />
  );
}

interface ColorInputProps {
  value: string;
  onChange: (value: string) => void;
  "aria-label"?: string;
}

/** The platform colour picker — a custom swatch UI would add surface without adding value. */
export function ColorInput({ value, onChange, ...aria }: ColorInputProps) {
  return <input type="color" className="ui-color" value={value} aria-label={aria["aria-label"]} onChange={(event) => onChange(event.target.value)} />;
}

interface TextInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  size?: "middle" | "small";
  disabled?: boolean;
  style?: CSSProperties;
  spellCheck?: boolean;
  "aria-label"?: string;
}

/** Plain text field with the same chrome as `NumberInput`. */
export function TextInput({ value, onChange, placeholder, size = "middle", disabled = false, style, spellCheck = false, ...aria }: TextInputProps) {
  return (
    <input
      type="text"
      className="ui-input"
      data-size={size}
      value={value}
      disabled={disabled}
      placeholder={placeholder}
      spellCheck={spellCheck}
      autoComplete="off"
      aria-label={aria["aria-label"]}
      style={style}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}
