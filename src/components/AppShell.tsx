"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  Calculator,
  History,
  Info,
  LayoutDashboard,
  Menu,
  Package,
  SlidersHorizontal,
  TrendingUp,
  Wallet,
  X,
} from "lucide-react";
import { SECTIONS, type SectionId } from "@/state/navigation";
import { cx } from "./ui/primitives";

const ICONS: Record<SectionId, ReactNode> = {
  "genel-bakis": <LayoutDashboard className="size-4" aria-hidden="true" />,
  hesaplayici: <Calculator className="size-4" aria-hidden="true" />,
  urunler: <Package className="size-4" aria-hidden="true" />,
  senaryolar: <TrendingUp className="size-4" aria-hidden="true" />,
  ayarlar: <SlidersHorizontal className="size-4" aria-hidden="true" />,
  gecmis: <History className="size-4" aria-hidden="true" />,
  hakkinda: <Info className="size-4" aria-hidden="true" />,
};

function Brand() {
  return (
    <div className="flex items-center gap-2">
      <span className="flex size-8 items-center justify-center rounded-lg bg-accent text-on-accent" aria-hidden="true">
        <Wallet className="size-4.5" />
      </span>
      <span className="text-lg font-bold tracking-tight text-fg">
        Kâr<span className="text-accent">Cep</span>
      </span>
    </div>
  );
}

function NavList({ current, onNavigate }: { current: SectionId; onNavigate: (id: SectionId) => void }) {
  return (
    <ul className="space-y-0.5">
      {SECTIONS.map((s) => {
        const active = s.id === current;
        return (
          <li key={s.id}>
            <a
              href={`#${s.id}`}
              aria-current={active ? "page" : undefined}
              onClick={(e) => {
                e.preventDefault();
                onNavigate(s.id);
              }}
              className={cx(
                "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors",
                active ? "bg-accent/15 font-semibold text-accent" : "text-muted hover:bg-surface-2 hover:text-fg",
              )}
            >
              {ICONS[s.id]}
              {s.label}
            </a>
          </li>
        );
      })}
    </ul>
  );
}

export function AppShell({
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
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    drawerRef.current?.querySelector<HTMLElement>("a,button")?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMenuOpen(false);
        menuButton.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  const go = (id: SectionId) => {
    setMenuOpen(false);
    onNavigate(id);
    // İçerik değişince odak ana başlığa taşınır (ekran okuyucular için).
    requestAnimationFrame(() => document.getElementById("main")?.focus());
  };

  return (
    <div className="min-h-dvh">
      <a
        href="#main"
        onClick={(e) => {
          e.preventDefault();
          document.getElementById("main")?.focus();
        }}
        className="sr-only z-50 rounded-md bg-accent px-3 py-2 text-on-accent focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
      >
        İçeriğe geç
      </a>

      {/* Masaüstü kenar çubuğu */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-line bg-surface lg:flex">
        <div className="px-5 py-5">
          <Brand />
          <p className="mt-1 text-xs text-subtle">E-ticaret kârlılık hesaplayıcı</p>
        </div>
        <nav aria-label="Ana menü" className="flex-1 overflow-y-auto px-3">
          <NavList current={current} onNavigate={go} />
        </nav>
        <p className="border-t border-line px-5 py-4 text-xs text-subtle">
          Veriler yalnızca bu tarayıcıda saklanır. Sonuçlar tahminidir.
        </p>
      </aside>

      {/* Mobil üst çubuk */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-line bg-surface/95 px-4 py-2.5 backdrop-blur lg:hidden">
        <Brand />
        <button
          ref={menuButton}
          type="button"
          onClick={() => setMenuOpen(true)}
          aria-expanded={menuOpen}
          aria-controls="mobile-nav"
          className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-sm text-fg"
        >
          <Menu className="size-4" aria-hidden="true" />
          Menü
        </button>
      </header>

      {menuOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMenuOpen(false)} aria-hidden="true" />
          <div
            ref={drawerRef}
            id="mobile-nav"
            role="dialog"
            aria-modal="true"
            aria-label="Ana menü"
            className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col border-r border-line bg-surface"
          >
            <div className="flex items-center justify-between px-4 py-3">
              <Brand />
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  menuButton.current?.focus();
                }}
                className="rounded-lg p-2 text-muted hover:text-fg"
                aria-label="Menüyü kapat"
              >
                <X className="size-5" aria-hidden="true" />
              </button>
            </div>
            <nav aria-label="Ana menü" className="flex-1 overflow-y-auto px-3 pb-4">
              <NavList current={current} onNavigate={go} />
            </nav>
          </div>
        </div>
      )}

      <div className="lg:pl-64">
        {banner}
        <main id="main" tabIndex={-1} className="mx-auto w-full max-w-7xl px-4 py-6 focus:outline-none sm:px-6 lg:px-8 lg:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
