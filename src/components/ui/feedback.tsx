"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
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
              "pointer-events-auto flex w-full max-w-sm items-start gap-2 rounded-lg border bg-surface-3 px-3 py-2.5 text-sm text-fg shadow-xl",
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

/* ---------- Onay penceresi ---------- */

function ConfirmDialog({
  title,
  message,
  confirmLabel = "Onayla",
  cancelLabel = "Vazgeç",
  danger,
  onClose,
}: ConfirmOptions & { onClose: (v: boolean) => void }) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    // Yanlışlıkla onaylamayı önlemek için odak "Vazgeç" düğmesinde başlar.
    cancelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose(false);
      }
      if (e.key === "Tab" && panelRef.current) {
        const focusables = panelRef.current.querySelectorAll<HTMLElement>("button");
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      previous?.focus?.();
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onMouseDown={() => onClose(false)}>
      <div
        ref={panelRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-message"
        onMouseDown={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-xl border border-line-strong bg-surface p-5 shadow-2xl"
      >
        <div className="flex items-start gap-3">
          {danger && (
            <span className="rounded-full bg-danger-bg p-2 text-danger" aria-hidden="true">
              <AlertTriangle className="size-5" />
            </span>
          )}
          <div className="min-w-0">
            <h2 id="confirm-title" className="text-base font-semibold text-fg">
              {title}
            </h2>
            <div id="confirm-message" className="mt-1 text-sm text-muted">
              {message}
            </div>
          </div>
        </div>
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <Button ref={cancelRef} onClick={() => onClose(false)}>
            {cancelLabel}
          </Button>
          <Button variant={danger ? "danger" : "primary"} onClick={() => onClose(true)}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
