"use client";

import { useMemo, useState } from "react";
import {
  Calculator as CalcIcon,
  FlaskConical,
  History,
  Info,
  Package,
  Percent,
  RotateCcw,
  Save,
  Store,
  Target,
  Truck,
  Wallet,
} from "lucide-react";
import type { CalcFieldKey, CalcFormValues, CommissionBase } from "@/engine";
import { exampleDraft, newDraft, type CalcMeta, type Draft } from "@/storage";
import { evaluate } from "@/lib/calc";
import { formatPercent, formatTRY } from "@/lib/format";
import { useData } from "@/state/DataProvider";
import type { SectionId } from "@/state/navigation";
import { ProfileSourceDetail } from "../ProfileSource";
import { BASE_LABELS, Breakdown, ResultMetrics, StatusBanner, Warnings } from "../Results";
import { useFeedback } from "../ui/feedback";
import { Segmented, SelectField, Switch, TextField } from "../ui/form";
import { Badge, Button, Card, CardHeader, Notice, PageHeader, cx } from "../ui/primitives";

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
  shippingCost: "Kargo gideri",
  shippingIncludesVat: "Kargo KDV dâhil",
  shippingVatRate: "Kargo KDV oranı",
  packagingCost: "Paketleme gideri",
  packagingIncludesVat: "Paketleme KDV dâhil",
  packagingVatRate: "Paketleme KDV oranı",
  adCost: "Reklam gideri",
  adIncludesVat: "Reklam KDV dâhil",
  adVatRate: "Reklam KDV oranı",
  otherCost: "Diğer giderler",
  otherIncludesVat: "Diğer giderler KDV dâhil",
  otherVatRate: "Diğer giderler KDV oranı",
  saleFeeRate: "Satışa bağlı ücret oranı",
  saleFeeFixed: "Satış başı sabit ücret",
  saleFeeIncludesVat: "Satışa bağlı ücretler KDV dâhil",
  saleFeeVatRate: "Satışa bağlı ücret KDV oranı",
  fixedCostShare: "Sabit gider payı",
  vatDeductible: "İndirilebilir KDV",
  targetType: "Hedef türü",
  targetValue: "Hedef değeri",
};

const COMMISSION_KEYS: CalcFieldKey[] = ["commissionRate", "commissionBase", "commissionIncludesVat", "commissionVatRate"];

function isPristine(values: CalcFormValues): boolean {
  return !values.salePrice.trim() && !values.costPrice.trim() && !values.commissionRate.trim();
}

