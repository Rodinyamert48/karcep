import type { HistoryEntry, MarketplaceProfile } from "./types";

/** Excel'in Türkçe ayarlarında doğru açılması için: UTF-8 BOM, ";" ayraç, virgüllü ondalık, CRLF. */
const BOM = "﻿";
const SEP = ";";

/** Formül enjeksiyonunu önlemek için metin hücrelerini güvenli hale getirir. */
export function csvText(value: string): string {
  let v = value ?? "";
  if (/^[=+\-@\t\r]/.test(v)) v = "'" + v;
  if (/[";\r\n]/.test(v)) v = `"${v.replace(/"/g, '""')}"`;
  return v;
}

export function csvMoney(kurus: number | null): string {
  if (kurus === null) return "";
  const negative = kurus < 0;
  const abs = Math.abs(kurus);
  const s = `${Math.floor(abs / 100)},${String(abs % 100).padStart(2, "0")}`;
  return negative ? `-${s}` : s;
}

export function csvNumber(n: number | null, decimals = 2): string {
  if (n === null || !Number.isFinite(n)) return "";
  return n.toFixed(decimals).replace(".", ",");
}

function csvDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const p = (x: number) => String(x).padStart(2, "0");
  return `${p(d.getDate())}.${p(d.getMonth() + 1)}.${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

export function historyToCsv(entries: HistoryEntry[], marketplaces: MarketplaceProfile[]): string {
  const header = [
    "Tarih",
    "Ürün",
    "Pazaryeri",
    "Kategori",
    "Hesaplama modu",
    "Satış fiyatı (TL)",
    "Satış fiyatı KDV",
    "Komisyon (TL)",
    "Toplam gider (TL)",
    "Tahmini kâr (TL)",
    "Kâr marjı (%)",
    "Başa baş fiyatı (TL)",
  ];
  const rows = entries.map((e) => {
    const mp = marketplaces.find((m) => m.id === e.meta.marketplaceId)?.name ?? e.meta.marketplaceId;
    return [
      csvDate(e.createdAt),
      csvText(e.meta.productName || "Adsız"),
      csvText(mp),
      csvText(e.meta.category),
      e.summary.mode === "vat" ? "KDV ayrıştırmalı" : "Hızlı",
      csvMoney(e.summary.salePrice),
      e.values.saleIncludesVat ? "Dâhil" : "Hariç",
      csvMoney(e.summary.commission),
      csvMoney(e.summary.totalExpense),
      csvMoney(e.summary.profit),
      csvNumber(e.summary.marginPercent),
      csvMoney(e.summary.breakEven),
    ].join(SEP);
  });
  return BOM + [header.join(SEP), ...rows].join("\r\n") + "\r\n";
}
