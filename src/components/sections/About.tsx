"use client";

import { useId, useRef, useState } from "react";
import * as Tabs from "@radix-ui/react-tabs";
import * as Dialog from "@radix-ui/react-dialog";
import {
  AlertTriangle,
  Calculator,
  CheckCircle2,
  Database,
  Download,
  FileClock,
  GitBranch,
  Info,
  Lock,
  Mail,
  Scale,
  ShieldCheck,
  Upload,
  X,
} from "lucide-react";
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
import { formatDateTime } from "@/lib/format";
import { APP_VERSION, LIVE_URL, RELEASE_DATE, REPO_URL } from "@/lib/appInfo";
import { useData } from "@/state/DataProvider";
import { useFeedback } from "../ui/feedback";
import { Badge, Button, Card, CardHeader, Notice, PageHeader, cx } from "../ui/primitives";

const TABS = [
  { value: "hakkinda", label: "Uygulama Hakkında", icon: Info },
  { value: "gizlilik", label: "Gizlilik ve Veri Saklama", icon: Lock },
  { value: "yedekleme", label: "Yedekleme ve Geri Yükleme", icon: Database },
  { value: "kosullar", label: "Kullanım Koşulları", icon: Scale },
  { value: "surum", label: "Sürüm ve İletişim", icon: GitBranch },
] as const;

