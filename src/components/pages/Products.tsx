"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { newDraft, type Product } from "@/storage";
import { evaluate } from "@/lib/calc";
import { formatDateTime, formatPercent, formatTRY } from "@/lib/format";
import { useData } from "@/state/DataProvider";
import type { SectionId } from "@/state/navigation";
import { Amount } from "../money";
import { Button } from "../ui/button";
import { useFeedback } from "../ui/feedback";
import { SelectField } from "../ui/field";
import { Empty, PageTitle, Tag } from "../ui/layout";

type SortKey = "updated" | "profit-desc" | "profit-asc" | "price-desc" | "price-asc" | "name";

const SORTS: { value: SortKey; label: string }[] = [
  { value: "updated", label: "Son güncellenen" },
  { value: "profit-desc", label: "Kâr: yüksekten düşüğe" },
  { value: "profit-asc", label: "Kâr: düşükten yükseğe" },
  { value: "price-desc", label: "Fiyat: yüksekten düşüğe" },
  { value: "price-asc", label: "Fiyat: düşükten yükseğe" },
  { value: "name", label: "Ad (A–Z)" },
];

interface Row {
  product: Product;
  salePrice: number | null;
  cost: number | null;
  profit: number | null;
  margin: number | null;
  commission: string;
}

function toRow(product: Product): Row {
  const { result, validation } = evaluate(product.values);
  return {
    product,
    salePrice: validation.input ? validation.input.salePrice : null,
    cost: validation.input ? validation.input.cost.amount : null,
    profit: result ? result.profit : null,
    margin: result ? result.marginPercent : null,
    commission: `%${product.values.commissionRate || "0"}`,
  };
}

