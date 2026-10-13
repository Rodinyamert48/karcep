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

## Sonraki adımlar (isteğe bağlı)
- [ ] Chrome MV3 eklentisi: `src/engine`'i kullanan bağımsız popup (yalnızca manuel girdi, ek izin yok)
- [ ] Kargo baremleri / kademeli komisyon desteği
- [ ] İade/iptal oranı gibi beklenen-değer giderleri
- [ ] Geçmiş büyüdükçe IndexedDB'ye geçiş (KeyValueStore arayüzü hazır)
