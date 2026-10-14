# KârCep — E-ticaret Kârlılık Hesaplayıcı

KârCep, Türkiye'deki e-ticaret satıcılarının ürün maliyeti, pazaryeri komisyonu, kargo, KDV ve diğer giderlerini hesaba katarak
**tahmini kâr**, **kâr marjı**, **başa baş satış fiyatı** ve **hedef kâr fiyatını** hesaplayan ücretsiz bir web uygulamasıdır.

- Sunucu, hesap, veritabanı ya da ücretli API gerektirmez; statik barındırmada çalışır.
- Tüm veriler yalnızca kullanıcının tarayıcısında (`localStorage`) saklanır. Analitik/izleme kodu yoktur.
- Pazaryerlerinin komisyon oranları **otomatik çekilmez ve uygulamada hazır oran yoktur**; oranlar kullanıcı tarafından girilir.

## Özellikler

| Bölüm | İçerik |
| --- | --- |
| Genel Bakış | Son hesaplama, kâr/marj/başa baş, son hesaplamalar, ürün özeti (hangi kayıtların dâhil edildiği belirtilir) |
| Kâr Hesaplayıcı | Hızlı ve KDV ayrıştırmalı mod, anlık sonuç, ayrıntılı döküm, başa baş ve hedef (kâr/marj) fiyatı |
| Ürünlerim | Ekle, düzenle, sil (onaylı), üründen yeni hesaplama, ada göre arama, kâr/fiyat sıralama |
| Fiyat Senaryoları | Aynı varsayımlarla 8'e kadar satış fiyatını karşılaştırma; başa başa uzaklık ve güvenlik payı |
| Komisyon ve Gider Ayarları | Pazaryeri/kategori komisyon profilleri (kaynak + doğrulama tarihi), pazaryeri varsayılanları, varsayılan giderler, tema |
| Hesaplama Geçmişi | Görüntüleme, yeniden açma, silme, tümünü temizleme, CSV dışa aktarma (UTF-8 BOM, `;` ayraç) |
| Hakkında ve Gizlilik | 5 sekme: Uygulama Hakkında, Gizlilik ve Veri Saklama, **Yedekleme ve Geri Yükleme (.krcp)**, Kullanım Koşulları, Sürüm ve İletişim |

## Teknolojiler

Next.js 16 (App Router, statik dışa aktarım `output: "export"`), React 19, TypeScript, Tailwind CSS 4, Lucide React,
[Radix UI](https://www.radix-ui.com/) (Dialog, AlertDialog, Switch, Tabs — erişilebilir, stilsiz temel bileşenler;
`class-variance-authority` + `clsx` + `tailwind-merge` ile shadcn/ui tarzında Tailwind üzerine giydirilmiştir),
Vitest + React Testing Library. Grafik kütüphanesi kullanılmadı (senaryo çubukları saf CSS; ağır bir kütüphane gerekmedi).

## Kurulum ve komutlar

