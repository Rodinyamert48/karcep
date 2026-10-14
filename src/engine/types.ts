import type { Kurus, Rate } from "./money";

/** quick: KDV ayrıştırılmaz, tutarlar girildiği gibi kullanılır. vat: KDV ayrıştırmalı. */
export type CalcMode = "quick" | "vat";

/** Komisyonun uygulandığı taban (matrah). */
export type CommissionBase = "gross" | "net" | "manual";

export type TargetType = "profit" | "margin";

/** Formdan gelen ham değerler. Sayısal alanlar string tutulur ki yazarken alanlar sıfırlanmasın. */
export interface CalcFormValues {
  mode: CalcMode;

  salePrice: string;
  saleIncludesVat: boolean;
  saleVatRate: string;

  costPrice: string;
  costIncludesVat: boolean;
  costVatRate: string;

  commissionRate: string;
  commissionBase: CommissionBase;
  commissionManualBase: string;
  commissionIncludesVat: boolean;
  commissionVatRate: string;

  shippingCost: string;
  shippingIncludesVat: boolean;
  shippingVatRate: string;

  packagingCost: string;
  packagingIncludesVat: boolean;
  packagingVatRate: string;

  adCost: string;
  adIncludesVat: boolean;
  adVatRate: string;

  otherCost: string;
  otherIncludesVat: boolean;
  otherVatRate: string;

  /** Satışa bağlı diğer ücretler: KDV dâhil satış tutarının yüzdesi + adet başı sabit ücret. */
  saleFeeRate: string;
  saleFeeFixed: string;
  saleFeeIncludesVat: boolean;
  saleFeeVatRate: string;

  /** Adet başına düşen sabit gider payı (kira, personel vb.). KDV ayrıştırılmaz. */
  fixedCostShare: string;

  /** KDV modunda alış ve hizmet KDV'sinin indirilebildiği varsayımı. */
  vatDeductible: boolean;

  targetType: TargetType;
  targetValue: string;
}

export type CalcFieldKey = keyof CalcFormValues;
export type FieldErrors = Partial<Record<CalcFieldKey, string>>;

export interface CostLineInput {
  amount: Kurus;
  includesVat: boolean;
  vatRate: Rate;
}

/** Doğrulanmış, tamsayı birimli hesaplama girdisi. */
export interface CalcInput {
  mode: CalcMode;
  salePrice: Kurus;
  saleIncludesVat: boolean;
  saleVatRate: Rate;
  cost: CostLineInput;
  commissionRate: Rate;
  commissionBase: CommissionBase;
  commissionManualBase: Kurus;
  commissionIncludesVat: boolean;
  commissionVatRate: Rate;
  shipping: CostLineInput;
  packaging: CostLineInput;
  advertising: CostLineInput;
  other: CostLineInput;
  saleFeeRate: Rate;
  saleFeeFixed: Kurus;
  saleFeeIncludesVat: boolean;
  saleFeeVatRate: Rate;
  fixedCostShare: Kurus;
  vatDeductible: boolean;
}

export interface CalcTarget {
  type: TargetType;
  /** profit: kuruş; margin: oran (milyonda bir) */
  value: number;
}

export type LineKey =
  | "cost"
  | "commission"
  | "shipping"
  | "packaging"
  | "advertising"
  | "other"
  | "saleFee"
  | "fixedShare";

export interface LineItem {
  key: LineKey;
  label: string;
  /** KDV dâhil tutar */
  gross: Kurus;
  /** KDV hariç tutar */
  net: Kurus;
  vat: Kurus;
  /** Bu modda kâr hesabına gider olarak yazılan tutar */
  expense: Kurus;
  /** İndirilebilir KDV olarak dikkate alınan tutar (yalnız KDV modunda) */
  deductibleVat: Kurus;
}

export type PriceSolution =
  | { ok: true; price: Kurus }
  | { ok: false; reason: "unreachable" | "invalid-target"; message: string };

export interface CalcCore {
  mode: CalcMode;
  salePrice: Kurus;
  saleGross: Kurus;
  saleNet: Kurus;
  outputVat: Kurus;
  /** Kâr marjının hesaplandığı gelir: hızlı modda girilen satış fiyatı, KDV modunda KDV hariç satış. */
  revenue: Kurus;
  commissionBaseAmount: Kurus;
  lines: LineItem[];
  totalExpense: Kurus;
  /** Komisyon dışındaki giderlerin (ürün maliyeti hariç) toplamı: kargo, paketleme, reklam, diğer, ücretler, sabit pay */
  otherExpenses: Kurus;
  deductibleVatTotal: Kurus;
  /** KDV modunda: çıktı KDV − indirilebilir KDV. Negatifse devreden KDV. */
  vatBalance: Kurus;
  profit: Kurus;
  /** Yüzde olarak kâr marjı (Kâr / Satış geliri × 100); gelir sıfırsa null. */
  marginPercent: number | null;
  /** Maliyet üzerine kâr oranı / markup (Kâr / Alış maliyeti × 100); kâr marjından farklıdır. Maliyet sıfırsa null. */
  costMarkupPercent: number | null;
  status: "profit" | "loss" | "breakeven";
}

export interface CalcResult extends CalcCore {
  breakEven: PriceSolution;
  target: PriceSolution | null;
  warnings: string[];
}
