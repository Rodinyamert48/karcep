import { describe, expect, it } from "vitest";
import { emptyFormValues } from "@/engine";
import {
  buildKrcpFile,
  commitAppData,
  createMemoryStore,
  defaultAppData,
  KRCP_FORMAT_VERSION,
  krcpFileName,
  krcpSummary,
  mergeAppData,
  MAX_KRCP_BYTES,
  parseKrcp,
  saveAll,
  serializeKrcp,
  type AppData,
  type KeyValueStore,
  type Product,
} from "./index";

function product(id: string, name: string): Product {
  const now = new Date().toISOString();
  return {
    id,
    meta: { productName: name, marketplaceId: "trendyol", category: "Türkçe çğıöşü", commissionProfileId: null },
    values: emptyFormValues({ salePrice: "199,90", costPrice: "80" }),
    createdAt: now,
    updatedAt: now,
  };
}

function populatedData(): AppData {
  const d = defaultAppData();
  d.products = [product("p1", "Çaydanlık"), product("p2", "Şemsiye")];
  return d;
}

describe(".krcp dosya adı", () => {
  it("'KarCep-Yedek-' ile başlar, .krcp ile biter ve yalnızca ASCII karakter içerir", () => {
    const name = krcpFileName(new Date("2026-10-14T14:32:00Z"));
    expect(name.startsWith("KarCep-Yedek-")).toBe(true);
    expect(name.endsWith(".krcp")).toBe(true);
    expect(name).not.toMatch(/[\\/:*?"<>|]/);
    // Aksanlı karakterler bazı tarayıcılarda "download" özniteliğini bozabiliyor (bkz. krcp.ts yorumu).
    expect(name).toMatch(/^[\x20-\x7e]+$/);
  });
});

describe("yedek oluşturma (buildKrcpFile / serializeKrcp)", () => {
  it("geçerli bir .krcp dosyası üretir ve kaynak veriyi değiştirmez", () => {
    const data = populatedData();
    const snapshot = JSON.parse(JSON.stringify(data));
    const file = buildKrcpFile(data, new Date("2026-10-14T10:00:00Z"));
    expect(file.format).toBe("krcp");
    expect(file.app).toBe("KarCep");
    expect(file.formatVersion).toBe(KRCP_FORMAT_VERSION);
    expect(file.createdAt).toBe("2026-10-14T10:00:00.000Z");
    expect(file.data.products).toHaveLength(2);
    expect(data).toEqual(snapshot); // kaynak veri değişmedi
  });

  it("Türkçe karakterleri UTF-8 serileştirmede korur", () => {
    const file = buildKrcpFile(populatedData());
    const text = serializeKrcp(file);
    expect(text).toContain("Çaydanlık");
    expect(text).toContain("Şemsiye");
    expect(text).toContain("çğıöşü");
  });

  it("dışa aktarma → içe aktarma sonrası veri eşdeğer kalır", () => {
    const data = populatedData();
    const text = serializeKrcp(buildKrcpFile(data));
    const result = parseKrcp(text, text.length);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.products).toEqual(data.products);
    expect(result.data.history).toEqual(data.history);
    expect(result.data.commissionProfiles).toEqual(data.commissionProfiles);
  });

  it("özet (summary) doğru kayıt sayılarını verir", () => {
    const file = buildKrcpFile(populatedData());
    const s = krcpSummary(file);
    expect(s.counts.products).toBe(2);
    expect(s.counts.customMarketplaces).toBe(0);
  });
});

describe("yedek yükleme doğrulaması (parseKrcp)", () => {
  it("geçerli dosyayı kabul eder", () => {
    const text = serializeKrcp(buildKrcpFile(populatedData()));
    const r = parseKrcp(text, text.length);
    expect(r.ok).toBe(true);
  });

  it("geçersiz JSON'u reddeder, hiçbir veri üretmez", () => {
    const r = parseKrcp("{bozuk json", 10);
    expect(r).toEqual({ ok: false, reason: "invalid-json", message: expect.any(String) });
  });

  it("boş dosyayı reddeder", () => {
    expect(parseKrcp("", 0).ok).toBe(false);
    expect(parseKrcp("   ", 3).ok).toBe(false);
  });

  it("KârCep yedeği olmayan JSON'u reddeder", () => {
    const r = parseKrcp(JSON.stringify({ hello: "world" }), 20);
    expect(r).toMatchObject({ ok: false, reason: "wrong-format" });
  });

  it("çok büyük dosyayı reddeder", () => {
    const r = parseKrcp("{}", MAX_KRCP_BYTES + 1);
    expect(r).toMatchObject({ ok: false, reason: "too-large" });
  });

  it("desteklenmeyen (daha yeni) format sürümünü reddeder", () => {
    const file = buildKrcpFile(populatedData());
    const text = JSON.stringify({ ...file, formatVersion: KRCP_FORMAT_VERSION + 99 });
    const r = parseKrcp(text, text.length);
    expect(r).toMatchObject({ ok: false, reason: "unsupported-version" });
  });

  it("eksik/bozuk alanları güvenli biçimde ayıklar (uygulama çökmez)", () => {
    const text = JSON.stringify({
      format: "krcp",
      formatVersion: 1,
      app: "KarCep",
      createdAt: "2026-01-01T00:00:00.000Z",
      schemaVersion: 1,
      data: {
        products: [{ id: "ok", meta: { productName: "Geçerli" } }, { broken: true }, "metin-degil", null],
        history: "liste-degil",
        settings: { theme: 12345 },
      },
    });
    const r = parseKrcp(text, text.length);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.products).toHaveLength(1);
    expect(r.data.products[0].meta.productName).toBe("Geçerli");
    expect(r.data.history).toEqual([]);
    expect(r.data.settings.theme).toBe("system");
  });

  it("eski şema sürümünden geçişi (migration) güvenle işler", () => {
    const file = buildKrcpFile(populatedData());
    const text = JSON.stringify({ ...file, schemaVersion: 0 });
    const r = parseKrcp(text, text.length);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data.products).toHaveLength(2);
  });
});

