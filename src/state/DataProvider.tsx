"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { CalcResult } from "@/engine";
import {
  MAX_HISTORY,
  clearAll,
  createBrowserStore,
  defaultAppData,
  loadAppData,
  newDraft,
  saveCollection,
  type AppData,
  type CollectionKey,
  type CommissionProfile,
  type Draft,
  type HistoryEntry,
  type KeyValueStore,
  type MarketplaceProfile,
  type Product,
  type ScenarioState,
  type Settings,
} from "@/storage";
import { newId } from "@/lib/browser";
import { toSummary } from "@/lib/calc";

export interface DataApi {
  data: AppData;
  ready: boolean;
  /** localStorage kullanılamıyorsa false: veriler yalnızca bu oturumda kalır */
  persistent: boolean;
  loadIssues: string[];
  saveError: boolean;
  setDraft: (updater: (d: Draft) => Draft) => void;
  resetDraft: () => void;
  saveProduct: (draft: Draft, opts?: { asNew?: boolean }) => Product;
  deleteProduct: (id: string) => void;
  addHistory: (draft: Draft, result: CalcResult) => HistoryEntry;
  deleteHistory: (id: string) => void;
  clearHistory: () => void;
  upsertMarketplace: (m: MarketplaceProfile) => void;
  deleteMarketplace: (id: string) => void;
  upsertCommissionProfile: (p: CommissionProfile) => void;
  deleteCommissionProfile: (id: string) => void;
  updateSettings: (patch: Partial<Settings>) => void;
  setScenarios: (s: ScenarioState) => void;
  replaceAll: (data: AppData) => void;
  resetAll: () => void;
}

const DataContext = createContext<DataApi | null>(null);

const KEYS: CollectionKey[] = [
  "products",
  "history",
  "marketplaces",
  "commissionProfiles",
  "settings",
  "draft",
  "scenarios",
];

