Notu `DESTEK_NOTU.md` olarak kaydettim. Commit mesajı ile kod birbirini tutmuyor, bu yüzden notu mesaja göre değil kodun (`src/refund.js`) yaptığına göre yazdım.

| | Commit mesajı | Kod |
|---|---|---|
| Otomatik onay sınırı | 100 EUR | 50 EUR |
| Abonelikler | Dahil | Dahil değil, incelemeye gider |
| Testler | Eklendi | Eklenmemiş |

Hakan'a sormadan ekibe "100 EUR" demelerini önermem. Not bu uyarıyı en üstte veriyor.

Kodun uyguladığı kurallar şöyle:
- **1 Kasım 2026'dan önceki siparişler:** Elle işlem olur. Bugün 23 Ekim olduğu için şu an bütün siparişler bu gruptadır.
- **Tek seferlik olmayan siparişler (abonelik gibi):** İade incelemeye gider ve inceleme 5 iş günü sürer.
- **Tek seferlik siparişler:** Üç koşulun üçü de sağlanırsa iade otomatik onaylanır. Tutar 50 EUR veya altı olmalı (50 dahil). Hesap en az 30 günlük olmalı. Son 90 günde en fazla 2 iade olmalı, yani 3. iade otomatik onaylanmaz.
- **Bu koşullardan biri sağlanmazsa:** İade yine incelemeye gider ve 5 iş günü sürer.

Elle işlem için kodda bir süre yok. Notta ekibin buna süre sözü vermemesini yazdım.

Hiçbir şey çalıştırmadım. Yalnızca git geçmişini ve kodu okudum.