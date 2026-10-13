/**
 * Yerel veri katmanı. Arayüzden bağımsızdır; KeyValueStore arayüzü sayesinde
 * localStorage yerine ileride IndexedDB, chrome.storage veya bir sunucu kullanılabilir.
 */
import { defaultAppData } from "./defaults";
import {
  sanitizeCommissionProfiles,
  sanitizeDraft,
  sanitizeHistory,
  sanitizeMarketplaces,
  sanitizeProducts,
  sanitizeScenarios,
  sanitizeSettings,
} from "./sanitize";
import { SCHEMA_VERSION, type AppData, type CollectionKey } from "./types";

export interface KeyValueStore {
  get(key: string): string | null;
  set(key: string, value: string): void;
  remove(key: string): void;
  keys(): string[];
}

export const KEY_PREFIX = "karcep:";
const META_KEY = `${KEY_PREFIX}meta`;
const COLLECTIONS: CollectionKey[] = [
  "products",
  "history",
  "marketplaces",
  "commissionProfiles",
  "settings",
  "draft",
  "scenarios",
];
export const collectionKey = (c: CollectionKey) => `${KEY_PREFIX}${c}`;

export function createMemoryStore(initial: Record<string, string> = {}): KeyValueStore {
  const map = new Map(Object.entries(initial));
  return {
    get: (k) => (map.has(k) ? map.get(k)! : null),
    set: (k, v) => void map.set(k, v),
    remove: (k) => void map.delete(k),
    keys: () => [...map.keys()],
  };
}

/** localStorage erişilemezse (gizli mod, kota, engelleme) bellek içi depoya düşer. */
export function createBrowserStore(): { store: KeyValueStore; persistent: boolean } {
  try {
    const ls = window.localStorage;
    const probe = `${KEY_PREFIX}__probe`;
    ls.setItem(probe, "1");
    ls.removeItem(probe);
    return {
      persistent: true,
      store: {
        get: (k) => ls.getItem(k),
        set: (k, v) => ls.setItem(k, v),
        remove: (k) => ls.removeItem(k),
        keys: () => Array.from({ length: ls.length }, (_, i) => ls.key(i)).filter((k): k is string => k !== null),
      },
    };
  } catch {
    return { store: createMemoryStore(), persistent: false };
  }
}

export interface LoadResult {
  data: AppData;
  /** Kullanıcıya gösterilebilecek uyarılar (bozuk veri vb.) */
  issues: string[];
}

function readJson(store: KeyValueStore, key: string, issues: string[], label: string): unknown {
  let raw: string | null;
  try {
    raw = store.get(key);
  } catch {
    issues.push(`${label} okunamadı.`);
    return undefined;
  }
  if (raw === null) return undefined;
  try {
    return JSON.parse(raw);
  } catch {
    // Bozuk veriyi silmeden yedekle, uygulama açılmaya devam etsin.
    try {
      store.set(`${key}:bozuk-yedek`, raw);
    } catch {
      /* yedekleme başarısızsa yok say */
    }
    issues.push(`${label} bozuk olduğu için okunamadı; varsayılan değerlerle devam edildi.`);
    return undefined;
  }
}

/**
 * Şema migrasyonları: anahtar, kaynak sürüm. Her fonksiyon ham koleksiyonları bir sonraki sürüme taşır.
 * Şu an yalnızca v1 var; yeni sürümde buraya eklenir.
 */
type RawCollections = Partial<Record<CollectionKey, unknown>>;
const MIGRATIONS: Record<number, (raw: RawCollections) => RawCollections> = {
  // 1: (raw) => ({ ...raw, ... }),  // v1 → v2 örneği
};

export function migrate(raw: RawCollections, fromVersion: number): RawCollections {
  let v = fromVersion;
  let data = raw;
  while (v < SCHEMA_VERSION) {
    const step = MIGRATIONS[v];
    if (step) data = step(data);
    v++;
  }
  return data;
}

