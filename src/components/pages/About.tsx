"use client";

import { useId, useRef, useState, type ReactNode } from "react";
import * as Tabs from "@radix-ui/react-tabs";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import {
  buildKrcpFile,
  krcpFileName,
  mergeAppData,
  parseKrcp,
  serializeKrcp,
  KRCP_MIME,
  MAX_KRCP_BYTES,
  type AppData,
  type KrcpSummary,
} from "@/storage";
import { downloadText } from "@/lib/browser";
import { cn } from "@/lib/cn";
import { formatDateTime } from "@/lib/format";
import { APP_VERSION, LIVE_URL, RELEASE_DATE, REPO_URL } from "@/lib/appInfo";
import { useData } from "@/state/DataProvider";
import { Button } from "../ui/button";
import { useFeedback } from "../ui/feedback";
import { Block, Note, PageTitle } from "../ui/layout";

const TABS = [
  { value: "hakkinda", label: "Uygulama" },
  { value: "gizlilik", label: "Gizlilik" },
  { value: "yedekleme", label: "Yedekleme" },
  { value: "kosullar", label: "Kullanım koşulları" },
  { value: "surum", label: "Sürüm ve iletişim" },
] as const;
type TabValue = (typeof TABS)[number]["value"];

let requestedTab: TabValue | null = null;
/** Başka bir sayfadan Hakkında'ya geçerken açılacak sekmeyi belirtir (ör. "Yedek al"). */
export function requestAboutTab(tab: TabValue) {
  requestedTab = tab;
}

export function AboutPage() {
  const [tab, setTab] = useState<TabValue>(() => {
    const t = requestedTab ?? "hakkinda";
    requestedTab = null;
    return t;
  });

  return (
    <>
      <PageTitle title="Hakkında ve Gizlilik" />
      <Tabs.Root value={tab} onValueChange={(v) => setTab(v as TabValue)}>
        <Tabs.List
          aria-label="Bölümler"
          className="-mx-4 mb-10 flex gap-6 overflow-x-auto border-b border-line px-4 sm:mx-0 sm:px-0"
        >
          {TABS.map((t) => (
            <Tabs.Trigger
              key={t.value}
              value={t.value}
              className={cn(
                "relative shrink-0 py-3 text-sm whitespace-nowrap text-muted transition-colors hover:text-fg",
                "data-[state=active]:text-fg",
                "after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:bg-accent after:opacity-0 data-[state=active]:after:opacity-100",
              )}
            >
              {t.label}
            </Tabs.Trigger>
          ))}
        </Tabs.List>
        <Tabs.Content value="hakkinda" className="focus-visible:outline-none">
          <AppTab />
        </Tabs.Content>
        <Tabs.Content value="gizlilik" className="focus-visible:outline-none">
          <PrivacyTab />
        </Tabs.Content>
        <Tabs.Content value="yedekleme" className="focus-visible:outline-none">
          <BackupTab />
        </Tabs.Content>
        <Tabs.Content value="kosullar" className="focus-visible:outline-none">
          <TermsTab />
        </Tabs.Content>
        <Tabs.Content value="surum" className="focus-visible:outline-none">
          <VersionTab />
        </Tabs.Content>
      </Tabs.Root>
    </>
  );
}

function Prose({ children }: { children: ReactNode }) {
  return <div className="max-w-2xl space-y-4 text-[15px] leading-relaxed text-muted [&_strong]:font-medium [&_strong]:text-fg">{children}</div>;
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="max-w-2xl">
      <h2 className="mb-3 text-lg font-semibold text-fg">{title}</h2>
      <Prose>{children}</Prose>
    </section>
  );
}

/* ---------- Uygulama ---------- */

