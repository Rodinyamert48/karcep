import { breakEvenPrice, computeCore } from "./calculate";
import type { Kurus } from "./money";
import type { CalcCore, CalcInput, PriceSolution } from "./types";
import { assertValidInput } from "./validate";

export interface ScenarioRow {
  price: Kurus;
  core: CalcCore;
  /** Fiyat − başa baş fiyatı (kuruş). Başa baş bulunamazsa null. */
  distanceToBreakEven: Kurus | null;
  /** Fiyatın başa baş noktasına kadar düşebileceği oran (% , fiyata göre). */
  safetyMarginPercent: number | null;
}

export interface ScenarioComparison {
  breakEven: PriceSolution;
  rows: ScenarioRow[];
}

/** Aynı maliyet ve vergi varsayımlarıyla farklı satış fiyatlarını karşılaştırır. */
export function compareScenarios(base: CalcInput, prices: Kurus[]): ScenarioComparison {
  assertValidInput(base);
  const breakEven = breakEvenPrice(base);
  const rows = prices.map((price) => {
    const input = { ...base, salePrice: price };
    assertValidInput(input);
    const core = computeCore(input);
    const distance = breakEven.ok ? price - breakEven.price : null;
    return {
      price,
      core,
      distanceToBreakEven: distance,
      safetyMarginPercent: distance !== null && price > 0 ? (distance / price) * 100 : null,
    };
  });
  return { breakEven, rows };
}
