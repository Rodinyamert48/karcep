import { MAX_AMOUNT, RATE_ONE, mulRate, splitAmount, type Kurus } from "./money";
import type {
  CalcCore,
  CalcInput,
  CalcResult,
  CalcTarget,
  CostLineInput,
  LineItem,
  LineKey,
  PriceSolution,
} from "./types";
import { assertValidInput } from "./validate";

export const LINE_LABELS: Record<LineKey, string> = {
  cost: "Ürün alış maliyeti",
  commission: "Pazaryeri komisyonu",
  shipping: "Kargo",
  packaging: "Paketleme",
  advertising: "Reklam",
  other: "Diğer giderler",
  saleFee: "Satışa bağlı diğer ücretler",
  fixedShare: "Sabit gider payı",
};

function lineFrom(
  key: LineKey,
  amount: Kurus,
  includesVat: boolean,
  vatRate: number,
  input: CalcInput,
): LineItem {
  if (input.mode === "quick") {
    // Hızlı mod: tutar girildiği gibi gider yazılır, KDV ayrıştırılmaz.
    return { key, label: LINE_LABELS[key], gross: amount, net: amount, vat: 0, expense: amount, deductibleVat: 0 };
  }
  const s = splitAmount(amount, includesVat, vatRate);
  const deductible = input.vatDeductible;
  return {
    key,
    label: LINE_LABELS[key],
    gross: s.gross,
    net: s.net,
    vat: s.vat,
    // İndirilebilir KDV gider değildir; ikinci kez düşülmez.
    expense: deductible ? s.net : s.gross,
    deductibleVat: deductible ? s.vat : 0,
  };
}

function costLine(key: LineKey, l: CostLineInput, input: CalcInput): LineItem {
  return lineFrom(key, l.amount, l.includesVat, l.vatRate, input);
}

/** Tek bir satış fiyatı için kârı hesaplar (başa baş/hedef çözümleri olmadan). Saf ve deterministiktir. */
export function computeCore(input: CalcInput): CalcCore {
  const sale = splitAmount(input.salePrice, input.saleIncludesVat, input.saleVatRate);

  const commissionBaseAmount =
    input.commissionBase === "gross" ? sale.gross : input.commissionBase === "net" ? sale.net : input.commissionManualBase;
  const commissionAmount = mulRate(commissionBaseAmount, input.commissionRate);
  const saleFeeAmount = mulRate(sale.gross, input.saleFeeRate) + input.saleFeeFixed;

  const lines: LineItem[] = [
    costLine("cost", input.cost, input),
    lineFrom("commission", commissionAmount, input.commissionIncludesVat, input.commissionVatRate, input),
    costLine("shipping", input.shipping, input),
    costLine("packaging", input.packaging, input),
    costLine("advertising", input.advertising, input),
    costLine("other", input.other, input),
    lineFrom("saleFee", saleFeeAmount, input.saleFeeIncludesVat, input.saleFeeVatRate, input),
    {
      key: "fixedShare",
      label: LINE_LABELS.fixedShare,
      gross: input.fixedCostShare,
      net: input.fixedCostShare,
      vat: 0,
      expense: input.fixedCostShare,
      deductibleVat: 0,
    },
  ];

  const totalExpense = lines.reduce((s, l) => s + l.expense, 0);
  const otherExpenses = lines
    .filter((l) => l.key !== "cost" && l.key !== "commission")
    .reduce((s, l) => s + l.expense, 0);
  const deductibleVatTotal = lines.reduce((s, l) => s + l.deductibleVat, 0);

  const isVat = input.mode === "vat";
  const revenue = isVat ? sale.net : input.salePrice;
  const outputVat = isVat ? sale.vat : 0;
  const profit = revenue - totalExpense;
  const marginPercent = revenue > 0 ? (profit / revenue) * 100 : null;

  return {
    mode: input.mode,
    salePrice: input.salePrice,
    saleGross: sale.gross,
    saleNet: sale.net,
    outputVat,
    revenue,
    commissionBaseAmount,
    lines,
    totalExpense,
    otherExpenses,
    deductibleVatTotal,
    vatBalance: isVat ? outputVat - deductibleVatTotal : 0,
    profit,
    marginPercent,
    status: profit > 0 ? "profit" : profit < 0 ? "loss" : "breakeven",
  };
}

type Excess = (core: CalcCore) => bigint;