export function CalculatorSection({ navigate }: { navigate: (id: SectionId) => void }) {
  const { data, setDraft, saveProduct, addHistory } = useData();
  const { toast, confirm } = useFeedback();
  const { draft, marketplaces, commissionProfiles, products, settings } = data;
  const { values, meta } = draft;
  const [nameError, setNameError] = useState<string | undefined>();

  const evaluation = useMemo(() => evaluate(values), [values]);
  const { validation, result } = evaluation;
  const errors = validation.errors;
  const isVat = values.mode === "vat";

  const editingProduct = draft.productId ? products.find((p) => p.id === draft.productId) : undefined;
  const marketplace = marketplaces.find((m) => m.id === meta.marketplaceId) ?? marketplaces[marketplaces.length - 1];
  const mpProfiles = commissionProfiles.filter((c) => c.marketplaceId === meta.marketplaceId);
  const linkedProfile = meta.commissionProfileId ? commissionProfiles.find((c) => c.id === meta.commissionProfileId) : undefined;

  const setValue = <K extends keyof CalcFormValues>(key: K, value: CalcFormValues[K]) => {
    setDraft((d) => {
      const unlink = COMMISSION_KEYS.includes(key) && d.meta.commissionProfileId !== null;
      return {
        ...d,
        values: { ...d.values, [key]: value },
        meta: unlink ? { ...d.meta, commissionProfileId: null } : d.meta,
      };
    });
  };
  const setMeta = (patch: Partial<CalcMeta>) => setDraft((d) => ({ ...d, meta: { ...d.meta, ...patch } }));

  const text = (key: keyof CalcFormValues) => ({
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
    if (!id) {
      setMeta({ commissionProfileId: null });
      return;
    }
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
        title: "Yeni hesaplama başlatılsın mı?",
        message: "Formdaki kaydedilmemiş değerler temizlenecek. Kayıtlı ürünleriniz ve geçmişiniz etkilenmez.",
        confirmLabel: "Formu temizle",
      });
      if (!ok) return;
    }
    setDraft(() => newDraft(settings, marketplaces));
    setNameError(undefined);
  };

  const loadExample = () => setDraft(() => exampleDraft(settings));

  const toHistory = () => {
    if (!result) return;
    addHistory(draft as Draft, result);
    toast("Hesaplama geçmişe kaydedildi.");
  };

  const toProduct = (asNew = false) => {
    if (!meta.productName.trim()) {
      setNameError("Ürün olarak kaydetmek için ürün adı girin.");
      document.getElementById("calc-productName")?.focus();
      return;
    }
    if (!result) {
      toast("Kaydetmeden önce formdaki eksik veya hatalı alanları düzeltin.", "error");
      return;
    }
    const product = saveProduct(draft, { asNew });
    addHistory({ ...draft, productId: product.id }, result);
    toast(editingProduct && !asNew ? "Ürün güncellendi ve geçmişe eklendi." : "Ürün kaydedildi ve geçmişe eklendi.");
  };

  const errorList = Object.keys(errors) as CalcFieldKey[];
  const targetLabel = values.targetType === "margin" ? "marj" : "kâr";

  return (
    <div className="pb-24 lg:pb-0">
      <PageHeader
        title="Kâr Hesaplayıcı"
        description="Satış fiyatı ve giderleri girin; sonuçlar yazarken anında güncellenir. Tüm sonuçlar tahminidir."
        actions={
          <>
            {isPristine(values) && (
              <Button icon={<FlaskConical className="size-4" aria-hidden="true" />} onClick={loadExample}>
                Örnek hesaplama
              </Button>
            )}
            <Button icon={<RotateCcw className="size-4" aria-hidden="true" />} onClick={startNew}>
              Yeni hesaplama
            </Button>
          </>
        }
      />

      {draft.isExample && (
        <Notice tone="info" icon={<FlaskConical className="size-4" />} title="Bu bir örnek hesaplamadır" className="mb-4">
          Değerler kurgusaldır; komisyon oranı herhangi bir pazaryerinin gerçek veya güncel oranı değildir. Kendi verilerinizi girerek
          devam edin.
        </Notice>
      )}
      {editingProduct && (
        <Notice tone="info" icon={<Package className="size-4" />} className="mb-4">
          <span className="font-semibold">“{editingProduct.meta.productName}”</span> ürününü düzenliyorsunuz. Değişiklikler “Ürünü
          güncelle” ile kaydedilir.
        </Notice>
      )}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)] xl:grid-cols-[minmax(0,1fr)_minmax(0,30rem)]">
        {/* ---------------- FORM ---------------- */}
        <form className="min-w-0 space-y-4" onSubmit={(e) => e.preventDefault()} noValidate aria-label="Kâr hesaplama formu">
          <Card className="p-4 sm:p-5">
            <Segmented
              label="Hesaplama modu"
              value={values.mode}
              onChange={(m) => setValue("mode", m)}
              options={[
                { value: "vat", label: "KDV ayrıştırmalı" },
                { value: "quick", label: "Hızlı hesaplama" },
              ]}
            />
            <p className="mt-2 text-xs text-muted">
              {isVat
                ? "Satış KDV'si, alış ve hizmet KDV'lerinden ayrılır; indirilebilir KDV gider sayılmaz. Daha gerçekçi tahmin içindir, muhasebe sonucu değildir."
                : "Tutarlar girildiği gibi kullanılır, KDV ayrıştırılmaz. Satış fiyatındaki KDV kâr gibi görüneceği için sonuç olduğundan yüksek çıkabilir."}
            </p>
          </Card>

          <Card>
            <CardHeader title="Ürün ve pazaryeri" icon={<Store className="size-4" />} />
            <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 sm:p-5">
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
                hint="Hesaplama için zorunlu değil; ürün olarak kaydederken gerekir."
                wrapperClassName="sm:col-span-2"
              />
              <SelectField
                id="calc-marketplace"
                label="Pazaryeri profili"
                value={marketplace.id}
                onValueChange={onMarketplace}
                options={marketplaces.map((m) => ({ value: m.id, label: m.name }))}
              />
              <SelectField
                id="calc-profile"
                label="Komisyon profili"
                value={linkedProfile?.id ?? ""}
                onValueChange={onProfile}
                options={[
                  { value: "", label: "Manuel oran (profil yok)" },
                  ...mpProfiles.map((p) => ({
                    value: p.id,
                    label: `${p.category || "Genel"} — %${p.rate || "?"}${p.origin === "user" ? " (kullanıcı girişi)" : ""}`,
                  })),
                ]}
                hint={
                  mpProfiles.length === 0 ? (
                    <>
                      Bu pazaryeri için kayıtlı profil yok.{" "}
                      <button type="button" className="text-accent underline" onClick={() => navigate("ayarlar")}>
                        Profil ekle
                      </button>
                    </>
                  ) : undefined
                }
              />
              <TextField
                id="calc-category"
                label="Kategori"
                value={meta.category}
                onValueChange={(v) => setMeta({ category: v })}
                maxLength={200}
                placeholder="ör. Ev & Yaşam"
                wrapperClassName="sm:col-span-2"
              />
            </div>
          </Card>

          <Card>
            <CardHeader title="Satış" icon={<Wallet className="size-4" />} />
            <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 sm:p-5">
              <TextField
                id="calc-salePrice"
                label="Satış fiyatı"
                required
                numeric
                suffix="TL"
                placeholder="0,00"
                {...text("salePrice")}
                info="Müşterinin ödediği ürün fiyatı. KDV dâhil olup olmadığını aşağıdan seçin."
              />
              <TextField
                id="calc-saleVatRate"
                label="Ürün satış KDV oranı"
                numeric
                suffix="%"
                {...text("saleVatRate")}
                hint={isVat ? "Ürününüze uygulanan KDV oranı (%0, %1, %10, %20 …)" : "Hızlı modda yalnızca komisyon tabanı dönüşümünde kullanılır."}
              />
              <div className="sm:col-span-2">
                <Switch
                  id="calc-saleIncludesVat"
                  checked={values.saleIncludesVat}
                  onChange={(v) => setValue("saleIncludesVat", v)}
                  label="Satış fiyatı KDV dâhil"
                  description="Pazaryerlerinde listelenen fiyatlar genellikle KDV dâhildir."
                />
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader title="Alış maliyeti" icon={<Package className="size-4" />} />
            <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 sm:p-5">
              <TextField id="calc-costPrice" label="Alış maliyeti" required numeric suffix="TL" placeholder="0,00" {...text("costPrice")} info="Ürünün birim alış veya üretim maliyeti." />
              {isVat && <TextField id="calc-costVatRate" label="Alış KDV oranı" numeric suffix="%" {...text("costVatRate")} />}
              {isVat && (
                <div className="sm:col-span-2">
                  <Switch
                    id="calc-costIncludesVat"
                    checked={values.costIncludesVat}
                    onChange={(v) => setValue("costIncludesVat", v)}
                    label="Alış maliyeti KDV dâhil"
                  />
                </div>
              )}
            </div>
          </Card>

          <Card>
            <CardHeader
              title="Komisyon"
              icon={<Percent className="size-4" />}
              actions={linkedProfile ? <Badge tone="info">Profil: {linkedProfile.category || "Genel"}</Badge> : <Badge tone="warning">Manuel oran</Badge>}
            />
            <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 sm:p-5">
              <TextField
                id="calc-commissionRate"
                label="Komisyon oranı"
                numeric
                suffix="%"
                placeholder="ör. 15"
                {...text("commissionRate")}
                info="Pazaryeri panelinizde veya sözleşmenizde yazan oranı girin. KârCep güncel oranları otomatik çekmez ve tahmin etmez."
              />
              <SelectField
                id="calc-commissionBase"
                label="Komisyonun uygulandığı tutar"
                value={values.commissionBase}
                onValueChange={(v) => setValue("commissionBase", v as CommissionBase)}
                options={(Object.keys(BASE_LABELS) as CommissionBase[]).map((b) => ({ value: b, label: BASE_LABELS[b] }))}
                error={errors.commissionBase}
                info="Pazaryerinin komisyonu hangi tutar üzerinden kestiğini satıcı sözleşmenizden doğrulayın. Yanlış taban sonucu değiştirir."
              />
              {values.commissionBase === "manual" && (
                <TextField id="calc-commissionManualBase" label="Manuel taban tutarı" required numeric suffix="TL" {...text("commissionManualBase")} hint="Komisyonun hesaplanacağı sabit tutar; satış fiyatıyla değişmez." />
              )}
              {isVat && <TextField id="calc-commissionVatRate" label="Komisyon hizmeti KDV oranı" numeric suffix="%" {...text("commissionVatRate")} />}
              {isVat && (
                <div className="sm:col-span-2">
                  <Switch
                    id="calc-commissionIncludesVat"
                    checked={values.commissionIncludesVat}
                    onChange={(v) => setValue("commissionIncludesVat", v)}
                    label="Hesaplanan komisyon tutarı KDV dâhil"
                    description="Kapalıysa komisyon hizmet bedeline ayrıca KDV eklenir (faturada KDV ayrı gösteriliyorsa)."
                  />
                </div>
              )}
              <div className="sm:col-span-2">
                {linkedProfile ? (
                  <ProfileSourceDetail profile={linkedProfile} />
                ) : (
                  <p className="flex items-start gap-1.5 text-xs text-muted">
                    <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                    Manuel oran: bu değer sizin girdiğiniz orandır, güncelliği doğrulanmamıştır.
                  </p>
                )}
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader title="Giderler" icon={<Truck className="size-4" />} description={isVat ? "Her kalem için KDV oranını ve dâhil/hariç durumunu seçin." : undefined} />
            <div className="divide-y divide-line">
              <CostRow label="Kargo gideri" amount="shippingCost" incl="shippingIncludesVat" rate="shippingVatRate" isVat={isVat} values={values} errors={errors} setValue={setValue} />
              <CostRow label="Paketleme gideri" amount="packagingCost" incl="packagingIncludesVat" rate="packagingVatRate" isVat={isVat} values={values} errors={errors} setValue={setValue} />
              <CostRow label="Reklam gideri" amount="adCost" incl="adIncludesVat" rate="adVatRate" isVat={isVat} values={values} errors={errors} setValue={setValue} hint="Satış başına düşen reklam harcaması" />
              <CostRow label="Diğer giderler" amount="otherCost" incl="otherIncludesVat" rate="otherVatRate" isVat={isVat} values={values} errors={errors} setValue={setValue} />
            </div>
          </Card>

          <Card>
            <CardHeader title="Satışa bağlı ücretler ve sabit gider payı" icon={<Store className="size-4" />} />
            <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 sm:p-5">
              <TextField
                id="calc-saleFeeRate"
                label="Satışa bağlı ücret oranı"
                numeric
                suffix="%"
                {...text("saleFeeRate")}
                info="KDV dâhil satış tutarının yüzdesi olarak kesilen diğer ücretler (ör. ödeme/işlem ücretleri). Satış fiyatıyla birlikte değişir."
              />
              <TextField
                id="calc-saleFeeFixed"
                label="Satış başı sabit ücret"
                numeric
                suffix="TL"
                {...text("saleFeeFixed")}
                info="Her siparişte kesilen sabit tutarlı ücretler (ör. hizmet bedeli)."
              />
              {isVat && <TextField id="calc-saleFeeVatRate" label="Ücretlerin KDV oranı" numeric suffix="%" {...text("saleFeeVatRate")} />}
              {isVat && (
                <div className="self-end pb-2">
                  <Switch id="calc-saleFeeIncludesVat" checked={values.saleFeeIncludesVat} onChange={(v) => setValue("saleFeeIncludesVat", v)} label="Ücretler KDV dâhil" />
                </div>
              )}
              <TextField
                id="calc-fixedCostShare"
                label="Sabit gider payı (isteğe bağlı)"
                numeric
                suffix="TL"
                {...text("fixedCostShare")}
                info="Kira, personel, yazılım gibi sabit giderlerin ürün başına düşen payı. KDV ayrıştırılmaz."
                wrapperClassName="sm:col-span-2"
              />
            </div>
          </Card>

          {isVat && (
            <Card className="p-4 sm:p-5">
              <Switch
                id="calc-vatDeductible"
                checked={values.vatDeductible}
                onChange={(v) => setValue("vatDeductible", v)}
                label="Alış ve hizmet KDV'si indirilebilir"
                description="KDV mükellefi işletmeler genellikle alış ve hizmet KDV'sini indirebilir; ancak bu her işletme için aynı değildir. Emin değilseniz mali müşavirinize danışın."
              />
            </Card>
          )}

          <Card>
            <CardHeader title="Hedef" icon={<Target className="size-4" />} description="Hedeflediğiniz kâr veya marj için gereken satış fiyatını hesaplar." />
            <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 sm:p-5">
              <Segmented
                label="Hedef türü"
                value={values.targetType}
                onChange={(t) => setValue("targetType", t)}
                options={[
                  { value: "profit", label: "Kâr tutarı" },
                  { value: "margin", label: "Kâr marjı" },
                ]}
              />
              <TextField
                id="calc-targetValue"
                label={values.targetType === "margin" ? "Hedef marj" : "Hedef kâr (satış başı)"}
                numeric
                suffix={values.targetType === "margin" ? "%" : "TL"}
                {...text("targetValue")}
              />
            </div>
          </Card>
        </form>

        {/* ---------------- SONUÇLAR ---------------- */}
        <section aria-labelledby="results-title" role="region" id="sonuclar" className="min-w-0 scroll-mt-20">
          <div className="space-y-4 lg:sticky lg:top-6">
            <Card>
              <CardHeader id="results-title" title="Sonuçlar" icon={<CalcIcon className="size-4" />} description={isVat ? "KDV ayrıştırmalı tahmin" : "Hızlı tahmin (KDV ayrıştırılmadı)"} />
              <div className="space-y-3 p-4" aria-live="polite">
                {result ? (
                  <>
                    <StatusBanner result={result} />
                    <ResultMetrics result={result} saleIncludesVat={values.saleIncludesVat} targetLabel={targetLabel} />
                  </>
                ) : errorList.length > 0 ? (
                  <Notice tone="danger" title="Sonuç hesaplanamadı">
                    Şu alanları düzeltin:
                    <ul className="mt-1 list-disc pl-4">
                      {errorList.map((k) => (
                        <li key={k}>
                          <a href={`#calc-${k}`} className="underline" onClick={(e) => { e.preventDefault(); document.getElementById(`calc-${k}`)?.focus(); }}>
                            {FIELD_LABELS[k]}
                          </a>
                          : {errors[k]}
                        </li>
                      ))}
                    </ul>
                  </Notice>
                ) : (
                  <p className="rounded-lg border border-dashed border-line px-4 py-8 text-center text-sm text-muted">
                    Sonuçları görmek için <strong className="text-fg">satış fiyatı</strong> ve <strong className="text-fg">alış maliyeti</strong> girin.
                  </p>
                )}
              </div>
              {result && (
                <div className="flex flex-wrap gap-2 border-t border-line p-4">
                  <Button variant="primary" icon={<Save className="size-4" aria-hidden="true" />} onClick={() => toProduct(false)}>
                    {editingProduct ? "Ürünü güncelle" : "Ürün olarak kaydet"}
                  </Button>
                  {editingProduct && (
                    <Button onClick={() => toProduct(true)}>Yeni ürün olarak kaydet</Button>
                  )}
                  <Button icon={<History className="size-4" aria-hidden="true" />} onClick={toHistory}>
                    Geçmişe kaydet
                  </Button>
                </div>
              )}
            </Card>
            {result && <Warnings warnings={result.warnings} />}
            {result && <Breakdown result={result} />}
            <p className="text-xs text-subtle">
              Gelir/kurumlar vergisi, stopaj, iade ve iptaller, pazaryeri teşvikleri ve satıcıya özel yükümlülükler otomatik dâhil edilmez;
              gerekiyorsa “Diğer giderler” veya “Sabit gider payı” alanlarına ekleyin. Sonuçlar bilgilendirme amaçlı tahmindir, muhasebe veya vergi danışmanlığı değildir.
            </p>
          </div>
        </section>
      </div>

      {/* Mobil alt özet çubuğu */}
      {result && (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface/95 px-4 py-2.5 backdrop-blur lg:hidden">
          <a href="#sonuclar" className="flex items-center justify-between gap-3 text-sm">
            <span className="text-muted">Tahmini kâr</span>
            <span className={cx("num font-semibold", result.profit > 0 ? "text-success" : result.profit < 0 ? "text-danger" : "text-fg")}>
              {result.profit < 0 ? "Zarar " : ""}
              {formatTRY(result.profit)} · {formatPercent(result.marginPercent)}
            </span>
          </a>
        </div>
      )}
    </div>
  );
}

