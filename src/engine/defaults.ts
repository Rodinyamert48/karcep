import type { CalcFormValues } from "./types";

/**
 * Boş form. KDV oranı alanları Türkiye'deki genel KDV oranı (%20) ile başlar;
 * kullanıcı her kalem için oranı değiştirebilir. Komisyon oranı için varsayılan YOKTUR.
 */
export function emptyFormValues(overrides: Partial<CalcFormValues> = {}): CalcFormValues {
  return {
    mode: "vat",
    salePrice: "",
    saleIncludesVat: true,
    saleVatRate: "20",
    costPrice: "",
    costIncludesVat: true,
    costVatRate: "20",
    commissionRate: "",
    commissionBase: "gross",
    commissionManualBase: "",
    commissionIncludesVat: false,
    commissionVatRate: "20",
    shippingCost: "",
    shippingIncludesVat: true,
    shippingVatRate: "20",
    packagingCost: "",
    packagingIncludesVat: true,
    packagingVatRate: "20",
    adCost: "",
    adIncludesVat: true,
    adVatRate: "20",
    otherCost: "",
    otherIncludesVat: true,
    otherVatRate: "20",
    saleFeeRate: "",
    saleFeeFixed: "",
    saleFeeIncludesVat: false,
    saleFeeVatRate: "20",
    fixedCostShare: "",
    vatDeductible: true,
    targetType: "profit",
    targetValue: "",
    ...overrides,
  };
}
