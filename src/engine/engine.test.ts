import { describe, expect, it } from "vitest";
import {
  addVat,
  breakEvenPrice,
  calculate,
  compareScenarios,
  computeCore,
  divRound,
  emptyFormValues,
  mulRate,
  parseScaled,
  splitGross,
  validateForm,
  type CalcFormValues,
  type CalcInput,
} from "./index";

/** Formu doğrular ve geçerli girdiyi döndürür; geçersizse testi düşürür. */
function inputOf(overrides: Partial<CalcFormValues>): CalcInput {
  const v = validateForm(emptyFormValues(overrides));
  if (!v.input) throw new Error("Geçersiz test girdisi: " + JSON.stringify(v.errors) + " eksik: " + v.missing.join(","));
  return v.input;
}

const quick = (o: Partial<CalcFormValues>) => inputOf({ mode: "quick", ...o });
const vat = (o: Partial<CalcFormValues>) => inputOf({ mode: "vat", ...o });

function line(result: ReturnType<typeof computeCore>, key: string) {
  const l = result.lines.find((x) => x.key === key);
  if (!l) throw new Error("satır yok: " + key);
  return l;
}

describe("para aritmetiği", () => {
  it("yarımı sıfırdan uzağa yuvarlar", () => {
    expect(divRound(5n, 2n)).toBe(3);
    expect(divRound(-5n, 2n)).toBe(-3);
    expect(divRound(4n, 3n)).toBe(1);
    expect(divRound(-4n, 3n)).toBe(-1);
  });

  it("oranla çarpmayı kuruşa yuvarlar", () => {
    expect(mulRate(59900, 215_000)).toBe(12879); // 599 TL × %21,5 = 128,785 TL → 128,79 TL
    expect(mulRate(5, 500_000)).toBe(3); // 0,05 × %50 = 0,025 → 0,03
    expect(mulRate(10000, 0)).toBe(0);
    expect(mulRate(10000, 1_000_000)).toBe(10000);
  });

  it("KDV dâhil 120 TL = 100 TL + 20 TL KDV (%20)", () => {
    expect(splitGross(12000, 200_000)).toEqual({ gross: 12000, net: 10000, vat: 2000 });
  });

  it("KDV hariç 100 TL'ye %20 KDV eklenince 120 TL olur", () => {
    expect(addVat(10000, 200_000)).toEqual({ gross: 12000, net: 10000, vat: 2000 });
  });

  it("KDV ayrıştırmasında kuruş kaybı olmaz (hariç + KDV = dâhil)", () => {
    for (const gross of [1, 99, 100, 101, 4999, 59900, 123457]) {
      for (const rate of [0, 10_000, 100_000, 200_000]) {
        const s = splitGross(gross, rate);
        expect(s.net + s.vat).toBe(gross);
      }
    }
    expect(splitGross(100, 200_000)).toEqual({ gross: 100, net: 83, vat: 17 }); // 1 TL / 1,2 = 0,8333
  });
});

describe("sayı ayrıştırma", () => {
  it.each([
    ["1.234,56", 2, 123456],
    ["1234,56", 2, 123456],
    ["1234.56", 2, 123456],
    ["1,234.56", 2, 123456],
    ["1.234", 2, 123400], // para alanında binlik ayracı
    ["1.234", 4, 12340], // oran alanında ondalık
    ["₺ 1 234,5", 2, 123450],
    ["%21,5", 4, 215000],
    ["0", 2, 0],
    [",5", 2, 50],
    ["1.000.000", 2, 100000000],
  ])("%s (ölçek %i) → %i", (raw, dec, expected) => {
    expect(parseScaled(raw, dec)).toEqual({ kind: "ok", value: expected });
  });

  it.each(["abc", "NaN", "Infinity", "1e5", "1,2,3", "12..3", "1.23.4"])("%s geçersiz", (raw) => {
    expect(parseScaled(raw, 2).kind).toBe("error");
  });

  it("boş girdi hata değil, boş sayılır", () => {
    expect(parseScaled("", 2)).toEqual({ kind: "empty" });
    expect(parseScaled("   ", 2)).toEqual({ kind: "empty" });
  });

  it("negatif ve fazla ondalıklı değerleri reddeder", () => {
    expect(parseScaled("-5", 2)).toEqual({ kind: "error", message: "Negatif değer girilemez." });
    expect(parseScaled("1,234", 2)).toEqual({ kind: "error", message: "En fazla 2 ondalık basamak girin." });
  });
});

