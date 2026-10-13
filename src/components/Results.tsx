"use client";

import type { ReactNode } from "react";
import { AlertTriangle, CheckCircle2, MinusCircle, TrendingDown, TrendingUp } from "lucide-react";
import type { CalcResult, CommissionBase, PriceSolution } from "@/engine";
import { formatPercent, formatTRY } from "@/lib/format";
import { InfoTip } from "./ui/form";
import { Card, CardHeader, Notice, cx } from "./ui/primitives";

export const BASE_LABELS: Record<CommissionBase, string> = {
  gross: "KDV dâhil satış tutarı",
  net: "KDV hariç satış tutarı",
  manual: "Manuel taban tutarı",
};

export function StatusBanner({ result }: { result: CalcResult }) {
  if (result.status === "loss")
    return (
      <div role="status" className="flex items-center gap-2 rounded-lg border border-danger/40 bg-danger-bg px-3 py-2 text-sm font-semibold text-danger">
        <TrendingDown className="size-4" aria-hidden="true" />
        ZARAR: Bu fiyatla her satışta tahminen {formatTRY(-result.profit)} kaybedersiniz.
      </div>
    );
  if (result.status === "breakeven")
    return (
      <div role="status" className="flex items-center gap-2 rounded-lg border border-line-strong bg-surface-2 px-3 py-2 text-sm font-semibold text-fg">
        <MinusCircle className="size-4" aria-hidden="true" />
        BAŞA BAŞ: Bu fiyatla kâr veya zarar yok.
      </div>
    );
  return (
    <div role="status" className="flex items-center gap-2 rounded-lg border border-success/40 bg-success-bg px-3 py-2 text-sm font-semibold text-success">
      <TrendingUp className="size-4" aria-hidden="true" />
      KÂR: Bu fiyatla satış başına tahminen {formatTRY(result.profit)} kazanırsınız.
    </div>
  );
}

function Metric({
  label,
  value,
  info,
  sub,
  tone = "neutral",
  emphasis,
}: {
  label: string;
  value: ReactNode;
  info: ReactNode;
  sub?: ReactNode;
  tone?: "neutral" | "success" | "danger";
  emphasis?: boolean;
}) {
  return (
    <div className={cx("min-w-0 rounded-lg border border-line bg-surface-2 p-3", emphasis && "sm:col-span-2")}>
      <div className="flex items-center gap-1 text-xs font-medium text-muted">
        {label}
        <InfoTip label={label}>{info}</InfoTip>
      </div>
      <div
        className={cx(
          "num mt-1 truncate font-semibold",
          emphasis ? "text-2xl" : "text-lg",
          tone === "success" && "text-success",
          tone === "danger" && "text-danger",
          tone === "neutral" && "text-fg",
        )}
      >
        {value}
      </div>
      {sub && <div className="mt-0.5 text-xs text-subtle">{sub}</div>}
    </div>
  );
}

export function priceText(s: PriceSolution | null, includesVat: boolean): { value: string; sub: string } {
  if (!s) return { value: "—", sub: "Hedef girilmedi" };
  if (!s.ok) return { value: "Ulaşılamaz", sub: s.message };
  return { value: formatTRY(s.price), sub: includesVat ? "KDV dâhil satış fiyatı" : "KDV hariç satış fiyatı" };
}

export function ResultMetrics({ result, saleIncludesVat, targetLabel }: { result: CalcResult; saleIncludesVat: boolean; targetLabel: string }) {
  const commission = result.lines.find((l) => l.key === "commission")!;
  const tone = result.profit > 0 ? "success" : result.profit < 0 ? "danger" : "neutral";
  const be = priceText(result.breakEven, saleIncludesVat);
  const tp = priceText(result.target, saleIncludesVat);
  const isVat = result.mode === "vat";
  return (
    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
      <Metric
        emphasis
        label="Tahmini kâr"
        tone={tone}
        value={
          <>
            {result.profit < 0 && <span className="sr-only">Zarar: </span>}
            {formatTRY(result.profit)}
          </>
        }
        sub={isVat ? "KDV hariç gelir − KDV hariç giderler (gelir/kurumlar vergisi öncesi)" : "Satış fiyatı − toplam gider (KDV ayrıştırılmadı)"}
        info={
          isVat
            ? "KDV hariç satış tutarından, indirilebilir KDV düşülmüş giderler çıkarılır. Gelir/kurumlar vergisi, iade ve iptaller dâhil değildir."
            : "Hızlı modda girilen satış fiyatından tüm giderler girildiği gibi çıkarılır. KDV ayrıştırılmadığı için sonuç yaklaşıktır."
        }
      />
      <Metric
        label="Tahmini kâr marjı"
        tone={tone}
        value={formatPercent(result.marginPercent)}
        sub={result.marginPercent === null ? "Satış tutarı 0 olduğu için hesaplanamaz" : isVat ? "KDV hariç satışa göre" : "Satış fiyatına göre"}
        info="Kâr marjı = Tahmini kâr / Satış tutarı × 100. KDV modunda satış tutarı KDV hariçtir."
      />
      <Metric
        label="Toplam gider"
        value={formatTRY(result.totalExpense)}
        sub={isVat ? "İndirilebilir KDV hariç" : "Girilen tutarlarla"}
        info="Ürün maliyeti, komisyon, kargo, paketleme, reklam, diğer giderler, satışa bağlı ücretler ve sabit gider payının toplamı."
      />
      <Metric
        label="Komisyon tutarı"
        value={formatTRY(commission.expense)}
        sub={`Taban: ${formatTRY(result.commissionBaseAmount)}`}
        info="Komisyon = Komisyona esas tutar × Komisyon oranı. KDV modunda indirilebilir komisyon KDV'si gidere eklenmez."
      />
      <Metric
        label="Kargo ve diğer giderler"
        value={formatTRY(result.otherExpenses)}
        sub="Kargo, paketleme, reklam, diğer, ücretler, sabit pay"
        info="Ürün maliyeti ve komisyon dışındaki tüm giderlerin toplamı."
      />
      <Metric
        label="Başa baş satış fiyatı"
        value={be.value}
        sub={be.sub}
        info="Kârın sıfır olduğu en düşük satış fiyatı. Komisyon ve satışa bağlı ücretler fiyatla birlikte değiştiği için ayrı ayrı hesaba katılır."
      />
      <Metric
        emphasis
        label={`Hedef için gereken fiyat (${targetLabel})`}
        value={tp.value}
        sub={tp.sub}
        info="Girdiğiniz hedef kâr tutarına veya marjına ulaşmak için gereken en düşük satış fiyatı (kuruş hassasiyetinde)."
      />
    </div>
  );
}

