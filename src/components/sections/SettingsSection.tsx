"use client";

import { useRef, useState } from "react";
import { Database, Download, Pencil, Plus, Settings2, Store, Trash2, Upload, Percent } from "lucide-react";
import { parseScaled, type CommissionBase } from "@/engine";
import {
  exportAppData,
  parseImport,
  type CommissionProfile,
  type MarketplaceProfile,
  type ProfileOrigin,
  type Settings,
} from "@/storage";
import { downloadText, newId } from "@/lib/browser";
import { formatDate, todayISO } from "@/lib/format";
import { useData } from "@/state/DataProvider";
import { ProfileSourceBadge, ProfileSourceDetail } from "../ProfileSource";
import { BASE_LABELS } from "../Results";
import { useFeedback } from "../ui/feedback";
import { Segmented, SelectField, Switch, TextArea, TextField } from "../ui/form";
import { Badge, Button, Card, CardHeader, Notice, PageHeader } from "../ui/primitives";

const BASE_OPTIONS = (Object.keys(BASE_LABELS) as CommissionBase[]).map((b) => ({ value: b, label: BASE_LABELS[b] }));

function checkMoney(v: string): string | undefined {
  const r = parseScaled(v, 2);
  return r.kind === "error" ? r.message : undefined;
}
function checkRate(v: string, required = false): string | undefined {
  const r = parseScaled(v, 4);
  if (r.kind === "empty") return required ? "Oran girin." : undefined;
  if (r.kind === "error") return r.message;
  if (r.value > 100 * 10_000) return "Oran en fazla %100 olabilir.";
  return undefined;
}

export function SettingsSection() {
  const { data } = useData();
  const { theme: _theme, ...defaults } = data.settings;
  void _theme;
  return (
    <>
      <PageHeader
        title="Komisyon ve Gider Ayarları"
        description="Kendi komisyon oranlarınızı, pazaryeri profillerinizi ve varsayılan giderlerinizi tanımlayın. Para birimi TRY, sayı biçimi Türkçe (1.234,56) olarak sabittir."
      />
      <Notice tone="warning" title="Komisyon oranları hakkında" className="mb-5">
        KârCep, Trendyol, Hepsiburada veya başka bir pazaryerinin komisyon oranlarını otomatik çekmez, tahmin etmez ve hazır oran
        içermez. Oranları satıcı panelinizden veya sözleşmenizden kontrol ederek siz girersiniz. Kaynağı belirtilmeyen her oran
        “Kullanıcı girişi” olarak işaretlenir.
      </Notice>
      <div className="space-y-5">
        <CommissionProfiles />
        <Marketplaces />
        {/* Veri içe aktarılır veya silinirse form yeniden kurulur. */}
        <GeneralSettings key={JSON.stringify(defaults)} />
        <DataManagement />
      </div>
    </>
  );
}

/* ---------------- Komisyon profilleri ---------------- */

interface ProfileForm {
  id: string | null;
  marketplaceId: string;
  category: string;
  rate: string;
  base: CommissionBase;
  commissionIncludesVat: boolean;
  commissionVatRate: string;
  origin: ProfileOrigin;
  source: string;
  verifiedAt: string;
}

