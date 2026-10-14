"use client";

import { useEffect } from "react";
import type { Settings } from "@/storage";

/**
 * Tema tercihini uygular. "system" seçiliyken işletim sisteminin tercihini anlık izler
 * (kullanıcı OS temasını değiştirirse uygulama da değişir); "light"/"dark" seçiliyken
 * kullanıcının tercihini sabit tutar.
 */
export function useAppliedTheme(theme: Settings["theme"]): void {
  useEffect(() => {
    if (theme !== "system") {
      document.documentElement.dataset.theme = theme;
      return;
    }
    const mql = window.matchMedia("(prefers-color-scheme: light)");
    const apply = () => {
      document.documentElement.dataset.theme = mql.matches ? "light" : "dark";
    };
    apply();
    mql.addEventListener("change", apply);
    return () => mql.removeEventListener("change", apply);
  }, [theme]);
}