/**
 * excess(fiyat) ≥ 0 olan en düşük satış fiyatını (kuruş) bulur.
 * Kâr, satış fiyatının doğrusal bir fonksiyonudur (kuruş yuvarlaması dışında);
 * ikili arama ve ardından küçük bir aşağı tarama ile kuruş hassasiyetinde sonuç verir.
 */
function solveMinPrice(input: CalcInput, excess: Excess, minPrice: Kurus, unreachableMessage: string): PriceSolution {
  const f = (p: Kurus) => excess(computeCore({ ...input, salePrice: p }));
  if (f(minPrice) >= 0n) return { ok: true, price: minPrice };
  const fMax = f(MAX_AMOUNT);
  if (fMax < 0n) {
    const growing = fMax > f(minPrice);
    return {
      ok: false,
      reason: "unreachable",
      message: growing ? "1 milyar TL'nin altındaki hiçbir satış fiyatında bu hedefe ulaşılamıyor." : unreachableMessage,
    };
  }
  let lo = minPrice;
  let hi = MAX_AMOUNT;
  while (hi - lo > 1) {
    const mid = lo + Math.floor((hi - lo) / 2);
    if (f(mid) >= 0n) hi = mid;
    else lo = mid;
  }
  // Kuruş yuvarlaması nedeniyle oluşabilecek küçük dalgalanmalara karşı.
  let best = hi;
  for (let p = hi - 1; p >= Math.max(minPrice, hi - 5); p--) {
    if (f(p) >= 0n) best = p;
  }
  return { ok: true, price: best };
}

const NO_BREAK_EVEN =
  "Satış fiyatı arttıkça kâr artmıyor: satışa bağlı kesintiler (komisyon ve ücretler) satış gelirinin tamamını tüketiyor. Oranları kontrol edin.";

export function breakEvenPrice(input: CalcInput): PriceSolution {
  return solveMinPrice(input, (c) => BigInt(c.profit), 0, NO_BREAK_EVEN);
}

export function targetPrice(input: CalcInput, target: CalcTarget): PriceSolution {
  if (target.type === "profit") {
    if (!Number.isSafeInteger(target.value) || target.value < 0) {
      return { ok: false, reason: "invalid-target", message: "Hedef kâr 0 veya daha büyük olmalı." };
    }
    return solveMinPrice(input, (c) => BigInt(c.profit - target.value), 0, NO_BREAK_EVEN);
  }
  if (!Number.isSafeInteger(target.value) || target.value < 0 || target.value >= RATE_ONE) {
    return { ok: false, reason: "invalid-target", message: "Hedef marj %0 ile %100 arasında olmalı." };
  }
  const m = BigInt(target.value);
  return solveMinPrice(
    input,
    (c) => BigInt(c.profit) * BigInt(RATE_ONE) - m * BigInt(c.revenue),
    1,
    "Bu marj hedefine hiçbir satış fiyatında ulaşılamıyor: satışa bağlı kesinti oranları hedef marja yer bırakmıyor.",
  );
}

/** Tam hesaplama: kâr, marj, döküm, başa baş fiyatı ve (varsa) hedef fiyat. */
export function calculate(input: CalcInput, target: CalcTarget | null = null): CalcResult {
  assertValidInput(input);
  const core = computeCore(input);
  const warnings: string[] = [];

  if (input.salePrice === 0) {
    warnings.push("Satış fiyatı 0 olduğu için kâr marjı hesaplanamaz.");
  }
  const variableRate =
    (input.commissionBase === "manual" ? 0 : input.commissionRate) + input.saleFeeRate;
  if (variableRate >= RATE_ONE) {
    warnings.push("Komisyon ve satışa bağlı ücret oranlarının toplamı %100 veya üzerinde.");
  }
  if (input.mode === "vat" && !input.vatDeductible) {
    warnings.push("İndirilebilir KDV kapalı: alış ve hizmet KDV'leri gider olarak yazıldı.");
  }
  if (input.mode === "vat" && core.vatBalance < 0) {
    warnings.push("İndirilebilir KDV, satış KDV'sinden fazla: fark devreden KDV olarak kalır, nakit iadesi varsayılmadı.");
  }

  return {
    ...core,
    breakEven: breakEvenPrice(input),
    target: target ? targetPrice(input, target) : null,
    warnings,
  };
}