describe("hızlı hesaplama modu", () => {
  const base = { salePrice: "100", costPrice: "40", commissionRate: "10", shippingCost: "20" };

  it("temel kâr, komisyon, toplam gider ve marj", () => {
    const r = calculate(quick(base));
    expect(line(r, "commission").expense).toBe(1000);
    expect(r.totalExpense).toBe(7000);
    expect(r.profit).toBe(3000);
    expect(r.marginPercent).toBeCloseTo(30, 10);
    expect(r.otherExpenses).toBe(2000);
    expect(r.status).toBe("profit");
  });

  it("sıfır komisyon", () => {
    const r = calculate(quick({ salePrice: "100", costPrice: "40", commissionRate: "0" }));
    expect(line(r, "commission").expense).toBe(0);
    expect(r.profit).toBe(6000);
    expect(r.breakEven).toEqual({ ok: true, price: 4000 });
  });

  it("%100 komisyon: zarar ve başa baş noktası yok", () => {
    const r = calculate(quick({ salePrice: "100", costPrice: "40", commissionRate: "100" }));
    expect(line(r, "commission").expense).toBe(10000);
    expect(r.profit).toBe(-4000);
    expect(r.status).toBe("loss");
    expect(r.breakEven.ok).toBe(false);
    expect(r.warnings.some((w) => w.includes("%100"))).toBe(true);
  });

  it("negatif kâr ve negatif marj", () => {
    const r = calculate(quick({ salePrice: "50", costPrice: "60" }));
    expect(r.profit).toBe(-1000);
    expect(r.marginPercent).toBeCloseTo(-20, 10);
    expect(r.status).toBe("loss");
  });

  it("sıfır satış fiyatında sıfıra bölme olmaz", () => {
    const r = calculate(quick({ salePrice: "0", costPrice: "10" }));
    expect(r.profit).toBe(-1000);
    expect(r.marginPercent).toBeNull();
    expect(r.warnings).toContain("Satış fiyatı 0 olduğu için kâr marjı hesaplanamaz.");
    expect(r.breakEven).toEqual({ ok: true, price: 1000 });
  });

  it("tam sıfır kâr 'başa baş' olarak işaretlenir", () => {
    const r = calculate(quick({ salePrice: "100", costPrice: "100" }));
    expect(r.profit).toBe(0);
    expect(r.status).toBe("breakeven");
  });

  it("başa baş fiyatı kuruş hassasiyetinde en düşük fiyattır", () => {
    // P − %10·P − 60 TL = 0 → 66,666… TL → 66,67 TL
    const input = quick(base);
    const be = breakEvenPrice(input);
    expect(be).toEqual({ ok: true, price: 6667 });
    expect(computeCore({ ...input, salePrice: 6667 }).profit).toBeGreaterThanOrEqual(0);
    expect(computeCore({ ...input, salePrice: 6666 }).profit).toBeLessThan(0);
  });

  it("hedef kâr için gereken satış fiyatı", () => {
    const r = calculate(quick(base), { type: "profit", value: 3000 });
    expect(r.target).toEqual({ ok: true, price: 10000 });
  });

  it("hedef marj için gereken satış fiyatı", () => {
    // 0,9P − 60 = 0,2P → P = 85,714… → 85,72 TL
    const input = quick({ salePrice: "100", costPrice: "60", commissionRate: "10" });
    const r = calculate(input, { type: "margin", value: 200_000 });
    expect(r.target).toEqual({ ok: true, price: 8572 });
    const at = computeCore({ ...input, salePrice: 8572 });
    expect(at.marginPercent!).toBeGreaterThanOrEqual(20);
    expect(computeCore({ ...input, salePrice: 8571 }).marginPercent!).toBeLessThan(20);
  });

  it("ulaşılamayan marj hedefi açıkça bildirilir", () => {
    const r = calculate(quick({ salePrice: "100", costPrice: "10", commissionRate: "85" }), {
      type: "margin",
      value: 200_000,
    });
    expect(r.target?.ok).toBe(false);
  });

  it("hızlı modda KDV seçimleri gider tutarını değiştirmez", () => {
    const a = calculate(quick({ ...base, shippingIncludesVat: true }));
    const b = calculate(quick({ ...base, shippingIncludesVat: false }));
    expect(a.profit).toBe(b.profit);
    expect(a.outputVat).toBe(0);
  });

  it("çok yüksek kargo gideri", () => {
    const input = quick({ salePrice: "100", costPrice: "10", commissionRate: "10", shippingCost: "1000000" });
    const r = calculate(input);
    expect(r.profit).toBe(10000 - 1000 - 1000 - 100000000);
    expect(r.status).toBe("loss");
    expect(r.breakEven).toEqual({ ok: true, price: 111112222 });
  });

  it("kayan nokta hatası yok: 0,10 + 0,20 = 0,30", () => {
    const r = calculate(quick({ salePrice: "1", costPrice: "0", shippingCost: "0,10", packagingCost: "0,20" }));
    expect(r.totalExpense).toBe(30);
    expect(r.profit).toBe(70);
  });

  it("satışa bağlı ücretler: KDV dâhil satışın yüzdesi + sabit ücret", () => {
    const r = calculate(quick({ salePrice: "200", costPrice: "50", saleFeeRate: "2", saleFeeFixed: "5" }));
    expect(line(r, "saleFee").expense).toBe(400 + 500);
    expect(r.profit).toBe(20000 - 5000 - 900);
  });

  it("sıfır sabit gider payı", () => {
    const r = calculate(quick({ salePrice: "100", costPrice: "40", fixedCostShare: "" }));
    expect(line(r, "fixedShare").expense).toBe(0);
    const r2 = calculate(quick({ salePrice: "100", costPrice: "40", fixedCostShare: "7,5" }));
    expect(line(r2, "fixedShare").expense).toBe(750);
    expect(r2.profit).toBe(6000 - 750);
  });

  it("aynı girdi her zaman aynı sonucu verir", () => {
    const input = quick(base);
    expect(calculate(input)).toEqual(calculate(input));
  });
});