export function buildAppData(raw: RawCollections): AppData {
  const def = defaultAppData();
  const settings = raw.settings === undefined ? def.settings : sanitizeSettings(raw.settings);
  const marketplaces = raw.marketplaces === undefined ? def.marketplaces : sanitizeMarketplaces(raw.marketplaces);
  return {
    schemaVersion: SCHEMA_VERSION,
    settings,
    marketplaces,
    products: sanitizeProducts(raw.products),
    history: sanitizeHistory(raw.history),
    commissionProfiles: sanitizeCommissionProfiles(
      raw.commissionProfiles,
      marketplaces.map((m) => m.id),
    ),
    draft: raw.draft === undefined ? sanitizeDraft(undefined, settings) : sanitizeDraft(raw.draft, settings),
    scenarios: sanitizeScenarios(raw.scenarios),
  };
}

const LABELS: Record<CollectionKey, string> = {
  products: "Ürün kayıtları",
  history: "Hesaplama geçmişi",
  marketplaces: "Pazaryeri profilleri",
  commissionProfiles: "Komisyon profilleri",
  settings: "Ayarlar",
  draft: "Hesaplayıcı taslağı",
  scenarios: "Senaryolar",
};

export function loadAppData(store: KeyValueStore): LoadResult {
  const issues: string[] = [];
  const meta = readJson(store, META_KEY, issues, "Veri sürüm bilgisi");
  let version = SCHEMA_VERSION;
  if (meta && typeof meta === "object" && typeof (meta as { schemaVersion?: unknown }).schemaVersion === "number") {
    version = (meta as { schemaVersion: number }).schemaVersion;
  }
  if (version > SCHEMA_VERSION) {
    issues.push("Kayıtlı veriler bu sürümden daha yeni bir KârCep sürümüyle oluşturulmuş; bazı alanlar okunamayabilir.");
  }

  const raw: RawCollections = {};
  for (const c of COLLECTIONS) {
    raw[c] = readJson(store, collectionKey(c), issues, LABELS[c]);
  }
  const data = buildAppData(version < SCHEMA_VERSION ? migrate(raw, version) : raw);
  return { data, issues };
}

/** Bir koleksiyonu kaydeder. Başarısız olursa (ör. kota doldu) false döner. */
export function saveCollection<K extends CollectionKey>(store: KeyValueStore, key: K, value: AppData[K]): boolean {
  try {
    store.set(collectionKey(key), JSON.stringify(value));
    store.set(META_KEY, JSON.stringify({ schemaVersion: SCHEMA_VERSION }));
    return true;
  } catch {
    return false;
  }
}

export function saveAll(store: KeyValueStore, data: AppData): boolean {
  return COLLECTIONS.every((c) => saveCollection(store, c, data[c]));
}

/** KârCep'e ait tüm anahtarları siler (bozuk yedekler dâhil). */
export function clearAll(store: KeyValueStore): void {
  for (const k of store.keys()) {
    if (k.startsWith(KEY_PREFIX)) store.remove(k);
  }
}

export interface ExportFile {
  app: "KarCep";
  schemaVersion: number;
  exportedAt: string;
  data: Omit<AppData, "schemaVersion">;
}

export function exportAppData(data: AppData, now = new Date()): string {
  const { schemaVersion, ...rest } = data;
  const file: ExportFile = { app: "KarCep", schemaVersion, exportedAt: now.toISOString(), data: rest };
  return JSON.stringify(file, null, 2);
}

export type ImportResult = { ok: true; data: AppData } | { ok: false; message: string };

export function parseImport(text: string): ImportResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, message: "Dosya geçerli bir JSON değil." };
  }
  if (!parsed || typeof parsed !== "object" || (parsed as { app?: unknown }).app !== "KarCep") {
    return { ok: false, message: "Bu dosya bir KârCep yedeği değil." };
  }
  const file = parsed as Partial<ExportFile>;
  const version = typeof file.schemaVersion === "number" ? file.schemaVersion : 1;
  if (version > SCHEMA_VERSION) {
    return { ok: false, message: "Yedek, bu uygulamadan daha yeni bir sürüme ait." };
  }
  if (!file.data || typeof file.data !== "object") {
    return { ok: false, message: "Yedek dosyasında veri bulunamadı." };
  }
  const raw = file.data as RawCollections;
  return { ok: true, data: buildAppData(migrate(raw, version)) };
}