export function ProductsPage({ navigate }: { navigate: (id: SectionId) => void }) {
  const { data, setDraft, deleteProduct } = useData();
  const { toast, confirm } = useFeedback();
  const { products, marketplaces, settings } = data;
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("updated");

  const rows = useMemo(() => {
    const q = query.trim().toLocaleLowerCase("tr-TR");
    const list = products.map(toRow).filter((r) => !q || r.product.meta.productName.toLocaleLowerCase("tr-TR").includes(q));
    const cmp = (a: number | null, b: number | null, dir: 1 | -1) =>
      a === null && b === null ? 0 : a === null ? 1 : b === null ? -1 : (a - b) * dir;
    return list.sort((a, b) => {
      switch (sort) {
        case "profit-desc":
          return cmp(a.profit, b.profit, -1);
        case "profit-asc":
          return cmp(a.profit, b.profit, 1);
        case "price-desc":
          return cmp(a.salePrice, b.salePrice, -1);
        case "price-asc":
          return cmp(a.salePrice, b.salePrice, 1);
        case "name":
          return a.product.meta.productName.localeCompare(b.product.meta.productName, "tr-TR");
        default:
          return b.product.updatedAt.localeCompare(a.product.updatedAt);
      }
    });
  }, [products, query, sort]);

  const mpName = (id: string) => marketplaces.find((m) => m.id === id)?.name ?? "—";

  const edit = (p: Product) => {
    setDraft(() => ({ values: { ...p.values }, meta: { ...p.meta }, productId: p.id, isExample: false }));
    navigate("hesaplayici");
  };
  const calcFrom = (p: Product) => {
    setDraft(() => ({ values: { ...p.values }, meta: { ...p.meta }, productId: null, isExample: false }));
    navigate("hesaplayici");
    toast("Üründen yeni hesap açıldı; kaydetmezseniz ürün değişmez.", "info");
  };
  const add = () => {
    setDraft(() => newDraft(settings, marketplaces));
    navigate("hesaplayici");
  };
  const remove = async (p: Product) => {
    const ok = await confirm({
      title: "Ürün silinsin mi?",
      message: (
        <>
          <strong className="text-fg">{p.meta.productName}</strong> kalıcı olarak silinecek. Geçmişteki hesaplar kalır.
        </>
      ),
      confirmLabel: "Sil",
      danger: true,
    });
    if (!ok) return;
    deleteProduct(p.id);
    toast("Ürün silindi.");
  };

  return (
    <>
      <PageTitle
        title="Ürünlerim"
        lead="Kayıtlı ürünler, güncel değerleriyle yeniden hesaplanır."
        actions={
          <Button variant="primary" onClick={add}>
            Ürün ekle
          </Button>
        }
      />

      {products.length === 0 ? (
        <Empty
          title="Kayıtlı ürün yok"
          actions={
            <Button variant="primary" onClick={add}>
              İlk ürünü ekle
            </Button>
          }
        >
          Hesaplayıcıda değerleri girip “Ürün olarak kaydet”e basın.
        </Empty>
      ) : (
        <>
          <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_15rem] sm:items-end">
            <div>
              <label htmlFor="product-search" className="mb-1.5 block text-sm text-muted">
                Ara
              </label>
              <div className="relative">
                <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-subtle" aria-hidden="true" />
                <input
                  id="product-search"
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Ürün adı"
                  autoComplete="off"
                  className="h-10 w-full rounded-md border border-line bg-sunken pr-3 pl-9 text-[15px] text-fg placeholder:text-subtle hover:border-line-strong focus:border-accent focus:outline-none"
                />
              </div>
            </div>
            <SelectField id="product-sort" label="Sırala" value={sort} onValueChange={(v) => setSort(v as SortKey)} options={SORTS} />
          </div>

          <p className="sr-only" aria-live="polite">
            {rows.length} ürün listeleniyor
          </p>

          {rows.length === 0 ? (
            <p className="py-10 text-center text-muted">“{query}” ile eşleşen ürün yok.</p>
          ) : (
            <>
              <div className="hidden md:block">
                <table className="w-full text-sm">
                  <caption className="sr-only">Kayıtlı ürünler</caption>
                  <thead>
                    <tr className="border-b border-line text-left text-[13px] text-subtle">
                      <th scope="col" className="py-2.5 pr-4 font-normal">
                        Ürün
                      </th>
                      <th scope="col" className="px-3 py-2.5 text-right font-normal">
                        Alış
                      </th>
                      <th scope="col" className="px-3 py-2.5 text-right font-normal">
                        Satış
                      </th>
                      <th scope="col" className="px-3 py-2.5 text-right font-normal">
                        Komisyon
                      </th>
                      <th scope="col" className="px-3 py-2.5 text-right font-normal">
                        Tahmini kâr
                      </th>
                      <th scope="col" className="px-3 py-2.5 text-right font-normal">
                        Marj
                      </th>
                      <th scope="col" className="py-2.5 pl-3 font-normal">
                        <span className="sr-only">İşlemler</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {rows.map((r) => (
                      <tr key={r.product.id} className="hover:bg-raised">
                        <th scope="row" className="max-w-[18rem] py-3.5 pr-4 text-left font-normal">
                          <span className="block truncate text-[15px] text-fg">{r.product.meta.productName}</span>
                          <span className="block truncate text-[13px] text-subtle">
                            {mpName(r.product.meta.marketplaceId)} · {formatDateTime(r.product.updatedAt)}
                          </span>
                        </th>
                        <td className="num px-3 py-3.5 text-right text-muted">{r.cost === null ? "—" : formatTRY(r.cost)}</td>
                        <td className="num px-3 py-3.5 text-right">{r.salePrice === null ? "—" : formatTRY(r.salePrice)}</td>
                        <td className="num px-3 py-3.5 text-right text-muted">{r.commission}</td>
                        <td className="px-3 py-3.5 text-right">{r.profit === null ? <Tag tone="warn">Eksik veri</Tag> : <Amount value={r.profit} />}</td>
                        <td className="num px-3 py-3.5 text-right text-muted">{formatPercent(r.margin)}</td>
                        <td className="py-3.5 pl-3">
                          <Actions product={r.product} onEdit={edit} onCalc={calcFrom} onDelete={remove} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <ul className="divide-y divide-line border-y border-line md:hidden">
                {rows.map((r) => (
                  <li key={r.product.id} className="py-4">
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="min-w-0 truncate text-[15px] text-fg">{r.product.meta.productName}</p>
                      {r.profit === null ? <Tag tone="warn">Eksik veri</Tag> : <Amount value={r.profit} className="shrink-0 font-medium" />}
                    </div>
                    <p className="num mt-1 text-[13px] text-subtle">
                      {r.salePrice === null ? "—" : formatTRY(r.salePrice)} satış · {r.commission} komisyon · {formatPercent(r.margin)} marj
                    </p>
                    <div className="mt-3">
                      <Actions product={r.product} onEdit={edit} onCalc={calcFrom} onDelete={remove} />
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
        </>
      )}
    </>
  );
}

function Actions({
  product,
  onEdit,
  onCalc,
  onDelete,
}: {
  product: Product;
  onEdit: (p: Product) => void;
  onCalc: (p: Product) => void;
  onDelete: (p: Product) => void;
}) {
  const name = product.meta.productName;
  return (
    <div className="flex flex-wrap justify-start gap-1 md:justify-end">
      <Button size="sm" variant="ghost" onClick={() => onCalc(product)} aria-label={`${name}: yeni hesap aç`}>
        Hesapla
      </Button>
      <Button size="sm" variant="ghost" onClick={() => onEdit(product)} aria-label={`${name} ürününü düzenle`}>
        Düzenle
      </Button>
      <Button size="sm" variant="ghost" className="text-loss hover:text-loss" onClick={() => onDelete(product)} aria-label={`${name} ürününü sil`}>
        Sil
      </Button>
    </div>
  );
}
