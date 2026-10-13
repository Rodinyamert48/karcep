"use client";

import { Download, FolderOpen, History, Trash2 } from "lucide-react";
import { MAX_HISTORY, historyToCsv, type HistoryEntry } from "@/storage";
import { downloadText } from "@/lib/browser";
import { formatDateTime, formatPercent, formatTRY, todayISO } from "@/lib/format";
import { useData } from "@/state/DataProvider";
import type { SectionId } from "@/state/navigation";
import { ProfitInline } from "../Results";
import { useFeedback } from "../ui/feedback";
import { Badge, Button, Card, EmptyState, PageHeader } from "../ui/primitives";

export function HistorySection({ navigate }: { navigate: (id: SectionId) => void }) {
  const { data, setDraft, deleteHistory, clearHistory } = useData();
  const { toast, confirm } = useFeedback();
  const { history, marketplaces, products } = data;
  const mpName = (id: string) => marketplaces.find((m) => m.id === id)?.name ?? "—";

  const reopen = (h: HistoryEntry) => {
    const stillExists = h.productId && products.some((p) => p.id === h.productId);
    setDraft(() => ({ values: { ...h.values }, meta: { ...h.meta }, productId: stillExists ? h.productId : null, isExample: false }));
    navigate("hesaplayici");
    toast("Hesaplama hesaplayıcıda açıldı.", "info");
  };

  const remove = async (h: HistoryEntry) => {
    const ok = await confirm({
      title: "Kayıt silinsin mi?",
      message: `${h.meta.productName || "Adsız hesaplama"} (${formatDateTime(h.createdAt)}) geçmişten silinecek.`,
      confirmLabel: "Sil",
      danger: true,
    });
    if (!ok) return;
    deleteHistory(h.id);
    toast("Kayıt silindi.");
  };

  const clearAll = async () => {
    const ok = await confirm({
      title: "Tüm geçmiş temizlensin mi?",
      message: `${history.length} kayıt kalıcı olarak silinecek. Kayıtlı ürünleriniz etkilenmez. Önce CSV olarak dışa aktarmak isteyebilirsiniz.`,
      confirmLabel: "Tümünü sil",
      danger: true,
    });
    if (!ok) return;
    clearHistory();
    toast("Hesaplama geçmişi temizlendi.");
  };

  const exportCsv = () => {
    try {
      downloadText(`karcep-gecmis-${todayISO()}.csv`, historyToCsv(history, marketplaces), "text/csv;charset=utf-8");
      toast("CSV dosyası indirildi.");
    } catch {
      toast("CSV dosyası oluşturulamadı. Tarayıcınız dosya indirmeyi engelliyor olabilir.", "error");
    }
  };

  return (
    <>
      <PageHeader
        title="Hesaplama Geçmişi"
        description={`Kaydettiğiniz hesaplamalar bu tarayıcıda saklanır (en fazla ${MAX_HISTORY} kayıt; en eskiler otomatik silinir).`}
        actions={
          history.length > 0 && (
            <>
              <Button icon={<Download className="size-4" aria-hidden="true" />} onClick={exportCsv}>
                CSV indir
              </Button>
              <Button variant="danger" icon={<Trash2 className="size-4" aria-hidden="true" />} onClick={clearAll}>
                Tümünü temizle
              </Button>
            </>
          )
        }
      />
      {history.length === 0 ? (
        <Card>
          <EmptyState
            icon={<History className="size-6" />}
            title="Geçmiş boş"
            actions={
              <Button variant="primary" onClick={() => navigate("hesaplayici")}>
                Hesaplayıcıya git
              </Button>
            }
          >
            Hesaplayıcıda “Geçmişe kaydet” veya “Ürün olarak kaydet” düğmesine bastığınızda hesaplamalar burada listelenir.
          </EmptyState>
        </Card>
      ) : (
        <Card>
          <ul className="divide-y divide-line">
            {history.map((h) => (
              <li key={h.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                <div className="min-w-0">
                  <p className="truncate font-medium text-fg">{h.meta.productName || "Adsız hesaplama"}</p>
                  <p className="text-xs text-subtle">
                    {formatDateTime(h.createdAt)} · {mpName(h.meta.marketplaceId)}
                    {h.meta.category ? ` · ${h.meta.category}` : ""}
                  </p>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    <Badge>{h.summary.mode === "vat" ? "KDV ayrıştırmalı" : "Hızlı"}</Badge>
                    <Badge>Satış: {formatTRY(h.summary.salePrice)}</Badge>
                    <Badge>Başa baş: {h.summary.breakEven === null ? "ulaşılamaz" : formatTRY(h.summary.breakEven)}</Badge>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-4 sm:justify-end">
                  <div className="text-right text-sm">
                    <ProfitInline profit={h.summary.profit} />
                    <span className="num block text-xs text-subtle">{formatPercent(h.summary.marginPercent)}</span>
                  </div>
                  <div className="flex gap-1.5">
                    <Button size="sm" icon={<FolderOpen className="size-3.5" aria-hidden="true" />} onClick={() => reopen(h)}>
                      Aç
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      icon={<Trash2 className="size-3.5" aria-hidden="true" />}
                      onClick={() => remove(h)}
                      aria-label={`${h.meta.productName || "Adsız hesaplama"} kaydını sil`}
                    >
                      Sil
                    </Button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </>
  );
}
