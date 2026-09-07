"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import "./ui.css";

export type ButtonVariant = "default" | "primary" | "text" | "link";

export interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "type"> {
  variant?: ButtonVariant;
  size?: "middle" | "small";
  shape?: "default" | "circle";
  danger?: boolean;
  icon?: ReactNode;
  /** Native button type; defaults to `button` so a button inside a form never submits by accident. */
  htmlType?: "button" | "submit" | "reset";
}

export function Button({ variant = "default", size = "middle", shape = "default", danger = false, icon, htmlType = "button", className, children, ...rest }: ButtonProps) {
  return (
    <button
      type={htmlType}
      className={["ui-btn", className].filter(Boolean).join(" ")}
      data-variant={variant}
      data-size={size}
      data-shape={shape}
      data-danger={danger ? "true" : undefined}
      {...rest}
    >
      {icon}
      {children}
    </button>
  );
}
