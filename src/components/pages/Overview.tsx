"use client";

import { useMemo } from "react";
import { ArrowRight } from "lucide-react";
import { exampleDraft, newDraft, type HistoryEntry } from "@/storage";
import { summarize } from "@/lib/calc";
import { daysSince, formatDateTime, formatPercent, formatTRY } from "@/lib/format";
import { useData } from "@/state/DataProvider";
import type { SectionId } from "@/state/navigation";
import { Amount } from "../money";
import { Button } from "../ui/button";
import { Block, Empty, PageTitle } from "../ui/layout";
import { requestAboutTab } from "./About";

export function OverviewPage({ navigate }: { navigate: (id: SectionId) => void }) {
  const { data, setDraft } = useData();
  const { history, products, marketplaces, settings } = data;
  const last = history[0];
  const mpName = (id: string) => marketplaces.find((m) => m.id === id)?.name ?? "—";

  const ranked = useMemo(
    () =>
      products
        .map((p) => ({ p, s: summarize(p.values) }))
        .filter((x): x is { p: (typeof products)[number]; s: NonNullable<ReturnType<typeof summarize>> } => x.s !== null)
        .sort((a, b) => (a.s.marginPercent ?? -Infinity) - (b.s.marginPercent ?? -Infinity)),
    [products],
  );
  const maxAbsMargin = Math.max(1, ...ranked.map((r) => Math.abs(r.s.marginPercent ?? 0)));

  const startNew = () => {
    setDraft(() => newDraft(settings, marketplaces));
    navigate("hesaplayici");
  };
  const reopen = (h: HistoryEntry) => {
    const exists = h.productId && products.some((p) => p.id === h.productId);
    setDraft(() => ({ values: { ...h.values }, meta: { ...h.meta }, productId: exists ? h.productId : null, isExample: false }));
    navigate("hesaplayici");
  };

  const backupAge = settings.lastBackupAt ? daysSince(settings.lastBackupAt.slice(0, 10)) : null;
  const backupLine =
    settings.lastBackupAt === null
      ? "Henüz yedek alınmadı."
      : backupAge !== null && backupAge > 14
        ? `Son yedek ${backupAge} gün önce alındı.`
        : null;

  if (history.length === 0 && products.length === 0) {
    return (
      <>
        <PageTitle title="Genel Bakış" />
        <Empty
          title="Henüz hesap yok"
          actions={
            <>
              <Button variant="primary" onClick={startNew}>
                Hesaplamaya başla
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  setDraft(() => exampleDraft(settings));
                  navigate("hesaplayici");
                }}
              >
                Örnekle dene
              </Button>
            </>
          }
        >
          Satış fiyatı, maliyet ve komisyonu girin; kârı, marjı ve başa baş fiyatını hemen görün.
        </Empty>
      </>
    );
  }

  return (
    <>
      <PageTitle
        title="Genel Bakış"
        actions={
          <Button variant="primary" onClick={startNew}>
            Yeni hesap
          </Button>
        }
      />

      {last && (
        <section aria-labelledby="son-hesap" className="mb-12">
          <p className="text-sm text-muted">
            Son hesap · {formatDateTime(last.createdAt)} · {mpName(last.meta.marketplaceId)}
          </p>
          <h2 id="son-hesap" className="mt-1 text-xl font-semibold text-fg">
            {last.meta.productName || "Adsız hesap"}
          </h2>
          <div className="mt-5 flex flex-wrap items-end gap-x-10 gap-y-5">
            <div>
              <p className="text-[13px] text-subtle">{last.summary.profit < 0 ? "Tahmini zarar" : "Tahmini kâr"}</p>
              <Amount value={last.summary.profit} className="text-[44px] leading-none font-semibold tracking-tight" />
            </div>
            <Figure label="Kâr marjı" value={formatPercent(last.summary.marginPercent)} />
            <Figure label="Satış fiyatı" value={formatTRY(last.summary.salePrice)} />
            <Figure label="Başa baş" value={last.summary.breakEven === null ? "Ulaşılamaz" : formatTRY(last.summary.breakEven)} />
          </div>
          <Button variant="link" className="mt-5" onClick={() => reopen(last)}>
            Hesaplayıcıda aç
          </Button>
        </section>
      )}

      <div className="grid grid-cols-1 gap-x-12 gap-y-10 lg:grid-cols-2">
        <Block
          title="Son hesaplar"
          aside={
            <button type="button" className="inline-flex items-center gap-1 hover:text-fg" onClick={() => navigate("gecmis")}>
              Tümü <ArrowRight className="size-3.5" aria-hidden="true" />
            </button>
          }
        >
          {history.length === 0 ? (
            <p className="text-sm text-muted">Kaydedilmiş hesap yok.</p>
          ) : (
            <ul className="-mx-2">
              {history.slice(0, 6).map((h) => (
                <li key={h.id}>
                  <button
                    type="button"
                    onClick={() => reopen(h)}
                    className="flex w-full items-baseline justify-between gap-4 rounded-md px-2 py-2.5 text-left hover:bg-hover"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-[15px] text-fg">{h.meta.productName || "Adsız hesap"}</span>
                      <span className="block text-[13px] text-subtle">{formatDateTime(h.createdAt)}</span>
                    </span>
                    <span className="shrink-0 text-right">
                      <Amount value={h.summary.profit} className="block text-[15px]" />
                      <span className="num block text-[13px] text-subtle">{formatPercent(h.summary.marginPercent)}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Block>

        <Block
          title="Ürünler, marja göre"
          aside={
            <button type="button" className="inline-flex items-center gap-1 hover:text-fg" onClick={() => navigate("urunler")}>
              {products.length} ürün <ArrowRight className="size-3.5" aria-hidden="true" />
            </button>
          }
        >
          {ranked.length === 0 ? (
            <p className="text-sm text-muted">Kayıtlı ürün yok. Hesaplayıcıda “Ürün olarak kaydet” ile ekleyin.</p>
          ) : (
            <>
              <ul className="space-y-3">
                {ranked.slice(0, 8).map(({ p, s }) => {
                  const m = s.marginPercent ?? 0;
                  return (
                    <li key={p.id}>
                      <div className="flex items-baseline justify-between gap-4 text-[15px]">
                        <span className="truncate text-fg">{p.meta.productName}</span>
                        <span className={m < 0 ? "num text-loss" : "num text-fg"}>
                          {m < 0 && <span className="sr-only">Zarar </span>}
                          {formatPercent(s.marginPercent)}
                        </span>
                      </div>
                      <div className="mt-1.5 h-1 rounded-full bg-line" aria-hidden="true">
                        <div
                          className={m < 0 ? "k-hatch h-full rounded-full bg-loss" : "h-full rounded-full bg-accent"}
                          style={{ width: `${Math.max(2, (Math.abs(m) / maxAbsMargin) * 100)}%` }}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
              <p className="mt-4 text-[13px] text-subtle">En düşük marjlı ürün en üstte. Marj, ürünün kayıtlı değerleriyle yeniden hesaplanır.</p>
            </>
          )}
        </Block>
      </div>

      {backupLine && (
        <p className="mt-12 border-t border-line pt-5 text-sm text-muted">
          {backupLine} Veriler yalnızca bu tarayıcıda; tarayıcı verileri silinirse kaybolur.{" "}
          <button
            type="button"
            className="text-accent underline underline-offset-2"
            onClick={() => {
              requestAboutTab("yedekleme");
              navigate("hakkinda");
            }}
          >
            Yedek al
          </button>
        </p>
      )}
    </>
  );
}

function Figure({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[13px] text-subtle">{label}</p>
      <p className="num text-xl font-medium text-fg">{value}</p>
    </div>
  );
}
