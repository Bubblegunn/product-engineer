# Destek Notu: İade Kuralları

Kaynak: `src/refund.js` (son commit, 20 Ekim 2026, Hakan). Kurallar kodun gerçekte yaptığına göre yazıldı.

## Uyarı: Commit mesajı ile kod uyuşmuyor

Commit mesajında "100 EUR'ya kadar otomatik onay, abonelikler dahil, testler eklendi" yazıyor. Kod bunu yapmıyor:

- Otomatik onay sınırı **100 EUR değil, 50 EUR**.
- **Abonelikler otomatik onaya dahil değil.** Abonelik iadeleri incelemeye gidiyor.
- Bu commit'te **test eklenmemiş**. Testlerde yalnızca eski bir biçimlendirme testi var. Kurallar test edilmedi.

Müşteriye "100 EUR" ya da "abonelikler dahil" demeyin. Hakan'dan doğrulama gelene kadar aşağıdaki kurallar geçerlidir.

## Kurallar

Sıra önemli. Üstteki kural önce uygulanır.

1. **Sipariş tarihi 1 Kasım 2026'dan önceyse:** İade otomatik değerlendirilmez, durum **"manual"** (elle işlem) olur. Bu tarihten önceki siparişler için yeni kurallar geçerli değildir. Bu not yazılırken (23 Ekim 2026) bütün mevcut siparişler bu gruptadır.
2. **Sipariş tek seferlik değilse (ör. abonelik):** İade her zaman **incelemeye** gider. İnceleme süresi **5 iş günü**.
3. **Sipariş tek seferlikse**, iade ancak şu **dört koşulun hepsi** sağlanırsa **otomatik onaylanır**:
   - Tutar **50 EUR veya altı** (50 EUR dahil).
   - Hesap yaşı **en az 30 gün** (30. gün dahil).
   - Son 90 günde yapılmış iade sayısı **en fazla 2** (2 dahil, yani 3. iade otomatik onaylanmaz).
4. **Tek seferlik siparişte koşullardan biri bile sağlanmazsa:** İade **incelemeye** gider. İnceleme süresi **5 iş günü**.

## Kısa özet

| Durum | Sonuç |
|---|---|
| Sipariş 1 Kasım 2026'dan önce | Elle işlem (manual) |
| Abonelik / tek seferlik olmayan | İnceleme, 5 iş günü |
| Tek seferlik, ≤ 50 EUR, hesap ≥ 30 gün, son 90 günde ≤ 2 iade | Otomatik onay |
| Tek seferlik, yukarıdakilerden biri sağlanmıyor | İnceleme, 5 iş günü |

## Kodda belirtilmeyenler

- "Elle işlem" için bir süre verilmemiş. Müşteriye süre sözü vermeyin.
- Sipariş tarihinin 1 Kasım 2026'ya eşit olması durumu yeni kurallara girer (yalnızca daha eski tarihler "manual" olur).
