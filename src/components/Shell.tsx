"use client";

import { useState, type ReactNode } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import {
  Calculator,
  ChevronRight,
  Ellipsis,
  History,
  Info,
  LayoutGrid,
  Package,
  SlidersHorizontal,
  Spline,
  X,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { SECTIONS, type SectionId } from "@/state/navigation";

const ICON: Record<SectionId, typeof Calculator> = {
  "genel-bakis": LayoutGrid,
  hesaplayici: Calculator,
  urunler: Package,
  senaryolar: Spline,
  ayarlar: SlidersHorizontal,
  gecmis: History,
  hakkinda: Info,
};

/** Mobil alt çubukta doğrudan görünen bölümler; diğerleri "Diğer" sayfasında. */
const PRIMARY: SectionId[] = ["genel-bakis", "hesaplayici", "urunler", "senaryolar"];
const SECONDARY: SectionId[] = ["ayarlar", "gecmis", "hakkinda"];

export function Mark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={cn("size-5 text-accent", className)} fill="currentColor" aria-hidden="true">
      <path d="M2 21v-6h5v6zM9.5 21V10h5v11zM17 21V3h5v18z" />
    </svg>
  );
}

function sectionById(id: SectionId) {
  return SECTIONS.find((s) => s.id === id)!;
}

export function Shell({
  current,
  onNavigate,
  banner,
  children,
}: {
  current: SectionId;
  onNavigate: (id: SectionId) => void;
  banner?: ReactNode;
  children: ReactNode;
}) {
  const [moreOpen, setMoreOpen] = useState(false);

  const go = (id: SectionId) => {
    setMoreOpen(false);
    onNavigate(id);
    requestAnimationFrame(() => document.getElementById("main")?.focus());
  };

  const link = (id: SectionId) => ({
    href: `#${id}`,
    "aria-current": id === current ? ("page" as const) : undefined,
    onClick: (e: React.MouseEvent) => {
      e.preventDefault();
      go(id);
    },
  });

  return (
    <div className="min-h-dvh">
      <a
        href="#main"
        onClick={(e) => {
          e.preventDefault();
          document.getElementById("main")?.focus();
        }}
        className="sr-only z-[60] rounded-md bg-accent px-3 py-2 text-on-accent focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
      >
        İçeriğe geç
      </a>

      <header className="sticky top-0 z-30 border-b border-line bg-bg/90 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-8 px-4 sm:px-6">
          <a {...link("genel-bakis")} aria-current={undefined} className="flex shrink-0 items-center gap-2">
            <Mark />
            <span className="text-[15px] font-semibold tracking-tight">KârCep</span>
          </a>
          <nav aria-label="Ana menü" className="hidden h-full lg:block">
            <ul className="flex h-full items-stretch gap-1">
              {SECTIONS.map((s) => {
                const active = s.id === current;
                return (
                  <li key={s.id} className="relative flex">
                    <a
                      {...link(s.id)}
                      className={cn(
                        "flex items-center px-3 text-sm transition-colors",
                        active ? "text-fg" : "text-muted hover:text-fg",
                      )}
                    >
                      {s.short}
                    </a>
                    {active && <span aria-hidden="true" className="absolute inset-x-3 -bottom-px h-0.5 bg-accent" />}
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>
      </header>

      {banner}

      <main
        id="main"
        tabIndex={-1}
        className="mx-auto w-full max-w-6xl px-4 pt-8 pb-[calc(7rem+env(safe-area-inset-bottom))] focus:outline-none sm:px-6 lg:pt-12 lg:pb-20"
      >
        {children}
      </main>

      {/* Mobil alt sekme çubuğu */}
      <nav
        aria-label="Ana menü"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-bg/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden"
      >
        <ul className="mx-auto grid max-w-lg grid-cols-5">
          {PRIMARY.map((id) => {
            const Icon = ICON[id];
            const active = id === current;
            return (
              <li key={id}>
                <a
                  {...link(id)}
                  className={cn(
                    "flex h-16 flex-col items-center justify-center gap-1 text-[11px] transition-colors",
                    active ? "text-fg" : "text-subtle",
                  )}
                >
                  <Icon className={cn("size-5", active && "text-accent")} aria-hidden="true" />
                  {sectionById(id).short}
                </a>
              </li>
            );
          })}
          <li>
            <Dialog.Root open={moreOpen} onOpenChange={setMoreOpen}>
              <Dialog.Trigger asChild>
                <button
                  type="button"
                  className={cn(
                    "flex h-16 w-full flex-col items-center justify-center gap-1 text-[11px] transition-colors",
                    SECONDARY.includes(current) ? "text-fg" : "text-subtle",
                  )}
                >
                  <Ellipsis className={cn("size-5", SECONDARY.includes(current) && "text-accent")} aria-hidden="true" />
                  Diğer
                </button>
              </Dialog.Trigger>
              <Dialog.Portal>
                <Dialog.Overlay className="k-overlay fixed inset-0 z-40 bg-black/70" />
                <Dialog.Content className="k-sheet fixed inset-x-0 bottom-0 z-50 rounded-t-xl border-t border-line-strong bg-raised pb-[calc(1rem+env(safe-area-inset-bottom))] focus:outline-none">
                  <div className="flex items-center justify-between px-5 pt-4 pb-2">
                    <Dialog.Title className="text-base font-semibold">Diğer bölümler</Dialog.Title>
                    <Dialog.Close className="rounded-md p-2 text-muted hover:text-fg" aria-label="Kapat">
                      <X className="size-5" aria-hidden="true" />
                    </Dialog.Close>
                  </div>
                  <Dialog.Description className="sr-only">Ayarlar, geçmiş ve uygulama bilgileri</Dialog.Description>
                  <ul className="px-2">
                    {SECONDARY.map((id) => {
                      const Icon = ICON[id];
                      return (
                        <li key={id}>
                          <a
                            {...link(id)}
                            className="flex items-center gap-3 rounded-md px-3 py-3.5 text-[15px] hover:bg-hover"
                          >
                            <Icon className={cn("size-5", id === current ? "text-accent" : "text-subtle")} aria-hidden="true" />
                            <span className="flex-1">{sectionById(id).label}</span>
                            <ChevronRight className="size-4 text-subtle" aria-hidden="true" />
                          </a>
                        </li>
                      );
                    })}
                  </ul>
                </Dialog.Content>
              </Dialog.Portal>
            </Dialog.Root>
          </li>
        </ul>
      </nav>
    </div>
  );
}