function CostRow({
  label,
  amount,
  incl,
  rate,
  isVat,
  values,
  errors,
  setValue,
  hint,
}: {
  label: string;
  amount: keyof CalcFormValues;
  incl: keyof CalcFormValues;
  rate: keyof CalcFormValues;
  isVat: boolean;
  values: CalcFormValues;
  errors: Partial<Record<CalcFieldKey, string>>;
  setValue: <K extends keyof CalcFormValues>(key: K, value: CalcFormValues[K]) => void;
  hint?: string;
}) {
  return (
    <div className={cx("grid grid-cols-1 gap-3 p-4 sm:p-5", isVat && "sm:grid-cols-[minmax(0,1fr)_7rem_auto] sm:items-start")}>
      <TextField
        id={`calc-${amount}`}
        label={label}
        numeric
        suffix="TL"
        value={values[amount] as string}
        onValueChange={(v) => setValue(amount, v as never)}
        error={errors[amount]}
        hint={hint}
      />
      {isVat && (
        <TextField
          id={`calc-${rate}`}
          label={
            <>
              <span className="sr-only">{label} </span>KDV
            </>
          }
          numeric
          suffix="%"
          value={values[rate] as string}
          onValueChange={(v) => setValue(rate, v as never)}
          error={errors[rate]}
        />
      )}
      {isVat && (
        <div className="sm:pt-8">
          <Switch id={`calc-${incl}`} checked={Boolean(values[incl])} onChange={(v) => setValue(incl, v as never)} label={<><span className="sr-only">{label} </span>KDV dâhil</>} />
        </div>
      )}
    </div>
  );
}