function AppTab() {
  return (
    <div className="space-y-12">
      <Section title="Ne yapar?">
        <p>
          KârCep, pazaryerlerinde satış yapanların ürün maliyeti, komisyon, kargo, reklam ve KDV gibi kalemleri girerek{" "}
          <strong>tahmini kârını, kâr marjını ve başa baş fiyatını</strong> hesaplamasını sağlar. Hesap açmak, ödeme yapmak veya
          sunucu gerekmez; uygulama tamamen tarayıcıda çalışır.
        </p>
      </Section>
      <Section title="Nasıl hesaplar?">
        <p>
          <strong>Hızlı mod:</strong> tutarlar girildiği gibi kullanılır. Kâr = satış fiyatı − (maliyet + komisyon + kargo +
          paketleme + reklam + diğer + ücretler + sabit pay).
        </p>
        <p>
          <strong>KDV ayrıştırmalı mod:</strong> KDV hariç tutar = KDV dâhil tutar / (1 + oran). Kâr, KDV hariç satış gelirinden KDV
          hariç giderler çıkarılarak bulunur; indirilebilir KDV ikinci kez gider yazılmaz.
        </p>
        <p>
          <strong>Kâr marjı</strong> (kâr / satış geliri) ile <strong>maliyet üzerine kâr</strong> (kâr / alış maliyeti) farklı
          ölçülerdir ve ayrı gösterilir. Tutarlar tamsayı kuruşla işlenir; başa baş ve hedef fiyatlar kuruş hassasiyetindedir.
        </p>
      </Section>
    </div>
  );
}

/* ---------- Gizlilik ---------- */

function PrivacyTab() {
  return (
    <div className="space-y-12">
      <Section title="Verileriniz nerede?">
        <p>
          Ürünler, profiller, ayarlar, senaryolar ve hesap geçmişi yalnızca bu tarayıcının yerel deposunda (
          <code className="text-fg">localStorage</code>) saklanır. Hesap, giriş veya sunucu yoktur.
        </p>
        <p>
          Uygulama kodunda sunucuya veri gönderen bir istek, analitik, izleme veya reklam kodu bulunmaz. Yazı tipi de uygulamayla
          birlikte sunulur; üçüncü taraf bir servisten yüklenmez.
        </p>
        <p>
          Tarayıcı verilerini temizlerseniz, gizli pencereyi kapatırsanız veya başka bir cihaz kullanırsanız kayıtlarınıza
          erişemezsiniz. Bu yüzden düzenli olarak <strong>.krcp yedeği</strong> alın.
        </p>
      </Section>
      <Section title="Komisyon oranları">
        <p>
          KârCep hiçbir pazaryerinin oranını otomatik çekmez, satıcı panellerini taramaz ve tahmin etmez. Oranları siz girersiniz;
          her profil için kaynak ve son doğrulama tarihi tutulur, 90 günden eski doğrulamalar işaretlenir.
        </p>
      </Section>
      <Section title="KVKK">
        <p>
          Veriler bir sunucuya aktarılmadığı ve yalnızca sizin cihazınızda kaldığı için KârCep bu verileri bir veri sorumlusu olarak
          işlemez. İleride hesap veya sunucu eklenirse bu bölüm, gerçek veri sorumlusu bilgileriyle bir aydınlatma metniyle
          güncellenecektir.
        </p>
      </Section>
    </div>
  );
}

/* ---------- Yedekleme ---------- */

type Preview = { data: AppData; summary: KrcpSummary; fileName: string };

