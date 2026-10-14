/**
 * `.krcp` — KârCep'e özel, taşınabilir yedekleme dosyası.
 *
 * Biçim: UTF-8 kodlu, sürümlenmiş JSON. `.krcp` standart bir arşiv biçimi DEĞİLDİR;
 * yalnızca KârCep'in kendi verisini okuyup yazdığı bir dosya uzantısıdır. Dosyanın
 * uzantısını değiştirmek onu güvenli veya geçerli yapmaz — içerik her zaman
 * `parseKrcp` ile tam olarak doğrulanır (şema, tip, alan bazında).
 */
import { buildAppData, migrate, type RawCollections } from "./storage";
import { BUILT_IN_MARKETPLACES } from "./defaults";
import { MAX_HISTORY } from "./sanitize";
import { SCHEMA_VERSION, type AppData } from "./types";

export const KRCP_FORMAT = "krcp" as const;
export const KRCP_APP = "KarCep" as const;
/** Kapsayıcı dosya biçiminin kendi sürümü (içerideki veri şemasından ayrı tutulur). */
export const KRCP_FORMAT_VERSION = 1;
export const KRCP_EXTENSION = ".krcp";
export const KRCP_MIME = "application/json";
/** Makul bir üst sınır: gerçek kullanımda yedek birkaç yüz KB'ı geçmez. */
export const MAX_KRCP_BYTES = 15 * 1024 * 1024;

export interface KrcpFile {
  format: typeof KRCP_FORMAT;
  formatVersion: number;
  app: typeof KRCP_APP;
  /** Yedeğin oluşturulduğu an (ISO-8601). */
  createdAt: string;
  /** İçerideki veri koleksiyonlarının şema sürümü (migration için). */
  schemaVersion: number;
  data: Omit<AppData, "schemaVersion">;
}

export interface KrcpCounts {
  products: number;
  history: number;
  commissionProfiles: number;
  /** Kullanıcının eklediği özel pazaryeri profilleri (yerleşik 3 profil hariç). */
  customMarketplaces: number;
}

export interface KrcpSummary {
  createdAt: string;
  formatVersion: number;
  counts: KrcpCounts;
}

function countsOf(data: Pick<AppData, "products" | "history" | "commissionProfiles" | "marketplaces">): KrcpCounts {
  const builtInIds = new Set(BUILT_IN_MARKETPLACES.map((m) => m.id));
  return {
    products: data.products.length,
    history: data.history.length,
    commissionProfiles: data.commissionProfiles.length,
    customMarketplaces: data.marketplaces.filter((m) => !builtInIds.has(m.id)).length,
  };
}

/**
 * İşletim sistemleri ve tarayıcılar arasında güvenli bir dosya adı üretir.
 * "KârCep" yerine bilinçli olarak aksansız "KarCep" kullanılır: testte Chromium'un
 * `download` özniteliğinde "â" (U+00E2) karakteriyle dosya adını çözemeyip adı sessizce
 * "download"a düşürdüğü, yani `.krcp` uzantısının kaybolduğu gözlemlendi. Marka adı
 * uygulama içinde "KârCep" olarak kalmaya devam eder; yalnızca dosya adı etkilenir.
 */
export function krcpFileName(now = new Date()): string {
  const p = (n: number) => String(n).padStart(2, "0");
  const stamp = `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}-${p(now.getHours())}${p(now.getMinutes())}`;
  return `KarCep-Yedek-${stamp}${KRCP_EXTENSION}`;
}

/** Mevcut uygulama verisinden bir `.krcp` dosya nesnesi oluşturur. Kaynak veriyi değiştirmez. */
export function buildKrcpFile(data: AppData, now = new Date()): KrcpFile {
  const { schemaVersion, ...rest } = data;
  return {
    format: KRCP_FORMAT,
    formatVersion: KRCP_FORMAT_VERSION,
    app: KRCP_APP,
    createdAt: now.toISOString(),
    schemaVersion,
    data: rest,
  };
}

export function serializeKrcp(file: KrcpFile): string {
  // JSON.stringify, JS string'lerini (UTF-16 iç temsil) üretir; Blob indirilirken
  // "charset=utf-8" ile UTF-8 olarak kodlanır — Türkçe karakterler kaybolmaz.
  return JSON.stringify(file, null, 2);
}

export function krcpSummary(file: KrcpFile): KrcpSummary {
  return { createdAt: file.createdAt, formatVersion: file.formatVersion, counts: countsOf(file.data) };
}

