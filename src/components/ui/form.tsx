"use client";

import { useEffect, useId, useRef, useState, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from "react";
import * as RadixSwitch from "@radix-ui/react-switch";
import { AlertCircle, Info } from "lucide-react";
import { cx } from "./primitives";

const inputBase =
  "w-full min-w-0 rounded-md border bg-surface-2 px-3 text-sm text-fg placeholder:text-subtle transition-colors hover:border-line-strong focus:border-accent focus:outline-none focus-visible:outline-2 focus-visible:outline-focus disabled:opacity-60";

export interface FieldShellProps {
  id: string;
  label: ReactNode;
  hint?: ReactNode;
  error?: string;
  info?: ReactNode;
  required?: boolean;
  className?: string;
  children: ReactNode;
}

export function FieldShell({ id, label, hint, error, info, required, className, children }: FieldShellProps) {
  return (
    <div className={cx("min-w-0", className)}>
      <div className="mb-1 flex items-center gap-1">
        <label htmlFor={id} className="text-sm font-medium text-fg">
          {label}
          {required && (
            <span className="text-accent" aria-hidden="true">
              {" "}*
            </span>
          )}
          {required && <span className="sr-only"> (zorunlu)</span>}
        </label>
        {info && <InfoTip label={typeof label === "string" ? label : "Bilgi"}>{info}</InfoTip>}
      </div>
      {children}
      {error ? (
        <p id={`${id}-error`} className="mt-1 flex items-center gap-1 text-xs text-danger" role="alert">
          <AlertCircle className="size-3.5 shrink-0" aria-hidden="true" />
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="mt-1 text-xs text-subtle">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export interface TextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "onChange" | "value"> {
  label: ReactNode;
  value: string;
  onValueChange: (v: string) => void;
  hint?: ReactNode;
  error?: string;
  info?: ReactNode;
  suffix?: string;
  numeric?: boolean;
  wrapperClassName?: string;
}

export function TextField({
  label,
  value,
  onValueChange,
  hint,
  error,
  info,
  suffix,
  numeric,
  wrapperClassName,
  id: idProp,
  required,
  className,
  ...rest
}: TextFieldProps) {
  const autoId = useId();
  const id = idProp ?? autoId;
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  return (
    <FieldShell id={id} label={label} hint={hint} error={error} info={info} required={required} className={wrapperClassName}>
      <div className="relative">
        <input
          id={id}
          value={value}
          onChange={(e) => onValueChange(e.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          aria-required={required || undefined}
          inputMode={numeric ? "decimal" : undefined}
          autoComplete="off"
          className={cx(
            inputBase,
            "h-10",
            numeric && "num text-right",
            suffix && "pr-10",
            error ? "border-danger" : "border-line",
            className,
          )}
          {...rest}
        />
        {suffix && (
          <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-subtle" aria-hidden="true">
            {suffix}
          </span>
        )}
      </div>
    </FieldShell>
  );
}

export interface SelectFieldProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, "onChange" | "value"> {
  label: ReactNode;
  value: string;
  onValueChange: (v: string) => void;
  options: { value: string; label: string; disabled?: boolean }[];
  hint?: ReactNode;
  error?: string;
  info?: ReactNode;
  wrapperClassName?: string;
}

export function SelectField({
  label,
  value,
  onValueChange,
  options,
  hint,
  error,
  info,
  wrapperClassName,
  id: idProp,
  className,
  ...rest
}: SelectFieldProps) {
  const autoId = useId();
  const id = idProp ?? autoId;
  return (
    <FieldShell id={id} label={label} hint={hint} error={error} info={info} className={wrapperClassName}>
      <select
        id={id}
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
        className={cx(inputBase, "h-10 pr-8", error ? "border-danger" : "border-line", className)}
        {...rest}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value} disabled={o.disabled}>
            {o.label}
          </option>
        ))}
      </select>
    </FieldShell>
  );
}

export function TextArea({
  label,
  value,
  onValueChange,
  hint,
  rows = 3,
  maxLength,
}: {
  label: string;
  value: string;
  onValueChange: (v: string) => void;
  hint?: string;
  rows?: number;
  maxLength?: number;
}) {
  const id = useId();
  return (
    <FieldShell id={id} label={label} hint={hint}>
      <textarea
        id={id}
        rows={rows}
        maxLength={maxLength}
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        className={cx(inputBase, "border-line py-2")}
      />
    </FieldShell>
  );
}

/** Erişilebilir anahtar (switch). */
export function Switch({
  checked,
  onChange,
  label,
  description,
  id: idProp,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: ReactNode;
  description?: ReactNode;
  id?: string;
  disabled?: boolean;
}) {
  const autoId = useId();
  const id = idProp ?? autoId;
  return (
    <div className="flex items-start gap-3">
      <RadixSwitch.Root
        id={id}
        checked={checked}
        onCheckedChange={onChange}
        disabled={disabled}
        aria-describedby={description ? `${id}-desc` : undefined}
        className={cx(
          "relative mt-0.5 inline-flex h-5 w-9 shrink-0 items-center rounded-full border transition-colors disabled:opacity-50",
          checked ? "border-accent bg-accent" : "border-line-strong bg-surface-3",
        )}
      >
        <RadixSwitch.Thumb
          className={cx(
            "block size-3.5 rounded-full shadow transition-transform",
            checked ? "translate-x-4 bg-on-accent" : "translate-x-0.5 bg-muted",
          )}
        />
      </RadixSwitch.Root>
      <div className="min-w-0">
        <label htmlFor={id} className="cursor-pointer text-sm text-fg">
          {label}
        </label>
        {description && (
          <p id={`${id}-desc`} className="text-xs text-subtle">
            {description}
          </p>
        )}
      </div>
    </div>
  );
}

/** Radyo grubu olarak çalışan bölümlü seçici. */
export function Segmented<T extends string>({
  label,
  value,
  onChange,
  options,
  hideLabel,
}: {
  label: string;
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string; icon?: ReactNode }[];
  hideLabel?: boolean;
}) {
  const name = useId();
  return (
    <fieldset className="min-w-0">
      <legend className={cx("mb-1 text-sm font-medium text-fg", hideLabel && "sr-only")}>{label}</legend>
      <div className="inline-flex max-w-full flex-wrap rounded-md border border-line bg-surface-2 p-0.5">
        {options.map((o) => {
          const active = o.value === value;
          return (
            <label
              key={o.value}
              className={cx(
                "flex cursor-pointer items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-focus",
                active ? "bg-accent font-semibold text-on-accent" : "text-muted hover:text-fg",
              )}
            >
              <input
                type="radio"
                name={name}
                value={o.value}
                checked={active}
                onChange={() => onChange(o.value)}
                className="sr-only"
              />
              {o.icon}
              {o.label}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

/** Tıklama, odak veya üzerine gelme ile açılan erişilebilir bilgi balonu. */
export function InfoTip({ label, children }: { label: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <span ref={ref} className="relative inline-flex" onMouseLeave={() => setOpen(false)}>
      <button
        type="button"
        aria-label={`Bilgi: ${label}`}
        aria-expanded={open}
        aria-describedby={open ? id : undefined}
        // Not toggle: fareyle üzerine gelmek zaten açar; tıklama (mouseenter'dan hemen sonra gelen
        // click olayı) bunu kapatıp açmasın diye her zaman açık bırakır. Kapatma; Escape, dışarı
        // tıklama, fareyi çekme veya odağın çıkmasıyla olur.
        onClick={() => setOpen(true)}
        onMouseEnter={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        className="rounded-full p-0.5 text-subtle hover:text-fg"
      >
        <Info className="size-3.5" aria-hidden="true" />
      </button>
      {open && (
        <span
          id={id}
          role="tooltip"
          className="absolute bottom-full left-1/2 z-30 mb-1.5 w-64 max-w-[calc(100vw-2rem)] -translate-x-1/2 rounded-md border border-line-strong bg-surface-3 px-3 py-2 text-xs font-normal leading-relaxed text-fg shadow-lg"
        >
          {children}
        </span>
      )}
    </span>
  );
}
