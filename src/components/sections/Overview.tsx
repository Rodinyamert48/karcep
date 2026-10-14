"use client";

import { useMemo } from "react";
import { ArrowRight, Calculator, FlaskConical, History, Package, ShieldCheck } from "lucide-react";
import { exampleDraft, newDraft } from "@/storage";
import { summarize } from "@/lib/calc";
import { formatDateTime, formatPercent, formatTRY } from "@/lib/format";
import { useData } from "@/state/DataProvider";
import type { SectionId } from "@/state/navigation";
import { ProfitInline } from "../Results";
import { Badge, Button, Card, CardHeader, EmptyState, PageHeader, cx } from "../ui/primitives";

export function OverviewSection({ navigate }: { navigate: (id: SectionId) => void }) {
  const { data, setDraft } = useData();
  const { history, products, marketplaces, settings } = data;
  const last = history[0];
  const mpName = (id: string) => marketplaces.find((m) => m.id === id)?.name ?? "—";

  const productStats = useMemo(() => {
    const included = products
      .map((p) => ({ p, s: summarize(p.values) }))
      .filter((x): x is { p: typeof x.p; s: NonNullable<typeof x.s> } => x.s !== null && x.s.marginPercent !== null);
    const avg = included.length ? included.reduce((sum, x) => sum + (x.s.marginPercent ?? 0), 0) / included.length : null;
    const losing = included.filter((x) => x.s.profit < 0).length;
    return { included: included.length, avg, losing };
  }, [products]);

  const startNew = () => {
    setDraft(() => newDraft(settings, marketplaces));
    navigate("hesaplayici");
  };
  const openExample = () => {
    setDraft(() => exampleDraft(settings));
    navigate("hesaplayici");
  };
  const reopen = (id: string) => {
    const h = history.find((x) => x.id === id);
    if (!h) return;
    const stillExists = h.productId && products.some((p) => p.id === h.productId);
    setDraft(() => ({ values: { ...h.values }, meta: { ...h.meta }, productId: stillExists ? h.productId : null, isExample: false }));
    navigate("hesaplayici");
  };

  if (history.length === 0 && products.length === 0) {
    return (
      <>
        <PageHeader title="Genel Bakış" description="Ürünlerinizin kârlılığını tek bakışta görün." />
        <Card>
          <EmptyState
            icon={<Calculator className="size-6" />}
            title="Henüz bir hesaplama yok"
            actions={
              <>
                <Button variant="primary" icon={<Calculator className="size-4" aria-hidden="true" />} onClick={startNew}>
                  İlk hesaplamanı yap
                </Button>
                <Button icon={<FlaskConical className="size-4" aria-hidden="true" />} onClick={openExample}>
                  Örnek hesaplamayı aç
                </Button>
              </>
            }
          >
            Satış fiyatı, alış maliyeti, komisyon ve giderlerinizi girerek tahmini kârınızı, kâr marjınızı ve başa baş satış fiyatınızı
            hesaplayın. Örnek hesaplama kurgusal verilerle açılır.
          </EmptyState>
        </Card>
        <Privacy />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Genel Bakış"
        description="Son hesaplamalarınız ve kayıtlı ürünlerinizin özeti."
        actions={
          <Button variant="primary" icon={<Calculator className="size-4" aria-hidden="true" />} onClick={startNew}>
            Yeni hesaplama
          </Button>
        }
      />

      {last ? (
        <Card className="mb-5">
          <CardHeader
            title="Son hesaplama"
            description={`${last.meta.productName || "Adsız hesaplama"} · ${mpName(last.meta.marketplaceId)} · ${formatDateTime(last.createdAt)}`}
            actions={<Button size="sm" onClick={() => reopen(last.id)}>Yeniden aç</Button>}
          />
          <dl className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 sm:p-5 lg:grid-cols-4">
            <Stat label="Son hesaplanan ürün" value={last.meta.productName || "Adsız"} />
            <Stat
              label="Tahmini kâr"
              value={<ProfitInline profit={last.summary.profit} />}
              sub={last.summary.profit < 0 ? "Zarar" : last.summary.profit === 0 ? "Başa baş" : "Kâr"}
            />
            <Stat label="Kâr marjı" value={formatPercent(last.summary.marginPercent)} sub={last.summary.mode === "vat" ? "KDV hariç satışa göre" : "Hızlı mod"} />
            <Stat label="Başa baş satış fiyatı" value={last.summary.breakEven === null ? "Ulaşılamaz" : formatTRY(last.summary.breakEven)} />
          </dl>
        </Card>
      ) : null}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader
            title="Son hesaplamalar"
            icon={<History className="size-4" />}
            actions={
              <Button size="sm" variant="ghost" onClick={() => navigate("gecmis")}>
                Tümü <ArrowRight className="size-3.5" aria-hidden="true" />
              </Button>
            }
          />
          {history.length === 0 ? (
            <p className="p-5 text-sm text-muted">Geçmişe kaydedilmiş hesaplama yok.</p>
          ) : (
            <ul className="divide-y divide-line">
              {history.slice(0, 6).map((h) => (
                <li key={h.id}>
                  <button
                    type="button"
                    onClick={() => reopen(h.id)}
                    className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-surface-2 sm:px-5"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-fg">{h.meta.productName || "Adsız hesaplama"}</span>
                      <span className="block text-xs text-subtle">
                        {mpName(h.meta.marketplaceId)} · {formatDateTime(h.createdAt)}
                      </span>
                    </span>
                    <span className="shrink-0 text-right text-sm">
                      <ProfitInline profit={h.summary.profit} />
                      <span className="num block text-xs text-subtle">{formatPercent(h.summary.marginPercent)}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader title="Ürünlerim" icon={<Package className="size-4" />} />
          <div className="space-y-3 p-4 sm:p-5">
            <div className="flex items-baseline justify-between">
              <span className="text-sm text-muted">Kayıtlı ürün</span>
              <span className="num text-xl font-semibold">{products.length}</span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-sm text-muted">Ortalama kâr marjı</span>
              <span className="num text-xl font-semibold">{formatPercent(productStats.avg)}</span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-sm text-muted">Zarar eden ürün</span>
              <span className={cx("num text-xl font-semibold", productStats.losing > 0 && "text-danger")}>{productStats.losing}</span>
            </div>
            <p className="text-xs text-subtle">
              Ortalamaya, değerleri geçerli ve satış fiyatı 0’dan büyük olan {productStats.included} ürün dâhil edildi (her ürünün güncel
              kayıtlı değerleriyle, ağırlıksız ortalama). Geçmiş kayıtları dâhil değildir.
            </p>
            <Button className="w-full" onClick={() => navigate("urunler")}>
              Ürünlere git
            </Button>
          </div>
        </Card>
      </div>
      <Privacy />
    </>
  );
}

function Stat({ label, value, sub }: { label: string; value: React.ReactNode; sub?: string }) {
  return (
    <div className="min-w-0 rounded-lg border border-line bg-surface-2 p-3">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="num mt-1 truncate text-lg font-semibold text-fg">{value}</dd>
      {sub && <dd className="text-xs text-subtle">{sub}</dd>}
    </div>
  );
}

function Privacy() {
  return (
    <p className="mt-5 flex items-start gap-2 text-xs text-subtle">
      <ShieldCheck className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
      Verileriniz yalnızca bu tarayıcıda saklanır, hiçbir sunucuya gönderilmez. Tarayıcı verilerini temizlemek kayıtlarınızı siler;
      düzenli olarak <Badge className="mx-0.5">Hakkında ve Gizlilik → Yedekleme</Badge> ile `.krcp` yedeği alın.
    </p>
  );
}
