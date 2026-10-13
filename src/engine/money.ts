/**
 * Para ve oran aritmetiği.
 *
 * - Tutarlar her zaman tamsayı KURUŞ olarak tutulur (1 TL = 100 kuruş).
 * - Oranlar "milyonda bir" birimiyle tamsayı olarak tutulur: %20 = 200_000, %21,5 = 215_000.
 *   Bu sayede yüzde değerleri 4 ondalık basamağa kadar kayıpsız temsil edilir.
 * - Çarpma/bölme işlemleri BigInt ile yapılır ve yalnızca sonuçta, kuruşa,
 *   "yarımı sıfırdan uzağa" kuralıyla yuvarlanır. Kayan nokta hatası oluşmaz.
 */

/** Tamsayı kuruş. */
export type Kurus = number;
/** Milyonda bir cinsinden oran (1_000_000 = %100). */
export type Rate = number;

export const RATE_ONE = 1_000_000;
/** Yüzde başına oran birimi: %1 = 10_000. */
export const RATE_PER_PERCENT = 10_000;
/** Kabul edilen en yüksek tutar: 1 milyar TL. */
export const MAX_AMOUNT: Kurus = 1_000_000_000 * 100;

const RATE_ONE_BIG = BigInt(RATE_ONE);

/** num / den, sonuç kuruşa yarımı sıfırdan uzağa yuvarlanır. den > 0 olmalı. */
export function divRound(num: bigint, den: bigint): number {
  if (den <= 0n) throw new RangeError("Bölen pozitif olmalı");
  const negative = num < 0n;
  const abs = negative ? -num : num;
  const q = abs / den;
  const r = abs % den;
  const rounded = r * 2n >= den ? q + 1n : q;
  return Number(negative ? -rounded : rounded);
}

/** tutar × oran (kuruşa yuvarlanmış). */
export function mulRate(amount: Kurus, rate: Rate): Kurus {
  return divRound(BigInt(amount) * BigInt(rate), RATE_ONE_BIG);
}

export interface VatSplit {
  gross: Kurus;
  net: Kurus;
  vat: Kurus;
}

/** KDV dâhil tutarı ayrıştırır: Hariç = Dâhil / (1 + oran), KDV = Dâhil − Hariç. */
export function splitGross(gross: Kurus, vatRate: Rate): VatSplit {
  const net = divRound(BigInt(gross) * RATE_ONE_BIG, RATE_ONE_BIG + BigInt(vatRate));
  return { gross, net, vat: gross - net };
}

/** KDV hariç tutara KDV ekler: Dâhil = Hariç × (1 + oran). */
export function addVat(net: Kurus, vatRate: Rate): VatSplit {
  const vat = mulRate(net, vatRate);
  return { gross: net + vat, net, vat };
}

/** Tutarı, KDV durumuna göre ayrıştırır. */
export function splitAmount(amount: Kurus, includesVat: boolean, vatRate: Rate): VatSplit {
  return includesVat ? splitGross(amount, vatRate) : addVat(amount, vatRate);
}

export function percentToRate(percent: number): Rate {
  return Math.round(percent * RATE_PER_PERCENT);
}

export function rateToPercent(rate: Rate): number {
  return rate / RATE_PER_PERCENT;
}

export function tlToKurus(tl: number): Kurus {
  return Math.round(tl * 100);
}

export function kurusToTl(kurus: Kurus): number {
  return kurus / 100;
}
