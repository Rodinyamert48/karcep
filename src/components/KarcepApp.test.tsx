import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryStore } from "@/storage";
import { KarcepApp } from "./KarcepApp";

describe("KarcepApp", () => {
  it("ilk kullanımda boş durum gösterir", async () => {
    window.location.hash = "";
    render(<KarcepApp store={createMemoryStore()} />);
    expect(await screen.findByText("Henüz hesap yok")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Hesaplamaya başla" })).toBeInTheDocument();
  });

  it("hesaplayıcı yazarken sonucu günceller, hataları gösterir ve ürünü kaydeder", async () => {
    window.location.hash = "hesaplayici";
    const store = createMemoryStore();
    const user = userEvent.setup();
    render(<KarcepApp store={store} />);

    expect(await screen.findByText("Sonuç burada görünecek")).toBeInTheDocument();

    await user.type(screen.getByRole("textbox", { name: /^Satış fiyatı/ }), "599");
    await user.type(screen.getByRole("textbox", { name: /^Alış maliyeti/ }), "250");
    await user.type(screen.getByRole("textbox", { name: /^Komisyon oranı/ }), "20");
    await user.type(screen.getByRole("textbox", { name: "Kargo" }), "45");

    const results = screen.getByRole("complementary", { name: "Sonuçlar" });
    expect(within(results).getByText("Tahmini kâr", { selector: "p" })).toBeInTheDocument();
    expect(within(results).getByText("₺133,54", { selector: "p" })).toBeInTheDocument();
    expect(within(results).getByRole("img", { name: /Satış fiyatı ₺599,00 dağılımı/ })).toBeInTheDocument();

    const cost = screen.getByRole("textbox", { name: /^Alış maliyeti/ });
    await user.clear(cost);
    await user.type(cost, "-5");
    expect(await screen.findByText("Sonuç hesaplanamadı")).toBeInTheDocument();
    expect(screen.getAllByText(/Negatif değer girilemez\./).length).toBeGreaterThan(0);

    await user.clear(cost);
    await user.type(cost, "250");

    await user.click(screen.getByRole("button", { name: "Ürün olarak kaydet" }));
    expect(await screen.findByText("Ürün olarak kaydetmek için ürün adı girin.")).toBeInTheDocument();

    await user.type(screen.getByRole("textbox", { name: "Ürün adı" }), "Kupa");
    await user.click(screen.getByRole("button", { name: "Ürün olarak kaydet" }));
    expect(await screen.findByText("Ürün kaydedildi ve geçmişe eklendi.")).toBeInTheDocument();

    const products = JSON.parse(store.get("karcep:products") ?? "[]");
    expect(products).toHaveLength(1);
    expect(products[0].meta.productName).toBe("Kupa");
    expect(JSON.parse(store.get("karcep:history") ?? "[]")).toHaveLength(1);
  });

  it("zararda dağılım çubuğu satış fiyatını aşan gideri ayrıca gösterir", async () => {
    window.location.hash = "hesaplayici";
    const user = userEvent.setup();
    render(<KarcepApp store={createMemoryStore()} />);
    await user.type(await screen.findByRole("textbox", { name: /^Satış fiyatı/ }), "100");
    await user.type(screen.getByRole("textbox", { name: /^Alış maliyeti/ }), "150");
    const results = screen.getByRole("complementary", { name: "Sonuçlar" });
    expect(within(results).getByText("Tahmini zarar", { selector: "p" })).toBeInTheDocument();
    expect(within(results).getByText("Satış fiyatını aşan gider (zarar)")).toBeInTheDocument();
  });
});
