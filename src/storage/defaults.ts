import { emptyFormValues, type CalcFormValues } from "@/engine";
import type { AppData, CalcMeta, Draft, MarketplaceProfile, Settings } from "./types";
import { SCHEMA_VERSION } from "./types";

/**
 * Yerleşik pazaryeri profilleri. Hiçbirinde komisyon oranı YOKTUR:
 * güncel oranlar doğrulanamadığı için kullanıcı kendi oranını girer.
 */
export const BUILT_IN_MARKETPLACES: MarketplaceProfile[] = [
  {
    id: "trendyol",
    name: "Trendyol",
    builtIn: true,
    defaultCommissionBase: "gross",
    commissionIncludesVat: false,
    commissionVatRate: "20",
    saleFeeRate: "",
    saleFeeFixed: "",
    notes: "",
  },
  {
    id: "hepsiburada",
    name: "Hepsiburada",
    builtIn: true,
    defaultCommissionBase: "gross",
    commissionIncludesVat: false,
    commissionVatRate: "20",
    saleFeeRate: "",
    saleFeeFixed: "",
    notes: "",
  },
  {
    id: "other",
    name: "Diğer / manuel",
    builtIn: true,
    defaultCommissionBase: "gross",
    commissionIncludesVat: false,
    commissionVatRate: "20",
    saleFeeRate: "",
    saleFeeFixed: "",
    notes: "",
  },
];

export const DEFAULT_SETTINGS: Settings = {
  defaultMode: "vat",
  defaultShippingCost: "",
  defaultPackagingCost: "",
  defaultSaleVatRate: "20",
  defaultCostVatRate: "20",
  defaultServiceVatRate: "20",
  theme: "dark",
};

export function emptyMeta(overrides: Partial<CalcMeta> = {}): CalcMeta {
  return { productName: "", marketplaceId: "other", category: "", commissionProfileId: null, ...overrides };
}

/** Ayarlardaki varsayılanlarla yeni form değerleri. */
export function formFromSettings(settings: Settings, marketplace?: MarketplaceProfile): CalcFormValues {
  const service = settings.defaultServiceVatRate;
  return emptyFormValues({
    mode: settings.defaultMode,
    saleVatRate: settings.defaultSaleVatRate,
    costVatRate: settings.defaultCostVatRate,
    shippingCost: settings.defaultShippingCost,
    packagingCost: settings.defaultPackagingCost,
    shippingVatRate: service,
    packagingVatRate: service,
    adVatRate: service,
    otherVatRate: service,
    saleFeeVatRate: service,
    commissionVatRate: marketplace?.commissionVatRate || service,
    ...(marketplace
      ? {
          commissionBase: marketplace.defaultCommissionBase,
          commissionIncludesVat: marketplace.commissionIncludesVat,
          saleFeeRate: marketplace.saleFeeRate,
          saleFeeFixed: marketplace.saleFeeFixed,
        }
      : {}),
  });
}

export function newDraft(settings: Settings, marketplaces: MarketplaceProfile[] = BUILT_IN_MARKETPLACES): Draft {
  const mp = marketplaces.find((m) => m.id === "other");
  return { values: formFromSettings(settings, mp), meta: emptyMeta(), productId: null, isExample: false };
}

/**
 * Açıkça "örnek" olarak etiketlenen hesaplama. Komisyon oranı GERÇEK BİR PAZARYERİ ORANI DEĞİLDİR.
 */
export function exampleDraft(settings: Settings): Draft {
  return {
    values: emptyFormValues({
      mode: "vat",
      salePrice: "549,90",
      saleIncludesVat: true,
      saleVatRate: "20",
      costPrice: "240",
      costIncludesVat: true,
      costVatRate: "20",
      commissionRate: "15",
      commissionBase: "gross",
      commissionIncludesVat: false,
      commissionVatRate: settings.defaultServiceVatRate || "20",
      shippingCost: "55",
      packagingCost: "6",
      adCost: "20",
      targetType: "margin",
      targetValue: "15",
    }),
    meta: emptyMeta({ productName: "Örnek ürün (kurgusal veriler)", marketplaceId: "other" }),
    productId: null,
    isExample: true,
  };
}

export function defaultAppData(): AppData {
  return {
    schemaVersion: SCHEMA_VERSION,
    products: [],
    history: [],
    marketplaces: BUILT_IN_MARKETPLACES.map((m) => ({ ...m })),
    commissionProfiles: [],
    settings: { ...DEFAULT_SETTINGS },
    draft: newDraft(DEFAULT_SETTINGS),
    scenarios: { source: "draft", prices: [] },
  };
}
