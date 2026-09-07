import type { CSSProperties, ReactNode } from "react";
import "./ui.css";

interface TextProps {
  tone?: "default" | "secondary";
  strong?: boolean;
  ellipsis?: boolean;
  code?: boolean;
  style?: CSSProperties;
  title?: string;
  children: ReactNode;
}

export function Text({ tone = "default", strong = false, ellipsis = false, code = false, style, title, children }: TextProps) {
  if (code) {
    return (
      <code className="ui-code" style={style}>
        {children}
      </code>
    );
  }
  return (
    <span className="ui-text" data-tone={tone} data-strong={strong ? "true" : undefined} data-ellipsis={ellipsis ? "true" : undefined} style={style} title={title}>
      {children}
    </span>
  );
}
