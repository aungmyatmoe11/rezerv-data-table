"use client";

import type { CSSProperties, ReactNode } from "react";
import { AlertIcon, InboxIcon, InfoIcon, SpinnerIcon } from "./icons";
import "./ui.css";

export type Tone = "neutral" | "success" | "warning" | "danger" | "info" | "accent";

export function Tag({ tone = "neutral", children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span className="ui-tag" data-tone={tone}>
      {children}
    </span>
  );
}

export function Alert({ tone = "info", icon = true, children, style }: { tone?: Tone; icon?: boolean; children: ReactNode; style?: CSSProperties }) {
  return (
    <div className="ui-alert" data-tone={tone} style={style}>
      {icon ? <span className="ui-alert-icon">{tone === "danger" || tone === "warning" ? <AlertIcon /> : <InfoIcon />}</span> : null}
      <div className="ui-alert-body">{children}</div>
    </div>
  );
}

export function Empty({ description }: { description: ReactNode }) {
  return (
    <div className="ui-empty">
      <InboxIcon />
      <div>{description}</div>
    </div>
  );
}

export function Spinner({ label }: { label?: string }) {
  return (
    <span className="ui-spinner" role="status" aria-label={label ?? "Loading"}>
      <SpinnerIcon />
    </span>
  );
}

interface ProgressProps {
  percent: number;
  tone?: Tone;
  width?: number;
  height?: number;
  "aria-label"?: string;
}

/** `role="progressbar"` with the value attributes screen readers need; the bar itself is a div. */
export function Progress({ percent, tone = "info", width = 80, height = 6, ...aria }: ProgressProps) {
  const clamped = Math.min(100, Math.max(0, Math.round(percent)));
  return (
    <span
      className="ui-progress"
      data-tone={tone}
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={aria["aria-label"]}
      style={{ width, height }}
    >
      <span className="ui-progress-bar" style={{ width: `${clamped}%` }} />
    </span>
  );
}