export function AboutSection() {
  return (
    <>
      <PageHeader
        title="Hakkında ve Gizlilik"
        description="KârCep, Türkiye'deki e-ticaret satıcıları için ücretsiz, tarayıcıda çalışan bir kârlılık hesaplayıcısıdır."
      />
      <Tabs.Root defaultValue="hakkinda" className="w-full">
        <Tabs.List aria-label="Hakkında ve gizlilik bölümleri" className="mb-6 flex flex-wrap gap-x-6 gap-y-2 border-b border-line">
          {TABS.map((t) => (
            <Tabs.Trigger
              key={t.value}
              value={t.value}
              className={cx(
                "relative inline-flex items-center gap-1.5 py-2.5 text-sm text-muted transition-colors",
                "hover:text-fg",
                "data-[state=active]:font-medium data-[state=active]:text-fg",
                "after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:scale-x-0 after:bg-accent after:transition-transform",
                "data-[state=active]:after:scale-x-100",
                "focus-visible:outline-2 focus-visible:outline-focus focus-visible:outline-offset-2",
              )}
            >
              <t.icon className="size-4" aria-hidden="true" />
              {t.label}
            </Tabs.Trigger>
          ))}
        </Tabs.List>

        <Tabs.Content value="hakkinda" className="focus-visible:outline-none">
          <AboutTab />
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

/* ================= 1. Uygulama Hakkında ================= */

function AboutTab() {
  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
      <Card>
        <CardHeader title="KârCep nedir?" icon={<Info className="size-4" />} />
        <div className="space-y-3 p-4 text-sm text-muted sm:p-5">
          <p>
            KârCep; Trendyol, Hepsiburada ve benzeri pazaryerlerinde satış yapan e-ticaret satıcılarının ürün maliyeti, komisyon, kargo,
            paketleme, reklam ve KDV gibi kalemleri girerek <strong className="text-fg">tahmini kârını, kâr marjını ve başa baş satış
            fiyatını</strong> hesaplamasını sağlayan ücretsiz bir web uygulamasıdır.
          </p>
          <p>Hesap oluşturma, ödeme veya sunucu gerektirmez; tamamen tarayıcınızda çalışır ve statik bir sitede barındırılır.</p>
        </div>
      </Card>

      <Card>
        <CardHeader title="Hesaplama yöntemi" icon={<Calculator className="size-4" />} />
        <div className="space-y-3 p-4 text-sm text-muted sm:p-5">
          <p>
            <strong className="text-fg">Hızlı mod:</strong> Komisyon = Komisyona esas tutar × oran; Toplam gider = maliyet + komisyon +
            kargo + paketleme + reklam + diğer + ücretler + sabit pay; Tahmini kâr = Satış fiyatı − Toplam gider. KDV ayrıştırılmaz.
          </p>
          <p>
            <strong className="text-fg">KDV ayrıştırmalı mod:</strong> KDV hariç tutar = KDV dâhil tutar / (1 + oran). Kâr, KDV hariç
            satış gelirinden giderlerin KDV hariç tutarları çıkarılarak bulunur; indirilebilir KDV ikinci kez gider yazılmaz.
          </p>
          <p>
            <strong className="text-fg">Kâr marjı</strong> (Kâr / Satış geliri × 100) ile <strong className="text-fg">maliyet üzerine
            kâr oranı</strong> (Kâr / Alış maliyeti × 100) birbirinden farklı ölçümlerdir; her ikisi de Kâr Hesaplayıcı’da ayrı ayrı
            gösterilir. Başa baş ve hedef fiyatları, tüm tutarlar tamsayı kuruş olarak işlenerek kuruş hassasiyetinde hesaplanır.
          </p>
        </div>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader title="Teknoloji ve dağıtım" icon={<Database className="size-4" />} />
        <p className="p-4 text-sm text-muted sm:p-5">
          KârCep; React, TypeScript, Tailwind CSS ve Radix UI tabanlı erişilebilir bileşenlerle geliştirilmiş, statik bir web
          uygulamasıdır ve ücretsiz statik barındırma (GitHub Pages) üzerinde çalışır. Hesaplama motoru arayüzden tamamen bağımsız bir
          modül olarak yazılmıştır; ileride aynı motor bir tarayıcı eklentisinde de yeniden kullanılabilir.
        </p>
      </Card>
    </div>
  );
}

/* ================= 2. Gizlilik ve Veri Saklama ================= */

function PrivacyTab() {
  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
      <Card>
        <CardHeader title="Verileriniz nerede saklanır?" icon={<Lock className="size-4" />} />
        <div className="space-y-3 p-4 text-sm text-muted sm:p-5">
          <p>
            <strong className="text-fg">Hesap, giriş veya sunucu yoktur.</strong> Girdiğiniz ürünler, maliyetler, komisyon profilleri,
            pazaryeri ayarları, fiyat senaryoları ve hesaplama geçmişi yalnızca bu tarayıcının yerel deposunda (
            <code className="rounded bg-surface-3 px-1 py-0.5 text-xs">localStorage</code>) saklanır.
          </p>
          <p>
            Uygulamanın kaynak kodunda hiçbir sunucuya veri gönderen bir istek, analitik kodu, izleme pikseli veya reklam betiği
            bulunmaz — bu, kodu inceleyerek doğrulanabilir bir teknik gerçektir, soyut bir vaat değildir.
          </p>
          <p>
            Tarayıcı verilerini (çerezler ve site verileri) temizlerseniz, gizli pencereyi kapatırsanız veya farklı bir cihaz/tarayıcı
            kullanırsanız bu kayıtlara erişemezsiniz. <strong className="text-fg">Yedekleme ve Geri Yükleme</strong> sekmesinden
            düzenli olarak <code className="rounded bg-surface-3 px-1 py-0.5 text-xs">.krcp</code> yedeği alın.
          </p>
        </div>
      </Card>

      <Card>
        <CardHeader title="Komisyon oranlarının kaynağı" icon={<ShieldCheck className="size-4" />} />
        <div className="space-y-3 p-4 text-sm text-muted sm:p-5">
          <p>
            KârCep pazaryerlerinin güncel komisyon oranlarını <strong className="text-fg">otomatik çekmez</strong>, satıcı panellerini
            taramaz, özel API’leri taklit etmez ve tahmini oran içermez. Oranları kendi satıcı panelinizden veya sözleşmenizden kontrol
            ederek siz girersiniz.
          </p>
          <p>
            Her komisyon profili için kaynak ve son doğrulama tarihi tutulur. Kaynağı belirtilmeyen oranlar “Kullanıcı girişi”, 90
            günden eski doğrulamalar güncelliğin kontrol edilmesi gereken bir uyarıyla işaretlenir.
          </p>
        </div>
      </Card>

      <Card>
        <CardHeader title="Yedek dosyanız hakkında" icon={<Database className="size-4" />} />
        <div className="space-y-3 p-4 text-sm text-muted sm:p-5">
          <p>
            Oluşturduğunuz <code className="rounded bg-surface-3 px-1 py-0.5 text-xs">.krcp</code> yedek dosyası, ürün maliyetleriniz ve
            satış fiyatlarınız gibi <strong className="text-fg">hassas ticari bilgiler içerebilir</strong>. Dosya yalnızca sizin
            seçtiğiniz konuma (bilgisayarınız, harici disk, kendi bulut deponuz) indirilir; KârCep bu dosyayı hiçbir sunucuya göndermez
            ve kaydetmez.
          </p>
          <p>Yedeğinizi güvenli bir yerde saklamak ve kiminle paylaştığınıza dikkat etmek sizin sorumluluğunuzdadır.</p>
        </div>
      </Card>

      <Card>
        <CardHeader title="KVKK kapsamında" icon={<ShieldCheck className="size-4" />} />
        <div className="space-y-3 p-4 text-sm text-muted sm:p-5">
          <p>
            KârCep, verilerinizi bir sunucuya işlemek üzere toplamaz; tüm veriler yalnızca sizin cihazınızda, sizin kontrolünüzde
            kalır. Bu nedenle uygulama bir veri sorumlusu sıfatıyla kişisel veri işlemez.
          </p>
          <p>
            Girdiğiniz bilgiler (ör. ürün adları) kendi ticari verileriniz olup üçüncü bir tarafa aktarılmaz. Uygulamaya ileride bir
            hesap/sunucu sistemi eklenirse, bu bölüm ve ayrı bir aydınlatma metni, gerçek veri sorumlusu kimliği ve iletişim bilgileriyle
            güncellenecektir.
          </p>
        </div>
      </Card>
    </div>
  );
}