export function Breakdown({ result }: { result: CalcResult }) {
  const isVat = result.mode === "vat";
  const lines = result.lines.filter((l) => l.gross !== 0 || l.key === "cost" || l.key === "commission");
  return (
    <Card>
      <CardHeader
        title="Ayrıntılı döküm"
        description={isVat ? "Hangi tutarın gider, hangisinin indirilebilir KDV sayıldığı" : "Hesaba katılan giderler"}
      />
      <div className="overflow-x-auto">
        <table className="w-full min-w-[420px] text-sm">
          <caption className="sr-only">Gider dökümü</caption>
          <thead>
            <tr className="border-b border-line text-left text-xs text-muted">
              <th scope="col" className="px-4 py-2 font-medium">Kalem</th>
              {isVat && <th scope="col" className="px-2 py-2 text-right font-medium">KDV hariç</th>}
              {isVat && <th scope="col" className="px-2 py-2 text-right font-medium">KDV</th>}
              <th scope="col" className="px-4 py-2 text-right font-medium">Gider</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-line/60">
              <th scope="row" className="px-4 py-2 text-left font-medium text-fg">
                {isVat ? "Satış geliri (KDV hariç)" : "Satış fiyatı"}
              </th>
              {isVat && <td className="num px-2 py-2 text-right">{formatTRY(result.saleNet)}</td>}
              {isVat && <td className="num px-2 py-2 text-right text-muted">{formatTRY(result.outputVat)}</td>}
              <td className="num px-4 py-2 text-right text-success">+{formatTRY(result.revenue)}</td>
            </tr>
            {lines.map((l) => (
              <tr key={l.key} className="border-b border-line/60">
                <th scope="row" className="px-4 py-2 text-left font-normal text-fg">{l.label}</th>
                {isVat && <td className="num px-2 py-2 text-right">{formatTRY(l.net)}</td>}
                {isVat && (
                  <td className="num px-2 py-2 text-right text-muted">
                    {formatTRY(l.vat)}
                    {l.vat > 0 && (
                      <span className="block text-[11px] text-subtle">{l.deductibleVat > 0 ? "indirilebilir" : "gidere eklendi"}</span>
                    )}
                  </td>
                )}
                <td className="num px-4 py-2 text-right">−{formatTRY(l.expense)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <th scope="row" colSpan={isVat ? 3 : 1} className="px-4 py-2.5 text-left font-semibold">
                Tahmini kâr
              </th>
              <td
                className={cx(
                  "num px-4 py-2.5 text-right font-semibold",
                  result.profit > 0 ? "text-success" : result.profit < 0 ? "text-danger" : "text-fg",
                )}
              >
                {formatTRY(result.profit)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
      {isVat && (
        <dl className="grid grid-cols-1 gap-x-4 gap-y-1 border-t border-line px-4 py-3 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-xs text-muted">Satış KDV’si (çıktı)</dt>
            <dd className="num">{formatTRY(result.outputVat)}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted">İndirilebilir KDV</dt>
            <dd className="num">{formatTRY(result.deductibleVatTotal)}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted">{result.vatBalance >= 0 ? "Tahmini ödenecek KDV" : "Devreden KDV"}</dt>
            <dd className="num">{formatTRY(Math.abs(result.vatBalance))}</dd>
          </div>
        </dl>
      )}
    </Card>
  );
}

export function Warnings({ warnings }: { warnings: string[] }) {
  if (warnings.length === 0) return null;
  return (
    <Notice tone="warning" icon={<AlertTriangle className="size-4" />} title="Dikkat">
      <ul className="mt-1 list-disc space-y-0.5 pl-4">
        {warnings.map((w) => (
          <li key={w}>{w}</li>
        ))}
      </ul>
    </Notice>
  );
}

export function ProfitInline({ profit }: { profit: number }) {
  return (
    <span className={cx("num inline-flex items-center gap-1", profit > 0 ? "text-success" : profit < 0 ? "text-danger" : "text-fg")}>
      {profit > 0 ? (
        <CheckCircle2 className="size-3.5" aria-hidden="true" />
      ) : profit < 0 ? (
        <TrendingDown className="size-3.5" aria-hidden="true" />
      ) : (
        <MinusCircle className="size-3.5" aria-hidden="true" />
      )}
      {profit < 0 && <span className="sr-only">Zarar </span>}
      {formatTRY(profit)}
    </span>
  );
}