Node.js 20+ (CI'da 22) gerekir.

```bash
npm install        # bağımlılıkları kur
npm run dev        # geliştirme sunucusu: http://localhost:3000
npm run test       # birim ve arayüz testleri (Vitest)
npm run lint       # ESLint
npm run typecheck  # TypeScript denetimi
npm run build      # üretim çıktısı → out/
npm run preview    # out/ klasörünü http://localhost:4173 adresinde sunar
```

> Not: Next.js statik dışa aktarımında üretim çıktısı Vite'taki `dist/` yerine **`out/`** klasörüne yazılır.

## Proje yapısı

```
src/
  engine/      Hesaplama motoru — React/Next/tarayıcıdan bağımsız saf TypeScript (+ testleri)
  storage/     Yerel veri katmanı: şema sürümü, migrasyon, .krcp yedekleme, atomik yazma, CSV (+ testleri)
  state/       React veri bağlamı (DataProvider) ve hash tabanlı bölüm yönlendirmesi
  lib/         Biçimlendirme (tr-TR, TRY), tema çözümleme, tarayıcı yardımcıları, cn() birleştirici
  components/  Arayüz: kabuk, bölümler, shadcn/ui tarzı ortak bileşenler (ui/)
  app/         Next.js giriş noktası (layout, sayfa, global stiller, sitemap)
```

### Hesaplama motoru

- Tutarlar **tamsayı kuruş**, oranlar **milyonda bir** birimiyle tutulur; çarpma/bölme BigInt ile yapılır ve yalnızca kuruşa
  yuvarlanır (yarımı sıfırdan uzağa). `0,10 + 0,20 = 0,30` gibi kayan nokta hataları oluşmaz.
- **Hızlı mod:** `Komisyon = Taban × Oran`, `Toplam gider = maliyet + komisyon + kargo + paketleme + reklam + diğer + ücretler + sabit pay`,
  `Kâr = Satış fiyatı − Toplam gider`, `Marj = Kâr / Satış × 100`. KDV ayrıştırılmaz.
- **KDV ayrıştırmalı mod:** `Hariç = Dâhil / (1 + oran)`, `KDV = Dâhil − Hariç`, `Dâhil = Hariç × (1 + oran)`. Satış, alış, komisyon,
  kargo ve diğer hizmetler için KDV oranı ve dâhil/hariç durumu ayrı seçilir. İndirilebilir KDV ikinci kez gider yazılmaz;
  kapatılırsa alış/hizmet KDV'si gidere eklenir. Ödenecek/devreden KDV ayrıca gösterilir.
- **Başa baş ve hedef fiyat:** Kâr, satış fiyatının doğrusal fonksiyonudur; satışa bağlı kesintiler (komisyon, ücretler) ve sabit
  giderler ayrı ele alınır, çözüm ikili arama ile kuruş hassasiyetinde bulunur. Kesintiler satışın tamamını tüketiyorsa
  “ulaşılamaz” olarak bildirilir (sıfıra bölme yok).
- **Kâr marjı ≠ maliyet üzerine kâr oranı:** Kâr marjı = Kâr / Satış geliri × 100; maliyet üzerine kâr oranı (markup) =
  Kâr / Alış maliyeti × 100. İki ayrı metrik olarak hesaplanır ve gösterilir; biri 0 paydaya düşerse (satış 0 veya maliyet 0)
  o metrik `null` döner, diğeri etkilenmez.
- Geçersiz/boş/negatif/NaN/Infinity değerler doğrulamada yakalanır; motor geçersiz girdide `RangeError` fırlatır.

Motor `src/engine/index.ts` üzerinden dışa aktarılır ve ileride bir Chrome Manifest V3 eklentisinin popup'ında aynen
kullanılabilir (yalnızca manuel girdi, ek izin gerektirmez).

## Veri saklama

- Anahtarlar `karcep:` önekiyle `localStorage`'a yazılır (`products`, `history`, `commissionProfiles`, `marketplaces`, `settings`, `draft`, `scenarios`, `meta`).
- Şema sürümü (`karcep:meta`) tutulur; sürüm yükseltmeleri için migrasyon kancası `src/storage/storage.ts` içindedir.
- Bozuk JSON uygulamanın açılmasını engellemez: ham veri `…:bozuk-yedek` anahtarına kopyalanır, kullanıcıya uyarı gösterilir.
- `localStorage` kullanılamıyorsa (gizli mod vb.) uygulama bellek içinde çalışır ve bunu açıkça bildirir.
- Tarayıcı verilerinin temizlenmesi kayıtları siler; düzenli yedek alınmalıdır.

### `.krcp` yedekleme (Hakkında ve Gizlilik → Yedekleme ve Geri Yükleme)

- **Yedek Oluştur**, tüm ürünleri, komisyon/pazaryeri profillerini, genel ayarları, fiyat senaryolarını, hesaplama geçmişini ve
  tema tercihini sürümlenmiş, UTF-8 JSON içeren bir `KarCep-Yedek-YYYY-MM-DD-SSMM.krcp` dosyası olarak indirir (`src/storage/krcp.ts`).
  Oturum/erişim bilgisi, token veya teknik günlük tutulmadığı için yedeklenmez.
- **Yedek Yükle**, seçilen dosyayı önce tamamen doğrular (JSON geçerliliği, `format`/`app` imzası, sürüm uyumu, alan tipleri);
  geçersiz bir dosya **hiçbir mevcut veriyi değiştirmez**. Geçerli bir dosyada kayıt sayılarını ve oluşturulma tarihini gösteren
  bir onay penceresi açılır; kullanıcı **Değiştir** (tam değiştirme) veya **Birleştir** (ürün/geçmiş/komisyon profillerini
  kimliğe göre birleştirme, ayarları korur) arasında seçim yapar.
- Yazma, `commitAppData` ile mümkün olduğunca atomik uygulanır: önce tüm koleksiyonlar serileştirilir, sonra yazılır; yazma
  sırasında bir hata oluşursa (ör. depolama kotası) o ana kadar değişen anahtarlar önceki değerlerine geri alınır ve kullanıcıya
  mevcut verinin korunduğu açıkça bildirilir.
- `.krcp`, standart bir arşiv biçimi değildir; yalnızca KârCep'in kendi okuyup yazdığı, sürümlenmiş bir JSON dosyasıdır.
  Dosyanın uzantısını değiştirmek onu geçerli yapmaz — içerik her zaman tam olarak doğrulanır.
- Otomatik/arka plan yedekleme yoktur: dosya kullanıcının seçtiği konuma indirilir, KârCep hiçbir yedeği kendi başına saklamaz.

## Yayınlama (GitHub Pages)

`.github/workflows/deploy.yml`, `main` dalına her gönderimde lint, tip denetimi, testler ve build'i çalıştırır, `out/` klasörünü
GitHub Pages'e yükler. Alt dizin yolu (`/<depo-adı>`) `NEXT_PUBLIC_BASE_PATH` ile otomatik ayarlanır.

1. Depoyu GitHub'a gönderin ve varsayılan dalın `main` olduğundan emin olun.
2. GitHub'da **Settings → Pages → Build and deployment → Source: GitHub Actions** seçin.
3. `main` dalına gönderin veya **Actions → GitHub Pages'e yayınla → Run workflow** ile elle çalıştırın.
4. Uygulama `https://<kullanıcı-adı>.github.io/<depo-adı>/` adresinde yayınlanır.

Hiçbir token veya API anahtarı gerekmez; iş akışı GitHub'ın yerleşik `GITHUB_TOKEN`/OIDC izinlerini kullanır.

Başka bir statik barındırma (Netlify, Cloudflare Pages vb.) için: build komutu `npm run build`, yayın klasörü `out`.
Kök alan adında yayınlıyorsanız `NEXT_PUBLIC_BASE_PATH` tanımlamayın; alt dizinde yayınlıyorsanız `/alt-dizin` verin.
Yerelde alt dizin yolu ile üretilen bir build'i `npm run preview` ile önizlemek için `NEXT_PUBLIC_BASE_PATH` olmadan build alın.

> Bu depoda yayın dosyaları hazırdır; canlı yayın, depo sahibi Pages ayarını etkinleştirip iş akışını çalıştırdığında gerçekleşir.

> **Bilinen GitHub ayarı notu:** Pages ilk kez "GitHub Actions" kaynağıyla etkinleştirildiğinde, oluşturulan `github-pages`
> ortamının dal koruma kuralı yalnızca deponun **gerçek varsayılan dalını** deploy'a izin verebilir. Deploy `main`'den
> reddedilirse: **Settings → Environments → github-pages → Deployment branches and tags** altından `main`'i izinli dallara
> ekleyin ya da **Settings → General → Default branch**'i `main` yapın.

## Bilinen sınırlamalar

- Pazaryeri komisyon oranları otomatik güncellenmez; resmî ve kullanım koşulları uygun bir kaynak doğrulanmadıkça eklenmeyecektir.
- Gelir/kurumlar vergisi, stopaj, iade ve iptaller, pazaryeri teşvikleri/kampanyaları ve satıcıya özel yükümlülükler hesaplanmaz;
  gerekirse “Diğer giderler” veya “Sabit gider payı” alanlarına elle eklenir.
- Fiyata göre değişen kargo baremleri ve kademeli komisyonlar desteklenmez (kargo tek tutar, komisyon tek oran).
- “Satışa bağlı ücret oranı” KDV dâhil satış tutarı üzerinden uygulanır.
- İndirilebilir KDV varsayımı her işletme için geçerli değildir; KDV sonuçları muhasebe/vergi danışmanlığı yerine geçmez.
- Hızlı modda satış fiyatındaki KDV ayrıştırılmadığı için kâr olduğundan yüksek görünebilir.
- Veriler cihazlar arasında otomatik senkronize edilmez; yalnızca `.krcp` yedeği indirip başka bir cihaza yükleyerek taşınabilir.
  Geçmiş en fazla 500 kayıt tutar.
- Ürün listesindeki kâr değerleri, ürünün kayıtlı değerleriyle her açılışta yeniden hesaplanır.
- `.krcp` yedeğinde “Birleştir” stratejisi yalnızca liste tabanlı kayıtları (ürün, geçmiş, komisyon profili, özel pazaryeri)
  kimliğe göre birleştirir; genel ayarlar ve hesaplayıcı taslağı birleştirmede değişmez (bunlar “tekil tercih”tir, alan bazında
  güvenilir bir birleştirme tanımı yoktur). Tam değiştirme bu sınırı taşımaz.
- İsteğe bağlı parola korumalı (şifreli) yedekleme ilk sürümde yoktur; veri modeli ileride eklenebilecek şekilde tasarlanmıştır
  ancak şu an hiçbir şifreleme uygulanmaz — arayüzde de böyle bir özellik iddia edilmez.

## Lisans ve sorumluluk

Sonuçlar bilgilendirme amaçlı tahminlerdir; kesin muhasebe veya vergi sonucu değildir.
