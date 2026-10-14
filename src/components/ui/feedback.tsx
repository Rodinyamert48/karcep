"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import * as AlertDialog from "@radix-ui/react-alert-dialog";
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from "lucide-react";
import { Button, cx } from "./primitives";

/* ---------- Bildirimler (toast) ---------- */

type ToastTone = "success" | "error" | "info";
interface Toast {
  id: number;
  tone: ToastTone;
  message: string;
}

interface ConfirmOptions {
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

interface FeedbackApi {
  toast: (message: string, tone?: ToastTone) => void;
  confirm: (opts: ConfirmOptions) => Promise<boolean>;
}

const FeedbackContext = createContext<FeedbackApi | null>(null);

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [dialog, setDialog] = useState<(ConfirmOptions & { resolve: (v: boolean) => void }) | null>(null);
  const counter = useRef(0);

  const dismiss = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), []);

  const toast = useCallback(
    (message: string, tone: ToastTone = "success") => {
      const id = ++counter.current;
      setToasts((t) => [...t.slice(-3), { id, tone, message }]);
      setTimeout(() => dismiss(id), tone === "error" ? 7000 : 4000);
    },
    [dismiss],
  );

  const confirm = useCallback(
    (opts: ConfirmOptions) => new Promise<boolean>((resolve) => setDialog({ ...opts, resolve })),
    [],
  );

  const dialogRef = useRef(dialog);
  useEffect(() => {
    dialogRef.current = dialog;
  }, [dialog]);
  const close = useCallback((value: boolean) => {
    dialogRef.current?.resolve(value);
    dialogRef.current = null;
    setDialog(null);
  }, []);

  return (
    <FeedbackContext.Provider value={{ toast, confirm }}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex flex-col items-center gap-2 p-4 sm:items-end"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            role={t.tone === "error" ? "alert" : "status"}
            className={cx(
              "pointer-events-auto flex w-full max-w-sm items-start gap-2 rounded-md border bg-surface-3 px-3 py-2.5 text-sm text-fg shadow-xl",
              t.tone === "success" && "border-success/40",
              t.tone === "error" && "border-danger/50",
              t.tone === "info" && "border-info/40",
            )}
          >
            {t.tone === "success" && <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" aria-hidden="true" />}
            {t.tone === "error" && <XCircle className="mt-0.5 size-4 shrink-0 text-danger" aria-hidden="true" />}
            {t.tone === "info" && <Info className="mt-0.5 size-4 shrink-0 text-info" aria-hidden="true" />}
            <span className="min-w-0 flex-1">{t.message}</span>
            <button
              type="button"
              onClick={() => dismiss(t.id)}
              className="rounded p-0.5 text-subtle hover:text-fg"
              aria-label="Bildirimi kapat"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          </div>
        ))}
      </div>
      {dialog && <ConfirmDialog {...dialog} onClose={close} />}
    </FeedbackContext.Provider>
  );
}

export function useFeedback(): FeedbackApi {
  const ctx = useContext(FeedbackContext);
  if (!ctx) throw new Error("useFeedback, FeedbackProvider içinde kullanılmalı");
  return ctx;
}

/* ---------- Onay penceresi (Radix AlertDialog) ---------- */

function ConfirmDialog({
  title,
  message,
  confirmLabel = "Onayla",
  cancelLabel = "Vazgeç",
  danger,
  onClose,
}: ConfirmOptions & { onClose: (v: boolean) => void }) {
  return (
    <AlertDialog.Root
      open
      onOpenChange={(open) => {
        if (!open) onClose(false);
      }}
    >
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="k-overlay fixed inset-0 z-50 bg-black/60" />
        <AlertDialog.Content
          className="k-dialog fixed top-1/2 left-1/2 z-50 w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-md border border-line-strong bg-surface p-5 shadow-2xl focus:outline-none"
          // Radix odağı ilk etkileşimli öğeye taşır; yanlışlıkla onaylamayı önlemek için
          // "Vazgeç" önce gelir (bkz. JSX sırası), bu yüzden varsayılan odak güvenlidir.
          onOpenAutoFocus={(e) => {
            const cancel = (e.currentTarget as HTMLElement).querySelector<HTMLElement>("[data-cancel]");
            if (cancel) {
              e.preventDefault();
              cancel.focus();
            }
          }}
        >
          <div className="flex items-start gap-3">
            {danger && (
              <span className="rounded-full bg-danger-bg p-2 text-danger" aria-hidden="true">
                <AlertTriangle className="size-5" />
              </span>
            )}
            <div className="min-w-0">
              <AlertDialog.Title className="text-base font-semibold text-fg">{title}</AlertDialog.Title>
              <AlertDialog.Description className="mt-1 text-sm text-muted">{message}</AlertDialog.Description>
            </div>
          </div>
          <div className="mt-5 flex flex-wrap justify-end gap-2">
            <AlertDialog.Cancel asChild>
              <Button data-cancel onClick={() => onClose(false)}>
                {cancelLabel}
              </Button>
            </AlertDialog.Cancel>
            <AlertDialog.Action asChild>
              <Button variant={danger ? "danger" : "primary"} onClick={() => onClose(true)}>
                {confirmLabel}
              </Button>
            </AlertDialog.Action>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
