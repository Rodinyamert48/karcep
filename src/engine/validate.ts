import { MAX_AMOUNT, RATE_ONE } from "./money";
import { parseScaled } from "./parse";
import type {
  CalcFieldKey,
  CalcFormValues,
  CalcInput,
  CalcTarget,
  CostLineInput,
  FieldErrors,
} from "./types";

export interface ValidationResult {
  /** Tüm zorunlu alanlar dolu ve hata yoksa hesaplama girdisi */
  input: CalcInput | null;
  target: CalcTarget | null;
  errors: FieldErrors;
  /** Zorunlu alanlardan biri boşsa true (hata değil, henüz eksik) */
  incomplete: boolean;
  missing: CalcFieldKey[];
}

const MONEY_DECIMALS = 2;
const RATE_DECIMALS = 4; // yüzde değerinde 4 ondalık → milyonda bir birimi

interface Ctx {
  values: CalcFormValues;
  errors: FieldErrors;
  missing: CalcFieldKey[];
}

function money(ctx: Ctx, key: CalcFieldKey, required = false): number {
  const raw = String(ctx.values[key] ?? "");
  const r = parseScaled(raw, MONEY_DECIMALS);
  if (r.kind === "empty") {
    if (required) ctx.missing.push(key);
    return 0;
  }
  if (r.kind === "error") {
    ctx.errors[key] = r.message;
    return 0;
  }
  if (r.value > MAX_AMOUNT) {
    ctx.errors[key] = "Tutar en fazla 1.000.000.000 TL olabilir.";
    return 0;
  }
  return r.value;
}

function rate(ctx: Ctx, key: CalcFieldKey, opts: { max?: number; exclusiveMax?: boolean; required?: boolean } = {}): number {
  const { max = 100, exclusiveMax = false, required = false } = opts;
  const raw = String(ctx.values[key] ?? "");
  const r = parseScaled(raw, RATE_DECIMALS);
  if (r.kind === "empty") {
    if (required) ctx.missing.push(key);
    return 0;
  }
  if (r.kind === "error") {
    ctx.errors[key] = r.message;
    return 0;
  }
  // parseScaled 4 ondalıkla ölçekler: %20 → 200000 → milyonda bir birimiyle aynı.
  const maxUnits = max * 10_000;
  if (exclusiveMax ? r.value >= maxUnits : r.value > maxUnits) {
    ctx.errors[key] = exclusiveMax ? `Oran %${max}'den küçük olmalı.` : `Oran en fazla %${max} olabilir.`;
    return 0;
  }
  return r.value;
}

function line(ctx: Ctx, amountKey: CalcFieldKey, inclKey: CalcFieldKey, vatKey: CalcFieldKey): CostLineInput {
  return {
    amount: money(ctx, amountKey),
    includesVat: Boolean(ctx.values[inclKey]),
    vatRate: rate(ctx, vatKey),
  };
}

/** Form değerlerini doğrular ve hesaplama girdisine dönüştürür. */
export function validateForm(values: CalcFormValues): ValidationResult {
  const ctx: Ctx = { values, errors: {}, missing: [] };

  const salePrice = money(ctx, "salePrice", true);
  const saleVatRate = rate(ctx, "saleVatRate");
  const costAmount = money(ctx, "costPrice", true);
  const costVatRate = rate(ctx, "costVatRate");

  const commissionRate = rate(ctx, "commissionRate");
  const commissionBase = values.commissionBase;
  if (!["gross", "net", "manual"].includes(commissionBase)) {
    ctx.errors.commissionBase = "Komisyon tabanını seçin.";
  }
  const commissionManualBase = commissionBase === "manual" ? money(ctx, "commissionManualBase", true) : 0;
  const commissionVatRate = rate(ctx, "commissionVatRate");

  const shipping = line(ctx, "shippingCost", "shippingIncludesVat", "shippingVatRate");
  const packaging = line(ctx, "packagingCost", "packagingIncludesVat", "packagingVatRate");
  const advertising = line(ctx, "adCost", "adIncludesVat", "adVatRate");
  const other = line(ctx, "otherCost", "otherIncludesVat", "otherVatRate");

  const saleFeeRate = rate(ctx, "saleFeeRate");
  const saleFeeFixed = money(ctx, "saleFeeFixed");
  const saleFeeVatRate = rate(ctx, "saleFeeVatRate");
  const fixedCostShare = money(ctx, "fixedCostShare");

  let target: CalcTarget | null = null;
  if (values.targetType === "margin") {
    const m = rate(ctx, "targetValue", { max: 100, exclusiveMax: true });
    if (String(values.targetValue ?? "").trim() !== "" && !ctx.errors.targetValue) target = { type: "margin", value: m };
  } else {
    const p = money(ctx, "targetValue");
    if (String(values.targetValue ?? "").trim() !== "" && !ctx.errors.targetValue) target = { type: "profit", value: p };
  }

  const hasErrors = Object.keys(ctx.errors).length > 0;
  const incomplete = ctx.missing.length > 0;
  if (hasErrors || incomplete) {
    return { input: null, target, errors: ctx.errors, incomplete, missing: ctx.missing };
  }

  const input: CalcInput = {
    mode: values.mode === "vat" ? "vat" : "quick",
    salePrice,
    saleIncludesVat: Boolean(values.saleIncludesVat),
    saleVatRate,
    cost: { amount: costAmount, includesVat: Boolean(values.costIncludesVat), vatRate: costVatRate },
    commissionRate,
    commissionBase,
    commissionManualBase,
    commissionIncludesVat: Boolean(values.commissionIncludesVat),
    commissionVatRate,
    shipping,
    packaging,
    advertising,
    other,
    saleFeeRate,
    saleFeeFixed,
    saleFeeIncludesVat: Boolean(values.saleFeeIncludesVat),
    saleFeeVatRate,
    fixedCostShare,
    vatDeductible: Boolean(values.vatDeductible),
  };
  return { input, target, errors: {}, incomplete: false, missing: [] };
}

/** Hesaplama girdisinin kendisinin tutarlı olup olmadığını denetler (motoru doğrudan kullananlar için). */
export function assertValidInput(input: CalcInput): void {
  const amounts = [
    input.salePrice,
    input.cost.amount,
    input.commissionManualBase,
    input.shipping.amount,
    input.packaging.amount,
    input.advertising.amount,
    input.other.amount,
    input.saleFeeFixed,
    input.fixedCostShare,
  ];
  for (const a of amounts) {
    if (!Number.isSafeInteger(a) || a < 0 || a > MAX_AMOUNT) {
      throw new RangeError(`Geçersiz tutar: ${a}`);
    }
  }
  const rates = [
    input.saleVatRate,
    input.cost.vatRate,
    input.commissionRate,
    input.commissionVatRate,
    input.shipping.vatRate,
    input.packaging.vatRate,
    input.advertising.vatRate,
    input.other.vatRate,
    input.saleFeeRate,
    input.saleFeeVatRate,
  ];
  for (const r of rates) {
    if (!Number.isSafeInteger(r) || r < 0 || r > RATE_ONE) {
      throw new RangeError(`Geçersiz oran: ${r}`);
    }
  }
}
