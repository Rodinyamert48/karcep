"use client";

import { MAX_HISTORY, historyToCsv, type HistoryEntry } from "@/storage";
import { downloadText } from "@/lib/browser";
import { formatDateTime, formatPercent, formatTRY, todayISO } from "@/lib/format";
import { useData } from "@/state/DataProvider";
import type { SectionId } from "@/state/navigation";
import { Amount } from "../money";
import { Button } from "../ui/button";
import { useFeedback } from "../ui/feedback";
import { Empty, PageTitle } from "../ui/layout";

export function HistoryPage({ navigate }: { navigate: (id: SectionId) => void }) {
  const { data, setDraft, deleteHistory, clearHistory } = useData();
  const { toast, confirm } = useFeedback();
  const { history, marketplaces, products } = data;
  const mpName = (id: string) => marketplaces.find((m) => m.id === id)?.name ?? "—";

  const reopen = (h: HistoryEntry) => {
    const exists = h.productId && products.some((p) => p.id === h.productId);
    setDraft(() => ({ values: { ...h.values }, meta: { ...h.meta }, productId: exists ? h.productId : null, isExample: false }));
    navigate("hesaplayici");
  };

  const remove = async (h: HistoryEntry) => {
    const ok = await confirm({
      title: "Kayıt silinsin mi?",
      message: `${h.meta.productName || "Adsız hesap"} (${formatDateTime(h.createdAt)}) geçmişten silinecek.`,
      confirmLabel: "Sil",
      danger: true,
    });
    if (!ok) return;
    deleteHistory(h.id);
    toast("Kayıt silindi.");
  };

  const clearAll = async () => {
    const ok = await confirm({
      title: "Tüm geçmiş silinsin mi?",
      message: `${history.length} kayıt kalıcı olarak silinecek. Ürünleriniz etkilenmez.`,
      confirmLabel: "Tümünü sil",
      danger: true,
    });
    if (!ok) return;
    clearHistory();
    toast("Geçmiş temizlendi.");
  };

  const exportCsv = () => {
    try {
      downloadText(`karcep-gecmis-${todayISO()}.csv`, historyToCsv(history, marketplaces), "text/csv;charset=utf-8");
      toast("CSV dosyası indirildi.");
    } catch {
      toast("CSV oluşturulamadı; tarayıcı indirmeyi engelliyor olabilir.", "error");
    }
  };

  return (
    <>
      <PageTitle
        title="Hesaplama Geçmişi"
        lead={`Kaydettiğiniz hesaplar. En fazla ${MAX_HISTORY} kayıt tutulur; en eskiler otomatik silinir.`}
        actions={
          history.length > 0 && (
            <>
              <Button onClick={exportCsv}>CSV indir</Button>
              <Button variant="danger" onClick={clearAll}>
                Tümünü sil
              </Button>
            </>
          )
        }
      />
      {history.length === 0 ? (
        <Empty
          title="Geçmiş boş"
          actions={
            <Button variant="primary" onClick={() => navigate("hesaplayici")}>
              Hesaplayıcıya git
            </Button>
          }
        >
          “Geçmişe kaydet” veya “Ürün olarak kaydet” ile kaydedilen hesaplar burada listelenir.
        </Empty>
      ) : (
        <ol className="divide-y divide-line border-y border-line">
          {history.map((h) => (
            <li key={h.id} className="grid grid-cols-1 gap-3 py-4 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center sm:gap-6">
              <div className="min-w-0">
                <p className="truncate text-[15px] text-fg">{h.meta.productName || "Adsız hesap"}</p>
                <p className="num mt-0.5 text-[13px] text-subtle">
                  {formatDateTime(h.createdAt)} · {mpName(h.meta.marketplaceId)} · {h.summary.mode === "vat" ? "KDV ayrıştırmalı" : "Hızlı"} ·{" "}
                  {formatTRY(h.summary.salePrice)} satış
                </p>
              </div>
              <div className="sm:text-right">
                <Amount value={h.summary.profit} className="text-[15px] font-medium" />
                <span className="num ml-3 text-[13px] text-subtle sm:ml-0 sm:block">{formatPercent(h.summary.marginPercent)} marj</span>
              </div>
              <div className="flex gap-1">
                <Button size="sm" variant="ghost" onClick={() => reopen(h)}>
                  Aç
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-loss hover:text-loss"
                  onClick={() => remove(h)}
                  aria-label={`${h.meta.productName || "Adsız hesap"} kaydını sil`}
                >
                  Sil
                </Button>
              </div>
            </li>
          ))}
        </ol>
      )}
    </>
  );
}