function BackupTab() {
  const { data, replaceAll, updateSettings } = useData();
  const { toast } = useFeedback();
  const fileRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);

  const create = () => {
    try {
      const name = krcpFileName();
      downloadText(name, serializeKrcp(buildKrcpFile(data)), `${KRCP_MIME};charset=utf-8`);
      updateSettings({ lastBackupAt: new Date().toISOString() });
      toast(`Yedek indirildi: ${name}`);
    } catch {
      toast("Yedek dosyası oluşturulamadı.", "error");
    }
  };

  const reset = () => {
    if (fileRef.current) fileRef.current.value = "";
    setFileName(null);
  };

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setFileName(file.name);
    if (file.size > MAX_KRCP_BYTES) {
      toast(`Dosya çok büyük (en fazla ${Math.round(MAX_KRCP_BYTES / 1024 / 1024)} MB).`, "error");
      return reset();
    }
    let text: string;
    try {
      text = await file.text();
    } catch {
      toast("Dosya okunamadı.", "error");
      return reset();
    }
    const r = parseKrcp(text, file.size);
    if (!r.ok) {
      toast(r.message, "error");
      return reset();
    }
    setPreview({ data: r.data, summary: r.summary, fileName: file.name });
  };

  const apply = (strategy: "replace" | "merge") => {
    if (!preview) return;
    const next = strategy === "merge" ? mergeAppData(data, preview.data) : preview.data;
    if (replaceAll(next)) {
      toast(
        strategy === "merge"
          ? `Birleştirildi: ${next.products.length} ürün, ${next.history.length} geçmiş kaydı.`
          : `Geri yüklendi: ${next.products.length} ürün, ${next.history.length} geçmiş kaydı.`,
      );
      setPreview(null);
      reset();
    } else {
      toast("Kaydedilemedi (depolama dolu olabilir). Mevcut verileriniz değişmedi.", "error");
    }
  };

  return (
    <div className="max-w-2xl space-y-12">
      <Block title="Yedek oluştur" className="border-t-0 pt-0">
        <Prose>
          <p>
            Ürünler, komisyon ve pazaryeri profilleri, varsayılanlar, fiyat senaryoları, hesap geçmişi ve tercihler tek bir{" "}
            <strong>.krcp</strong> dosyasına indirilir. Dosya ticari bilgiler içerir; güvendiğiniz bir yerde saklayın.
          </p>
        </Prose>
        <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2">
          <Button variant="primary" onClick={create}>
            Yedek oluştur
          </Button>
          <span className="text-sm text-subtle">
            {data.settings.lastBackupAt ? `Son yedek: ${formatDateTime(data.settings.lastBackupAt)}` : "Henüz yedek alınmadı."}
          </span>
        </div>
      </Block>

      <Block title="Yedek yükle">
        <Prose>
          <p>
            Dosya önce doğrulanır (biçim, sürüm, alanlar). Geçersiz bir dosya hiçbir veriyi değiştirmez; geçerliyse ne yapılacağını
            seçmeniz istenir.
          </p>
        </Prose>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Button onClick={() => fileRef.current?.click()}>Yedek yükle</Button>
          <input
            ref={fileRef}
            type="file"
            accept=".krcp"
            className="sr-only"
            tabIndex={-1}
            aria-hidden="true"
            onChange={(e) => onFile(e.target.files?.[0])}
          />
          <span className="truncate text-sm text-subtle">{fileName ?? "Dosya seçilmedi"}</span>
        </div>
      </Block>

      <Note title="Otomatik yedek yoktur">
        Tarayıcı, bilgisayarınızdaki bir klasöre kendiliğinden yazamaz. Yedeği siz indirir; bilgisayar, harici disk veya kendi bulut
        deponuzda saklarsınız.
      </Note>

      {preview && (
        <RestoreDialog
          preview={preview}
          current={data}
          onApply={apply}
          onClose={() => {
            setPreview(null);
            reset();
          }}
        />
      )}
    </div>
  );
}

