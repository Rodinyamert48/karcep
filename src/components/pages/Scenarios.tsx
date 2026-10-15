"use client";

import { Plus, X } from "lucide-react";
import { compareScenarios, parseScaled, validateForm, type CalcFormValues, type ScenarioRow } from "@/engine";
import { kurusToInput, formatPercent, formatSignedTRY, formatTRY } from "@/lib/format";
import { useData } from "@/state/DataProvider";
import type { SectionId } from "@/state/navigation";
import { Amount, BASE_LABELS } from "../money";
import { Button } from "../ui/button";
import { SelectField } from "../ui/field";
import { Block, Empty, PageTitle } from "../ui/layout";

const MAX_SCENARIOS = 8;

export function ScenariosPage({ navigate }: { navigate: (id: SectionId) => void }) {
  const { data, setScenarios, setDraft } = useData();
  const { scenarios, draft, products } = data;
  const sourceProduct = scenarios.source !== "draft" ? products.find((p) => p.id === scenarios.source) : undefined;
  const source = sourceProduct ? sourceProduct.id : "draft";
  const base: CalcFormValues = sourceProduct ? sourceProduct.values : draft.values;
  const baseName = sourceProduct ? sourceProduct.meta.productName : draft.meta.productName || "Hesaplayıcıdaki değerler";

  // Satış fiyatı satırlardan gelir; tabanın kendi fiyatı boş olabilir.
  const baseValidation = validateForm({ ...base, salePrice: base.salePrice.trim() ? base.salePrice : "0" });
  const baseSalePrice = base.salePrice.trim() ? (baseValidation.input?.salePrice ?? null) : null;

  const parsed = scenarios.prices.map((raw) => {
    const r = parseScaled(raw, 2);
    if (r.kind === "ok") return r.value > 100_000_000_000 ? { value: null, error: "Tutar çok büyük." } : { value: r.value, error: undefined };
    return { value: null, error: r.kind === "error" ? r.message : undefined };
  });

  const comparison = baseValidation.input
    ? compareScenarios(
        baseValidation.input,
        parsed.filter((p) => p.value !== null).map((p) => p.value as number),
      )
    : null;

  const setPrices = (prices: string[]) => setScenarios({ source, prices });
  const suggest = () => {
    if (!baseSalePrice) return;
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
      <PageTitle title="Fiyat Senaryoları" lead="Aynı maliyet ve vergi varsayımlarıyla farklı satış fiyatlarını karşılaştırın." />

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[20rem_minmax(0,1fr)]">
        <div className="min-w-0 space-y-8">
          <div>
            <SelectField
              id="scenario-source"
              label="Varsayımlar"
              value={source}
              onValueChange={(v) => setScenarios({ source: v, prices: scenarios.prices })}
              options={[
                { value: "draft", label: "Hesaplayıcıdaki değerler" },
                ...products.map((p) => ({ value: p.id, label: p.meta.productName })),
              ]}
            />
            <Assumptions values={base} name={baseName} />
            <Button
              variant="link"
              className="mt-3"
              onClick={() => {
                if (sourceProduct) {
                  setDraft(() => ({ values: { ...sourceProduct.values }, meta: { ...sourceProduct.meta }, productId: sourceProduct.id, isExample: false }));
                }
                navigate("hesaplayici");
              }}
            >
              Varsayımları düzenle
            </Button>
          </div>

          <Block title="Satış fiyatları" aside={base.saleIncludesVat ? "KDV dâhil" : "KDV hariç"}>
            <ul className="space-y-2">
              {scenarios.prices.map((raw, i) => (
                <li key={i}>
                  <div className="flex items-center gap-2">
                    <label htmlFor={`scenario-price-${i}`} className="sr-only">
                      Senaryo {i + 1} fiyatı
                    </label>
                    <span aria-hidden="true" className="num w-5 text-right text-[13px] text-subtle">
                      {i + 1}
                    </span>
                    <div className="relative flex-1">
                      <input
                        id={`scenario-price-${i}`}
                        inputMode="decimal"
                        autoComplete="off"
                        value={raw}
                        onChange={(e) => setPrices(scenarios.prices.map((p, j) => (j === i ? e.target.value : p)))}
                        aria-invalid={parsed[i]?.error ? true : undefined}
                        aria-describedby={parsed[i]?.error ? `scenario-price-${i}-error` : undefined}
                        className={`num h-10 w-full rounded-md border bg-sunken pr-10 pl-3 text-right text-[15px] text-fg hover:border-line-strong focus:border-accent focus:outline-none ${parsed[i]?.error ? "border-loss" : "border-line"}`}
                      />
                      <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-subtle">
                        TL
                      </span>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label={`Senaryo ${i + 1} fiyatını kaldır`}
                      onClick={() => setPrices(scenarios.prices.filter((_, j) => j !== i))}
                    >
                      <X className="size-4" aria-hidden="true" />
                    </Button>
                  </div>
                  {parsed[i]?.error && (
                    <p id={`scenario-price-${i}-error`} role="alert" className="mt-1 ml-7 text-[13px] text-loss">
                      {parsed[i].error}
                    </p>
                  )}
                </li>
              ))}
            </ul>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                size="sm"
                icon={<Plus className="size-4" aria-hidden="true" />}
                disabled={scenarios.prices.length >= MAX_SCENARIOS}
                onClick={() => setPrices([...scenarios.prices, ""])}
              >
                Fiyat ekle
              </Button>
              {baseSalePrice !== null && baseSalePrice > 0 && (
                <Button size="sm" variant="ghost" onClick={suggest}>
                  Fiyat öner
                </Button>
              )}
            </div>
            {baseSalePrice !== null && baseSalePrice > 0 && (
              <p className="mt-3 text-[13px] text-subtle">Öneri: başa baş fiyatı, mevcut fiyat, %10 ve %20 fazlası.</p>
            )}
          </Block>
        </div>

        <div className="min-w-0">
          {!baseValidation.input ? (
            <Empty
              title="Varsayımlar eksik"
              actions={
                <Button variant="primary" onClick={() => navigate("hesaplayici")}>
                  Hesaplayıcıya git
                </Button>
              }
            >
              Karşılaştırma için en azından alış maliyetini girin ve hatalı alanları düzeltin.
            </Empty>
          ) : rows.length === 0 ? (
            <Empty title="Henüz fiyat yok">Soldan karşılaştırmak istediğiniz satış fiyatlarını ekleyin (ör. 499, 549, 599).</Empty>
          ) : (
            <>
              <p className="mb-6 text-[15px] text-muted">
                Başa baş satış fiyatı{" "}
                <strong className="num font-semibold text-fg">
                  {comparison!.breakEven.ok ? formatTRY(comparison!.breakEven.price) : "ulaşılamaz"}
                </strong>
                {!comparison!.breakEven.ok && <span className="mt-1 block text-[13px]">{comparison!.breakEven.message}</span>}
              </p>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[34rem] text-sm">
                  <caption className="sr-only">Fiyat senaryoları karşılaştırması</caption>
                  <thead>
                    <tr className="border-b border-line text-left text-[13px] text-subtle">
                      <th scope="col" className="py-2.5 pr-3 font-normal">
                        Satış fiyatı
                      </th>
                      <th scope="col" className="px-3 py-2.5 font-normal">
                        <span className="sr-only">Kâr çubuğu</span>
                      </th>
                      <th scope="col" className="px-3 py-2.5 text-right font-normal">
                        Tahmini kâr
                      </th>
                      <th scope="col" className="px-3 py-2.5 text-right font-normal">
                        Marj
                      </th>
                      <th scope="col" className="px-3 py-2.5 text-right font-normal">
                        Komisyon
                      </th>
                      <th scope="col" className="py-2.5 pl-3 text-right font-normal">
                        Başa başa uzaklık
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {rows.map((r, i) => (
                      <tr key={i}>
                        <th scope="row" className="num py-3.5 pr-3 text-left font-medium text-fg">
                          {formatTRY(r.price)}
                          {r === best && <span className="ml-2 text-[12px] font-normal text-accent">en kârlı</span>}
                        </th>
                        <td className="w-[28%] px-3 py-3.5">
                          <div className="h-1.5 rounded-full bg-line" aria-hidden="true">
                            <div
                              className={r.core.profit < 0 ? "k-hatch h-full rounded-full bg-loss" : "h-full rounded-full bg-accent"}
                              style={{ width: `${r.core.profit === 0 ? 0 : Math.max(3, (Math.abs(r.core.profit) / maxAbs) * 100)}%` }}
                            />
                          </div>
                        </td>
                        <td className="px-3 py-3.5 text-right">
                          <Amount value={r.core.profit} />
                        </td>
                        <td className="num px-3 py-3.5 text-right text-muted">{formatPercent(r.core.marginPercent)}</td>
                        <td className="num px-3 py-3.5 text-right text-muted">{formatTRY(commission(r))}</td>
                        <td className="num py-3.5 pl-3 text-right">
                          <Distance row={r} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
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
    <span className={row.distanceToBreakEven < 0 ? "text-loss" : "text-fg"}>
      {formatSignedTRY(row.distanceToBreakEven)}
      {row.safetyMarginPercent !== null && (
        <span className="block text-[12px] text-subtle">pay {formatPercent(row.safetyMarginPercent)}</span>
      )}
    </span>
  );
}

function Assumptions({ values: v, name }: { values: CalcFormValues; name: string }) {
  const isVat = v.mode === "vat";
  const tl = (x: string) => (x.trim() ? `${x} TL` : "0 TL");
  const items: [string, string][] = [
    ["Taban", name],
    ["Mod", isVat ? "KDV ayrıştırmalı" : "Hızlı"],
    ["Alış", v.costPrice ? `${v.costPrice} TL${isVat ? (v.costIncludesVat ? " (KDV dâhil)" : " (KDV hariç)") : ""}` : "—"],
    ["Komisyon", `%${v.commissionRate || "0"} · ${BASE_LABELS[v.commissionBase]}`],
    ["Kargo", tl(v.shippingCost)],
    ["Paketleme", tl(v.packagingCost)],
    ["Reklam", tl(v.adCost)],
    ["Diğer", tl(v.otherCost)],
  ];
  if (isVat) items.push(["İndirilebilir KDV", v.vatDeductible ? "Evet" : "Hayır"]);
  return (
    <dl className="mt-4 space-y-1.5 text-[13px]">
      {items.map(([k, val]) => (
        <div key={k} className="flex justify-between gap-4">
          <dt className="text-subtle">{k}</dt>
          <dd className="truncate text-right text-muted">{val}</dd>
        </div>
      ))}
    </dl>
  );
}
