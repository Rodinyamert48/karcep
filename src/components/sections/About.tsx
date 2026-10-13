"use client";

import { Calculator, Database, Lock, Scale, ShieldCheck, TriangleAlert } from "lucide-react";
import { Card, CardHeader, PageHeader } from "../ui/primitives";

export function AboutSection() {
  return (
    <>
      <PageHeader
        title="Hakkında ve Gizlilik"
        description="KârCep, Türkiye'deki e-ticaret satıcıları için ücretsiz, tarayıcıda çalışan bir kârlılık hesaplayıcısıdır."
      />
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader title="Gizlilik ve veri saklama" icon={<Lock className="size-4" />} />
          <div className="space-y-3 p-4 text-sm text-muted sm:p-5">
            <p>
              <strong className="text-fg">Hesap, giriş veya sunucu yoktur.</strong> Girdiğiniz ürünler, maliyetler, komisyon profilleri ve
              hesaplama geçmişi yalnızca bu tarayıcının yerel deposunda (<code>localStorage</code>) saklanır.
            </p>
            <p>
              Uygulama hiçbir veriyi sunucuya göndermez; analitik, izleme veya reklam kodu içermez. Dışa aktarılan CSV ve JSON dosyaları
              doğrudan cihazınıza indirilir.
            </p>
            <p>
              Tarayıcı verilerini temizlerseniz, gizli pencere kapatırsanız veya farklı cihaz/tarayıcı kullanırsanız kayıtlarınıza
              erişemezsiniz. <strong className="text-fg">Ayarlar → Veri yönetimi</strong> bölümünden düzenli yedek alın; aynı bölümden
              tüm verilerinizi silebilirsiniz.
            </p>
          </div>
        </Card>

        <Card>
          <CardHeader title="Komisyon oranları" icon={<ShieldCheck className="size-4" />} />
          <div className="space-y-3 p-4 text-sm text-muted sm:p-5">
            <p>
              KârCep pazaryerlerinin (Trendyol, Hepsiburada vb.) güncel komisyon oranlarını <strong className="text-fg">otomatik çekmez</strong>,
              satıcı panellerini taramaz ve tahmini oran içermez. Oranları kendi satıcı panelinizden veya sözleşmenizden kontrol ederek girersiniz.
            </p>
            <p>
              Her komisyon profili için kaynak ve son doğrulama tarihi tutulur. Kaynağı belirtilmeyen oranlar “Kullanıcı girişi”, 90 günden
              eski doğrulamalar “güncelliği kontrol edin” olarak işaretlenir.
            </p>
          </div>
        </Card>

        <Card>
          <CardHeader title="Hesaplama yöntemi" icon={<Calculator className="size-4" />} />
          <div className="space-y-3 p-4 text-sm text-muted sm:p-5">
            <p>
              <strong className="text-fg">Hızlı mod:</strong> Komisyon = Komisyona esas tutar × oran; Toplam gider = maliyet + komisyon + kargo +
              paketleme + reklam + diğer + ücretler + sabit pay; Tahmini kâr = Satış fiyatı − Toplam gider. KDV ayrıştırılmaz.
            </p>
            <p>
              <strong className="text-fg">KDV ayrıştırmalı mod:</strong> KDV hariç tutar = KDV dâhil tutar / (1 + oran). Kâr, KDV hariç satış
              gelirinden giderlerin KDV hariç tutarları çıkarılarak bulunur; indirilebilir KDV ikinci kez gider yazılmaz. İndirilebilir KDV
              kapatılırsa alış ve hizmet KDV’leri gidere eklenir.
            </p>
            <p>
              Başa baş ve hedef fiyatları, satış fiyatına bağlı kesintiler (komisyon, ücretler) ile sabit giderler ayrı ele alınarak kuruş
              hassasiyetinde bulunur. Tüm tutarlar tamsayı kuruş olarak işlenir; kayan nokta yuvarlama hatası oluşmaz.
            </p>
          </div>
        </Card>

        <Card>
          <CardHeader title="Sınırlar ve sorumluluk" icon={<Scale className="size-4" />} />
          <div className="space-y-3 p-4 text-sm text-muted sm:p-5">
            <p className="flex gap-2">
              <TriangleAlert className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden="true" />
              Sonuçlar bilgilendirme amaçlı tahminlerdir; muhasebe, vergi veya hukuki danışmanlık değildir.
            </p>
            <ul className="list-disc space-y-1 pl-5">
              <li>Gelir vergisi, kurumlar vergisi ve stopaj hesaplanmaz.</li>
              <li>İadeler, iptal edilen siparişler, pazaryeri teşvikleri/kampanyaları otomatik varsayılmaz.</li>
              <li>Fiyata göre değişen kargo baremleri desteklenmez; kargo tek tutar olarak girilir.</li>
              <li>İndirilebilir KDV varsayımı her işletme için aynı değildir; KDV sonucu işletmenin tüm vergi yükümlülüğünü göstermez.</li>
              <li>Gerekirse bu kalemleri “Diğer giderler” veya “Sabit gider payı” alanlarına kendiniz ekleyin.</li>
            </ul>
          </div>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader title="Açık kaynak ve ücretsiz" icon={<Database className="size-4" />} />
          <p className="p-4 text-sm text-muted sm:p-5">
            KârCep statik bir web uygulamasıdır ve ücretsiz statik barındırma (ör. GitHub Pages) üzerinde çalışır. Hesaplama motoru arayüzden
            bağımsızdır; ileride aynı motor bir tarayıcı eklentisinde de kullanılabilir.
          </p>
        </Card>
      </div>
    </>
  );
}
