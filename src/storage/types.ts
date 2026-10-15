import type { CalcFormValues, CalcMode, CommissionBase, Kurus } from "@/engine";

export const SCHEMA_VERSION = 1;

/** Hesaplamaya iliştirilen, motoru etkilemeyen bilgiler. */
export interface CalcMeta {
  productName: string;
  marketplaceId: string;
  category: string;
  /** Komisyon oranı bir profilden geldiyse profil kimliği; manuel girildiyse null. */
  commissionProfileId: string | null;
}

export interface MarketplaceProfile {
  id: string;
  name: string;
  /** Yerleşik profiller (Trendyol, Hepsiburada, Diğer) silinemez, adları değiştirilemez. */
  builtIn: boolean;
  defaultCommissionBase: CommissionBase;
  commissionIncludesVat: boolean;
  commissionVatRate: string;
  saleFeeRate: string;
  saleFeeFixed: string;
  notes: string;
}

export type ProfileOrigin = "user" | "source";

export interface CommissionProfile {
  id: string;
  marketplaceId: string;
  category: string;
  rate: string;
  base: CommissionBase;
  commissionIncludesVat: boolean;
  commissionVatRate: string;
  /** user: kullanıcı girişi; source: kullanıcının belirttiği bir kaynaktan alındı. */
  origin: ProfileOrigin;
  source: string;
  /** YYYY-MM-DD; bilinmiyorsa null */
  verifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Settings {
  defaultMode: CalcMode;
  defaultShippingCost: string;
  defaultPackagingCost: string;
  defaultSaleVatRate: string;
  defaultCostVatRate: string;
  defaultServiceVatRate: string;
  /** v0.3.0 itibarıyla arayüz yalnızca koyu temadır; alan eski yedeklerle uyumluluk için saklanır, kullanılmaz. */
  theme: "dark" | "light" | "system";
  /** Son başarılı ".krcp" yedeği oluşturulma zamanı (ISO-8601); hiç yedek alınmadıysa null. */
  lastBackupAt: string | null;
}

export interface CalcSummary {
  mode: CalcMode;
  salePrice: Kurus;
  profit: Kurus;
  marginPercent: number | null;
  totalExpense: Kurus;
  commission: Kurus;
  breakEven: Kurus | null;
}

export interface Product {
  id: string;
  meta: CalcMeta;
  values: CalcFormValues;
  createdAt: string;
  updatedAt: string;
}

export interface HistoryEntry {
  id: string;
  createdAt: string;
  productId: string | null;
  meta: CalcMeta;
  values: CalcFormValues;
  summary: CalcSummary;
}

export interface Draft {
  values: CalcFormValues;
  meta: CalcMeta;
  /** Düzenlenmekte olan ürün; yeni hesaplamada null */
  productId: string | null;
  /** Taslak örnek veriyle mi dolduruldu */
  isExample: boolean;
}

export interface ScenarioState {
  /** "draft" ya da ürün kimliği */
  source: string;
  prices: string[];
}

export interface AppData {
  schemaVersion: number;
  products: Product[];
  history: HistoryEntry[];
  marketplaces: MarketplaceProfile[];
  commissionProfiles: CommissionProfile[];
  settings: Settings;
  draft: Draft;
  scenarios: ScenarioState;
}

export type CollectionKey = Exclude<keyof AppData, "schemaVersion">;
