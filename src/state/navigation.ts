"use client";

import { useCallback, useSyncExternalStore } from "react";

export const SECTIONS = [
  { id: "genel-bakis", label: "Genel Bakış" },
  { id: "hesaplayici", label: "Kâr Hesaplayıcı" },
  { id: "urunler", label: "Ürünlerim" },
  { id: "senaryolar", label: "Fiyat Senaryoları" },
  { id: "ayarlar", label: "Komisyon ve Gider Ayarları" },
  { id: "gecmis", label: "Hesaplama Geçmişi" },
  { id: "hakkinda", label: "Hakkında ve Gizlilik" },
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