describe("KDV ayrıştırmalı mod", () => {
  const base: Partial<CalcFormValues> = {
    salePrice: "120",
    saleIncludesVat: true,
    saleVatRate: "20",
    costPrice: "60",
    costIncludesVat: true,
    costVatRate: "20",
    commissionRate: "10",
    commissionBase: "gross",
    commissionIncludesVat: false,
    commissionVatRate: "20",
    shippingCost: "24",
    shippingIncludesVat: true,
    shippingVatRate: "20",
    vatDeductible: true,
  };

  it("satış, alış, komisyon ve kargo KDV'lerini ayrıştırır", () => {
    const r = calculate(vat(base));
    expect(r.saleGross).toBe(12000);
    expect(r.saleNet).toBe(10000);
    expect(r.outputVat).toBe(2000);
    expect(r.revenue).toBe(10000);

    expect(line(r, "cost")).toMatchObject({ gross: 6000, net: 5000, vat: 1000, expense: 5000, deductibleVat: 1000 });
    // Komisyon KDV dâhil satış (120) × %10 = 12 TL, KDV hariç; +%20 KDV = 14,40 TL
    expect(r.commissionBaseAmount).toBe(12000);
    expect(line(r, "commission")).toMatchObject({ gross: 1440, net: 1200, vat: 240, expense: 1200 });
    expect(line(r, "shipping")).toMatchObject({ gross: 2400, net: 2000, vat: 400, expense: 2000 });

    // İndirilebilir KDV ikinci kez gider yazılmaz
    expect(r.totalExpense).toBe(5000 + 1200 + 2000);
    expect(r.profit).toBe(1800);
    expect(r.marginPercent).toBeCloseTo(18, 10);
    expect(r.deductibleVatTotal).toBe(1000 + 240 + 400);
    expect(r.vatBalance).toBe(2000 - 1640);
  });

  it("nakit akışı tutarlıdır: dâhil satış − dâhil giderler − ödenecek KDV = kâr", () => {
    const r = calculate(vat(base));
    const grossOut = r.lines.reduce((s, l) => s + l.gross, 0);
    expect(r.saleGross - grossOut - r.vatBalance).toBe(r.profit);
  });

  it("indirilebilir KDV kapalıysa alış/hizmet KDV'si gider olur", () => {
    const r = calculate(vat({ ...base, vatDeductible: false }));
    expect(r.totalExpense).toBe(6000 + 1440 + 2400);
    expect(r.profit).toBe(10000 - 9840);
    expect(r.deductibleVatTotal).toBe(0);
    expect(r.vatBalance).toBe(2000);
  });

  it("KDV dâhil komisyon hizmet bedeli ayrıştırılır", () => {
    const r = calculate(vat({ ...base, commissionRate: "12", commissionIncludesVat: true }));
    expect(line(r, "commission")).toMatchObject({ gross: 1440, net: 1200, vat: 240 });
  });

  it("komisyon KDV hariç satış tutarı üzerinden", () => {
    const r = calculate(vat({ ...base, commissionBase: "net" }));
    expect(r.commissionBaseAmount).toBe(10000);
    expect(line(r, "commission")).toMatchObject({ net: 1000, vat: 200, gross: 1200 });
  });

  it("komisyon manuel taban üzerinden ve satış fiyatından bağımsız", () => {
    const input = vat({ ...base, commissionBase: "manual", commissionManualBase: "50" });
    const r = calculate(input);
    expect(r.commissionBaseAmount).toBe(5000);
    expect(line(r, "commission").net).toBe(500);
    expect(computeCore({ ...input, salePrice: 50000 }).commissionBaseAmount).toBe(5000);
  });

  it("KDV hariç girilen satış fiyatı", () => {
    const r = calculate(vat({ ...base, salePrice: "100", saleIncludesVat: false }));
    expect(r.saleGross).toBe(12000);
    expect(r.saleNet).toBe(10000);
    expect(r.profit).toBe(1800);
  });

  it("KDV hariç girilen alış maliyeti", () => {
    const r = calculate(vat({ ...base, costPrice: "50", costIncludesVat: false }));
    expect(line(r, "cost")).toMatchObject({ gross: 6000, net: 5000, vat: 1000 });
  });

  it("kalem bazında farklı KDV oranları (%1, %10, %0)", () => {
    const r = calculate(
      vat({ ...base, saleVatRate: "10", salePrice: "110", costVatRate: "1", costPrice: "101", shippingVatRate: "0" }),
    );
    expect(r.saleNet).toBe(10000);
    expect(line(r, "cost")).toMatchObject({ net: 10000, vat: 100 });
    expect(line(r, "shipping")).toMatchObject({ net: 2400, vat: 0 });
  });

  it("başa baş fiyatı (KDV dâhil satış fiyatı cinsinden)", () => {
    const input = vat(base);
    const be = breakEvenPrice(input);
    expect(be.ok).toBe(true);
    if (!be.ok) return;
    // P/1,2 − 0,1P − 70 = 0 → P = 70 / (0,8333… − 0,1) = 95,4545… → 95,46 TL
    expect(be.price).toBe(9546);
    expect(computeCore({ ...input, salePrice: be.price }).profit).toBeGreaterThanOrEqual(0);
    expect(computeCore({ ...input, salePrice: be.price - 1 }).profit).toBeLessThan(0);
  });

  it("kuruş yuvarlaması: çok küçük tutarlar", () => {
    const r = calculate(vat({ salePrice: "0,01", costPrice: "0", commissionRate: "15" }));
    expect(r.saleNet).toBe(1); // 0,01 / 1,2 = 0,0083 → 0,01
    expect(r.outputVat).toBe(0);
    expect(line(r, "commission").net).toBe(0); // 0,01 × %15 = 0,0015 → 0
  });
});