function RestoreDialog({
  preview,
  current,
  onApply,
  onClose,
}: {
  preview: Preview;
  current: AppData;
  onApply: (s: "replace" | "merge") => void;
  onClose: () => void;
}) {
  const titleId = useId();
  const { summary } = preview;
  const knownDate = new Date(summary.createdAt).getTime() !== 0;
  const counts: [string, number][] = [
    ["Ürün", summary.counts.products],
    ["Geçmiş", summary.counts.history],
    ["Komisyon profili", summary.counts.commissionProfiles],
    ["Özel pazaryeri", summary.counts.customMarketplaces],
  ];

  return (
    <Dialog.Root open onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="k-overlay fixed inset-0 z-50 bg-black/70" />
        <Dialog.Content
          aria-labelledby={titleId}
          className="k-dialog fixed inset-x-4 bottom-4 z-50 mx-auto max-h-[calc(100dvh-2rem)] max-w-lg overflow-y-auto rounded-lg border border-line-strong bg-raised p-5 focus:outline-none sm:top-1/2 sm:bottom-auto sm:-translate-y-1/2"
        >
          <div className="flex items-start justify-between gap-3">
            <Dialog.Title id={titleId} className="text-lg font-semibold">
              Yedek geri yüklensin mi?
            </Dialog.Title>
            <Dialog.Close className="rounded p-1 text-subtle hover:text-fg" aria-label="Kapat">
              <X className="size-4" aria-hidden="true" />
            </Dialog.Close>
          </div>
          <Dialog.Description className="mt-1 text-sm text-muted">
            <span className="block truncate text-fg">{preview.fileName}</span>
            {knownDate && <>Oluşturulma: {formatDateTime(summary.createdAt)}</>}
          </Dialog.Description>

          <dl className="mt-5 grid grid-cols-2 gap-y-3 border-y border-line py-4 text-sm sm:grid-cols-4">
            {counts.map(([label, n]) => (
              <div key={label} className="flex flex-col-reverse">
                <dt className="text-[13px] text-subtle">{label}</dt>
                <dd className="num text-xl font-semibold text-fg">{n}</dd>
              </div>
            ))}
          </dl>

          <div className="mt-5 space-y-4 text-sm">
            <div>
              <p className="font-medium text-fg">Birleştir</p>
              <p className="mt-0.5 text-muted">
                Ürünler, geçmiş ve profiller kimliğe göre birleştirilir; aynı kayıtta yedekteki kazanır. Ayarlarınız ve taslağınız
                değişmez.
              </p>
            </div>
            <div>
              <p className="font-medium text-fg">Değiştir</p>
              <p className="mt-0.5 text-muted">
                Mevcut tüm verilerin ({current.products.length} ürün, {current.history.length} geçmiş) yerini yedek alır.
              </p>
            </div>
          </div>

          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="ghost" onClick={onClose}>
              Vazgeç
            </Button>
            <Button onClick={() => onApply("merge")}>Birleştir</Button>
            <Button variant="danger" onClick={() => onApply("replace")}>
              Değiştir
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/* ---------- Koşullar ---------- */

function TermsTab() {
  return (
    <div className="space-y-12">
      <Section title="Amaç">
        <p>
          KârCep satış kararlarına yardımcı olacak <strong>tahminler</strong> sunar. Girdiğiniz oranların, maliyetlerin veya KDV&apos;nin
          doğruluğunu denetlemez; gelir/kurumlar vergisi, stopaj, iade, iptal ve pazaryeri teşviklerini otomatik içermez. Gerçek
          kararlardan önce kendi gider ve komisyon oranlarınızı doğrulayın.
        </p>
      </Section>
      <Section title="Sorumluluk">
        <p>
          Uygulama olduğu gibi sunulur; kesintisiz veya hatasız çalışacağı garanti edilmez ve resmî muhasebe, vergi ya da hukuki
          danışmanlığın yerine geçmez. Bu metin, kanundan doğan haklarınızı kısıtlamaz.
        </p>
      </Section>
      <Section title="Erişim ve kullanım">
        <p>
          Hizmet GitHub Pages üzerinde barındırılır; geçici erişim sorunları olabilir. Verileriniz cihazınızda kaldığından yedeğiniz her
          zaman sizdedir. Uygulamayı kişisel veya ticari satış işlerinizde kullanabilirsiniz; adını ve kodunu üçüncü kişileri
          yanıltacak biçimde yeniden dağıtmayın.
        </p>
      </Section>
    </div>
  );
}

/* ---------- Sürüm ---------- */

function VersionTab() {
  const rows: [string, string][] = [
    ["Sürüm", APP_VERSION],
    ["Son güncelleme", RELEASE_DATE],
    ["Yedek biçimi", ".krcp (sürümlü JSON)"],
  ];
  return (
    <div className="max-w-2xl space-y-12">
      <dl className="divide-y divide-line border-y border-line text-[15px]">
        {rows.map(([k, v]) => (
          <div key={k} className="flex justify-between gap-4 py-3">
            <dt className="text-muted">{k}</dt>
            <dd className="num text-fg">{v}</dd>
          </div>
        ))}
      </dl>
      <Section title="İletişim">
        <p>
          Hata bildirimi ve öneriler için proje deposunu kullanın. Gerçek bir şirket, adres veya telefon kaydı olmadığından burada
          iletişim bilgisi uydurulmamıştır.
        </p>
        <p className="flex flex-col gap-1.5">
          <a href={REPO_URL} target="_blank" rel="noopener noreferrer nofollow" className="text-accent underline underline-offset-4">
            Kaynak kod ve hata bildirimi
          </a>
          <a href={LIVE_URL} target="_blank" rel="noopener noreferrer nofollow" className="text-accent underline underline-offset-4">
            Canlı uygulama
          </a>
        </p>
      </Section>
    </div>
  );
}
