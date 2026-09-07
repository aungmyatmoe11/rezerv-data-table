/**
 * The primitive layer — every control the app and the DataTable render.
 *
 * There is no component library in this project's dependency tree: these are the buttons,
 * inputs, menus, overlays and icons everything else is built from. They are token-driven
 * (`ui.css`), accessible by construction, and free of client-only styling engines so the
 * server and the browser render identical markup.
 */
export { Button, type ButtonProps, type ButtonVariant } from "./Button";
export { Checkbox, Radio, Switch } from "./Toggle";
export { Segmented, type SegmentedOption } from "./Segmented";
export { Select, type SelectOption } from "./Select";
export { MenuButton, type MenuItem, type MenuTriggerProps } from "./Menu";
export { Popover, type PopoverPlacement } from "./Popover";
export { Tooltip } from "./Tooltip";
export { NumberInput, ColorInput, TextInput } from "./Inputs";
export { Alert, Empty, Progress, Spinner, Tag, type Tone } from "./Feedback";
export { Card, Collapse, Drawer, Space, type CollapseItem } from "./Surface";
export { Text } from "./Text";
export { ToastProvider, useToast } from "./Toast";
export * from "./icons";