describe("geçersiz veya eksik girişler", () => {
  it("boş form: hata yok ama eksik", () => {
    const v = validateForm(emptyFormValues());
    expect(v.input).toBeNull();
    expect(v.incomplete).toBe(true);
    expect(v.missing).toEqual(expect.arrayContaining(["salePrice", "costPrice"]));
    expect(v.errors).toEqual({});
  });

  it("geçersiz metin, negatif değer ve aralık dışı oran", () => {
    const v = validateForm(
      emptyFormValues({ salePrice: "abc", costPrice: "-5", commissionRate: "150", saleVatRate: "101" }),
    );
    expect(v.input).toBeNull();
    expect(v.errors.salePrice).toBeTruthy();
    expect(v.errors.costPrice).toBe("Negatif değer girilemez.");
    expect(v.errors.commissionRate).toBe("Oran en fazla %100 olabilir.");
    expect(v.errors.saleVatRate).toBeTruthy();
  });

  it("manuel taban seçiliyse taban tutarı zorunlu", () => {
    const v = validateForm(emptyFormValues({ salePrice: "10", costPrice: "1", commissionBase: "manual" }));
    expect(v.missing).toContain("commissionManualBase");
  });

  it("hedef marj %100 olamaz", () => {
    const v = validateForm(
      emptyFormValues({ salePrice: "10", costPrice: "1", targetType: "margin", targetValue: "100" }),
    );
    expect(v.errors.targetValue).toBeTruthy();
  });

  it("çok büyük tutar reddedilir", () => {
    const v = validateForm(emptyFormValues({ salePrice: "2000000000", costPrice: "1" }));
    expect(v.errors.salePrice).toBeTruthy();
  });

  it("motor NaN, Infinity ve negatif tutarları reddeder", () => {
    const ok = quick({ salePrice: "100", costPrice: "40" });
    expect(() => calculate({ ...ok, salePrice: Number.NaN })).toThrow(RangeError);
    expect(() => calculate({ ...ok, salePrice: Number.POSITIVE_INFINITY })).toThrow(RangeError);
    expect(() => calculate({ ...ok, cost: { ...ok.cost, amount: -1 } })).toThrow(RangeError);
    expect(() => calculate({ ...ok, commissionRate: 1_000_001 })).toThrow(RangeError);
    expect(() => calculate({ ...ok, salePrice: 10.5 })).toThrow(RangeError);
  });
});

