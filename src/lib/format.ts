/** Türkçe (tr-TR) ve TRY biçimlendirme yardımcıları. Para birimi ve sayı biçimi sabittir. */

const currency = new Intl.NumberFormat("tr-TR", {
  style: "currency",
  currency: "TRY",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const decimal2 = new Intl.NumberFormat("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const dateTime = new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium", timeStyle: "short" });
const dateOnly = new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium" });

/** Kuruş → "₺1.234,56". Tamsayı kuruş kullanıldığı için "-₺0,00" oluşmaz. */
export function formatTRY(kurus: number): string {
  return currency.format(kurus / 100);
}

/** İşaretli tutar: "+₺12,00" / "-₺12,00" / "₺0,00" */
export function formatSignedTRY(kurus: number): string {
  if (kurus > 0) return "+" + formatTRY(kurus);
  return formatTRY(kurus);
}

/**
 * Yüzde: "%18,50". Sıfır olmayan ama yuvarlamada sıfıra düşecek değerler "<%0,01" olarak gösterilir,
 * böylece küçük bir zarar "%0,00" ya da "-%0,00" gibi yanıltıcı görünmez.
 */
export function formatPercent(value: number | null, opts: { signed?: boolean } = {}): string {
  if (value === null || !Number.isFinite(value)) return "—";
  if (value === 0) return "%0,00";
  const abs = Math.abs(value);
  if (abs < 0.005) return value < 0 ? "-%<0,01" : "%<0,01";
  const s = `%${decimal2.format(abs)}`;
  if (value < 0) return "-" + s;
  return opts.signed ? "+" + s : s;
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : dateTime.format(d);
}

export function formatDate(isoOrDay: string): string {
  const d = /^\d{4}-\d{2}-\d{2}$/.test(isoOrDay) ? new Date(isoOrDay + "T12:00:00") : new Date(isoOrDay);
  return Number.isNaN(d.getTime()) ? "—" : dateOnly.format(d);
}

/** Kuruşu form alanına yazılabilecek metne çevirir: 12345 → "123,45" */
export function kurusToInput(kurus: number): string {
  const negative = kurus < 0;
  const abs = Math.abs(kurus);
  const lira = Math.floor(abs / 100);
  const k = abs % 100;
  const s = k === 0 ? String(lira) : `${lira},${String(k).padStart(2, "0")}`;
  return negative ? "-" + s : s;
}

/** Gün farkı (bugün − tarih), tarih YYYY-MM-DD */
export function daysSince(day: string, now = new Date()): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return null;
  const d = new Date(day + "T00:00:00");
  if (Number.isNaN(d.getTime())) return null;
  return Math.floor((now.getTime() - d.getTime()) / 86_400_000);
}

export function todayISO(now = new Date()): string {
  const p = (x: number) => String(x).padStart(2, "0");
  return `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}`;
}
