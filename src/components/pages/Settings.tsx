"use client";

import { useState } from "react";
import { parseScaled, type CommissionBase } from "@/engine";
import { type CommissionProfile, type MarketplaceProfile, type ProfileOrigin, type Settings } from "@/storage";
import { newId } from "@/lib/browser";
import { formatDate, todayISO } from "@/lib/format";
import { useData } from "@/state/DataProvider";
import type { SectionId } from "@/state/navigation";
import { BASE_LABELS } from "../money";
import { SourceDetail } from "../profileSource";
import { Button } from "../ui/button";
import { useFeedback } from "../ui/feedback";
import { Choice, SelectField, TextArea, TextField, Toggle } from "../ui/field";
import { Block, Note, PageTitle, Panel, Tag } from "../ui/layout";
import { requestAboutTab } from "./About";

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
const clean = <T extends Record<string, string | undefined>>(e: T) =>
  Object.fromEntries(Object.entries(e).filter(([, v]) => v)) as Partial<T>;

export function SettingsPage({ navigate }: { navigate: (id: SectionId) => void }) {
  const { data } = useData();
  const { theme: _t, lastBackupAt: _l, ...defaults } = data.settings;
  void _t;
  void _l;
  return (
    <>
      <PageTitle
        title="Komisyon ve Gider Ayarları"
        lead="Kendi komisyon oranlarınız, pazaryeri varsayılanlarınız ve yeni hesaplara uygulanan giderler."
      />
      <Note tone="warn" title="Komisyon oranları sizden gelir" className="mb-10">
        KârCep hiçbir pazaryerinin oranını otomatik çekmez veya tahmin etmez. Oranı satıcı panelinizden kontrol edip girin; kaynağı
        belirtilmeyen oranlar “Kullanıcı girişi” olarak işaretlenir.
      </Note>
      <div className="space-y-14">
        <CommissionProfiles />
        <Marketplaces />
        <Defaults key={JSON.stringify(defaults)} />
        <DataSection navigate={navigate} />
      </div>
    </>
  );
}

