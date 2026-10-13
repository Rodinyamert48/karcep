import { describe, expect, it } from "vitest";
import { emptyFormValues } from "@/engine";
import {
  collectionKey,
  createMemoryStore,
  defaultAppData,
  exportAppData,
  historyToCsv,
  loadAppData,
  parseImport,
  saveAll,
  saveCollection,
  clearAll,
  BUILT_IN_MARKETPLACES,
  type HistoryEntry,
} from "./index";

describe("yerel depolama", () => {
  it("ilk kullanımda varsayılan verilerle açılır", () => {
    const { data, issues } = loadAppData(createMemoryStore());
    expect(issues).toEqual([]);
    expect(data.products).toEqual([]);
    expect(data.history).toEqual([]);
    expect(data.commissionProfiles).toEqual([]);
    expect(data.marketplaces.map((m) => m.id)).toEqual(["trendyol", "hepsiburada", "other"]);
  });

  it("kaydedilen veri yeniden yüklendiğinde korunur (sayfa yenileme)", () => {
    const store = createMemoryStore();
    const data = defaultAppData();
    data.products.push({
      id: "p1",
      meta: { productName: "Kupa", marketplaceId: "trendyol", category: "Ev", commissionProfileId: null },
      values: emptyFormValues({ salePrice: "199,90", costPrice: "80" }),
      createdAt: "2026-01-01T10:00:00.000Z",
      updatedAt: "2026-01-02T10:00:00.000Z",
    });
    expect(saveAll(store, data)).toBe(true);
    const loaded = loadAppData(store).data;
    expect(loaded.products).toEqual(data.products);
    expect(loaded.settings).toEqual(data.settings);
  });

  it("bozuk JSON uygulamanın açılmasını engellemez ve yedeklenir", () => {
    const store = createMemoryStore({
      [collectionKey("products")]: "{bozuk",
      [collectionKey("history")]: JSON.stringify([{ id: 5 }, "x", null]),
    });
    const { data, issues } = loadAppData(store);
    expect(data.products).toEqual([]);
    expect(data.history).toEqual([]);
    expect(issues.length).toBe(1);
    expect(store.get(`${collectionKey("products")}:bozuk-yedek`)).toBe("{bozuk");
  });

  it("yanlış tipli alanlar varsayılanla doldurulur", () => {
    const store = createMemoryStore({
      [collectionKey("draft")]: JSON.stringify({ values: { salePrice: 12, mode: "x", saleIncludesVat: "evet" } }),
      [collectionKey("settings")]: JSON.stringify({ defaultMode: "quick", theme: 3 }),
    });
    const { data } = loadAppData(store);
    expect(data.draft.values.salePrice).toBe("");
    expect(data.draft.values.mode).toBe("vat");
    expect(data.draft.values.saleIncludesVat).toBe(true);
    expect(data.settings.defaultMode).toBe("quick");
    expect(data.settings.theme).toBe("dark");
  });

  it("yerleşik pazaryerleri silinmiş olsa bile geri gelir", () => {
    const store = createMemoryStore();
    saveCollection(store, "marketplaces", [
      { ...BUILT_IN_MARKETPLACES[0], notes: "not" },
      {
        id: "mp-x",
        name: "Benim mağazam",
        builtIn: false,
        defaultCommissionBase: "net",
        commissionIncludesVat: false,
        commissionVatRate: "20",
        saleFeeRate: "",
        saleFeeFixed: "",
        notes: "",
      },
    ]);
    const { data } = loadAppData(store);
    expect(data.marketplaces.map((m) => m.id)).toEqual(["trendyol", "hepsiburada", "other", "mp-x"]);
    expect(data.marketplaces[0].notes).toBe("not");
  });

  it("bilinmeyen pazaryerine bağlı komisyon profilleri elenir", () => {
    const store = createMemoryStore();
    saveCollection(store, "commissionProfiles", [
      { id: "c1", marketplaceId: "trendyol", category: "Elektronik", rate: "12", origin: "user" },
      { id: "c2", marketplaceId: "yok", category: "X", rate: "5" },
    ] as never);
    const { data } = loadAppData(store);
    expect(data.commissionProfiles.map((c) => c.id)).toEqual(["c1"]);
    expect(data.commissionProfiles[0].verifiedAt).toBeNull();
    expect(data.commissionProfiles[0].origin).toBe("user");
  });

  it("tüm verileri siler", () => {
    const store = createMemoryStore({ "karcep:products": "[]", "baska:anahtar": "1" });
    clearAll(store);
    expect(store.keys()).toEqual(["baska:anahtar"]);
  });

  it("dışa aktarılan yedek içe aktarılabilir", () => {
    const data = defaultAppData();
    data.settings.defaultShippingCost = "45";
    const text = exportAppData(data, new Date("2026-05-01T00:00:00Z"));
    const result = parseImport(text);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.settings.defaultShippingCost).toBe("45");
  });

  it("geçersiz yedek dosyası reddedilir", () => {
    expect(parseImport("nope").ok).toBe(false);
    expect(parseImport(JSON.stringify({ app: "Baska" })).ok).toBe(false);
    expect(parseImport(JSON.stringify({ app: "KarCep", schemaVersion: 999, data: {} })).ok).toBe(false);
  });
});

describe("CSV dışa aktarma", () => {
  const entry: HistoryEntry = {
    id: "h1",
    createdAt: "2026-03-04T05:06:00.000Z",
    productId: null,
    meta: { productName: 'Çiçekli "şık" kılıf; özel', marketplaceId: "trendyol", category: "Aksesuar", commissionProfileId: null },
    values: emptyFormValues({ salePrice: "549,9", costPrice: "200" }),
    summary: {
      mode: "vat",
      salePrice: 54990,
      profit: -1234,
      marginPercent: -2.678,
      totalExpense: 47059,
      commission: 8249,
      breakEven: 56500,
    },
  };

  it("UTF-8 BOM, noktalı virgül ayraç ve Türkçe karakterler", () => {
    const csv = historyToCsv([entry], BUILT_IN_MARKETPLACES);
    expect(csv.startsWith("﻿")).toBe(true);
    const lines = csv.slice(1).trimEnd().split("\r\n");
    expect(lines[0].split(";")[0]).toBe("Tarih");
    expect(lines[1]).toContain('"Çiçekli ""şık"" kılıf; özel"');
    expect(lines[1]).toContain(";Trendyol;");
    expect(lines[1]).toContain(";549,90;");
    expect(lines[1]).toContain(";-12,34;");
    expect(lines[1]).toContain(";-2,68;");
    expect(lines[1]).toContain(";KDV ayrıştırmalı;");
  });

  it("formül enjeksiyonunu engeller", () => {
    const csv = historyToCsv([{ ...entry, meta: { ...entry.meta, productName: "=HYPERLINK(1)" } }], BUILT_IN_MARKETPLACES);
    expect(csv).toContain(";'=HYPERLINK(1);");
  });
});
