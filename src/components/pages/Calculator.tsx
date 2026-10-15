"use client";

import { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import type { CalcFieldKey, CalcFormValues, CalcResult, CommissionBase } from "@/engine";
import { exampleDraft, newDraft, type CalcMeta } from "@/storage";
import { evaluate } from "@/lib/calc";
import { cn } from "@/lib/cn";
import { formatPercent, formatTRY } from "@/lib/format";
import { useData } from "@/state/DataProvider";
import type { SectionId } from "@/state/navigation";
import { Amount, BASE_LABELS, PriceSplit, priceText } from "../money";
import { SourceDetail } from "../profileSource";
import { Button } from "../ui/button";
import { useFeedback } from "../ui/feedback";
import { Choice, Help, SelectField, TextField, Toggle } from "../ui/field";
import { Block, Note, PageTitle, Tag } from "../ui/layout";

export const FIELD_LABELS: Record<CalcFieldKey, string> = {
  mode: "Hesaplama modu",
  salePrice: "Satış fiyatı",
  saleIncludesVat: "Satış fiyatı KDV dâhil",
  saleVatRate: "Satış KDV oranı",
  costPrice: "Alış maliyeti",
  costIncludesVat: "Alış maliyeti KDV dâhil",
  costVatRate: "Alış KDV oranı",
  commissionRate: "Komisyon oranı",
  commissionBase: "Komisyon tabanı",
  commissionManualBase: "Manuel komisyon tabanı",
  commissionIncludesVat: "Komisyon KDV dâhil",
  commissionVatRate: "Komisyon KDV oranı",
  shippingCost: "Kargo",
  shippingIncludesVat: "Kargo KDV dâhil",
  shippingVatRate: "Kargo KDV oranı",
  packagingCost: "Paketleme",
  packagingIncludesVat: "Paketleme KDV dâhil",
  packagingVatRate: "Paketleme KDV oranı",
  adCost: "Reklam",
  adIncludesVat: "Reklam KDV dâhil",
  adVatRate: "Reklam KDV oranı",
  otherCost: "Diğer giderler",
  otherIncludesVat: "Diğer giderler KDV dâhil",
  otherVatRate: "Diğer giderler KDV oranı",
  saleFeeRate: "Satışa bağlı ücret oranı",
  saleFeeFixed: "Satış başı sabit ücret",
  saleFeeIncludesVat: "Ücretler KDV dâhil",
  saleFeeVatRate: "Ücretlerin KDV oranı",
  fixedCostShare: "Sabit gider payı",
  vatDeductible: "İndirilebilir KDV",
  targetType: "Hedef türü",
  targetValue: "Hedef değeri",
};

const COMMISSION_KEYS: CalcFieldKey[] = ["commissionRate", "commissionBase", "commissionIncludesVat", "commissionVatRate"];

function isPristine(v: CalcFormValues): boolean {
  return !v.salePrice.trim() && !v.costPrice.trim() && !v.commissionRate.trim();
}

type SetValue = <K extends keyof CalcFormValues>(key: K, value: CalcFormValues[K]) => void;

export function CalculatorPage({ navigate }: { navigate: (id: SectionId) => void }) {
  const { data, setDraft, saveProduct, addHistory } = useData();
  const { toast, confirm } = useFeedback();
  const { draft, marketplaces, commissionProfiles, products, settings } = data;
  const { values, meta } = draft;
  const [nameError, setNameError] = useState<string | undefined>();

  const { validation, result } = useMemo(() => evaluate(values), [values]);
  const errors = validation.errors;
  const isVat = values.mode === "vat";

  const editing = draft.productId ? products.find((p) => p.id === draft.productId) : undefined;
  const marketplace = marketplaces.find((m) => m.id === meta.marketplaceId) ?? marketplaces[marketplaces.length - 1];
  const mpProfiles = commissionProfiles.filter((c) => c.marketplaceId === meta.marketplaceId);
  const linked = meta.commissionProfileId ? commissionProfiles.find((c) => c.id === meta.commissionProfileId) : undefined;

  const setValue: SetValue = (key, value) =>
    setDraft((d) => {
      const unlink = COMMISSION_KEYS.includes(key) && d.meta.commissionProfileId !== null;
      return { ...d, values: { ...d.values, [key]: value }, meta: unlink ? { ...d.meta, commissionProfileId: null } : d.meta };
    });
  const setMeta = (patch: Partial<CalcMeta>) => setDraft((d) => ({ ...d, meta: { ...d.meta, ...patch } }));

  const text = (key: keyof CalcFormValues) => ({
    id: `calc-${key}`,
    value: values[key] as string,
    onValueChange: (v: string) => setValue(key, v as never),
    error: errors[key as CalcFieldKey],
  });

  const onMarketplace = (id: string) => {
    const mp = marketplaces.find((m) => m.id === id);
    setDraft((d) => ({
      ...d,
      meta: { ...d.meta, marketplaceId: id, commissionProfileId: null },
      values: mp
        ? {
            ...d.values,
            commissionBase: mp.defaultCommissionBase,
            commissionIncludesVat: mp.commissionIncludesVat,
            commissionVatRate: mp.commissionVatRate || d.values.commissionVatRate,
            saleFeeRate: mp.saleFeeRate || d.values.saleFeeRate,
            saleFeeFixed: mp.saleFeeFixed || d.values.saleFeeFixed,
          }
        : d.values,
    }));
  };

  const onProfile = (id: string) => {
    if (!id) return setMeta({ commissionProfileId: null });
    const p = commissionProfiles.find((c) => c.id === id);
    if (!p) return;
    setDraft((d) => ({
      ...d,
      meta: { ...d.meta, commissionProfileId: p.id, category: p.category },
      values: {
        ...d.values,
        commissionRate: p.rate,
        commissionBase: p.base,
        commissionIncludesVat: p.commissionIncludesVat,
        commissionVatRate: p.commissionVatRate,
      },
    }));
  };

  const startNew = async () => {
    if (!isPristine(values)) {
      const ok = await confirm({
        title: "Form temizlensin mi?",
        message: "Kaydedilmemiş değerler silinecek. Ürünleriniz ve geçmişiniz etkilenmez.",
        confirmLabel: "Temizle",
      });
      if (!ok) return;
    }
    setDraft(() => newDraft(settings, marketplaces));
    setNameError(undefined);
  };

  const toHistory = () => {
    if (!result) return;
    addHistory(draft, result);
    toast("Hesaplama geçmişe kaydedildi.");
  };

  const toProduct = (asNew = false) => {
    if (!meta.productName.trim()) {
      setNameError("Ürün olarak kaydetmek için ürün adı girin.");
      document.getElementById("calc-productName")?.focus();
      return;
    }
    if (!result) return toast("Önce hatalı veya eksik alanları düzeltin.", "error");
    const product = saveProduct(draft, { asNew });
    addHistory({ ...draft, productId: product.id }, result);
    toast(editing && !asNew ? "Ürün güncellendi ve geçmişe eklendi." : "Ürün kaydedildi ve geçmişe eklendi.");
  };

  const errorKeys = Object.keys(errors) as CalcFieldKey[];

  return (
    <>
      <PageTitle
        title="Kâr Hesaplayıcı"
        lead="Değerleri girdikçe sonuç anında güncellenir. Tüm sonuçlar tahminidir."
        actions={
          <>
            {isPristine(values) && (
              <Button variant="ghost" onClick={() => setDraft(() => exampleDraft(settings))}>
                Örnekle doldur
              </Button>
            )}
            <Button onClick={startNew}>Yeni hesap</Button>
          </>
        }
      />

      {draft.isExample && (
        <Note tone="info" title="Örnek veriler" className="mb-6">
          Değerler kurgusaldır; komisyon oranı hiçbir pazaryerinin gerçek oranı değildir.
        </Note>
      )}
      {editing && (
        <Note tone="info" title={`“${editing.meta.productName}” düzenleniyor`} className="mb-6">
          Değişiklikler “Ürünü güncelle” ile kaydedilir.
        </Note>
      )}

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_23rem] xl:grid-cols-[minmax(0,1fr)_26rem]">
        <form className="min-w-0 space-y-8" onSubmit={(e) => e.preventDefault()} noValidate aria-label="Hesaplama formu">
          <div>
            <Choice
              label="Hesaplama modu"
              value={values.mode}
              onChange={(m) => setValue("mode", m)}
              options={[
                { value: "vat", label: "KDV ayrıştırmalı" },
                { value: "quick", label: "Hızlı" },
              ]}
            />
            <p className="mt-2 max-w-xl text-[13px] text-subtle">
              {isVat
                ? "Satış KDV'si ile alış ve hizmet KDV'leri ayrılır; indirilebilir KDV gider sayılmaz."
                : "Tutarlar girildiği gibi kullanılır, KDV ayrılmaz. Satıştaki KDV kâr gibi görüneceği için sonuç olduğundan yüksek çıkabilir."}
            </p>
          </div>

          <Block title="Ürün">
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField
                id="calc-productName"
                label="Ürün adı"
                value={meta.productName}
                onValueChange={(v) => {
                  setMeta({ productName: v });
                  if (v.trim()) setNameError(undefined);
                }}
                maxLength={200}
                error={nameError}
                hint="Yalnızca kaydederken gerekir."
                wrapperClassName="sm:col-span-2"
              />
              <SelectField
                id="calc-marketplace"
                label="Pazaryeri"
                value={marketplace.id}
                onValueChange={onMarketplace}
                options={marketplaces.map((m) => ({ value: m.id, label: m.name }))}
              />
              <SelectField
                id="calc-profile"
                label="Komisyon profili"
                value={linked?.id ?? ""}
                onValueChange={onProfile}
                options={[
                  { value: "", label: "Manuel oran" },
                  ...mpProfiles.map((p) => ({ value: p.id, label: `${p.category || "Genel"} — %${p.rate || "?"}` })),
                ]}
                hint={
                  mpProfiles.length === 0 ? (
                    <>
                      Kayıtlı profil yok.{" "}
                      <button type="button" className="text-accent underline underline-offset-2" onClick={() => navigate("ayarlar")}>
                        Profil ekle
                      </button>
                    </>
                  ) : undefined
                }
              />
              <TextField
                id="calc-category"
                label="Kategori"
                optional
                value={meta.category}
                onValueChange={(v) => setMeta({ category: v })}
                maxLength={200}
                wrapperClassName="sm:col-span-2"
              />
            </div>
          </Block>

          <Block title="Fiyat ve maliyet">
            <div className="grid gap-x-4 gap-y-5 sm:grid-cols-2">
              <TextField
                label="Satış fiyatı"
                required
                numeric
                unit="TL"
                placeholder="0,00"
                {...text("salePrice")}
                help="Müşterinin ödediği ürün fiyatı."
              />
              <TextField
                label="Satış KDV oranı"
                numeric
                unit="%"
                {...text("saleVatRate")}
                hint={isVat ? undefined : "Hızlı modda yalnızca komisyon tabanı için."}
              />
              <Toggle
                id="calc-saleIncludesVat"
                checked={values.saleIncludesVat}
                onChange={(v) => setValue("saleIncludesVat", v)}
                label="Satış fiyatı KDV dâhil"
              />
              <div className="hidden sm:block" />
              <TextField
                label="Alış maliyeti"
                required
                numeric
                unit="TL"
                placeholder="0,00"
                {...text("costPrice")}
                help="Ürünün birim alış veya üretim maliyeti."
              />
              {isVat ? <TextField label="Alış KDV oranı" numeric unit="%" {...text("costVatRate")} /> : <div className="hidden sm:block" />}
              {isVat && (
                <Toggle
                  id="calc-costIncludesVat"
                  checked={values.costIncludesVat}
                  onChange={(v) => setValue("costIncludesVat", v)}
                  label="Alış maliyeti KDV dâhil"
                />
              )}
            </div>
          </Block>

          <Block title="Komisyon" aside={linked ? <Tag tone="info">Profilden</Tag> : <Tag tone="warn">Manuel oran</Tag>}>
            <div className="grid gap-x-4 gap-y-5 sm:grid-cols-2">
              <TextField
                label="Komisyon oranı"
                numeric
                unit="%"
                placeholder="ör. 15"
                {...text("commissionRate")}
                help="Satıcı panelinizdeki veya sözleşmenizdeki oranı girin. KârCep oranları otomatik çekmez ve tahmin etmez."
              />
              <SelectField
                id="calc-commissionBase"
                label="Uygulandığı tutar"
                value={values.commissionBase}
                onValueChange={(v) => setValue("commissionBase", v as CommissionBase)}
                options={(Object.keys(BASE_LABELS) as CommissionBase[]).map((b) => ({ value: b, label: BASE_LABELS[b] }))}
                error={errors.commissionBase}
                help="Komisyonun hangi tutar üzerinden kesildiğini sözleşmenizden doğrulayın."
              />
              {values.commissionBase === "manual" && (
                <TextField label="Manuel taban" required numeric unit="TL" {...text("commissionManualBase")} hint="Satış fiyatıyla değişmez." />
              )}
              {isVat && <TextField label="Komisyon KDV oranı" numeric unit="%" {...text("commissionVatRate")} />}
              {isVat && (
                <Toggle
                  id="calc-commissionIncludesVat"
                  checked={values.commissionIncludesVat}
                  onChange={(v) => setValue("commissionIncludesVat", v)}
                  label="Komisyon tutarı KDV dâhil"
                  description="Kapalıysa faturadaki KDV komisyona ayrıca eklenir."
                />
              )}
            </div>
            <div className="mt-4">
              {linked ? (
                <SourceDetail profile={linked} />
              ) : (
                <p className="text-[13px] text-subtle">Bu oran sizin girdiğiniz değerdir; güncelliği doğrulanmadı.</p>
              )}
            </div>
          </Block>

          <Block title="Giderler" aside={isVat ? "Satış başına, KDV durumuyla" : "Satış başına"}>
            <div className={cn(isVat ? "divide-y divide-line" : "grid gap-4 sm:grid-cols-2")}>
              <CostRow name="Kargo" amount="shippingCost" incl="shippingIncludesVat" rate="shippingVatRate" isVat={isVat} values={values} errors={errors} setValue={setValue} />
              <CostRow name="Paketleme" amount="packagingCost" incl="packagingIncludesVat" rate="packagingVatRate" isVat={isVat} values={values} errors={errors} setValue={setValue} />
              <CostRow name="Reklam" amount="adCost" incl="adIncludesVat" rate="adVatRate" isVat={isVat} values={values} errors={errors} setValue={setValue} />
              <CostRow name="Diğer giderler" amount="otherCost" incl="otherIncludesVat" rate="otherVatRate" isVat={isVat} values={values} errors={errors} setValue={setValue} />
            </div>
          </Block>

          <Block title="Ücretler ve sabit pay">
            <div className="grid gap-x-4 gap-y-5 sm:grid-cols-2">
              <TextField
                label="Satışa bağlı ücret"
                optional
                numeric
                unit="%"
                {...text("saleFeeRate")}
                help="KDV dâhil satış tutarının yüzdesi olarak kesilen ücretler (ör. ödeme/işlem ücreti)."
              />
              <TextField label="Satış başı sabit ücret" optional numeric unit="TL" {...text("saleFeeFixed")} help="Her siparişte kesilen sabit ücret." />
              {isVat && <TextField label="Ücretlerin KDV oranı" numeric unit="%" {...text("saleFeeVatRate")} />}
              {isVat && (
                <Toggle
                  id="calc-saleFeeIncludesVat"
                  checked={values.saleFeeIncludesVat}
                  onChange={(v) => setValue("saleFeeIncludesVat", v)}
                  label="Ücretler KDV dâhil"
                />
              )}
              <TextField
                label="Sabit gider payı"
                optional
                numeric
                unit="TL"
                {...text("fixedCostShare")}
                help="Kira, personel gibi sabit giderlerin ürün başına payı. KDV ayrıştırılmaz."
                wrapperClassName="sm:col-span-2"
              />
            </div>
          </Block>

          {isVat && (
            <Block title="KDV indirimi">
              <Toggle
                id="calc-vatDeductible"
                checked={values.vatDeductible}
                onChange={(v) => setValue("vatDeductible", v)}
                label="Alış ve hizmet KDV'si indirilebilir"
                description="KDV mükellefleri genellikle indirebilir; her işletme için aynı değildir. Emin değilseniz mali müşavirinize danışın."
              />
            </Block>
          )}

          <Block title="Hedef">
            <div className="grid gap-x-4 gap-y-5 sm:grid-cols-2">
              <Choice
                label="Hedef türü"
                value={values.targetType}
                onChange={(t) => setValue("targetType", t)}
                options={[
                  { value: "profit", label: "Kâr tutarı" },
                  { value: "margin", label: "Kâr marjı" },
                ]}
              />
              <TextField
                label={values.targetType === "margin" ? "Hedef marj" : "Hedef kâr"}
                optional
                numeric
                unit={values.targetType === "margin" ? "%" : "TL"}
                {...text("targetValue")}
              />
            </div>
          </Block>
        </form>

        <aside id="sonuclar" aria-label="Sonuçlar" className="min-w-0 scroll-mt-20">
          <div className="lg:sticky lg:top-20">
            <ResultPanel
              result={result}
              errorKeys={errorKeys}
              errors={errors}
              isEditing={Boolean(editing)}
              onSaveProduct={toProduct}
              onSaveHistory={toHistory}
            />
          </div>
        </aside>
      </div>

      {result && (
        <a
          href="#sonuclar"
          className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-20 flex items-center justify-between border-t border-line bg-raised px-4 py-2.5 text-sm lg:hidden"
        >
          <span className="text-muted">{result.profit < 0 ? "Tahmini zarar" : "Tahmini kâr"}</span>
          <span className="flex items-baseline gap-3">
            <Amount value={result.profit} className="font-semibold" />
            <span className="num text-subtle">{formatPercent(result.marginPercent)}</span>
          </span>
        </a>
      )}
    </>
  );
}

