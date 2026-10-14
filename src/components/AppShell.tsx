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

/** Üç yükselen çubuktan oluşan marka işareti: dairesel ikon kutusu kullanmaz, doğrudan zemine oturur. */
function Mark({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className="text-accent" aria-hidden="true">
      <rect x="2" y="13" width="5" height="9" />
      <rect x="9.5" y="8" width="5" height="14" />
      <rect x="17" y="2" width="5" height="20" />
    </svg>
  );
}

function Brand() {
  return (
    <div className="flex items-center gap-2.5">
      <Mark />
      <span className="text-sm font-semibold tracking-wide text-fg">KârCep</span>
    </div>
  );
}

/** Dolgulu "aktif sekme" yerine sol kenarda ince bir şerit kullanan, gruplanmış gezinme listesi. */
function NavList({ current, onNavigate }: { current: SectionId; onNavigate: (id: SectionId) => void }) {
  const groups: { label: string | null; ids: SectionId[] }[] = [
    { label: null, ids: ["genel-bakis"] },
    { label: "Hesaplama", ids: ["hesaplayici", "urunler", "senaryolar"] },
    { label: "Yönetim", ids: ["ayarlar", "gecmis"] },
    { label: null, ids: ["hakkinda"] },
  ];
  const byId = Object.fromEntries(SECTIONS.map((s) => [s.id, s.label])) as Record<SectionId, string>;

  return (
    <div className="space-y-5">
      {groups.map((group, i) => (
        <div key={i} className={i === groups.length - 1 ? "border-t border-line pt-3" : undefined}>
          {group.label && (
            <p className="px-4 pb-1.5 text-[11px] font-medium tracking-wider text-subtle uppercase">{group.label}</p>
          )}
          <ul>
            {group.ids.map((id) => {
              const active = id === current;
              return (
                <li key={id} className="relative">
                  {active && <span className="absolute top-1 bottom-1 left-0 w-0.5 bg-accent" aria-hidden="true" />}
                  <a
                    href={`#${id}`}
                    aria-current={active ? "page" : undefined}
                    onClick={(e) => {
                      e.preventDefault();
                      onNavigate(id);
                    }}
                    className={cx(
                      "flex items-center gap-3 py-2 pr-3 pl-4 text-sm transition-colors",
                      active ? "font-medium text-fg" : "text-muted hover:text-fg",
                    )}
                  >
                    <span className={active ? "text-accent" : "text-subtle"}>{ICONS[id]}</span>
                    {byId[id]}
                  </a>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
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
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-56 flex-col border-r border-line bg-surface lg:flex">
        <div className="px-4 py-5">
          <Brand />
        </div>
        <nav aria-label="Ana menü" className="flex-1 overflow-y-auto">
          <NavList current={current} onNavigate={go} />
        </nav>
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
          className="inline-flex items-center gap-1.5 rounded-md border border-line px-3 py-1.5 text-sm text-fg"
        >
          <Menu className="size-4" aria-hidden="true" />
          Menü
        </button>
      </header>

      {menuOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/70" onClick={() => setMenuOpen(false)} aria-hidden="true" />
          <div
            ref={drawerRef}
            id="mobile-nav"
            role="dialog"
            aria-modal="true"
            aria-label="Ana menü"
            className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col border-r border-line bg-surface"
          >
            <div className="flex items-center justify-between px-4 py-4">
              <Brand />
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  menuButton.current?.focus();
                }}
                className="rounded-md p-2 text-muted hover:text-fg"
                aria-label="Menüyü kapat"
              >
                <X className="size-5" aria-hidden="true" />
              </button>
            </div>
            <nav aria-label="Ana menü" className="flex-1 overflow-y-auto pb-4">
              <NavList current={current} onNavigate={go} />
            </nav>
          </div>
        </div>
      )}

      <div className="lg:pl-56">
        {banner}
        <main id="main" tabIndex={-1} className="mx-auto w-full max-w-7xl px-4 py-6 focus:outline-none sm:px-6 lg:px-8 lg:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