/* ================= 3. Yedekleme ve Geri Yükleme ================= */

type RestorePreview = { data: AppData; summary: KrcpSummary; fileName: string };

function BackupTab() {
  const { data, replaceAll, updateSettings } = useData();
  const { toast } = useFeedback();
  const fileRef = useRef<HTMLInputElement>(null);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [preview, setPreview] = useState<RestorePreview | null>(null);
  const [busy, setBusy] = useState(false);

  const createBackup = () => {
    try {
      const file = buildKrcpFile(data);
      const text = serializeKrcp(file);
      const name = krcpFileName();
      downloadText(name, text, `${KRCP_MIME};charset=utf-8`);
      updateSettings({ lastBackupAt: new Date().toISOString() });
      toast(`Yedek oluşturuldu: ${name}`);
    } catch {
      toast("Yedek dosyası oluşturulamadı.", "error");
    }
  };

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setSelectedFileName(file.name);
    if (file.size > MAX_KRCP_BYTES) {
      toast(`Dosya çok büyük (en fazla ${Math.round(MAX_KRCP_BYTES / 1024 / 1024)} MB).`, "error");
      resetFileInput();
      return;
    }
    let text: string;
    try {
      text = await file.text();
    } catch {
      toast("Dosya okunamadı.", "error");
      resetFileInput();
      return;
    }
    const result = parseKrcp(text, file.size);
    if (!result.ok) {
      toast(result.message, "error");
      resetFileInput();
      return;
    }
    setPreview({ data: result.data, summary: result.summary, fileName: file.name });
  };

  const resetFileInput = () => {
    if (fileRef.current) fileRef.current.value = "";
    setSelectedFileName(null);
  };

  const closePreview = () => {
    setPreview(null);
    resetFileInput();
  };

  const applyRestore = (strategy: "replace" | "merge") => {
    if (!preview) return;
    setBusy(true);
    const next = strategy === "merge" ? mergeAppData(data, preview.data) : preview.data;
    const ok = replaceAll(next);
    setBusy(false);
    if (ok) {
      toast(
        strategy === "merge"
          ? `Birleştirildi: toplam ${next.products.length} ürün, ${next.history.length} geçmiş kaydı.`
          : `Geri yüklendi: ${next.products.length} ürün, ${next.history.length} geçmiş kaydı.`,
      );
      closePreview();
    } else {
      toast("Geri yükleme kaydedilemedi (depolama alanı dolu olabilir). Mevcut verileriniz değiştirilmedi.", "error");
    }
  };

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader
          title="Yedek Oluştur"
          icon={<Download className="size-4" />}
          description="Tüm ürünlerinizi, komisyon profillerinizi, ayarlarınızı ve hesaplama geçmişinizi tek bir .krcp dosyasına indirin."
        />
        <div className="space-y-4 p-4 sm:p-5">
          <ul className="grid grid-cols-1 gap-x-6 gap-y-1 text-sm text-muted sm:grid-cols-2">
            <Item ok>Kayıtlı ürünler ve maliyetleri</Item>
            <Item ok>Komisyon ve pazaryeri profilleri</Item>
            <Item ok>Genel gider ayarları ve varsayılanlar</Item>
            <Item ok>Fiyat senaryoları, hesaplama geçmişi</Item>
            <Item ok>Tema ve kişiselleştirme tercihleri</Item>
            <Item>Oturum/erişim bilgisi, teknik günlükler (zaten tutulmuyor)</Item>
          </ul>
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="primary" size="md" icon={<Download className="size-4" aria-hidden="true" />} onClick={createBackup}>
              Yedek Oluştur (.krcp)
            </Button>
            <span className="flex items-center gap-1.5 text-xs text-subtle">
              <FileClock className="size-3.5" aria-hidden="true" />
              {data.settings.lastBackupAt ? <>Son yedek: {formatDateTime(data.settings.lastBackupAt)}</> : "Henüz yedek alınmadı."}
            </span>
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader
          title="Yedek Yükle"
          icon={<Upload className="size-4" />}
          description="Daha önce indirdiğiniz bir .krcp dosyasını seçin; önce içeriği doğrulanır, hiçbir veri onayınız olmadan değiştirilmez."
        />
        <div className="space-y-3 p-4 sm:p-5">
          <div className="flex flex-wrap items-center gap-3">
            <Button icon={<Upload className="size-4" aria-hidden="true" />} onClick={() => fileRef.current?.click()}>
              Yedek Yükle
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept=".krcp"
              className="sr-only"
              tabIndex={-1}
              aria-hidden="true"
              onChange={(e) => onFile(e.target.files?.[0])}
            />
            {selectedFileName && <Badge tone="info">{selectedFileName}</Badge>}
          </div>
          <p className="text-xs text-subtle">
            En fazla {Math.round(MAX_KRCP_BYTES / 1024 / 1024)} MB. Yalnızca KârCep’in kendi oluşturduğu `.krcp` dosyaları kabul edilir;
            format, sürüm ve tüm alanlar yüklemeden önce doğrulanır.
          </p>
        </div>
      </Card>

      <Notice tone="warning" icon={<AlertTriangle className="size-4" />} title="Otomatik yedekleme yoktur">
        KârCep, bilgisayarınızda bir klasöre sessizce sürekli yedek yazmaz. Yedeğinizi kendiniz indirir ve güvenli bulduğunuz bir
        konumda (bilgisayar, harici disk, kendi bulut deponuz) saklarsınız.
      </Notice>

      {preview && <RestoreDialog preview={preview} current={data} busy={busy} onApply={applyRestore} onClose={closePreview} />}
    </div>
  );
}

