# KârCep — TODO

## MVP (tamamlandı)
- [x] Proje klasörünü incele (boş depo)
- [x] Next.js (statik export) + TypeScript + Tailwind CSS + Vitest kurulumu
- [x] Hesaplama motoru (`src/engine`) — kuruş/BigInt tabanlı, React'ten bağımsız
- [x] Motor testleri (sıfır/%100 komisyon, negatif kâr, sıfır fiyat, KDV, yuvarlama, başa baş, hedef fiyat, geçersiz giriş)
- [x] Yerel depolama katmanı — şema sürümü, migrasyon kancası, bozuk JSON koruması, JSON dışa/içe aktarma
- [x] Arayüz: kenar çubuğu + mobil menü, 7 bölüm, hash yönlendirme
- [x] Kâr hesaplayıcı (hızlı + KDV ayrıştırmalı mod, döküm, bilgi balonları, hedef kâr/marj)
- [x] Ürünlerim (ekle/düzenle/sil/ara/sırala, üründen hesaplama)
- [x] Fiyat senaryoları
- [x] Komisyon & gider ayarları (kaynak + doğrulama tarihi, 90 gün eskime uyarısı)
- [x] Hesaplama geçmişi + CSV (UTF-8 BOM, `;` ayraç, formül enjeksiyonu koruması)
- [x] Mobil (360 px, yatay taşma yok) ve erişilebilirlik (etiketler, odak, klavye, metinle durum)
- [x] lint + typecheck + test + build; Chromium'da uçtan uca kontrol
- [x] README, GitHub Pages iş akışı, bilinen sınırlamalar

## v0.2.0 — Tasarım sistemi, .krcp yedekleme, doğrulama (tamamlandı)
- [x] shadcn/ui tarzı tasarım sistemi: Radix UI (Dialog/AlertDialog/Switch/Tabs) + class-variance-authority + clsx/tailwind-merge
- [x] Lacivert/yeşil marka paleti (WCAG AA kontrast doğrulandı), "Sistem" tema seçeneği + canlı OS tema izleme
- [x] `.krcp` yedekleme/geri yükleme: doğrulama, önizleme, Değiştir/Birleştir stratejileri, atomik yazma + geri alma
- [x] Hakkında ve Gizlilik: 5 sekmeli yapı (Hakkında, Gizlilik, Yedekleme, Kullanım Koşulları, Sürüm ve İletişim)
- [x] Hesaplama motoruna "maliyet üzerine kâr oranı" (markup) eklendi, kâr marjından ayrıştırıldı
- [x] SEO: robots.txt, sitemap.xml, Open Graph/Twitter meta, canonical
- [x] 94 otomatik test (motor 64, depolama+krcp 28, arayüz 2); lint + typecheck + build temiz

## Sonraki adımlar (isteğe bağlı)
- [ ] Chrome MV3 eklentisi: `src/engine`'i kullanan bağımsız popup (yalnızca manuel girdi, ek izin yok)
- [ ] Kargo baremleri / kademeli komisyon desteği
- [ ] İade/iptal oranı gibi beklenen-değer giderleri
- [ ] Geçmiş büyüdükçe IndexedDB'ye geçiş (KeyValueStore arayüzü hazır)
- [ ] `.krcp` için isteğe bağlı parola korumalı (Web Crypto) şifreleme
- [ ] Gerçek bir veri sorumlusu/iletişim bilgisi netleşirse KVKK aydınlatma metninin güncellenmesi