function CommissionProfiles() {
  const { data, upsertCommissionProfile, deleteCommissionProfile } = useData();
  const { toast, confirm } = useFeedback();
  const { commissionProfiles, marketplaces, settings } = data;
  const [form, setForm] = useState<ProfileForm | null>(null);
  const [errors, setErrors] = useState<Partial<Record<keyof ProfileForm, string>>>({});
  const [filter, setFilter] = useState("all");

  const mpName = (id: string) => marketplaces.find((m) => m.id === id)?.name ?? "—";
  const visible = commissionProfiles.filter((c) => filter === "all" || c.marketplaceId === filter);

  const openNew = () => {
    const mp = marketplaces.find((m) => m.id === (filter === "all" ? "trendyol" : filter)) ?? marketplaces[0];
    setErrors({});
    setForm({
      id: null,
      marketplaceId: mp.id,
      category: "",
      rate: "",
      base: mp.defaultCommissionBase,
      commissionIncludesVat: mp.commissionIncludesVat,
      commissionVatRate: mp.commissionVatRate || settings.defaultServiceVatRate,
      origin: "user",
      source: "",
      verifiedAt: "",
    });
  };
  const openEdit = (p: CommissionProfile) => {
    setErrors({});
    setForm({ ...p, verifiedAt: p.verifiedAt ?? "" });
  };

  const save = () => {
    if (!form) return;
    const e: typeof errors = {};
    e.rate = checkRate(form.rate, true);
    e.commissionVatRate = checkRate(form.commissionVatRate);
    if (form.origin === "source") {
      if (!form.source.trim()) e.source = "Kaynağı belirtin (bağlantı veya açıklama).";
      if (!form.verifiedAt) e.verifiedAt = "Son doğrulama tarihini girin.";
      else if (form.verifiedAt > todayISO()) e.verifiedAt = "Doğrulama tarihi gelecekte olamaz.";
    }
    const clean = Object.fromEntries(Object.entries(e).filter(([, v]) => v)) as typeof errors;
    setErrors(clean);
    if (Object.keys(clean).length) return;
    const now = new Date().toISOString();
    const existing = form.id ? commissionProfiles.find((c) => c.id === form.id) : undefined;
    const profile: CommissionProfile = {
      id: form.id ?? newId("c"),
      marketplaceId: form.marketplaceId,
      category: form.category.trim(),
      rate: form.rate.trim(),
      base: form.base,
      commissionIncludesVat: form.commissionIncludesVat,
      commissionVatRate: form.commissionVatRate.trim(),
      origin: form.origin,
      source: form.origin === "source" ? form.source.trim() : "",
      verifiedAt: form.origin === "source" ? form.verifiedAt : null,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
    upsertCommissionProfile(profile);
    setForm(null);
    toast(existing ? "Komisyon profili güncellendi." : "Komisyon profili eklendi.");
  };

  const remove = async (p: CommissionProfile) => {
    const ok = await confirm({
      title: "Komisyon profili silinsin mi?",
      message: `${mpName(p.marketplaceId)} · ${p.category || "Genel"} (%${p.rate}) silinecek. Bu profili kullanan ürünlerde oran korunur ancak “manuel oran” olarak işaretlenir.`,
      confirmLabel: "Sil",
      danger: true,
    });
    if (!ok) return;
    deleteCommissionProfile(p.id);
    toast("Komisyon profili silindi.");
  };

  const set = <K extends keyof ProfileForm>(k: K, v: ProfileForm[K]) => setForm((f) => (f ? { ...f, [k]: v } : f));

  return (
    <Card>
      <CardHeader
        title="Komisyon profilleri"
        description="Pazaryeri ve kategoriye özel oranlarınız. Hesaplayıcıda “Komisyon profili” listesinden seçilir."
        icon={<Percent className="size-4" />}
        actions={
          <Button variant="primary" size="sm" icon={<Plus className="size-4" aria-hidden="true" />} onClick={openNew}>
            Profil ekle
          </Button>
        }
      />

      {form && (
        <div className="border-b border-line bg-surface-2/50 p-4 sm:p-5">
          <h3 className="mb-3 text-sm font-semibold">{form.id ? "Profili düzenle" : "Yeni komisyon profili"}</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <SelectField
              id="cp-marketplace"
              label="Pazaryeri"
              value={form.marketplaceId}
              onValueChange={(v) => set("marketplaceId", v)}
              options={marketplaces.map((m) => ({ value: m.id, label: m.name }))}
            />
            <TextField id="cp-category" label="Kategori" value={form.category} onValueChange={(v) => set("category", v)} placeholder="ör. Elektronik > Kulaklık" maxLength={200} />
            <TextField id="cp-rate" label="Komisyon oranı" required numeric suffix="%" value={form.rate} onValueChange={(v) => set("rate", v)} error={errors.rate} />
            <SelectField id="cp-base" label="Uygulandığı tutar" value={form.base} onValueChange={(v) => set("base", v as CommissionBase)} options={BASE_OPTIONS} />
            <TextField id="cp-vat" label="Komisyon KDV oranı" numeric suffix="%" value={form.commissionVatRate} onValueChange={(v) => set("commissionVatRate", v)} error={errors.commissionVatRate} />
            <div className="self-end pb-2">
              <Switch id="cp-incl" checked={form.commissionIncludesVat} onChange={(v) => set("commissionIncludesVat", v)} label="Komisyon tutarı KDV dâhil" />
            </div>
            <div className="sm:col-span-2 lg:col-span-3">
              <Segmented
                label="Oranın kaynağı"
                value={form.origin}
                onChange={(v) => set("origin", v)}
                options={[
                  { value: "user", label: "Kullanıcı girişi" },
                  { value: "source", label: "Bir kaynaktan aldım" },
                ]}
              />
            </div>
            {form.origin === "source" && (
              <>
                <TextField
                  id="cp-source"
                  label="Kaynak"
                  required
                  value={form.source}
                  onValueChange={(v) => set("source", v)}
                  error={errors.source}
                  placeholder="ör. Satıcı paneli > Komisyon oranları veya https://…"
                  maxLength={500}
                  wrapperClassName="sm:col-span-2"
                />
                <TextField
                  id="cp-verified"
                  label="Son doğrulama tarihi"
                  required
                  type="date"
                  max={todayISO()}
                  value={form.verifiedAt}
                  onValueChange={(v) => set("verifiedAt", v)}
                  error={errors.verifiedAt}
                />
              </>
            )}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button variant="primary" onClick={save}>
              Kaydet
            </Button>
            <Button onClick={() => setForm(null)}>Vazgeç</Button>
          </div>
        </div>
      )}

      {commissionProfiles.length > 0 && (
        <div className="border-b border-line p-4">
          <SelectField
            id="cp-filter"
            label="Pazaryerine göre filtrele"
            value={filter}
            onValueChange={setFilter}
            options={[{ value: "all", label: "Tümü" }, ...marketplaces.map((m) => ({ value: m.id, label: m.name }))]}
            wrapperClassName="max-w-xs"
          />
        </div>
      )}

      {visible.length === 0 ? (
        <p className="p-5 text-sm text-muted">
          {commissionProfiles.length === 0
            ? "Henüz komisyon profili yok. Sık kullandığınız oranları kaydederek hesaplayıcıda hızlıca seçebilirsiniz."
            : "Bu pazaryeri için profil yok."}
        </p>
      ) : (
        <ul className="divide-y divide-line">
          {visible.map((p) => (
            <li key={p.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between sm:px-5">
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-fg">{mpName(p.marketplaceId)}</span>
                  <span className="text-muted">·</span>
                  <span className="text-fg">{p.category || "Genel"}</span>
                  <Badge tone="accent" className="num">%{p.rate}</Badge>
                  <ProfileSourceBadge profile={p} />
                </div>
                <p className="text-xs text-muted">
                  {BASE_LABELS[p.base]} · Komisyon {p.commissionIncludesVat ? "KDV dâhil" : "KDV hariç"} (%{p.commissionVatRate || "0"} KDV) ·
                  Güncelleme: {formatDate(p.updatedAt)}
                </p>
                <ProfileSourceDetail profile={p} />
              </div>
              <div className="flex shrink-0 gap-1.5">
                <Button size="sm" icon={<Pencil className="size-3.5" aria-hidden="true" />} onClick={() => openEdit(p)}>
                  Düzenle
                </Button>
                <Button size="sm" variant="danger" icon={<Trash2 className="size-3.5" aria-hidden="true" />} onClick={() => remove(p)} aria-label={`${p.category || "Genel"} profilini sil`}>
                  Sil
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

/* ---------------- Pazaryeri profilleri ---------------- */

function Marketplaces() {
  const { data, upsertMarketplace, deleteMarketplace } = useData();
  const { toast, confirm } = useFeedback();
  const [editing, setEditing] = useState<MarketplaceProfile | null>(null);
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});

  const openNew = () => {
    setErrors({});
    setEditing({
      id: newId("mp"),
      name: "",
      builtIn: false,
      defaultCommissionBase: "gross",
      commissionIncludesVat: false,
      commissionVatRate: data.settings.defaultServiceVatRate,
      saleFeeRate: "",
      saleFeeFixed: "",
      notes: "",
    });
  };

  const save = () => {
    if (!editing) return;
    const e = {
      name: !editing.builtIn && !editing.name.trim() ? "Pazaryeri adı girin." : undefined,
      commissionVatRate: checkRate(editing.commissionVatRate),
      saleFeeRate: checkRate(editing.saleFeeRate),
      saleFeeFixed: checkMoney(editing.saleFeeFixed),
    };
    setErrors(e);
    if (Object.values(e).some(Boolean)) return;
    const isNew = !data.marketplaces.some((m) => m.id === editing.id);
    upsertMarketplace({ ...editing, name: editing.name.trim() });
    setEditing(null);
    toast(isNew ? "Pazaryeri profili eklendi." : "Pazaryeri profili güncellendi.");
  };

  const remove = async (m: MarketplaceProfile) => {
    const count = data.commissionProfiles.filter((c) => c.marketplaceId === m.id).length;
    const ok = await confirm({
      title: "Pazaryeri profili silinsin mi?",
      message: `“${m.name}” ve buna bağlı ${count} komisyon profili silinecek. Bu pazaryerini kullanan ürünler “Diğer / manuel” olarak işaretlenir.`,
      confirmLabel: "Sil",
      danger: true,
    });
    if (!ok) return;
    deleteMarketplace(m.id);
    toast("Pazaryeri profili silindi.");
  };

  const set = <K extends keyof MarketplaceProfile>(k: K, v: MarketplaceProfile[K]) => setEditing((m) => (m ? { ...m, [k]: v } : m));

  return (
    <Card>
      <CardHeader
        title="Pazaryeri profilleri"
        description="Pazaryeri seçildiğinde hesaplayıcıya uygulanacak varsayılan komisyon tabanı, KDV durumu ve satışa bağlı ücretler."
        icon={<Store className="size-4" />}
        actions={
          <Button size="sm" icon={<Plus className="size-4" aria-hidden="true" />} onClick={openNew}>
            Pazaryeri ekle
          </Button>
        }
      />
      {editing && (
        <div className="border-b border-line bg-surface-2/50 p-4 sm:p-5">
          <h3 className="mb-3 text-sm font-semibold">{editing.builtIn ? `${editing.name} varsayılanları` : editing.name ? "Pazaryerini düzenle" : "Yeni pazaryeri"}</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <TextField
              id="mp-name"
              label="Pazaryeri adı"
              required={!editing.builtIn}
              value={editing.name}
              onValueChange={(v) => set("name", v)}
              disabled={editing.builtIn}
              error={errors.name}
              maxLength={80}
              hint={editing.builtIn ? "Yerleşik profillerin adı değiştirilemez." : undefined}
            />
            <SelectField id="mp-base" label="Varsayılan komisyon tabanı" value={editing.defaultCommissionBase} onValueChange={(v) => set("defaultCommissionBase", v as CommissionBase)} options={BASE_OPTIONS} />
            <TextField id="mp-vat" label="Komisyon KDV oranı" numeric suffix="%" value={editing.commissionVatRate} onValueChange={(v) => set("commissionVatRate", v)} error={errors.commissionVatRate} />
            <TextField id="mp-feeRate" label="Satışa bağlı ücret oranı" numeric suffix="%" value={editing.saleFeeRate} onValueChange={(v) => set("saleFeeRate", v)} error={errors.saleFeeRate} />
            <TextField id="mp-feeFixed" label="Satış başı sabit ücret" numeric suffix="TL" value={editing.saleFeeFixed} onValueChange={(v) => set("saleFeeFixed", v)} error={errors.saleFeeFixed} />
            <div className="self-end pb-2">
              <Switch id="mp-incl" checked={editing.commissionIncludesVat} onChange={(v) => set("commissionIncludesVat", v)} label="Komisyon tutarı KDV dâhil" />
            </div>
            <div className="sm:col-span-2 lg:col-span-3">
              <TextArea label="Notlar" value={editing.notes} onValueChange={(v) => set("notes", v)} maxLength={1000} hint="ör. sözleşme tarihi, kampanya koşulları" />
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button variant="primary" onClick={save}>Kaydet</Button>
            <Button onClick={() => setEditing(null)}>Vazgeç</Button>
          </div>
        </div>
      )}
      <ul className="divide-y divide-line">
        {data.marketplaces.map((m) => (
          <li key={m.id} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <div className="min-w-0">
              <p className="flex flex-wrap items-center gap-2 font-medium text-fg">
                {m.name}
                {m.builtIn ? <Badge>Yerleşik</Badge> : <Badge tone="info">Özel</Badge>}
              </p>
              <p className="text-xs text-muted">
                {BASE_LABELS[m.defaultCommissionBase]} · Komisyon {m.commissionIncludesVat ? "KDV dâhil" : "KDV hariç"}
                {m.saleFeeRate ? ` · Ücret %${m.saleFeeRate}` : ""}
                {m.saleFeeFixed ? ` · Sabit ücret ${m.saleFeeFixed} TL` : ""}
                {" · "}
                {data.commissionProfiles.filter((c) => c.marketplaceId === m.id).length} komisyon profili
              </p>
              {m.notes && <p className="mt-0.5 text-xs whitespace-pre-line text-subtle">{m.notes}</p>}
            </div>
            <div className="flex shrink-0 gap-1.5">
              <Button size="sm" icon={<Pencil className="size-3.5" aria-hidden="true" />} onClick={() => { setErrors({}); setEditing({ ...m }); }} aria-label={`${m.name} profilini düzenle`}>
                Düzenle
              </Button>
              {!m.builtIn && (
                <Button size="sm" variant="danger" icon={<Trash2 className="size-3.5" aria-hidden="true" />} onClick={() => remove(m)} aria-label={`${m.name} profilini sil`}>
                  Sil
                </Button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}

/* ---------------- Genel varsayılanlar ---------------- */

function GeneralSettings() {
  const { data, updateSettings } = useData();
  const { toast } = useFeedback();
  const [form, setForm] = useState<Settings>(data.settings);
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const set = <K extends keyof Settings>(k: K, v: Settings[K]) => setForm((f) => ({ ...f, [k]: v }));

  const save = () => {
    const e = {
      defaultShippingCost: checkMoney(form.defaultShippingCost),
      defaultPackagingCost: checkMoney(form.defaultPackagingCost),
      defaultSaleVatRate: checkRate(form.defaultSaleVatRate),
      defaultCostVatRate: checkRate(form.defaultCostVatRate),
      defaultServiceVatRate: checkRate(form.defaultServiceVatRate),
    };
    setErrors(e);
    if (Object.values(e).some(Boolean)) return;
    updateSettings({ ...form, theme: data.settings.theme });
    toast("Varsayılanlar kaydedildi. Yeni hesaplamalarda kullanılacak.");
  };

  return (
    <Card>
      <CardHeader title="Varsayılan giderler ve görünüm" description="Yeni hesaplama başlatıldığında forma uygulanır." icon={<Settings2 className="size-4" />} />
      <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 sm:p-5 lg:grid-cols-3">
        <Segmented
          label="Varsayılan hesaplama modu"
          value={form.defaultMode}
          onChange={(v) => set("defaultMode", v)}
          options={[
            { value: "vat", label: "KDV ayrıştırmalı" },
            { value: "quick", label: "Hızlı" },
          ]}
        />
        <TextField id="set-ship" label="Varsayılan kargo gideri" numeric suffix="TL" value={form.defaultShippingCost} onValueChange={(v) => set("defaultShippingCost", v)} error={errors.defaultShippingCost} />
        <TextField id="set-pack" label="Varsayılan paketleme gideri" numeric suffix="TL" value={form.defaultPackagingCost} onValueChange={(v) => set("defaultPackagingCost", v)} error={errors.defaultPackagingCost} />
        <TextField id="set-saleVat" label="Varsayılan satış KDV oranı" numeric suffix="%" value={form.defaultSaleVatRate} onValueChange={(v) => set("defaultSaleVatRate", v)} error={errors.defaultSaleVatRate} />
        <TextField id="set-costVat" label="Varsayılan alış KDV oranı" numeric suffix="%" value={form.defaultCostVatRate} onValueChange={(v) => set("defaultCostVatRate", v)} error={errors.defaultCostVatRate} />
        <TextField id="set-serviceVat" label="Varsayılan hizmet KDV oranı" numeric suffix="%" value={form.defaultServiceVatRate} onValueChange={(v) => set("defaultServiceVatRate", v)} error={errors.defaultServiceVatRate} hint="Kargo, paketleme, reklam, komisyon vb." />
      </div>
      <div className="flex flex-wrap items-end justify-between gap-4 border-t border-line p-4 sm:px-5">
        <Segmented
          label="Tema"
          value={data.settings.theme}
          onChange={(v) => updateSettings({ theme: v })}
          options={[
            { value: "dark", label: "Koyu" },
            { value: "light", label: "Açık" },
          ]}
        />
        <Button variant="primary" onClick={save}>
          Varsayılanları kaydet
        </Button>
      </div>
    </Card>
  );
}

/* ---------------- Veri yönetimi ---------------- */

function DataManagement() {
  const { data, replaceAll, resetAll, persistent } = useData();
  const { toast, confirm } = useFeedback();
  const fileRef = useRef<HTMLInputElement>(null);

  const exportJson = () => {
    try {
      downloadText(`karcep-yedek-${todayISO()}.json`, exportAppData(data), "application/json");
      toast("Yedek dosyası indirildi.");
    } catch {
      toast("Yedek dosyası oluşturulamadı.", "error");
    }
  };

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast("Dosya çok büyük (en fazla 10 MB).", "error");
      return;
    }
    const result = parseImport(await file.text());
    if (fileRef.current) fileRef.current.value = "";
    if (!result.ok) {
      toast(result.message, "error");
      return;
    }
    const ok = await confirm({
      title: "Yedek geri yüklensin mi?",
      message: `Mevcut tüm verilerin yerini yedekteki ${result.data.products.length} ürün, ${result.data.history.length} geçmiş kaydı ve ${result.data.commissionProfiles.length} komisyon profili alacak. Bu işlem geri alınamaz.`,
      confirmLabel: "Geri yükle",
      danger: true,
    });
    if (!ok) return;
    replaceAll(result.data);
    toast("Yedek geri yüklendi.");
  };

  const wipe = async () => {
    const ok = await confirm({
      title: "Tüm veriler silinsin mi?",
      message: "Ürünler, geçmiş, komisyon profilleri, pazaryeri ayarları ve varsayılanlar bu tarayıcıdan kalıcı olarak silinecek. Önce yedek almanız önerilir.",
      confirmLabel: "Tüm verileri sil",
      danger: true,
    });
    if (!ok) return;
    resetAll();
    toast("Tüm veriler silindi.");
  };

  return (
    <Card>
      <CardHeader title="Veri yönetimi" description="Verileriniz yalnızca bu tarayıcının yerel deposunda (localStorage) tutulur." icon={<Database className="size-4" />} />
      <div className="space-y-4 p-4 sm:p-5">
        {!persistent && (
          <Notice tone="danger" title="Kalıcı depolama kullanılamıyor">
            Tarayıcınız yerel depolamaya izin vermiyor (gizli mod veya engellenmiş site verisi). Veriler sayfayı kapattığınızda kaybolur.
          </Notice>
        )}
        <p className="text-sm text-muted">
          Tarayıcı verilerini (çerezler ve site verileri) temizlemek veya farklı bir tarayıcı/cihaz kullanmak kayıtlarınıza erişimi
          kaldırır. Düzenli yedek almanız önerilir.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button icon={<Download className="size-4" aria-hidden="true" />} onClick={exportJson}>
            Tüm verileri dışa aktar (JSON)
          </Button>
          <Button icon={<Upload className="size-4" aria-hidden="true" />} onClick={() => fileRef.current?.click()}>
            Yedekten geri yükle
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="sr-only"
            tabIndex={-1}
            aria-hidden="true"
            onChange={(e) => onFile(e.target.files?.[0])}
          />
          <Button variant="danger" icon={<Trash2 className="size-4" aria-hidden="true" />} onClick={wipe}>
            Tüm verileri sil
          </Button>
        </div>
      </div>
    </Card>
  );
}
