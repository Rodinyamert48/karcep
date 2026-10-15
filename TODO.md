# KârCep — TODO

## v0.3.0 — Arayüz baştan (tamamlandı)
Plan (kendi kendime onaylandı) ve sonuç:
- Eski `src/components/` tamamen silinir; motor, depolama, durum (state) ve testler korunur.
- Koyu tema tek tema: sıcak koyu zemin (#121110 ailesi), kırık beyaz metin, tek yeşil vurgu.
- Yazı tipi: Geologica (yerel, @fontsource). Önce Schibsted Grotesk denendi; tabular rakamlarında tırnaklı "1",
  aralıklı virgül ve £'ye benzeyen ₺ çizimi görüldüğü için değiştirildi.
- Yerleşim: masaüstünde üst çubukta yatay gezinme; mobilde altta başparmakla
  erişilen sekme çubuğu (4 ana bölüm + "Diğer" sayfası). Kenar çubuğu yok.
- Hesaplayıcı: tek akışlı form (kart yığını yok) + yapışkan sonuç paneli; sonuçta
  "satış fiyatının nereye gittiği" yatay yığılmış çubuğu (gerçek veriden).
- Genel Bakış: büyük tipografik son-hesap satırı + son hesaplar listesi + ürün marj listesi.
- Kart ızgaraları, ikon rozetleri, gradyan, gölge, emoji, dolgu metin yok.
- Testleri yeni arayüze göre güncelle; tarayıcıda uçtan uca doğrula; deploy.

## Sonraki adımlar (isteğe bağlı)
- [ ] Chrome MV3 eklentisi: `src/engine`'i kullanan bağımsız popup
- [ ] Kargo baremleri / kademeli komisyon desteği
- [ ] İade/iptal oranı gibi beklenen-değer giderleri
- [ ] Geçmiş büyüdükçe IndexedDB'ye geçiş (KeyValueStore arayüzü hazır)
- [ ] `.krcp` için isteğe bağlı parola korumalı (Web Crypto) şifreleme