/* ---------- Komisyon profilleri ---------- */

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
  const set = <K extends keyof ProfileForm>(k: K, v: ProfileForm[K]) => setForm((f) => (f ? { ...f, [k]: v } : f));

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

  const save = () => {
    if (!form) return;
    const e = clean({
      rate: checkRate(form.rate, true),
      commissionVatRate: checkRate(form.commissionVatRate),
      source: form.origin === "source" && !form.source.trim() ? "Kaynağı belirtin (bağlantı veya açıklama)." : undefined,
      verifiedAt:
        form.origin === "source"
          ? !form.verifiedAt
            ? "Son doğrulama tarihini girin."
            : form.verifiedAt > todayISO()
              ? "Tarih gelecekte olamaz."
              : undefined
          : undefined,
    });
    setErrors(e);
    if (Object.keys(e).length) return;
    const now = new Date().toISOString();
    const existing = form.id ? commissionProfiles.find((c) => c.id === form.id) : undefined;
    upsertCommissionProfile({
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
    });
    setForm(null);
    toast(existing ? "Profil güncellendi." : "Profil eklendi.");
  };

  const remove = async (p: CommissionProfile) => {
    const ok = await confirm({
      title: "Profil silinsin mi?",
      message: `${mpName(p.marketplaceId)} · ${p.category || "Genel"} (%${p.rate}). Bu profili kullanan ürünlerde oran korunur, “manuel oran” olur.`,
      confirmLabel: "Sil",
      danger: true,
    });
    if (!ok) return;
    deleteCommissionProfile(p.id);
    toast("Profil silindi.");
  };

  return (
    <Block
      id="komisyon-profilleri"
      title="Komisyon profilleri"
      aside={
        !form && (
          <Button size="sm" variant="primary" onClick={openNew}>
            Profil ekle
          </Button>
        )
      }
    >
      {form && (
        <Panel className="mb-6 p-5">
          <p className="mb-5 font-semibold">{form.id ? "Profili düzenle" : "Yeni profil"}</p>
          <div className="grid gap-x-4 gap-y-5 sm:grid-cols-2">
            <SelectField
              id="cp-marketplace"
              label="Pazaryeri"
              value={form.marketplaceId}
              onValueChange={(v) => set("marketplaceId", v)}
              options={marketplaces.map((m) => ({ value: m.id, label: m.name }))}
            />
            <TextField id="cp-category" label="Kategori" optional value={form.category} onValueChange={(v) => set("category", v)} maxLength={200} />
            <TextField id="cp-rate" label="Komisyon oranı" required numeric unit="%" value={form.rate} onValueChange={(v) => set("rate", v)} error={errors.rate} />
            <SelectField id="cp-base" label="Uygulandığı tutar" value={form.base} onValueChange={(v) => set("base", v as CommissionBase)} options={BASE_OPTIONS} />
            <TextField id="cp-vat" label="Komisyon KDV oranı" numeric unit="%" value={form.commissionVatRate} onValueChange={(v) => set("commissionVatRate", v)} error={errors.commissionVatRate} />
            <div className="sm:pt-7">
              <Toggle id="cp-incl" checked={form.commissionIncludesVat} onChange={(v) => set("commissionIncludesVat", v)} label="Komisyon tutarı KDV dâhil" />
            </div>
            <Choice
              label="Oranın kaynağı"
              value={form.origin}
              onChange={(v) => set("origin", v)}
              options={[
                { value: "user", label: "Kendi girişim" },
                { value: "source", label: "Bir kaynaktan" },
              ]}
              className="sm:col-span-2"
            />
            {form.origin === "source" && (
              <>
                <TextField
                  id="cp-source"
                  label="Kaynak"
                  required
                  value={form.source}
                  onValueChange={(v) => set("source", v)}
                  error={errors.source}
                  placeholder="Satıcı paneli sayfası veya bağlantı"
                  maxLength={500}
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
          <div className="mt-6 flex gap-2">
            <Button variant="primary" onClick={save}>
              Kaydet
            </Button>
            <Button variant="ghost" onClick={() => setForm(null)}>
              Vazgeç
            </Button>
          </div>
        </Panel>
      )}

      {commissionProfiles.length > 0 && (
        <SelectField
          id="cp-filter"
          label="Pazaryeri"
          value={filter}
          onValueChange={setFilter}
          options={[{ value: "all", label: "Tümü" }, ...marketplaces.map((m) => ({ value: m.id, label: m.name }))]}
          wrapperClassName="mb-4 max-w-xs"
        />
      )}

      {visible.length === 0 ? (
        <p className="text-sm text-muted">
          {commissionProfiles.length === 0
            ? "Henüz profil yok. Sık kullandığınız oranları kaydederseniz hesaplayıcıda listeden seçebilirsiniz."
            : "Bu pazaryeri için profil yok."}
        </p>
      ) : (
        <ul className="divide-y divide-line border-y border-line">
          {visible.map((p) => (
            <li key={p.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0 space-y-1.5">
                <p className="text-[15px] text-fg">
                  {mpName(p.marketplaceId)} · {p.category || "Genel"} <span className="num ml-1 font-semibold">%{p.rate}</span>
                </p>
                <p className="text-[13px] text-subtle">
                  {BASE_LABELS[p.base]} · komisyon {p.commissionIncludesVat ? "KDV dâhil" : "KDV hariç"} · güncelleme {formatDate(p.updatedAt)}
                </p>
                <SourceDetail profile={p} />
              </div>
              <div className="flex shrink-0 gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setErrors({});
                    setForm({ ...p, verifiedAt: p.verifiedAt ?? "" });
                  }}
                >
                  Düzenle
                </Button>
                <Button size="sm" variant="ghost" className="text-loss hover:text-loss" onClick={() => remove(p)} aria-label={`${p.category || "Genel"} profilini sil`}>
                  Sil
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Block>
  );
}

/* ---------- Pazaryerleri ---------- */

function Marketplaces() {
  const { data, upsertMarketplace, deleteMarketplace } = useData();
  const { toast, confirm } = useFeedback();
  const [editing, setEditing] = useState<MarketplaceProfile | null>(null);
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const set = <K extends keyof MarketplaceProfile>(k: K, v: MarketplaceProfile[K]) => setEditing((m) => (m ? { ...m, [k]: v } : m));

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
    const e = clean({
      name: !editing.builtIn && !editing.name.trim() ? "Pazaryeri adı girin." : undefined,
      commissionVatRate: checkRate(editing.commissionVatRate),
      saleFeeRate: checkRate(editing.saleFeeRate),
      saleFeeFixed: checkMoney(editing.saleFeeFixed),
    });
    setErrors(e);
    if (Object.keys(e).length) return;
    const isNew = !data.marketplaces.some((m) => m.id === editing.id);
    upsertMarketplace({ ...editing, name: editing.name.trim() });
    setEditing(null);
    toast(isNew ? "Pazaryeri eklendi." : "Pazaryeri güncellendi.");
  };

  const remove = async (m: MarketplaceProfile) => {
    const count = data.commissionProfiles.filter((c) => c.marketplaceId === m.id).length;
    const ok = await confirm({
      title: "Pazaryeri silinsin mi?",
      message: `“${m.name}” ve bağlı ${count} komisyon profili silinecek. Bu pazaryerini kullanan ürünler “Diğer / manuel” olur.`,
      confirmLabel: "Sil",
      danger: true,
    });
    if (!ok) return;
    deleteMarketplace(m.id);
    toast("Pazaryeri silindi.");
  };

  return (
    <Block
      title="Pazaryerleri"
      aside={
        !editing && (
          <Button size="sm" onClick={openNew}>
            Pazaryeri ekle
          </Button>
        )
      }
    >
      <p className="-mt-2 mb-5 max-w-2xl text-sm text-muted">Pazaryeri seçildiğinde hesaplayıcıya uygulanacak komisyon tabanı, KDV durumu ve ücretler.</p>
      {editing && (
        <Panel className="mb-6 p-5">
          <p className="mb-5 font-semibold">{editing.builtIn ? editing.name : editing.name ? "Pazaryerini düzenle" : "Yeni pazaryeri"}</p>
          <div className="grid gap-x-4 gap-y-5 sm:grid-cols-2">
            {!editing.builtIn && (
              <TextField id="mp-name" label="Ad" required value={editing.name} onValueChange={(v) => set("name", v)} error={errors.name} maxLength={80} />
            )}
            <SelectField id="mp-base" label="Komisyon tabanı" value={editing.defaultCommissionBase} onValueChange={(v) => set("defaultCommissionBase", v as CommissionBase)} options={BASE_OPTIONS} />
            <TextField id="mp-vat" label="Komisyon KDV oranı" numeric unit="%" value={editing.commissionVatRate} onValueChange={(v) => set("commissionVatRate", v)} error={errors.commissionVatRate} />
            <TextField id="mp-feeRate" label="Satışa bağlı ücret" optional numeric unit="%" value={editing.saleFeeRate} onValueChange={(v) => set("saleFeeRate", v)} error={errors.saleFeeRate} />
            <TextField id="mp-feeFixed" label="Satış başı sabit ücret" optional numeric unit="TL" value={editing.saleFeeFixed} onValueChange={(v) => set("saleFeeFixed", v)} error={errors.saleFeeFixed} />
            <div className="sm:col-span-2">
              <Toggle id="mp-incl" checked={editing.commissionIncludesVat} onChange={(v) => set("commissionIncludesVat", v)} label="Komisyon tutarı KDV dâhil" />
            </div>
            <div className="sm:col-span-2">
              <TextArea label="Notlar" value={editing.notes} onValueChange={(v) => set("notes", v)} maxLength={1000} hint="ör. sözleşme tarihi" />
            </div>
          </div>
          <div className="mt-6 flex gap-2">
            <Button variant="primary" onClick={save}>
              Kaydet
            </Button>
            <Button variant="ghost" onClick={() => setEditing(null)}>
              Vazgeç
            </Button>
          </div>
        </Panel>
      )}
      <ul className="divide-y divide-line border-y border-line">
        {data.marketplaces.map((m) => (
          <li key={m.id} className="flex flex-col gap-2 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="flex items-center gap-2 text-[15px] text-fg">
                {m.name}
                {!m.builtIn && <Tag>Özel</Tag>}
              </p>
              <p className="mt-0.5 text-[13px] text-subtle">
                {BASE_LABELS[m.defaultCommissionBase]} · komisyon {m.commissionIncludesVat ? "KDV dâhil" : "KDV hariç"}
                {m.saleFeeRate ? ` · ücret %${m.saleFeeRate}` : ""}
                {m.saleFeeFixed ? ` · sabit ${m.saleFeeFixed} TL` : ""} · {data.commissionProfiles.filter((c) => c.marketplaceId === m.id).length} profil
              </p>
              {m.notes && <p className="mt-1 text-[13px] whitespace-pre-line text-muted">{m.notes}</p>}
            </div>
            <div className="flex shrink-0 gap-1">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setErrors({});
                  setEditing({ ...m });
                }}
                aria-label={`${m.name} ayarlarını düzenle`}
              >
                Düzenle
              </Button>
              {!m.builtIn && (
                <Button size="sm" variant="ghost" className="text-loss hover:text-loss" onClick={() => remove(m)} aria-label={`${m.name} pazaryerini sil`}>
                  Sil
                </Button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </Block>
  );
}

/* ---------- Varsayılanlar ---------- */

function Defaults() {
  const { data, updateSettings } = useData();
  const { toast } = useFeedback();
  const [form, setForm] = useState<Settings>(data.settings);
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const set = <K extends keyof Settings>(k: K, v: Settings[K]) => setForm((f) => ({ ...f, [k]: v }));

  const save = () => {
    const e = clean({
      defaultShippingCost: checkMoney(form.defaultShippingCost),
      defaultPackagingCost: checkMoney(form.defaultPackagingCost),
      defaultSaleVatRate: checkRate(form.defaultSaleVatRate),
      defaultCostVatRate: checkRate(form.defaultCostVatRate),
      defaultServiceVatRate: checkRate(form.defaultServiceVatRate),
    });
    setErrors(e);
    if (Object.keys(e).length) return;
    updateSettings({ ...form, theme: data.settings.theme, lastBackupAt: data.settings.lastBackupAt });
    toast("Varsayılanlar kaydedildi; yeni hesaplarda kullanılacak.");
  };

  return (
    <Block title="Yeni hesap varsayılanları">
      <div className="grid gap-x-4 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
        <Choice
          label="Hesaplama modu"
          value={form.defaultMode}
          onChange={(v) => set("defaultMode", v)}
          options={[
            { value: "vat", label: "KDV ayrıştırmalı" },
            { value: "quick", label: "Hızlı" },
          ]}
          className="sm:col-span-2 lg:col-span-3"
        />
        <TextField id="set-ship" label="Kargo" numeric unit="TL" value={form.defaultShippingCost} onValueChange={(v) => set("defaultShippingCost", v)} error={errors.defaultShippingCost} />
        <TextField id="set-pack" label="Paketleme" numeric unit="TL" value={form.defaultPackagingCost} onValueChange={(v) => set("defaultPackagingCost", v)} error={errors.defaultPackagingCost} />
        <TextField id="set-saleVat" label="Satış KDV oranı" numeric unit="%" value={form.defaultSaleVatRate} onValueChange={(v) => set("defaultSaleVatRate", v)} error={errors.defaultSaleVatRate} />
        <TextField id="set-costVat" label="Alış KDV oranı" numeric unit="%" value={form.defaultCostVatRate} onValueChange={(v) => set("defaultCostVatRate", v)} error={errors.defaultCostVatRate} />
        <TextField
          id="set-serviceVat"
          label="Hizmet KDV oranı"
          numeric
          unit="%"
          value={form.defaultServiceVatRate}
          onValueChange={(v) => set("defaultServiceVatRate", v)}
          error={errors.defaultServiceVatRate}
          hint="Kargo, paketleme, reklam, komisyon"
        />
      </div>
      <Button variant="primary" className="mt-6" onClick={save}>
        Varsayılanları kaydet
      </Button>
    </Block>
  );
}

/* ---------- Veri ---------- */

function DataSection({ navigate }: { navigate: (id: SectionId) => void }) {
  const { resetAll, persistent } = useData();
  const { toast, confirm } = useFeedback();

  const wipe = async () => {
    const ok = await confirm({
      title: "Tüm veriler silinsin mi?",
      message: "Ürünler, geçmiş, profiller ve varsayılanlar bu tarayıcıdan kalıcı olarak silinir. Önce yedek almanız önerilir.",
      confirmLabel: "Tümünü sil",
      danger: true,
    });
    if (!ok) return;
    resetAll();
    toast("Tüm veriler silindi.");
  };

  return (
    <Block title="Veriler">
      {!persistent && (
        <Note tone="loss" title="Kalıcı depolama yok" className="mb-4">
          Tarayıcı yerel depolamaya izin vermiyor; veriler sayfa kapanınca kaybolur.
        </Note>
      )}
      <p className="max-w-2xl text-sm text-muted">
        Veriler yalnızca bu tarayıcıda saklanır. Tarayıcı verilerini temizlemek veya başka cihaz kullanmak kayıtlara erişimi kaldırır.
      </p>
      <div className="mt-5 flex flex-wrap gap-2">
        <Button
          onClick={() => {
            requestAboutTab("yedekleme");
            navigate("hakkinda");
          }}
        >
          Yedekleme ve geri yükleme
        </Button>
        <Button variant="danger" onClick={wipe}>
          Tüm verileri sil
        </Button>
      </div>
    </Block>
  );
}
