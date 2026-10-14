"use client";

import { Plus, Sparkles, Trash2, TrendingUp } from "lucide-react";
import { compareScenarios, parseScaled, validateForm, type CalcFormValues, type ScenarioRow } from "@/engine";
import { formatPercent, formatSignedTRY, formatTRY, kurusToInput } from "@/lib/format";
import { useData } from "@/state/DataProvider";
import type { SectionId } from "@/state/navigation";
import { BASE_LABELS, ProfitInline } from "../Results";
import { SelectField, TextField } from "../ui/form";
import { Badge, Button, Card, CardHeader, EmptyState, Notice, PageHeader, cx } from "../ui/primitives";

const MAX_SCENARIOS = 8;

export function ScenariosSection({ navigate }: { navigate: (id: SectionId) => void }) {
  const { data, setScenarios, setDraft } = useData();
  const { scenarios, draft, products } = data;
  const sourceProduct = scenarios.source !== "draft" ? products.find((p) => p.id === scenarios.source) : undefined;
  const source = sourceProduct ? sourceProduct.id : "draft";
  const baseValues: CalcFormValues = sourceProduct ? sourceProduct.values : draft.values;
  const baseName = sourceProduct ? sourceProduct.meta.productName : draft.meta.productName || "Hesaplayıcıdaki güncel değerler";

  // Senaryolarda satış fiyatı satırlardan gelir; tabanın kendi satış fiyatı boş olabilir.
  const baseValidation = validateForm({
    ...baseValues,
    salePrice: baseValues.salePrice.trim() ? baseValues.salePrice : "0",
  });
  const baseSalePrice = baseValues.salePrice.trim() ? baseValidation.input?.salePrice ?? null : null;

  const parsed = scenarios.prices.map((raw) => {
    const r = parseScaled(raw, 2);
    if (r.kind === "ok") {
      if (r.value > 100_000_000_000) return { raw, value: null, error: "Tutar çok büyük." };
      return { raw, value: r.value, error: undefined };
    }
    return { raw, value: null, error: r.kind === "error" ? r.message : undefined };
  });

  const comparison = baseValidation.input
    ? compareScenarios(
        baseValidation.input,
        parsed.filter((p) => p.value !== null).map((p) => p.value as number),
      )
    : null;

  const setPrices = (prices: string[]) => setScenarios({ source, prices });
  const suggest = () => {
    if (baseSalePrice === null || baseSalePrice === 0) return;
    const round = (k: number) => Math.round(k / 100) * 100;
    const list = [baseSalePrice, round(baseSalePrice * 1.1), round(baseSalePrice * 1.2)];
    if (comparison?.breakEven.ok) list.unshift(comparison.breakEven.price);
    setPrices([...new Set(list)].sort((a, b) => a - b).map(kurusToInput));
  };

  const rows = comparison?.rows ?? [];
  const best = rows.length > 1 ? rows.reduce((b, r) => (r.core.profit > b.core.profit ? r : b), rows[0]) : null;
  const maxAbs = Math.max(1, ...rows.map((r) => Math.abs(r.core.profit)));

  return (
    <>
      <PageHeader
        title="Fiyat Senaryoları"
        description="Aynı ürün için farklı satış fiyatlarını aynı maliyet ve vergi varsayımlarıyla karşılaştırın."
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
        <div className="min-w-0 space-y-4">
          <Card>
            <CardHeader title="Varsayımlar" description="Tüm senaryolar bu değerleri kullanır." />
            <div className="space-y-4 p-4">
              <SelectField
                id="scenario-source"
                label="Taban"
                value={source}
                onValueChange={(v) => setScenarios({ source: v, prices: scenarios.prices })}
                options={[
                  { value: "draft", label: "Hesaplayıcıdaki güncel değerler" },
                  ...products.map((p) => ({ value: p.id, label: `Ürün: ${p.meta.productName}` })),
                ]}
              />
              <Assumptions values={baseValues} name={baseName} />
              <Button
                className="w-full"
                onClick={() => {
                  if (sourceProduct) {
                    setDraft(() => ({ values: { ...sourceProduct.values }, meta: { ...sourceProduct.meta }, productId: sourceProduct.id, isExample: false }));
                  }
                  navigate("hesaplayici");
                }}
              >
                Varsayımları hesaplayıcıda düzenle
              </Button>
              <p className="text-xs text-subtle">Varsayımlar değiştiğinde senaryolar otomatik olarak yeniden hesaplanır.</p>
            </div>
          </Card>

          <Card>
            <CardHeader
              title="Satış fiyatları"
              description={baseValues.saleIncludesVat ? "KDV dâhil fiyatlar" : "KDV hariç fiyatlar"}
            />
            <div className="space-y-3 p-4">
              {scenarios.prices.map((raw, i) => (
                <div key={i} className="flex items-end gap-2">
                  <TextField
                    id={`scenario-price-${i}`}
                    label={`Senaryo ${i + 1}`}
                    numeric
                    suffix="TL"
                    value={raw}
                    onValueChange={(v) => setPrices(scenarios.prices.map((p, j) => (j === i ? v : p)))}
                    error={parsed[i]?.error}
                    wrapperClassName="flex-1"
                  />
                  <Button
                    variant="ghost"
                    className="mb-px"
                    aria-label={`Senaryo ${i + 1} fiyatını kaldır`}
                    onClick={() => setPrices(scenarios.prices.filter((_, j) => j !== i))}
                    icon={<Trash2 className="size-4" aria-hidden="true" />}
                  />
                </div>
              ))}
              <div className="flex flex-wrap gap-2">
                <Button
                  icon={<Plus className="size-4" aria-hidden="true" />}
                  disabled={scenarios.prices.length >= MAX_SCENARIOS}
                  onClick={() => setPrices([...scenarios.prices, ""])}
                >
                  Fiyat ekle
                </Button>
                {baseSalePrice !== null && baseSalePrice > 0 && (
                  <Button icon={<Sparkles className="size-4" aria-hidden="true" />} onClick={suggest}>
                    Fiyat öner
                  </Button>
                )}
              </div>
              {baseSalePrice !== null && baseSalePrice > 0 && (
                <p className="text-xs text-subtle">“Fiyat öner”: başa baş fiyatı, mevcut fiyat, %10 ve %20 fazlası.</p>
              )}
            </div>
          </Card>
        </div>

        <div className="min-w-0 space-y-4">
          {!baseValidation.input ? (
            <Card>
              <EmptyState
                icon={<TrendingUp className="size-6" />}
                title="Varsayımlar eksik veya hatalı"
                actions={<Button variant="primary" onClick={() => navigate("hesaplayici")}>Hesaplayıcıya git</Button>}
              >
                Senaryoları karşılaştırmak için hesaplayıcıda en azından alış maliyetini girin ve hatalı alanları düzeltin.
              </EmptyState>
            </Card>
          ) : rows.length === 0 ? (
            <Card>
              <EmptyState icon={<TrendingUp className="size-6" />} title="Henüz fiyat senaryosu yok">
                Soldaki “Fiyat ekle” ile karşılaştırmak istediğiniz satış fiyatlarını girin (ör. 499, 549, 599 TL).
              </EmptyState>
            </Card>
          ) : (
            <>
              <Notice tone="info">
                Başa baş satış fiyatı:{" "}
                <strong className="num">
                  {comparison!.breakEven.ok ? formatTRY(comparison!.breakEven.price) : "ulaşılamaz"}
                </strong>
                {!comparison!.breakEven.ok && <span className="block text-xs">{comparison!.breakEven.message}</span>}
              </Notice>
              <Card>
                <CardHeader title="Karşılaştırma" />
                <div className="hidden overflow-x-auto md:block">
                  <table className="w-full text-sm">
                    <caption className="sr-only">Fiyat senaryoları karşılaştırması</caption>
                    <thead>
                      <tr className="border-b border-line text-left text-xs text-muted">
                        <th scope="col" className="px-4 py-2 font-medium">Satış fiyatı</th>
                        <th scope="col" className="px-3 py-2 text-right font-medium">Tahmini kâr</th>
                        <th scope="col" className="px-3 py-2 text-right font-medium">Kâr marjı</th>
                        <th scope="col" className="px-3 py-2 text-right font-medium">Komisyon</th>
                        <th scope="col" className="px-3 py-2 text-right font-medium">Toplam gider</th>
                        <th scope="col" className="px-4 py-2 text-right font-medium">Başa başa uzaklık</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r, i) => (
                        <tr key={i} className={cx("border-b border-line/60", r === best && "bg-accent/5")}>
                          <th scope="row" className="num px-4 py-3 text-left font-semibold">
                            {formatTRY(r.price)}
                            {r === best && <Badge tone="accent" className="ml-2">En yüksek kâr</Badge>}
                          </th>
                          <td className="px-3 py-3 text-right"><ProfitInline profit={r.core.profit} /></td>
                          <td className="num px-3 py-3 text-right">{formatPercent(r.core.marginPercent)}</td>
                          <td className="num px-3 py-3 text-right">{formatTRY(commission(r))}</td>
                          <td className="num px-3 py-3 text-right">{formatTRY(r.core.totalExpense)}</td>
                          <td className="num px-4 py-3 text-right"><Distance row={r} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <ul className="divide-y divide-line md:hidden">
                  {rows.map((r, i) => (
                    <li key={i} className="space-y-2 p-4">
                      <div className="flex items-center justify-between gap-2">
                        <span className="num font-semibold">{formatTRY(r.price)}</span>
                        {r === best && <Badge tone="accent">En yüksek kâr</Badge>}
                      </div>
                      <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
                        <dt className="text-muted">Tahmini kâr</dt>
                        <dd className="text-right"><ProfitInline profit={r.core.profit} /></dd>
                        <dt className="text-muted">Kâr marjı</dt>
                        <dd className="num text-right">{formatPercent(r.core.marginPercent)}</dd>
                        <dt className="text-muted">Komisyon</dt>
                        <dd className="num text-right">{formatTRY(commission(r))}</dd>
                        <dt className="text-muted">Toplam gider</dt>
                        <dd className="num text-right">{formatTRY(r.core.totalExpense)}</dd>
                        <dt className="text-muted">Başa başa uzaklık</dt>
                        <dd className="num text-right"><Distance row={r} /></dd>
                      </dl>
                    </li>
                  ))}
                </ul>
              </Card>

              <Card>
                <CardHeader title="Kâr karşılaştırması" description="Çubuk uzunluğu tahmini kârla orantılıdır." />
                <ul className="space-y-3 p-4">
                  {rows.map((r, i) => {
                    const width = (Math.abs(r.core.profit) / maxAbs) * 100;
                    return (
                      <li key={i} className="grid grid-cols-[6.5rem_minmax(0,1fr)] items-center gap-3 text-sm sm:grid-cols-[8rem_minmax(0,1fr)]">
                        <span className="num truncate text-muted">{formatTRY(r.price)}</span>
                        <div className="flex min-w-0 items-center gap-2">
                          <div className="h-3 min-w-0 flex-1 overflow-hidden rounded-full bg-surface-3" aria-hidden="true">
                            <div
                              className={cx("h-full rounded-full", r.core.profit >= 0 ? "bg-success" : "bg-danger")}
                              style={{ width: `${Math.max(width, r.core.profit === 0 ? 0 : 2)}%` }}
                            />
                          </div>
                          <span className="w-28 shrink-0 text-right"><ProfitInline profit={r.core.profit} /></span>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </Card>
            </>
          )}
        </div>
      </div>
    </>
  );
}

function commission(r: ScenarioRow): number {
  return r.core.lines.find((l) => l.key === "commission")?.expense ?? 0;
}

function Distance({ row }: { row: ScenarioRow }) {
  if (row.distanceToBreakEven === null) return <>—</>;
  return (
    <span className={row.distanceToBreakEven < 0 ? "text-danger" : undefined}>
      {formatSignedTRY(row.distanceToBreakEven)}
      {row.safetyMarginPercent !== null && (
        <span className="block text-xs text-subtle">güvenlik payı {formatPercent(row.safetyMarginPercent)}</span>
      )}
    </span>
  );
}

function Assumptions({ values, name }: { values: CalcFormValues; name: string }) {
  const v = values;
  const isVat = v.mode === "vat";
  const items: [string, string][] = [
    ["Ad", name],
    ["Mod", isVat ? "KDV ayrıştırmalı" : "Hızlı"],
    ["Alış maliyeti", v.costPrice ? `${v.costPrice} TL${isVat ? (v.costIncludesVat ? " (KDV dâhil)" : " (KDV hariç)") : ""}` : "—"],
    ["Komisyon", `%${v.commissionRate || "0"} · ${BASE_LABELS[v.commissionBase]}`],
    ["Kargo", v.shippingCost ? `${v.shippingCost} TL` : "0 TL"],
    ["Paketleme", v.packagingCost ? `${v.packagingCost} TL` : "0 TL"],
    ["Reklam", v.adCost ? `${v.adCost} TL` : "0 TL"],
    ["Diğer", v.otherCost ? `${v.otherCost} TL` : "0 TL"],
  ];
  if (isVat) {
    items.push(["Satış KDV", `%${v.saleVatRate || "0"}`]);
    items.push(["İndirilebilir KDV", v.vatDeductible ? "Evet" : "Hayır"]);
  }
  return (
    <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 rounded-md border border-line bg-surface-2 p-3 text-xs">
      {items.map(([k, val]) => (
        <div key={k} className="contents">
          <dt className="text-muted">{k}</dt>
          <dd className="truncate text-right text-fg">{val}</dd>
        </div>
      ))}
    </dl>
  );
}
