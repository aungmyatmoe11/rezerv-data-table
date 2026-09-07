"use client";

import { useEffect, useRef, type ChangeEvent, type MouseEvent } from "react";
import { CheckIcon, MinusIcon } from "./icons";
import "./ui.css";

interface CheckboxProps {
  checked: boolean;
  indeterminate?: boolean;
  disabled?: boolean;
  name?: string;
  "aria-label"?: string;
  onChange: (checked: boolean, event: ChangeEvent<HTMLInputElement>) => void;
  onClick?: (event: MouseEvent<HTMLInputElement>) => void;
}

/**
 * A real `<input type="checkbox">` under a painted box: screen readers, form semantics and the
 * `:indeterminate` state come from the platform; only the visuals are ours.
 */
export function Checkbox({ checked, indeterminate = false, disabled = false, name, onChange, onClick, ...aria }: CheckboxProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  useEffect(() => {
    if (inputRef.current !== null) inputRef.current.indeterminate = indeterminate;
  }, [indeterminate]);

  return (
    <span className="ui-check" data-type="checkbox">
      <input
        ref={inputRef}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        aria-label={aria["aria-label"]}
        {...(name === undefined ? {} : { name })}
        {...(onClick === undefined ? {} : { onClick })}
        onChange={(event) => onChange(event.target.checked, event)}
      />
      <span className="ui-check-box" aria-hidden="true">
        {indeterminate ? <MinusIcon /> : checked ? <CheckIcon /> : null}
      </span>
    </span>
  );
}

interface RadioProps {
  checked: boolean;
  disabled?: boolean;
  name?: string;
  "aria-label"?: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onClick?: (event: MouseEvent<HTMLInputElement>) => void;
}

export function Radio({ checked, disabled = false, name, onChange, onClick, ...aria }: RadioProps) {
  return (
    <span className="ui-check" data-type="radio">
      <input
        type="radio"
        checked={checked}
        disabled={disabled}
        aria-label={aria["aria-label"]}
        {...(name === undefined ? {} : { name })}
        {...(onClick === undefined ? {} : { onClick })}
        onChange={onChange}
      />
      <span className="ui-check-box" aria-hidden="true" />
    </span>
  );
}

interface SwitchProps {
  checked: boolean;
  disabled?: boolean;
  "aria-label"?: string;
  onChange: (checked: boolean) => void;
}

export function Switch({ checked, disabled = false, onChange, ...aria }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      className="ui-switch"
      aria-checked={checked}
      aria-label={aria["aria-label"]}
      disabled={disabled}
      onClick={() => onChange(!checked)}
    />
  );
}