export function DataProvider({ children, store: injected }: { children: ReactNode; store?: KeyValueStore }) {
  const [data, setData] = useState<AppData>(defaultAppData);
  const [ready, setReady] = useState(false);
  const [persistent, setPersistent] = useState(true);
  const [loadIssues, setLoadIssues] = useState<string[]>([]);
  const [saveError, setSaveError] = useState(false);
  const storeRef = useRef<KeyValueStore | null>(null);
  const savedRef = useRef<AppData | null>(null);
  const dataRef = useRef(data);
  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  // Tarayıcıda ilk yükleme (statik dışa aktarımda sunucuda localStorage yoktur).
  useEffect(() => {
    let store = injected;
    let isPersistent = true;
    if (!store) {
      const s = createBrowserStore();
      store = s.store;
      isPersistent = s.persistent;
    }
    storeRef.current = store;
    const { data: loaded, issues } = loadAppData(store);
    savedRef.current = loaded;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- tek seferlik, tarayıcıya özgü yükleme
    setData(loaded);
    setPersistent(isPersistent);
    setLoadIssues(issues);
    setReady(true);
  }, [injected]);

  // Değişen koleksiyonları kaydet.
  useEffect(() => {
    const store = storeRef.current;
    const prev = savedRef.current;
    if (!ready || !store || !prev || prev === data) return;
    let ok = true;
    for (const k of KEYS) {
      if (prev[k] !== data[k]) ok = saveCollection(store, k, data[k] as never) && ok;
    }
    savedRef.current = data;
    setSaveError(!ok);
  }, [data, ready]);

  const patch = useCallback(<K extends CollectionKey>(key: K, fn: (v: AppData[K], all: AppData) => AppData[K]) => {
    setData((d) => ({ ...d, [key]: fn(d[key], d) }));
  }, []);

  const setDraft = useCallback((updater: (d: Draft) => Draft) => patch("draft", (d) => updater(d)), [patch]);

  const resetDraft = useCallback(() => {
    setData((d) => ({ ...d, draft: newDraft(d.settings, d.marketplaces) }));
  }, []);

  const saveProduct = useCallback((draft: Draft, opts: { asNew?: boolean } = {}): Product => {
    const now = new Date().toISOString();
    const current = dataRef.current;
    const existing =
      !opts.asNew && draft.productId ? current.products.find((p) => p.id === draft.productId) : undefined;
    const product: Product = existing
      ? { ...existing, meta: { ...draft.meta }, values: { ...draft.values }, updatedAt: now }
      : { id: newId("p"), meta: { ...draft.meta }, values: { ...draft.values }, createdAt: now, updatedAt: now };
    setData((d) => ({
      ...d,
      products: d.products.some((p) => p.id === product.id)
        ? d.products.map((p) => (p.id === product.id ? product : p))
        : [product, ...d.products],
      draft: { ...d.draft, productId: product.id, isExample: false },
    }));
    return product;
  }, []);

  const deleteProduct = useCallback((id: string) => {
    setData((d) => ({
      ...d,
      products: d.products.filter((p) => p.id !== id),
      draft: d.draft.productId === id ? { ...d.draft, productId: null } : d.draft,
      scenarios: d.scenarios.source === id ? { ...d.scenarios, source: "draft" } : d.scenarios,
    }));
  }, []);

  const addHistory = useCallback((draft: Draft, result: CalcResult): HistoryEntry => {
    const entry: HistoryEntry = {
      id: newId("h"),
      createdAt: new Date().toISOString(),
      productId: draft.productId,
      meta: { ...draft.meta },
      values: { ...draft.values },
      summary: toSummary(result),
    };
    patch("history", (h) => [entry, ...h].slice(0, MAX_HISTORY));
    return entry;
  }, [patch]);

  const deleteHistory = useCallback((id: string) => patch("history", (h) => h.filter((e) => e.id !== id)), [patch]);
  const clearHistory = useCallback(() => patch("history", () => []), [patch]);

  const upsertMarketplace = useCallback(
    (m: MarketplaceProfile) =>
      patch("marketplaces", (list) =>
        list.some((x) => x.id === m.id) ? list.map((x) => (x.id === m.id ? m : x)) : [...list, m],
      ),
    [patch],
  );

  const deleteMarketplace = useCallback((id: string) => {
    setData((d) => {
      const target = d.marketplaces.find((m) => m.id === id);
      if (!target || target.builtIn) return d;
      const fix = <T extends { meta: Draft["meta"] }>(x: T): T =>
        x.meta.marketplaceId === id ? { ...x, meta: { ...x.meta, marketplaceId: "other", commissionProfileId: null } } : x;
      return {
        ...d,
        marketplaces: d.marketplaces.filter((m) => m.id !== id),
        commissionProfiles: d.commissionProfiles.filter((c) => c.marketplaceId !== id),
        products: d.products.map(fix),
        draft: fix(d.draft),
      };
    });
  }, []);

  const upsertCommissionProfile = useCallback(
    (p: CommissionProfile) =>
      patch("commissionProfiles", (list) =>
        list.some((x) => x.id === p.id) ? list.map((x) => (x.id === p.id ? p : x)) : [...list, p],
      ),
    [patch],
  );

  const deleteCommissionProfile = useCallback((id: string) => {
    setData((d) => {
      const unlink = <T extends { meta: Draft["meta"] }>(x: T): T =>
        x.meta.commissionProfileId === id ? { ...x, meta: { ...x.meta, commissionProfileId: null } } : x;
      return {
        ...d,
        commissionProfiles: d.commissionProfiles.filter((c) => c.id !== id),
        products: d.products.map(unlink),
        draft: unlink(d.draft),
      };
    });
  }, []);

  const updateSettings = useCallback(
    (p: Partial<Settings>) => patch("settings", (s) => ({ ...s, ...p })),
    [patch],
  );
  const setScenarios = useCallback((s: ScenarioState) => patch("scenarios", () => s), [patch]);

  const replaceAll = useCallback((next: AppData) => setData(next), []);

  const resetAll = useCallback(() => {
    const store = storeRef.current;
    if (store) clearAll(store);
    const fresh = defaultAppData();
    savedRef.current = fresh;
    setData(fresh);
  }, []);

  const api = useMemo<DataApi>(
    () => ({
      data,
      ready,
      persistent,
      loadIssues,
      saveError,
      setDraft,
      resetDraft,
      saveProduct,
      deleteProduct,
      addHistory,
      deleteHistory,
      clearHistory,
      upsertMarketplace,
      deleteMarketplace,
      upsertCommissionProfile,
      deleteCommissionProfile,
      updateSettings,
      setScenarios,
      replaceAll,
      resetAll,
    }),
    [
      data,
      ready,
      persistent,
      loadIssues,
      saveError,
      setDraft,
      resetDraft,
      saveProduct,
      deleteProduct,
      addHistory,
      deleteHistory,
      clearHistory,
      upsertMarketplace,
      deleteMarketplace,
      upsertCommissionProfile,
      deleteCommissionProfile,
      updateSettings,
      setScenarios,
      replaceAll,
      resetAll,
    ],
  );

  return <DataContext.Provider value={api}>{children}</DataContext.Provider>;
}

export function useData(): DataApi {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData, DataProvider içinde kullanılmalı");
  return ctx;
}
