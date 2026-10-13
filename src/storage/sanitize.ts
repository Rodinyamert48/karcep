/**
 * Yerel depodan veya içe aktarılan dosyadan gelen veriyi savunmacı biçimde okur.
 * Beklenmeyen alanlar atılır, eksik alanlar varsayılanla doldurulur, bozuk kayıtlar elenir.
 */
import { emptyFormValues, type CalcFormValues, type CommissionBase } from "@/engine";
import { BUILT_IN_MARKETPLACES, DEFAULT_SETTINGS, emptyMeta, newDraft } from "./defaults";
import type {
  CalcMeta,
  CalcSummary,
  CommissionProfile,
  Draft,
  HistoryEntry,
  MarketplaceProfile,
  Product,
  ScenarioState,
  Settings,
} from "./types";

type Obj = Record<string, unknown>;

const isObj = (v: unknown): v is Obj => typeof v === "object" && v !== null && !Array.isArray(v);
const str = (v: unknown, fallback = "", max = 500): string => (typeof v === "string" ? v.slice(0, max) : fallback);
const bool = (v: unknown, fallback: boolean): boolean => (typeof v === "boolean" ? v : fallback);
const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);
const int = (v: unknown, fallback = 0): number => (typeof v === "number" && Number.isSafeInteger(v) ? v : fallback);
const base = (v: unknown, fallback: CommissionBase = "gross"): CommissionBase =>
  v === "gross" || v === "net" || v === "manual" ? v : fallback;
const isoDate = (v: unknown, fallback: string): string =>
  typeof v === "string" && !Number.isNaN(Date.parse(v)) ? v : fallback;
const id = (v: unknown): string | null => (typeof v === "string" && v.length > 0 && v.length <= 100 ? v : null);

export function sanitizeFormValues(raw: unknown): CalcFormValues {
  const def = emptyFormValues();
  if (!isObj(raw)) return def;
  const out = { ...def } as Record<string, unknown>;
  for (const key of Object.keys(def) as (keyof CalcFormValues)[]) {
    const d = def[key];
    const v = raw[key];
    if (typeof d === "boolean") out[key] = bool(v, d);
    else if (typeof d === "string") out[key] = str(v, d, 64);
  }
  out.mode = raw.mode === "quick" ? "quick" : "vat";
  out.commissionBase = base(raw.commissionBase);
  out.targetType = raw.targetType === "margin" ? "margin" : "profit";
  return out as unknown as CalcFormValues;
}

export function sanitizeMeta(raw: unknown): CalcMeta {
  if (!isObj(raw)) return emptyMeta();
  return {
    productName: str(raw.productName, "", 200),
    marketplaceId: id(raw.marketplaceId) ?? "other",
    category: str(raw.category, "", 200),
    commissionProfileId: id(raw.commissionProfileId),
  };
}

function sanitizeSummary(raw: unknown): CalcSummary | null {
  if (!isObj(raw)) return null;
  const salePrice = num(raw.salePrice);
  const profit = num(raw.profit);
  if (salePrice === null || profit === null) return null;
  return {
    mode: raw.mode === "quick" ? "quick" : "vat",
    salePrice: int(salePrice),
    profit: int(profit),
    marginPercent: num(raw.marginPercent),
    totalExpense: int(raw.totalExpense),
    commission: int(raw.commission),
    breakEven: num(raw.breakEven) === null ? null : int(raw.breakEven),
  };
}

function list<T>(raw: unknown, map: (item: unknown) => T | null, max: number): T[] {
  if (!Array.isArray(raw)) return [];
  const out: T[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    const v = map(item);
    if (!v) continue;
    const key = (v as { id?: string }).id;
    if (key && seen.has(key)) continue;
    if (key) seen.add(key);
    out.push(v);
    if (out.length >= max) break;
  }
  return out;
}

const NOW = () => new Date().toISOString();

export function sanitizeProducts(raw: unknown): Product[] {
  return list(
    raw,
    (p) => {
      if (!isObj(p)) return null;
      const pid = id(p.id);
      if (!pid) return null;
      const now = NOW();
      return {
        id: pid,
        meta: sanitizeMeta(p.meta),
        values: sanitizeFormValues(p.values),
        createdAt: isoDate(p.createdAt, now),
        updatedAt: isoDate(p.updatedAt, now),
      };
    },
    5000,
  );
}

export const MAX_HISTORY = 500;