function Item({ ok, children }: { ok?: boolean; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-1.5">
      {ok ? (
        <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-success" aria-hidden="true" />
      ) : (
        <X className="mt-0.5 size-3.5 shrink-0 text-subtle" aria-hidden="true" />
      )}
      <span className={ok ? "text-fg" : "text-subtle line-through decoration-subtle/50"}>{children}</span>
    </li>
  );
}

function RestoreDialog({
  preview,
  current,
  busy,
  onApply,
  onClose,
}: {
  preview: RestorePreview;
  current: AppData;
  busy: boolean;
  onApply: (strategy: "replace" | "merge") => void;
  onClose: () => void;
}) {
  const titleId = useId();
  const { summary, fileName } = preview;
  const isPlaceholderDate = new Date(summary.createdAt).getTime() === 0;

  return (
    <Dialog.Root open onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="k-overlay fixed inset-0 z-50 bg-black/60" />
        <Dialog.Content
          aria-labelledby={titleId}
          className="k-dialog fixed top-1/2 left-1/2 z-50 w-[calc(100vw-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-md border border-line-strong bg-surface p-5 shadow-2xl focus:outline-none"
        >
          <div className="flex items-start justify-between gap-3">
            <Dialog.Title id={titleId} className="text-base font-semibold text-fg">
              Yedek geri yüklensin mi?
            </Dialog.Title>
            <Dialog.Close asChild>
              <button type="button" className="rounded p-1 text-subtle hover:text-fg" aria-label="Kapat">
                <X className="size-4" aria-hidden="true" />
              </button>
            </Dialog.Close>
          </div>
          <Dialog.Description className="mt-1 text-sm text-muted">
            <span className="block truncate font-medium text-fg">{fileName}</span>
            {!isPlaceholderDate && <>Oluşturulma tarihi: {formatDateTime(summary.createdAt)}</>}
          </Dialog.Description>

          <dl className="mt-4 grid grid-cols-2 gap-3 rounded-md border border-line bg-surface-2 p-3 text-sm sm:grid-cols-4">
            <Count label="Ürün" value={summary.counts.products} />
            <Count label="Geçmiş" value={summary.counts.history} />
            <Count label="Komisyon profili" value={summary.counts.commissionProfiles} />
            <Count label="Özel pazaryeri" value={summary.counts.customMarketplaces} />
          </dl>

          <div className="mt-4 space-y-2 text-sm">
            <p className="text-muted">Nasıl uygulansın?</p>
            <div className="rounded-md border border-line p-3">
              <p className="font-medium text-fg">Değiştir</p>
              <p className="text-xs text-muted">
                Mevcut tüm verilerinizin ({current.products.length} ürün, {current.history.length} geçmiş kaydı) yerini yedekteki
                veriler alır. Yedekte olmayan güncel kayıtlar kaybolur.
              </p>
            </div>
            <div className="rounded-md border border-line p-3">
              <p className="font-medium text-fg">Birleştir</p>
              <p className="text-xs text-muted">
                Ürünler, geçmiş ve komisyon profilleri kimliğe göre birleştirilir (çakışmada yedekteki kazanır); yalnızca mevcutta olan
                kayıtlar korunur. Ayarlarınız ve taslağınız değişmez.
              </p>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap justify-end gap-2">
            <Button disabled={busy} onClick={onClose}>
              Vazgeç
            </Button>
            <Button disabled={busy} onClick={() => onApply("merge")}>
              Birleştir
            </Button>
            <Button variant="danger" disabled={busy} onClick={() => onApply("replace")}>
              Değiştir (mevcut veriyi sil)
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function Count({ label, value }: { label: string; value: number }) {
  return (
    <div className="text-center">
      <div className="num text-lg font-semibold text-fg">{value}</div>
      <div className="text-xs text-muted">{label}</div>
    </div>
  );
}

/* ================= 4. Kullanım Koşulları ================= */

function TermsTab() {
  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
      <Card>
        <CardHeader title="Amaç ve kapsam" icon={<Scale className="size-4" />} />
        <div className="space-y-3 p-4 text-sm text-muted sm:p-5">
          <p>
            KârCep, e-ticaret satıcılarına satış kararlarında yardımcı olacak <strong className="text-fg">bilgilendirici tahminler</strong>{" "}
            sunar. Girdiğiniz değerlere dayanarak hesaplama yapar; girdiğiniz oranların, maliyetlerin veya KDV’nin doğruluğunu
            denetlemez.
          </p>
          <p>
            Hesaplama sonuçları; gelir/kurumlar vergisi, stopaj, iadeler, iptal edilen siparişler ve pazaryeri teşviklerini otomatik
            içermez (bkz. Uygulama Hakkında). Sonuçları gerçek satış kararlarında kullanmadan önce kendi gider ve komisyon
            oranlarınızı doğrulamanız gerekir.
          </p>
        </div>
      </Card>

      <Card>
        <CardHeader title="Sorumluluk sınırı" icon={<AlertTriangle className="size-4" />} />
        <div className="space-y-3 p-4 text-sm text-muted sm:p-5">
          <p>
            Uygulama <strong className="text-fg">“olduğu gibi”</strong> sunulur; kesintisiz veya hatasız çalışacağı garanti edilmez.
            KârCep, tek başına resmî muhasebe, vergi veya hukuki danışmanlığın yerine geçmez.
          </p>
          <p>Mevzuatın izin verdiği azami ölçüde, uygulamanın kullanımından doğabilecek ticari kararlar kullanıcının sorumluluğundadır.</p>
          <p className="text-xs text-subtle">
            Bu metin kullanıcının kanundan doğan haklarını (ör. tüketici hakları) geçersiz kılmaz; yalnızca uygulamanın sunduğu
            hesaplama hizmetinin kapsamını ve sınırlarını açıklar.
          </p>
        </div>
      </Card>

      <Card>
        <CardHeader title="Erişilebilirlik" icon={<Info className="size-4" />} />
        <p className="p-4 text-sm text-muted sm:p-5">
          Hizmetin kesintisiz erişilebilir olacağı garanti edilmez (ör. GitHub Pages veya tarayıcınızdaki bir sorun nedeniyle geçici
          erişim sorunları yaşanabilir). Verileriniz yerel olarak saklandığından, uygulamaya erişemediğiniz durumlarda bile
          `.krcp` yedeğinizdeki veriler sizde kalır.
        </p>
      </Card>

      <Card>
        <CardHeader title="Fikrî mülkiyet ve kullanım" icon={<Scale className="size-4" />} />
        <p className="p-4 text-sm text-muted sm:p-5">
          Uygulamanın adı, tasarımı ve kodu projeye aittir. Uygulamayı kişisel veya ticari e-ticaret faaliyetlerinizde serbestçe
          kullanabilirsiniz; uygulamayı veya kodunu taklit ederek üçüncü kişileri yanıltacak biçimde yeniden dağıtmayınız.
        </p>
      </Card>
    </div>
  );
}

/* ================= 5. Sürüm ve İletişim ================= */

function VersionTab() {
  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
      <Card>
        <CardHeader title="Sürüm bilgisi" icon={<GitBranch className="size-4" />} />
        <dl className="grid grid-cols-2 gap-3 p-4 text-sm sm:p-5">
          <dt className="text-muted">Sürüm</dt>
          <dd className="text-right font-medium text-fg">{APP_VERSION}</dd>
          <dt className="text-muted">Son güncelleme</dt>
          <dd className="text-right font-medium text-fg">{RELEASE_DATE}</dd>
          <dt className="text-muted">Yedek dosya biçimi</dt>
          <dd className="text-right font-medium text-fg">.krcp</dd>
        </dl>
      </Card>

      <Card>
        <CardHeader title="İletişim ve kaynak kod" icon={<Mail className="size-4" />} />
        <div className="space-y-3 p-4 text-sm text-muted sm:p-5">
          <p>
            KârCep açık kaynaklı bir projedir; hata bildirimi, öneri veya soru için proje deposunu kullanabilirsiniz. Gerçek bir
            şirket, adres veya telefon numarası bulunmadığından burada uydurma iletişim bilgisi verilmemiştir.
          </p>
          <div className="flex flex-col gap-1.5 text-sm">
            <a href={REPO_URL} target="_blank" rel="noopener noreferrer nofollow" className="text-accent underline underline-offset-2">
              Kaynak kod ve hata bildirimi (GitHub)
            </a>
            <a href={LIVE_URL} target="_blank" rel="noopener noreferrer nofollow" className="text-accent underline underline-offset-2">
              Canlı uygulama
            </a>
          </div>
        </div>
      </Card>
    </div>
  );
}
