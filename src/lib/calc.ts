import { calculate, validateForm, type CalcFormValues, type CalcResult, type ValidationResult } from "@/engine";
import type { CalcSummary } from "@/storage";

export interface Evaluation {
  validation: ValidationResult;
  result: CalcResult | null;
}

/** Form değerlerini doğrular ve geçerliyse hesaplar. Hiçbir zaman hata fırlatmaz. */
export function evaluate(values: CalcFormValues): Evaluation {
  const validation = validateForm(values);
  if (!validation.input) return { validation, result: null };
  try {
    return { validation, result: calculate(validation.input, validation.target) };
  } catch {
    return { validation: { ...validation, input: null }, result: null };
  }
}

export function toSummary(result: CalcResult): CalcSummary {
  return {
    mode: result.mode,
    salePrice: result.salePrice,
    profit: result.profit,
    marginPercent: result.marginPercent,
    totalExpense: result.totalExpense,
    commission: result.lines.find((l) => l.key === "commission")?.expense ?? 0,
    breakEven: result.breakEven.ok ? result.breakEven.price : null,
  };
}

export function summarize(values: CalcFormValues): CalcSummary | null {
  const { result } = evaluate(values);
  return result ? toSummary(result) : null;
}