describe("fiyat senaryoları", () => {
  it("aynı varsayımlarla farklı fiyatları karşılaştırır", () => {
    const input = vat({
      salePrice: "499",
      costPrice: "250",
      commissionRate: "20",
      shippingCost: "45",
      packagingCost: "5",
    });
    const cmp = compareScenarios(input, [49900, 54900, 59900]);
    expect(cmp.breakEven.ok).toBe(true);
    expect(cmp.rows).toHaveLength(3);
    for (const row of cmp.rows) {
      expect(row.core).toEqual(computeCore({ ...input, salePrice: row.price }));
      if (cmp.breakEven.ok) expect(row.distanceToBreakEven).toBe(row.price - cmp.breakEven.price);
    }
    // Fiyat arttıkça kâr artar
    expect(cmp.rows[1].core.profit).toBeGreaterThan(cmp.rows[0].core.profit);
    expect(cmp.rows[2].core.profit).toBeGreaterThan(cmp.rows[1].core.profit);
  });

  it("başa baş yoksa uzaklık null", () => {
    const input = quick({ salePrice: "100", costPrice: "40", commissionRate: "100" });
    const cmp = compareScenarios(input, [10000]);
    expect(cmp.rows[0].distanceToBreakEven).toBeNull();
    expect(cmp.rows[0].safetyMarginPercent).toBeNull();
  });
});
