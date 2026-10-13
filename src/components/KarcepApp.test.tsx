import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryStore } from "@/storage";
import { KarcepApp } from "./KarcepApp";

describe("KarcepApp", () => {
  it("ilk kullanımda boş durum gösterir", async () => {
    window.location.hash = "";
    render(<KarcepApp store={createMemoryStore()} />);
    expect(await screen.findByText("Henüz bir hesaplama yok")).toBeInTheDocument();
  });

  it("hesaplayıcı yazarken sonucu günceller, hataları gösterir ve ürünü kaydeder", async () => {
    window.location.hash = "hesaplayici";
    const store = createMemoryStore();
    const user = userEvent.setup();
    render(<KarcepApp store={store} />);

    expect(await screen.findByText(/Sonuçları görmek için/)).toBeInTheDocument();

    await user.type(screen.getByRole("textbox", { name: /^Satış fiyatı/ }), "599");
    await user.type(screen.getByRole("textbox", { name: /^Alış maliyeti/ }), "250");
    await user.type(screen.getByRole("textbox", { name: /^Komisyon oranı/ }), "20");
    await user.type(screen.getByRole("textbox", { name: "Kargo gideri" }), "45");

    const results = screen.getByRole("region", { name: "Sonuçlar" });
    expect(within(results).getByText(/KÂR: Bu fiyatla/)).toHaveTextContent("₺133,54");

    await user.clear(screen.getByRole("textbox", { name: /^Alış maliyeti/ }));
    await user.type(screen.getByRole("textbox", { name: /^Alış maliyeti/ }), "-5");
    expect(await screen.findByText("Sonuç hesaplanamadı")).toBeInTheDocument();
    expect(screen.getAllByText("Negatif değer girilemez.").length).toBeGreaterThan(0);

    await user.clear(screen.getByRole("textbox", { name: /^Alış maliyeti/ }));
    await user.type(screen.getByRole("textbox", { name: /^Alış maliyeti/ }), "250");

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
});