export function sanitizeHistory(raw: unknown): HistoryEntry[] {
  return list(
    raw,
    (h) => {
      if (!isObj(h)) return null;
      const hid = id(h.id);
      const summary = sanitizeSummary(h.summary);
      if (!hid || !summary) return null;
      return {
        id: hid,
        createdAt: isoDate(h.createdAt, NOW()),
        productId: id(h.productId),
        meta: sanitizeMeta(h.meta),
        values: sanitizeFormValues(h.values),
        summary,
      };
    },
    MAX_HISTORY,
  );
}

export function sanitizeMarketplaces(raw: unknown): MarketplaceProfile[] {
  const stored = list(
    raw,
    (m) => {
      if (!isObj(m)) return null;
      const mid = id(m.id);
      if (!mid) return null;
      const builtIn = BUILT_IN_MARKETPLACES.find((b) => b.id === mid);
      const name = str(m.name, "", 80).trim();
      if (!builtIn && !name) return null;
      return {
        id: mid,
        name: builtIn ? builtIn.name : name,
        builtIn: Boolean(builtIn),
        defaultCommissionBase: base(m.defaultCommissionBase),
        commissionIncludesVat: bool(m.commissionIncludesVat, false),
        commissionVatRate: str(m.commissionVatRate, "20", 16),
        saleFeeRate: str(m.saleFeeRate, "", 16),
        saleFeeFixed: str(m.saleFeeFixed, "", 32),
        notes: str(m.notes, "", 1000),
      } satisfies MarketplaceProfile;
    },
    100,
  );
  // Yerleşik profiller her zaman mevcut olmalı.
  const missing = BUILT_IN_MARKETPLACES.filter((b) => !stored.some((s) => s.id === b.id)).map((b) => ({ ...b }));
  const builtIns = BUILT_IN_MARKETPLACES.map(
    (b) => stored.find((s) => s.id === b.id) ?? missing.find((m) => m.id === b.id)!,
  );
  return [...builtIns, ...stored.filter((s) => !s.builtIn)];
}

export function sanitizeCommissionProfiles(raw: unknown, marketplaceIds: string[]): CommissionProfile[] {
  return list(
    raw,
    (c) => {
      if (!isObj(c)) return null;
      const cid = id(c.id);
      const mid = id(c.marketplaceId);
      if (!cid || !mid || !marketplaceIds.includes(mid)) return null;
      const origin = c.origin === "source" ? "source" : "user";
      const verifiedAt =
        typeof c.verifiedAt === "string" && /^\d{4}-\d{2}-\d{2}$/.test(c.verifiedAt) ? c.verifiedAt : null;
      const now = NOW();
      return {
        id: cid,
        marketplaceId: mid,
        category: str(c.category, "", 200),
        rate: str(c.rate, "", 16),
        base: base(c.base),
        commissionIncludesVat: bool(c.commissionIncludesVat, false),
        commissionVatRate: str(c.commissionVatRate, "20", 16),
        origin,
        source: str(c.source, "", 500),
        verifiedAt,
        createdAt: isoDate(c.createdAt, now),
        updatedAt: isoDate(c.updatedAt, now),
      } satisfies CommissionProfile;
    },
    2000,
  );
}

export function sanitizeSettings(raw: unknown): Settings {
  if (!isObj(raw)) return { ...DEFAULT_SETTINGS };
  return {
    defaultMode: raw.defaultMode === "quick" ? "quick" : "vat",
    defaultShippingCost: str(raw.defaultShippingCost, DEFAULT_SETTINGS.defaultShippingCost, 32),
    defaultPackagingCost: str(raw.defaultPackagingCost, DEFAULT_SETTINGS.defaultPackagingCost, 32),
    defaultSaleVatRate: str(raw.defaultSaleVatRate, DEFAULT_SETTINGS.defaultSaleVatRate, 16),
    defaultCostVatRate: str(raw.defaultCostVatRate, DEFAULT_SETTINGS.defaultCostVatRate, 16),
    defaultServiceVatRate: str(raw.defaultServiceVatRate, DEFAULT_SETTINGS.defaultServiceVatRate, 16),
    theme: raw.theme === "light" ? "light" : "dark",
  };
}

export function sanitizeDraft(raw: unknown, settings: Settings): Draft {
  if (!isObj(raw)) return newDraft(settings);
  return {
    values: sanitizeFormValues(raw.values),
    meta: sanitizeMeta(raw.meta),
    productId: id(raw.productId),
    isExample: bool(raw.isExample, false),
  };
}

export function sanitizeScenarios(raw: unknown): ScenarioState {
  if (!isObj(raw)) return { source: "draft", prices: [] };
  const prices = Array.isArray(raw.prices)
    ? raw.prices.filter((p): p is string => typeof p === "string").map((p) => p.slice(0, 32)).slice(0, 12)
    : [];
  return { source: id(raw.source) ?? "draft", prices };
}