function CostRow({
  name,
  amount,
  incl,
  rate,
  isVat,
  values,
  errors,
  setValue,
}: {
  name: string;
  amount: keyof CalcFormValues;
  incl: keyof CalcFormValues;
  rate: keyof CalcFormValues;
  isVat: boolean;
  values: CalcFormValues;
  errors: Partial<Record<CalcFieldKey, string>>;
  setValue: SetValue;
}) {
  const amountField = (
    <TextField
      id={`calc-${amount}`}
      label={name}
      numeric
      unit="TL"
      value={values[amount] as string}
      onValueChange={(v) => setValue(amount, v as never)}
      error={errors[amount]}
    />
  );
  if (!isVat) return amountField;
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_5.5rem] items-start gap-x-3 gap-y-3 py-4 first:pt-0 sm:grid-cols-[minmax(0,1fr)_6rem_9rem] sm:items-end">
      {amountField}
      <TextField
        id={`calc-${rate}`}
        label={
          <>
            <span className="sr-only">{name} </span>KDV
          </>
        }
        numeric
        unit="%"
        value={values[rate] as string}
        onValueChange={(v) => setValue(rate, v as never)}
        error={errors[rate]}
      />
      <div className="col-span-2 sm:col-span-1 sm:pb-2.5">
        <Toggle
          id={`calc-${incl}`}
          checked={Boolean(values[incl])}
          onChange={(v) => setValue(incl, v as never)}
          label={
            <>
              <span className="sr-only">{name} </span>KDV dâhil
            </>
          }
        />
      </div>
    </div>
  );
}

