"use client";

import { useState } from "react";
import type { CalcCore, CommissionBase, PriceSolution } from "@/engine";
import { formatPercent, formatTRY } from "@/lib/format";
import { cn } from "@/lib/cn";

export const BASE_LABELS: Record<CommissionBase, string> = {
  gross: "KDV dâhil satış tutarı",
  net: "KDV hariç satış tutarı",
  manual: "Manuel taban tutarı",
};

/** Kâr/zarar tutarı: renk + işaret + ekran okuyucu için sözcük (yalnızca renge güvenmez). */
export function Amount({ value, className }: { value: number; className?: string }) {
  return (
    <span className={cn("num", value > 0 ? "text-accent" : value < 0 ? "text-loss" : "text-fg", className)}>
      {value < 0 && <span className="sr-only">Zarar </span>}
      {formatTRY(value)}
    </span>
  );
}

export function priceText(s: PriceSolution | null): { value: string; note?: string } {
  if (!s) return { value: "—", note: "Hedef girilmedi" };
  if (!s.ok) return { value: "Ulaşılamaz", note: s.message };
  return { value: formatTRY(s.price) };
}

type SegKey = "cost" | "commission" | "logistics" | "other" | "vat" | "profit";

const SEG: Record<SegKey, { label: string; color: string; hatch?: boolean }> = {
  cost: { label: "Ürün maliyeti", color: "var(--k-seg-cost)" },
  commission: { label: "Komisyon", color: "var(--k-seg-commission)" },
  logistics: { label: "Kargo ve paketleme", color: "var(--k-seg-logistics)" },
  other: { label: "Reklam, ücretler, diğer", color: "var(--k-seg-other)" },
  vat: { label: "KDV", color: "var(--k-seg-vat)", hatch: true },
  profit: { label: "Kalan: kâr", color: "var(--k-seg-profit)" },
};

/**
 * Müşterinin ödediği fiyatın kalemlere dağılımı. Kimlik: sabit sıralı kategorik renk + lejant
 * (her satırda tutar ve pay) — renk tek başına anlam taşımaz. Zararda, giderler satış fiyatını
 * aşar; aşan kısım taralı bir bölge ve "Satış fiyatı" işaretiyle gösterilir.
 */
export function PriceSplit({ core }: { core: CalcCore }) {
  const [hover, setHover] = useState<SegKey | null>(null);
  const exp = (k: string) => core.lines.find((l) => l.key === k)?.expense ?? 0;
  const sale = core.revenue + core.outputVat;
  if (sale <= 0) return null;

  const values: Record<SegKey, number> = {
    cost: exp("cost"),
    commission: exp("commission"),
    logistics: exp("shipping") + exp("packaging"),
    other: exp("advertising") + exp("other") + exp("saleFee") + exp("fixedShare"),
    vat: core.outputVat,
    profit: Math.max(core.profit, 0),
  };
  const loss = Math.max(-core.profit, 0);
  const scale = sale + loss;
  const keys = (Object.keys(SEG) as SegKey[]).filter((k) => values[k] > 0);
  const salePct = (sale / scale) * 100;

  const summary = keys.map((k) => `${SEG[k].label} ${formatTRY(values[k])}`).join(", ");

  return (
    <div>
      <div className="relative">
        <div
          role="img"
          aria-label={`Satış fiyatı ${formatTRY(sale)} dağılımı: ${summary}${loss > 0 ? `; zarar ${formatTRY(loss)}` : ""}`}
          className="flex h-3 w-full gap-[2px] overflow-hidden rounded-[4px]"
        >
          {keys.map((k) => (
            <div
              key={k}
              onPointerEnter={(e) => e.pointerType === "mouse" && setHover(k)}
              onPointerLeave={() => setHover(null)}
              className={cn("h-full min-w-[3px] transition-opacity", SEG[k].hatch && "k-hatch", hover && hover !== k && "opacity-35")}
              style={{ width: `${(values[k] / scale) * 100}%`, backgroundColor: SEG[k].color }}
            />
          ))}
        </div>
        {loss > 0 && (
          <>
            <div
              aria-hidden="true"
              className="k-hatch pointer-events-none absolute inset-y-0 right-0 rounded-r-[4px] border border-loss"
              style={{ left: `${salePct}%` }}
            />
            <div aria-hidden="true" className="absolute -top-1 -bottom-1 w-0.5 bg-fg" style={{ left: `${salePct}%` }} />
          </>
        )}
      </div>

      <ul className="mt-4 space-y-0.5 text-sm">
        {keys.map((k) => (
          <li
            key={k}
            onPointerEnter={(e) => e.pointerType === "mouse" && setHover(k)}
            onPointerLeave={() => setHover(null)}
            className={cn("flex items-center gap-2.5 rounded px-1.5 py-1", hover === k && "bg-hover")}
          >
            <span
              aria-hidden="true"
              className={cn("size-2.5 shrink-0 rounded-[2px]", SEG[k].hatch && "k-hatch")}
              style={{ backgroundColor: SEG[k].color }}
            />
            <span className="flex-1 text-muted">{SEG[k].label}</span>
            <span className="num text-fg">{formatTRY(values[k])}</span>
            <span className="num w-14 text-right text-subtle">{formatPercent((values[k] / sale) * 100)}</span>
          </li>
        ))}
        {loss > 0 && (
          <li className="flex items-center gap-2.5 px-1.5 py-1">
            <span aria-hidden="true" className="k-hatch size-2.5 shrink-0 rounded-[2px] border border-loss" />
            <span className="flex-1 text-muted">Satış fiyatını aşan gider (zarar)</span>
            <span className="num text-loss">{formatTRY(loss)}</span>
            <span className="num w-14 text-right text-subtle">{formatPercent((loss / sale) * 100)}</span>
          </li>
        )}
      </ul>
    </div>
  );
}