describe("birleştirme (merge) stratejisi", () => {
  it("ürünleri kimliğe göre birleştirir; çakışmada yedekteki kazanır", () => {
    const current = populatedData();
    const incoming = defaultAppData();
    incoming.products = [{ ...product("p2", "Şemsiye (güncellendi)") }, product("p3", "Yeni ürün")];
    const merged = mergeAppData(current, incoming);
    expect(merged.products.map((p) => p.id).sort()).toEqual(["p1", "p2", "p3"]);
    expect(merged.products.find((p) => p.id === "p2")?.meta.productName).toBe("Şemsiye (güncellendi)");
    expect(merged.products.find((p) => p.id === "p1")?.meta.productName).toBe("Çaydanlık");
  });

  it("mevcut ayarları ve taslağı değiştirmez", () => {
    const current = populatedData();
    current.settings.defaultShippingCost = "42";
    const incoming = defaultAppData();
    incoming.settings.defaultShippingCost = "99";
    const merged = mergeAppData(current, incoming);
    expect(merged.settings.defaultShippingCost).toBe("42");
  });
});

describe("atomik yazma ve geri alma (commitAppData)", () => {
  it("başarılı yazmada tüm koleksiyonları günceller", () => {
    const store = createMemoryStore();
    const data = populatedData();
    const result = commitAppData(store, data);
    expect(result.ok).toBe(true);
    expect(JSON.parse(store.get("karcep:products")!)).toHaveLength(2);
  });

  it("yazma ortasında hata oluşursa önceki veriyi geri yükler, mevcut veri korunur", () => {
    const store = createMemoryStore();
    const original = populatedData();
    saveAll(store, original);

    let writeCount = 0;
    const failingStore: KeyValueStore = {
      ...store,
      set: (k, v) => {
        writeCount++;
        // Dördüncü anahtarı yazarken kota dolmuş gibi davran (geri alma yazımları etkilenmez).
        if (writeCount === 4) throw new Error("QuotaExceededError");
        store.set(k, v);
      },
    };

    const corrupted = defaultAppData();
    corrupted.products = [product("x", "Yarım yazılacak ürün")];
    const result = commitAppData(failingStore, corrupted);

    expect(result.ok).toBe(false);
    expect(result.rolledBack).toBe(true);
    // Orijinal veriler store'da hâlâ okunabilir ve değişmemiş olmalı.
    const reloadedProducts = JSON.parse(store.get("karcep:products")!);
    expect(reloadedProducts).toHaveLength(2);
    expect(reloadedProducts[0].meta.productName).toBe("Çaydanlık");
  });
});