function ResultPanel({
  result,
  errorKeys,
  errors,
  isEditing,
  onSaveProduct,
  onSaveHistory,
}: {
  result: CalcResult | null;
  errorKeys: CalcFieldKey[];
  errors: Partial<Record<CalcFieldKey, string>>;
  isEditing: boolean;
  onSaveProduct: (asNew?: boolean) => void;
  onSaveHistory: () => void;
}) {
  if (!result) {
    return (
      <div className="rounded-lg border border-line bg-raised p-5" aria-live="polite">
        {errorKeys.length > 0 ? (
          <>
            <p className="font-semibold text-fg">Sonuç hesaplanamadı</p>
            <ul className="mt-3 space-y-1.5 text-sm">
              {errorKeys.map((k) => (
                <li key={k}>
                  <a
                    href={`#calc-${k}`}
                    onClick={(e) => {
                      e.preventDefault();
                      document.getElementById(`calc-${k}`)?.focus();
                    }}
                    className="text-loss underline underline-offset-2"
                  >
                    {FIELD_LABELS[k]}
                  </a>
                  <span className="text-muted">: {errors[k]}</span>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <>
            <p className="font-semibold text-fg">Sonuç burada görünecek</p>
            <p className="mt-1 text-sm text-muted">Satış fiyatını ve alış maliyetini girin.</p>
          </>
        )}
      </div>
    );
  }

  const isVat = result.mode === "vat";
  const be = priceText(result.breakEven);
  const tp = priceText(result.target);
  const statusWord = result.status === "loss" ? "Tahmini zarar" : result.status === "breakeven" ? "Başa baş" : "Tahmini kâr";
  const commission = result.lines.find((l) => l.key === "commission")!.expense;

  return (
    <div className="rounded-lg border border-line bg-raised" aria-live="polite">
      <div className="p-5">
        <p className="text-sm text-muted">{statusWord}</p>
        <p
          className={cn(
            "num mt-1 text-[40px] leading-none font-semibold tracking-tight",
            result.profit > 0 ? "text-accent" : result.profit < 0 ? "text-loss" : "text-fg",
          )}
        >
          {result.profit < 0 && <span className="sr-only">Zarar </span>}
          {formatTRY(result.profit)}
        </p>
        <p className="mt-2 text-[13px] text-subtle">
          {isVat ? "KDV hariç gelir − KDV hariç giderler, gelir vergisi öncesi" : "Satış fiyatı − toplam gider, KDV ayrılmadan"}
        </p>

        <dl className="mt-5 grid grid-cols-2 gap-x-4 border-t border-line pt-4">
          <Stat label="Kâr marjı" help="Kâr / satış geliri × 100. KDV modunda gelir KDV hariçtir.">
            {formatPercent(result.marginPercent)}
          </Stat>
          <Stat label="Maliyet üzerine kâr" help="Kâr / alış maliyeti × 100. Kâr marjıyla aynı şey değildir: payda yalnızca alış maliyetidir.">
            {formatPercent(result.costMarkupPercent)}
          </Stat>
        </dl>
      </div>

      <div className="border-t border-line p-5">
        <p className="mb-3 text-sm text-muted">Satış fiyatının dağılımı</p>
        <PriceSplit core={result} />
      </div>

      <dl className="divide-y divide-line border-t border-line text-sm">
        <Row label="Toplam gider" value={formatTRY(result.totalExpense)} />
        <Row label="Komisyon" value={formatTRY(commission)} />
        <Row label="Başa baş satış fiyatı" value={be.value} note={be.note} help="Kârın sıfır olduğu en düşük fiyat. Fiyata bağlı kesintiler hesaba katılır." />
        <Row label="Hedef için gereken fiyat" value={tp.value} note={tp.note} />
      </dl>

      {result.warnings.length > 0 && (
        <div className="border-t border-line p-5">
          <ul className="space-y-1.5 text-[13px] text-warn">
            {result.warnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-wrap gap-2 border-t border-line p-5">
        <Button variant="primary" onClick={() => onSaveProduct(false)}>
          {isEditing ? "Ürünü güncelle" : "Ürün olarak kaydet"}
        </Button>
        {isEditing && <Button onClick={() => onSaveProduct(true)}>Yeni ürün olarak kaydet</Button>}
        <Button variant="ghost" onClick={onSaveHistory}>
          Geçmişe kaydet
        </Button>
      </div>

      <details className="group border-t border-line">
        <summary className="flex cursor-pointer items-center justify-between px-5 py-3.5 text-sm text-muted hover:text-fg">
          Ayrıntılı döküm
          <ChevronDown className="size-4 transition-transform group-open:rotate-180" aria-hidden="true" />
        </summary>
        <Breakdown result={result} />
      </details>
    </div>
  );
}

function Stat({ label, help, children }: { label: string; help: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="flex items-center gap-1.5 text-[13px] text-muted">
        {label}
        <Help label={label}>{help}</Help>
      </dt>
      <dd className="num mt-1 text-lg font-medium text-fg">{children}</dd>
    </div>
  );
}

function Row({ label, value, note, help }: { label: string; value: string; note?: string; help?: string }) {
  return (
    <div className="flex items-start justify-between gap-4 px-5 py-3">
      <dt className="flex items-center gap-1.5 text-muted">
        {label}
        {help && <Help label={label}>{help}</Help>}
      </dt>
      <dd className="text-right">
        <span className="num text-fg">{value}</span>
        {note && <span className="mt-0.5 block max-w-[14rem] text-[12px] text-subtle">{note}</span>}
      </dd>
    </div>
  );
}

function Breakdown({ result }: { result: CalcResult }) {
  const isVat = result.mode === "vat";
  const lines = result.lines.filter((l) => l.gross !== 0 || l.key === "cost" || l.key === "commission");
  return (
    <div className="px-5 pb-5">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[19rem] text-[13px]">
          <caption className="sr-only">Gider dökümü</caption>
          <thead>
            <tr className="text-left text-subtle">
              <th scope="col" className="py-2 font-normal">
                Kalem
              </th>
              {isVat && (
                <th scope="col" className="py-2 text-right font-normal">
                  KDV hariç
                </th>
              )}
              {isVat && (
                <th scope="col" className="py-2 text-right font-normal">
                  KDV
                </th>
              )}
              <th scope="col" className="py-2 text-right font-normal">
                Gider
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            <tr>
              <th scope="row" className="py-2 text-left font-normal text-fg">
                {isVat ? "Satış (KDV hariç)" : "Satış fiyatı"}
              </th>
              {isVat && <td className="num py-2 text-right">{formatTRY(result.saleNet)}</td>}
              {isVat && <td className="num py-2 text-right text-muted">{formatTRY(result.outputVat)}</td>}
              <td className="num py-2 text-right text-accent">+{formatTRY(result.revenue)}</td>
            </tr>
            {lines.map((l) => (
              <tr key={l.key}>
                <th scope="row" className="py-2 text-left font-normal text-fg">
                  {l.label}
                </th>
                {isVat && <td className="num py-2 text-right">{formatTRY(l.net)}</td>}
                {isVat && (
                  <td className="num py-2 text-right text-muted">
                    {formatTRY(l.vat)}
                    {l.vat > 0 && <span className="block text-[11px] text-subtle">{l.deductibleVat > 0 ? "indirilebilir" : "gidere eklendi"}</span>}
                  </td>
                )}
                <td className="num py-2 text-right">−{formatTRY(l.expense)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-line-strong">
              <th scope="row" colSpan={isVat ? 3 : 1} className="py-2 text-left font-medium text-fg">
                Tahmini kâr
              </th>
              <td className="py-2 text-right font-medium">
                <Amount value={result.profit} />
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
      {isVat && (
        <dl className="mt-4 grid grid-cols-1 gap-2 text-[13px] sm:grid-cols-2">
          <div className="flex justify-between gap-2">
            <dt className="text-subtle">Satış KDV&apos;si</dt>
            <dd className="num">{formatTRY(result.outputVat)}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-subtle">İndirilebilir KDV</dt>
            <dd className="num">{formatTRY(result.deductibleVatTotal)}</dd>
          </div>
          <div className="flex justify-between gap-2 sm:col-span-2">
            <dt className="text-subtle">{result.vatBalance >= 0 ? "Tahmini ödenecek KDV" : "Devreden KDV"}</dt>
            <dd className="num">{formatTRY(Math.abs(result.vatBalance))}</dd>
          </div>
        </dl>
      )}
      <p className="mt-4 text-[12px] leading-relaxed text-subtle">
        Gelir/kurumlar vergisi, stopaj, iade ve iptaller, pazaryeri teşvikleri otomatik eklenmez; gerekiyorsa “Diğer giderler”
        veya “Sabit gider payı” alanına girin. Sonuçlar tahmindir, muhasebe veya vergi danışmanlığı değildir.
      </p>
    </div>
  );
}
