import type { SVGProps } from "react";
import "./ui.css";

// `path` is itself an SVG attribute in React's typings, so it is omitted before we reuse the name
type IconProps = Omit<SVGProps<SVGSVGElement>, "children" | "viewBox" | "xmlns" | "path">;

/** Shared frame: 1em square, inherits `currentColor`, decorative unless a label is passed. */
function Icon({ path, filled = false, className, ...rest }: IconProps & { path: string; filled?: boolean }) {
  const decorative = rest["aria-label"] === undefined;
  return (
    <svg
      viewBox="0 0 24 24"
      className={["ui-icon", className].filter(Boolean).join(" ")}
      fill={filled ? "currentColor" : "none"}
      stroke={filled ? "none" : "currentColor"}
      strokeWidth={filled ? undefined : 1.9}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={decorative ? true : undefined}
      role={decorative ? undefined : "img"}
      focusable="false"
      {...rest}
    >
      <path d={path} />
    </svg>
  );
}

export const ChevronRightIcon = (props: IconProps) => <Icon path="M9.5 5.5 16 12l-6.5 6.5" {...props} />;
export const ChevronLeftIcon = (props: IconProps) => <Icon path="M14.5 5.5 8 12l6.5 6.5" {...props} />;
export const ChevronDownIcon = (props: IconProps) => <Icon path="M5.5 9.5 12 16l6.5-6.5" {...props} />;
export const CaretUpIcon = (props: IconProps) => <Icon path="M12 8.5 17 15H7z" filled {...props} />;
export const CaretDownIcon = (props: IconProps) => <Icon path="M12 15.5 7 9h10z" filled {...props} />;
export const CheckIcon = (props: IconProps) => <Icon path="m5 12.5 4.5 4.5L19 7.5" {...props} />;
export const MinusIcon = (props: IconProps) => <Icon path="M6 12h12" {...props} />;
export const CloseIcon = (props: IconProps) => <Icon path="M6.5 6.5 17.5 17.5M17.5 6.5 6.5 17.5" {...props} />;
export const FilterIcon = (props: IconProps) => <Icon path="M4 5.5h16l-6.2 7.2V19l-3.6 1.8v-8.1z" filled {...props} />;
export const CopyIcon = (props: IconProps) => <Icon path="M9 9h9.5v10.5H9zM5.5 15V4.5H15" {...props} />;
export const AlertIcon = (props: IconProps) => <Icon path="M12 3.5a8.5 8.5 0 1 1 0 17 8.5 8.5 0 0 1 0-17zM12 7.8v5M12 15.8v.4" {...props} />;
export const InfoIcon = (props: IconProps) => <Icon path="M12 3.5a8.5 8.5 0 1 1 0 17 8.5 8.5 0 0 1 0-17zM12 11v5.2M12 7.8v.4" {...props} />;
export const SunIcon = (props: IconProps) => <Icon path="M12 8.2a3.8 3.8 0 1 1 0 7.6 3.8 3.8 0 0 1 0-7.6zM12 2.8v2.1M12 19.1v2.1M4.7 4.7l1.5 1.5M17.8 17.8l1.5 1.5M2.8 12h2.1M19.1 12h2.1M4.7 19.3l1.5-1.5M17.8 6.2l1.5-1.5" {...props} />;
export const MoonIcon = (props: IconProps) => <Icon path="M20 14.2A8.4 8.4 0 0 1 9.8 4a7.4 7.4 0 1 0 10.2 10.2z" {...props} />;
export const TableIcon = (props: IconProps) => <Icon path="M4 5.5h16v13H4zM4 10h16M10 10v8.5" {...props} />;
export const BoxIcon = (props: IconProps) => <Icon path="m12 3 8 4.4v9.2L12 21l-8-4.4V7.4zM4 7.4l8 4.4 8-4.4M12 11.8V21" {...props} />;
export const FlaskIcon = (props: IconProps) => <Icon path="M9.5 3.5v6L4.8 18a2 2 0 0 0 1.7 3h11a2 2 0 0 0 1.7-3l-4.7-8.5v-6M8 3.5h8M7.6 14h8.8" {...props} />;
export const InboxIcon = (props: IconProps) => <Icon path="M4 13.5h4.2l1.6 2.6h4.4l1.6-2.6H20M4 13.5 6.2 5h11.6L20 13.5v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" {...props} />;

/** Indeterminate arc; the CSS class does the spinning. */
export function SpinnerIcon({ className, ...rest }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={["ui-icon", "ui-icon--spin", className].filter(Boolean).join(" ")} fill="none" aria-hidden="true" focusable="false" {...rest}>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.22" strokeWidth="2.4" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}
