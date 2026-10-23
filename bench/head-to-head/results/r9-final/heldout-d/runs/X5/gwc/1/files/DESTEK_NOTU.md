# İade Kuralları – Destek Ekibi Notu

Kaynak: `src/refund.js` (son commit'teki kod).

## Karar sırası

Sistem her iade talebini aşağıdaki sırayla kontrol eder; ilk uyan kural geçerlidir.

1. **Sipariş tarihi 1 Kasım 2026'dan önceyse** → **Manuel işlem.** Otomatik onay ve standart inceleme akışı uygulanmaz.
2. **Ürün tek seferlik satın alma değilse (ör. abonelik)** → **İnceleme.** Otomatik onay yoktur, tutar ne olursa olsun.
3. **Tek seferlik satın alma ise**, aşağıdaki **üç koşulun hepsi** sağlanırsa → **Otomatik onay:**
   - İade tutarı **50'ye kadar** (50 dahil; 50,01 ve üstü uymaz)
   - Hesap yaşı **en az 30 gün** (30. gün dahil)
   - Son 90 günde yapılmış iade sayısı **en fazla 2** (3 veya daha fazlaysa uymaz)
4. **Üç koşuldan biri bile sağlanmazsa** → **İnceleme.**

## İnceleme süresi

İnceleme durumundaki taleplerde süre **5 iş günüdür.**

## Dikkat

- **Bugünün tarihi itibarıyla (23 Ekim 2026) 1 Kasım 2026 öncesi siparişlerin hepsi "manuel" çıkar.** Otomatik onay ve 5 iş günü inceleme süresi yalnızca 1 Kasım 2026 ve sonrasındaki siparişler için geçerlidir.
- Abonelikler otomatik onaya **girmez**; her zaman incelemeye gider.
- Kodda para birimi belirtilmiyor. Tutar limiti "50" olarak tanımlı; müşteriye para birimi söylemeden önce teyit edin.
- "Manuel" durumunun ekipte tam olarak nasıl işleneceği ve süresi kodda tanımlı değil.

## Müşteriye söylenebilecek özet

- Tek seferlik alımlarda, 50'ye kadar iadeler; hesabınız en az 30 günlükse ve son 90 günde en fazla 2 iade yaptıysanız otomatik onaylanır.
- Diğer tüm talepler (50'nin üstü, yeni hesap, 3 veya daha fazla yakın tarihli iade, abonelikler) incelemeye alınır ve inceleme 5 iş günü sürer.
- 1 Kasım 2026'dan önceki siparişler bu kurallara tabi değildir, manuel değerlendirilir.
