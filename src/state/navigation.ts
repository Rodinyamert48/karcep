"use client";

import { useCallback, useSyncExternalStore } from "react";

export const SECTIONS = [
  { id: "genel-bakis", label: "Genel Bakış", short: "Genel" },
  { id: "hesaplayici", label: "Kâr Hesaplayıcı", short: "Hesapla" },
  { id: "urunler", label: "Ürünlerim", short: "Ürünler" },
  { id: "senaryolar", label: "Fiyat Senaryoları", short: "Senaryolar" },
  { id: "ayarlar", label: "Komisyon ve Gider Ayarları", short: "Ayarlar" },
  { id: "gecmis", label: "Hesaplama Geçmişi", short: "Geçmiş" },
  { id: "hakkinda", label: "Hakkında ve Gizlilik", short: "Hakkında" },
] as const;

export type SectionId = (typeof SECTIONS)[number]["id"];

const DEFAULT: SectionId = "genel-bakis";

function readHash(): SectionId {
  if (typeof window === "undefined") return DEFAULT;
  const h = window.location.hash.replace(/^#\/?/, "");
  return (SECTIONS.find((s) => s.id === h)?.id ?? DEFAULT) as SectionId;
}

function subscribe(cb: () => void) {
  window.addEventListener("hashchange", cb);
  return () => window.removeEventListener("hashchange", cb);
}

/** Hash tabanlı bölüm yönlendirmesi: statik barındırmada (GitHub Pages) yenilemede 404 oluşmaz. */
export function useSection(): [SectionId, (id: SectionId) => void] {
  const section = useSyncExternalStore(subscribe, readHash, () => DEFAULT);
  const navigate = useCallback((id: SectionId) => {
    if (readHash() === id && window.location.hash) {
      window.dispatchEvent(new HashChangeEvent("hashchange"));
    } else {
      window.location.hash = id;
    }
    window.scrollTo({ top: 0 });
  }, []);
  return [section, navigate];
}
