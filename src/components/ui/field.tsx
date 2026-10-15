"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
} from "react";
import * as RadixSwitch from "@radix-ui/react-switch";
import { CircleHelp } from "lucide-react";
import { cn } from "@/lib/cn";

const control =
  "w-full min-w-0 rounded-md border bg-sunken px-3 text-[15px] text-fg placeholder:text-subtle transition-colors hover:border-line-strong focus:border-accent focus:outline-none disabled:opacity-50";

interface ShellProps {
  id: string;
  label: ReactNode;
  hint?: ReactNode;
  error?: string;
  help?: ReactNode;
  required?: boolean;
  optional?: boolean;
  className?: string;
  children: ReactNode;
}

/** Etiket + kontrol + ipucu/hata. Hata metni role="alert" ile duyurulur ve alana aria-describedby ile bağlanır. */
export function FieldShell({ id, label, hint, error, help, required, optional, className, children }: ShellProps) {
  return (
    <div className={cn("min-w-0", className)}>
      <div className="mb-1.5 flex items-center gap-1.5">
        <label htmlFor={id} className="text-sm text-muted">
          {label}
          {required && <span className="sr-only"> (zorunlu)</span>}
        </label>
        {required && (
          <span aria-hidden="true" className="text-accent">
            •
          </span>
        )}
        {optional && <span className="text-xs text-subtle">isteğe bağlı</span>}
        {help && <Help label={typeof label === "string" ? label : "Bilgi"}>{help}</Help>}
      </div>
      {children}
      {error ? (
        <p id={`${id}-error`} role="alert" className="mt-1.5 text-[13px] text-loss">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="mt-1.5 text-[13px] text-subtle">
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
  help?: ReactNode;
  unit?: string;
  numeric?: boolean;
  optional?: boolean;
  wrapperClassName?: string;
}

export function TextField({
  label,
  value,
  onValueChange,
  hint,
  error,
  help,
  unit,
  numeric,
  optional,
  wrapperClassName,
  id: idProp,
  required,
  className,
  ...rest
}: TextFieldProps) {
  const auto = useId();
  const id = idProp ?? auto;
  return (
    <FieldShell
      id={id}
      label={label}
      hint={hint}
      error={error}
      help={help}
      required={required}
      optional={optional}
      className={wrapperClassName}
    >
      <div className="relative">
        <input
          id={id}
          value={value}
          onChange={(e) => onValueChange(e.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
          aria-required={required || undefined}
          inputMode={numeric ? "decimal" : undefined}
          autoComplete="off"
          className={cn(
            control,
            "h-10",
            numeric && "num text-right",
            unit && "pr-10",
            error ? "border-loss" : "border-line",
            className,
          )}
          {...rest}
        />
        {unit && (
          <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-subtle">
            {unit}
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
  options: { value: string; label: string }[];
  hint?: ReactNode;
  error?: string;
  help?: ReactNode;
  wrapperClassName?: string;
}

export function SelectField({
  label,
  value,
  onValueChange,
  options,
  hint,
  error,
  help,
  wrapperClassName,
  id: idProp,
  className,
  ...rest
}: SelectFieldProps) {
  const auto = useId();
  const id = idProp ?? auto;
  return (
    <FieldShell id={id} label={label} hint={hint} error={error} help={help} className={wrapperClassName}>
      <select
        id={id}
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
        className={cn(control, "h-10 pr-9", error ? "border-loss" : "border-line", className)}
        {...rest}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
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
        className={cn(control, "border-line py-2")}
      />
    </FieldShell>
  );
}

/** Radix Switch tabanlı açma/kapama. Etiket tıklanabilir, açıklama aria-describedby ile bağlıdır. */
export function Toggle({
  checked,
  onChange,
  label,
  description,
  id: idProp,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: ReactNode;
  description?: ReactNode;
  id?: string;
}) {
  const auto = useId();
  const id = idProp ?? auto;
  return (
    <div className="flex items-start gap-3">
      <RadixSwitch.Root
        id={id}
        checked={checked}
        onCheckedChange={onChange}
        aria-describedby={description ? `${id}-desc` : undefined}
        className={cn(
          "relative mt-0.5 inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors",
          checked ? "bg-accent" : "bg-line-strong",
        )}
      >
        <RadixSwitch.Thumb
          className={cn(
            "block size-4 rounded-full transition-transform",
            checked ? "translate-x-[18px] bg-on-accent" : "translate-x-0.5 bg-fg",
          )}
        />
      </RadixSwitch.Root>
      <div className="min-w-0">
        <label htmlFor={id} className="cursor-pointer text-sm text-fg">
          {label}
        </label>
        {description && (
          <p id={`${id}-desc`} className="mt-0.5 text-[13px] text-subtle">
            {description}
          </p>
        )}
      </div>
    </div>
  );
}

/** Radyo grubu olarak çalışan bölümlü seçim. */
export function Choice<T extends string>({
  label,
  value,
  onChange,
  options,
  hideLabel,
  className,
}: {
  label: string;
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
  hideLabel?: boolean;
  className?: string;
}) {
  const name = useId();
  return (
    <fieldset className={cn("min-w-0", className)}>
      <legend className={cn("mb-1.5 text-sm text-muted", hideLabel && "sr-only")}>{label}</legend>
      <div className="inline-flex max-w-full rounded-md border border-line bg-sunken p-0.5">
        {options.map((o) => {
          const active = o.value === value;
          return (
            <label
              key={o.value}
              className={cn(
                "cursor-pointer rounded-[5px] px-3 py-1.5 text-sm transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-accent",
                active ? "bg-hover text-fg" : "text-muted hover:text-fg",
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
              {o.label}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

/**
 * Bilgi balonu: fareyle üzerine gelince, odaklanınca veya tıklayınca açılır;
 * Escape, dışarı tıklama veya odak kaybıyla kapanır.
 */
export function Help({ label, children }: { label: string; children: ReactNode }) {
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
        onClick={() => setOpen(true)}
        onMouseEnter={() => setOpen(true)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        className="rounded-full text-subtle hover:text-fg"
      >
        <CircleHelp className="size-3.5" aria-hidden="true" />
      </button>
      {open && (
        <span
          id={id}
          role="tooltip"
          className="absolute bottom-full left-1/2 z-40 mb-2 w-64 max-w-[calc(100vw-2rem)] -translate-x-1/2 rounded-md border border-line-strong bg-hover px-3 py-2 text-[13px] leading-relaxed font-normal text-fg"
        >
          {children}
        </span>
      )}
    </span>
  );
}