export type KrcpParseResult =
  | { ok: true; data: AppData; summary: KrcpSummary }
  | {
      ok: false;
      reason: "too-large" | "empty" | "invalid-json" | "wrong-format" | "unsupported-version" | "invalid-data";
      message: string;
    };

function isObj(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/**
 * `.krcp` dosya içeriğini doğrular ve uygulanabilir bir `AppData`'ya dönüştürür.
 * Hiçbir aşamada mevcut depolamaya yazmaz; yalnızca okur ve doğrular.
 */
export function parseKrcp(text: string, sizeBytes: number): KrcpParseResult {
  if (sizeBytes > MAX_KRCP_BYTES) {
    return { ok: false, reason: "too-large", message: `Dosya çok büyük (en fazla ${Math.round(MAX_KRCP_BYTES / 1024 / 1024)} MB).` };
  }
  if (!text || !text.trim()) {
    return { ok: false, reason: "empty", message: "Dosya boş." };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, reason: "invalid-json", message: "Dosya geçerli bir JSON içermiyor. Dosya bozulmuş olabilir." };
  }

  if (!isObj(parsed) || parsed.format !== KRCP_FORMAT || parsed.app !== KRCP_APP) {
    return { ok: false, reason: "wrong-format", message: "Bu dosya bir KârCep (.krcp) yedeği değil." };
  }

  const formatVersion = typeof parsed.formatVersion === "number" ? parsed.formatVersion : NaN;
  if (!Number.isSafeInteger(formatVersion) || formatVersion < 1) {
    return { ok: false, reason: "invalid-data", message: "Yedek dosyasının sürüm bilgisi okunamadı." };
  }
  if (formatVersion > KRCP_FORMAT_VERSION) {
    return {
      ok: false,
      reason: "unsupported-version",
      message: "Bu yedek, uygulamanın bu sürümünden daha yeni bir KârCep ile oluşturulmuş. Lütfen uygulamayı güncelleyin.",
    };
  }

  const schemaVersion = typeof parsed.schemaVersion === "number" ? parsed.schemaVersion : SCHEMA_VERSION;
  if (!isObj(parsed.data)) {
    return { ok: false, reason: "invalid-data", message: "Yedek dosyasında okunabilir veri bulunamadı." };
  }

  const raw = (schemaVersion < SCHEMA_VERSION ? migrate(parsed.data as RawCollections, schemaVersion) : parsed.data) as RawCollections;

  let data: AppData;
  try {
    // buildAppData, her alanı tip tip doğrular; eksik/bozuk/beklenmeyen alanlar güvenli varsayılanlarla değiştirilir,
    // tanınmayan kayıtlar elenir — geçersiz veri mevcut depolamaya asla yazılmaz (bu fonksiyon saf bir dönüşümdür).
    data = buildAppData(raw);
  } catch {
    return { ok: false, reason: "invalid-data", message: "Yedek verisi okunurken beklenmeyen bir hata oluştu." };
  }

  const createdAt = typeof parsed.createdAt === "string" && !Number.isNaN(Date.parse(parsed.createdAt)) ? parsed.createdAt : new Date(0).toISOString();
  return { ok: true, data, summary: { createdAt, formatVersion, counts: countsOf(data) } };
}

/**
 * İki veri kümesini birleştirir: liste tabanlı koleksiyonlar (ürünler, geçmiş, komisyon
 * profilleri, özel pazaryerleri) kimliğe göre birleştirilir — çakışmada yedekteki kazanır,
 * yalnızca mevcutta olan kayıtlar korunur. Tekil ayarlar (genel ayarlar, taslak, senaryo
 * girdileri) mevcut oturumun değerleri olarak kalır; bunlar "birikmiş kayıt" değil, anlık
 * tercih olduğundan güvenilir bir alan-bazlı birleştirme tanımı yoktur.
 */
export function mergeAppData(current: AppData, incoming: AppData): AppData {
  const byId = <T extends { id: string }>(a: T[], b: T[]): T[] => {
    const map = new Map(a.map((x) => [x.id, x]));
    for (const item of b) map.set(item.id, item);
    return [...map.values()];
  };
  return {
    ...current,
    products: byId(current.products, incoming.products),
    history: byId(current.history, incoming.history).slice(0, MAX_HISTORY),
    commissionProfiles: byId(current.commissionProfiles, incoming.commissionProfiles),
    marketplaces: byId(current.marketplaces, incoming.marketplaces),
  };
}
