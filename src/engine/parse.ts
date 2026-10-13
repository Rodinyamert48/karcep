/**
 * Kullanıcı girdisini (string) kayıpsız biçimde ölçeklenmiş tamsayıya çevirir.
 * Türkçe ("1.234,56") ve noktalı ("1234.56") yazımları kabul eder.
 */

export type ParseResult =
  | { kind: "empty" }
  | { kind: "ok"; value: number }
  | { kind: "error"; message: string };

const STRIP = /[\s  ₺%]|tl/gi;

/**
 * @param raw Kullanıcının yazdığı metin
 * @param decimals Ölçek: sonuç = değer × 10^decimals (kuruş için 2, yüzde oranı için 4)
 */
export function parseScaled(raw: string, decimals: number): ParseResult {
  let s = (raw ?? "").replace(STRIP, "");
  if (s === "") return { kind: "empty" };

  let negative = false;
  if (s.startsWith("-") || s.startsWith("−")) {
    negative = true;
    s = s.slice(1);
  } else if (s.startsWith("+")) {
    s = s.slice(1);
  }
  if (s === "") return { kind: "error", message: "Geçerli bir sayı girin." };

  const hasComma = s.includes(",");
  const hasDot = s.includes(".");
  let normalized: string;

  if (hasComma && hasDot) {
    const decimalSep = s.lastIndexOf(",") > s.lastIndexOf(".") ? "," : ".";
    const thousandSep = decimalSep === "," ? "." : ",";
    const [intPart, ...rest] = s.split(decimalSep);
    if (rest.length !== 1) return { kind: "error", message: "Geçerli bir sayı girin." };
    if (!isGrouped(intPart, thousandSep)) return { kind: "error", message: "Binlik ayracı hatalı." };
    normalized = intPart.split(thousandSep).join("") + "." + rest[0];
  } else if (hasComma) {
    const parts = s.split(",");
    if (parts.length !== 2) return { kind: "error", message: "Geçerli bir sayı girin." };
    normalized = parts[0] + "." + parts[1];
  } else if (hasDot) {
    const parts = s.split(".");
    if (parts.length > 2) {
      if (!isGrouped(s, ".")) return { kind: "error", message: "Geçerli bir sayı girin." };
      normalized = parts.join("");
    } else if (parts[1].length === 3 && decimals < 3 && /^\d{1,3}$/.test(parts[0])) {
      // "1.234" para alanında binlik ayracı olarak yorumlanır.
      normalized = parts.join("");
    } else {
      normalized = s;
    }
  } else {
    normalized = s;
  }

  if (normalized.startsWith(".")) normalized = "0" + normalized;
  if (normalized.endsWith(".")) normalized = normalized.slice(0, -1);
  if (!/^\d+(\.\d+)?$/.test(normalized)) {
    return { kind: "error", message: "Geçerli bir sayı girin." };
  }

  const [intDigits, fracDigits = ""] = normalized.split(".");
  if (fracDigits.length > decimals) {
    return {
      kind: "error",
      message: decimals === 0 ? "Ondalık değer girilemez." : `En fazla ${decimals} ondalık basamak girin.`,
    };
  }
  const trimmedInt = intDigits.replace(/^0+(?=\d)/, "");
  if (trimmedInt.length > 13) return { kind: "error", message: "Değer çok büyük." };

  const scaled = Number(trimmedInt + fracDigits.padEnd(decimals, "0"));
  if (!Number.isSafeInteger(scaled)) return { kind: "error", message: "Değer çok büyük." };
  if (negative && scaled !== 0) return { kind: "error", message: "Negatif değer girilemez." };
  return { kind: "ok", value: scaled };
}

function isGrouped(intPart: string, sep: string): boolean {
  if (!intPart.includes(sep)) return /^\d+$/.test(intPart);
  const re = new RegExp(`^\\d{1,3}(\\${sep}\\d{3})+$`);
  return re.test(intPart);
}
