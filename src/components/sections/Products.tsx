"use client";

import { useMemo, useState } from "react";
import { Calculator, Package, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { newDraft, type Product } from "@/storage";
import { evaluate } from "@/lib/calc";
import { formatDateTime, formatPercent, formatTRY } from "@/lib/format";
import { useData } from "@/state/DataProvider";
import type { SectionId } from "@/state/navigation";
import { ProfitInline } from "../Results";
import { useFeedback } from "../ui/feedback";
import { SelectField, TextField } from "../ui/form";
import { Badge, Button, Card, EmptyState, PageHeader } from "../ui/primitives";

type SortKey = "updated" | "profit-desc" | "profit-asc" | "price-desc" | "price-asc" | "name";

const SORTS: { value: SortKey; label: string }[] = [
  { value: "updated", label: "Son güncellenen" },
  { value: "profit-desc", label: "Kâr (yüksekten düşüğe)" },
  { value: "profit-asc", label: "Kâr (düşükten yükseğe)" },
  { value: "price-desc", label: "Satış fiyatı (yüksekten düşüğe)" },
  { value: "price-asc", label: "Satış fiyatı (düşükten yükseğe)" },
  { value: "name", label: "Ada göre (A–Z)" },
];

interface Row {
  product: Product;
  salePrice: number | null;
  profit: number | null;
  margin: number | null;
  cost: string;
  commissionRate: string;
  otherCosts: number | null;
}

function toRow(product: Product): Row {
  const { result, validation } = evaluate(product.values);
  const cost = result?.lines.find((l) => l.key === "cost");
  return {
    product,
    salePrice: validation.input ? validation.input.salePrice : null,
    profit: result ? result.profit : null,
    margin: result ? result.marginPercent : null,
    cost: cost ? formatTRY(product.values.costIncludesVat || product.values.mode === "quick" ? cost.gross : cost.net) : "—",
    commissionRate: product.values.commissionRate ? `%${product.values.commissionRate}` : "%0",
    otherCosts: result ? result.otherExpenses : null,
  };
}

export function ProductsSection({ navigate }: { navigate: (id: SectionId) => void }) {
  const { data, setDraft, deleteProduct } = useData();
  const { toast, confirm } = useFeedback();
  const { products, marketplaces, settings } = data;
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("updated");

  const rows = useMemo(() => {
    const q = query.trim().toLocaleLowerCase("tr-TR");
    const filtered = products.map(toRow).filter((r) => !q || r.product.meta.productName.toLocaleLowerCase("tr-TR").includes(q));
    const nullLast = (a: number | null, b: number | null, dir: 1 | -1) => {
      if (a === null && b === null) return 0;
      if (a === null) return 1;
      if (b === null) return -1;
      return (a - b) * dir;
    };
    return filtered.sort((a, b) => {
      switch (sort) {
        case "profit-desc":
          return nullLast(a.profit, b.profit, -1);
        case "profit-asc":
          return nullLast(a.profit, b.profit, 1);
        case "price-desc":
          return nullLast(a.salePrice, b.salePrice, -1);
        case "price-asc":
          return nullLast(a.salePrice, b.salePrice, 1);
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
    toast("Üründen yeni hesaplama oluşturuldu. Kaydetmezseniz ürün değişmez.", "info");
  };
  const add = () => {
    setDraft(() => newDraft(settings, marketplaces));
    navigate("hesaplayici");
    toast("Değerleri girip “Ürün olarak kaydet”e basın.", "info");
  };
  const remove = async (p: Product) => {
    const ok = await confirm({
      title: "Ürün silinsin mi?",
      message: (
        <>
          <strong className="text-fg">{p.meta.productName}</strong> kalıcı olarak silinecek. Geçmişteki hesaplamalar silinmez. Bu işlem geri
          alınamaz.
        </>
      ),
      confirmLabel: "Ürünü sil",
      danger: true,
    });
    if (!ok) return;
    deleteProduct(p.id);
    toast("Ürün silindi.");
  };

  return (
    <>
      <PageHeader
        title="Ürünlerim"
        description="Kaydettiğiniz ürünler ve güncel değerleriyle hesaplanan tahmini kârları."
        actions={
          <Button variant="primary" icon={<Plus className="size-4" aria-hidden="true" />} onClick={add}>
            Ürün ekle
          </Button>
        }
      />

      {products.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Package className="size-6" />}
            title="Kayıtlı ürün yok"
            actions={
              <Button variant="primary" icon={<Plus className="size-4" aria-hidden="true" />} onClick={add}>
                İlk ürünü ekle
              </Button>
            }
          >
            Hesaplayıcıda değerleri girip “Ürün olarak kaydet” düğmesine basarak ürün ekleyebilirsiniz.
          </EmptyState>
        </Card>
      ) : (
        <Card>
          <div className="grid grid-cols-1 gap-3 border-b border-line p-4 sm:grid-cols-[minmax(0,1fr)_16rem]">
            <div className="relative">
              <TextField
                id="product-search"
                label="Ürün ara"
                value={query}
                onValueChange={setQuery}
                placeholder="Ürün adına göre ara"
                type="search"
                className="pl-9"
              />
              <Search className="pointer-events-none absolute bottom-3 left-3 size-4 text-subtle" aria-hidden="true" />
            </div>
            <SelectField id="product-sort" label="Sırala" value={sort} onValueChange={(v) => setSort(v as SortKey)} options={SORTS} />
          </div>

          <p className="sr-only" aria-live="polite">
            {rows.length} ürün listeleniyor
          </p>

          {rows.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted">“{query}” ile eşleşen ürün bulunamadı.</p>
          ) : (
            <>
              {/* Masaüstü tablo */}
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full text-sm">
                  <caption className="sr-only">Kayıtlı ürünler</caption>
                  <thead>
                    <tr className="border-b border-line text-left text-xs text-muted">
                      <th scope="col" className="px-4 py-2 font-medium">Ürün</th>
                      <th scope="col" className="px-3 py-2 text-right font-medium">Alış</th>
                      <th scope="col" className="px-3 py-2 text-right font-medium">Satış fiyatı</th>
                      <th scope="col" className="px-3 py-2 text-right font-medium">Komisyon</th>
                      <th scope="col" className="px-3 py-2 text-right font-medium">Kargo ve diğer</th>
                      <th scope="col" className="px-3 py-2 text-right font-medium">Tahmini kâr</th>
                      <th scope="col" className="px-3 py-2 font-medium">Güncelleme</th>
                      <th scope="col" className="px-4 py-2 text-right font-medium">
                        <span className="sr-only">İşlemler</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.product.id} className="border-b border-line/60 hover:bg-surface-2/60">
                        <th scope="row" className="max-w-[16rem] px-4 py-3 text-left font-medium">
                          <span className="block truncate text-fg">{r.product.meta.productName}</span>
                          <span className="block truncate text-xs font-normal text-subtle">
                            {mpName(r.product.meta.marketplaceId)}
                            {r.product.meta.category ? ` · ${r.product.meta.category}` : ""}
                          </span>
                        </th>
                        <td className="num px-3 py-3 text-right">{r.cost}</td>
                        <td className="num px-3 py-3 text-right">{r.salePrice === null ? "—" : formatTRY(r.salePrice)}</td>
                        <td className="num px-3 py-3 text-right">{r.commissionRate}</td>
                        <td className="num px-3 py-3 text-right">{r.otherCosts === null ? "—" : formatTRY(r.otherCosts)}</td>
                        <td className="px-3 py-3 text-right">
                          {r.profit === null ? (
                            <Badge tone="warning">Eksik veri</Badge>
                          ) : (
                            <>
                              <ProfitInline profit={r.profit} />
                              <span className="num block text-xs text-subtle">{formatPercent(r.margin)}</span>
                            </>
                          )}
                        </td>
                        <td className="px-3 py-3 text-xs text-muted">{formatDateTime(r.product.updatedAt)}</td>
                        <td className="px-4 py-3">
                          <Actions product={r.product} onEdit={edit} onCalc={calcFrom} onDelete={remove} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobil kartlar */}
              <ul className="divide-y divide-line md:hidden">
                {rows.map((r) => (
                  <li key={r.product.id} className="space-y-2 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-medium text-fg">{r.product.meta.productName}</p>
                        <p className="truncate text-xs text-subtle">
                          {mpName(r.product.meta.marketplaceId)} · {formatDateTime(r.product.updatedAt)}
                        </p>
                      </div>
                      <div className="shrink-0 text-right text-sm">
                        {r.profit === null ? <Badge tone="warning">Eksik veri</Badge> : <ProfitInline profit={r.profit} />}
                        <span className="num block text-xs text-subtle">{formatPercent(r.margin)}</span>
                      </div>
                    </div>
                    <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                      <dt className="text-muted">Alış</dt>
                      <dd className="num text-right">{r.cost}</dd>
                      <dt className="text-muted">Satış fiyatı</dt>
                      <dd className="num text-right">{r.salePrice === null ? "—" : formatTRY(r.salePrice)}</dd>
                      <dt className="text-muted">Komisyon</dt>
                      <dd className="num text-right">{r.commissionRate}</dd>
                      <dt className="text-muted">Kargo ve diğer</dt>
                      <dd className="num text-right">{r.otherCosts === null ? "—" : formatTRY(r.otherCosts)}</dd>
                    </dl>
                    <Actions product={r.product} onEdit={edit} onCalc={calcFrom} onDelete={remove} />
                  </li>
                ))}
              </ul>
            </>
          )}
        </Card>
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
    <div className="flex flex-wrap justify-end gap-1.5">
      <Button size="sm" icon={<Calculator className="size-3.5" aria-hidden="true" />} onClick={() => onCalc(product)} aria-label={`${name} ürününden yeni hesaplama`}>
        Hesapla
      </Button>
      <Button size="sm" icon={<Pencil className="size-3.5" aria-hidden="true" />} onClick={() => onEdit(product)} aria-label={`${name} ürününü düzenle`}>
        Düzenle
      </Button>
      <Button size="sm" variant="danger" icon={<Trash2 className="size-3.5" aria-hidden="true" />} onClick={() => onDelete(product)} aria-label={`${name} ürününü sil`}>
        Sil
      </Button>
    </div>
  );
}
