"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import * as AlertDialog from "@radix-ui/react-alert-dialog";
import { Check, CircleAlert, Info, X } from "lucide-react";
import { Button } from "./button";

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
      setToasts((t) => [...t.slice(-2), { id, tone, message }]);
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
        className="pointer-events-none fixed inset-x-0 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-50 flex flex-col items-center gap-2 px-4 lg:bottom-6 lg:items-end lg:px-6"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            role={t.tone === "error" ? "alert" : "status"}
            className="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-md border border-line-strong bg-hover py-2.5 pr-2 pl-3 text-sm text-fg"
          >
            {t.tone === "success" && <Check className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden="true" />}
            {t.tone === "error" && <CircleAlert className="mt-0.5 size-4 shrink-0 text-loss" aria-hidden="true" />}
            {t.tone === "info" && <Info className="mt-0.5 size-4 shrink-0 text-info" aria-hidden="true" />}
            <span className="min-w-0 flex-1">
              {t.tone === "error" && <span className="sr-only">Hata: </span>}
              {t.message}
            </span>
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

function ConfirmDialog({
  title,
  message,
  confirmLabel = "Onayla",
  cancelLabel = "Vazgeç",
  danger,
  onClose,
}: ConfirmOptions & { onClose: (v: boolean) => void }) {
  return (
    <AlertDialog.Root open onOpenChange={(open) => !open && onClose(false)}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="k-overlay fixed inset-0 z-50 bg-black/70" />
        <AlertDialog.Content
          className="k-dialog fixed inset-x-4 bottom-4 z-50 mx-auto max-w-md rounded-lg border border-line-strong bg-raised p-5 focus:outline-none sm:top-1/2 sm:bottom-auto sm:-translate-y-1/2"
          onOpenAutoFocus={(e) => {
            const cancel = (e.currentTarget as HTMLElement).querySelector<HTMLElement>("[data-cancel]");
            if (cancel) {
              e.preventDefault();
              cancel.focus();
            }
          }}
        >
          <AlertDialog.Title className="text-lg font-semibold text-fg">{title}</AlertDialog.Title>
          <AlertDialog.Description className="mt-2 text-sm leading-relaxed text-muted">{message}</AlertDialog.Description>
          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
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
