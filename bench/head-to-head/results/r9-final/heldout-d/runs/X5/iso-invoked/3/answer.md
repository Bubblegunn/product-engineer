`DESTEK_NOTU.md` hazır. Ekibe vermeden önce Hakan'la netleştirmeniz gereken bir çelişki var: commit mesajı ile kod birbirini tutmuyor. Notu kodun yaptığına göre yazdım.

| Konu | Commit mesajı | Kod (`src/refund.js`) |
|---|---|---|
| Otomatik onay limiti | 100 EUR'ya kadar | 50 (`AUTO_LIMIT = 50.0`) |
| Abonelikler | Dahil | Hiçbir zaman otomatik onaylanmaz, hepsi incelemeye gider |
| Testler | Eklendi | Commit yalnızca `src/refund.js` dosyasını değiştirmiş, test yok |

Müşteriye yanlış rakam söylenmesin diye, not 50 euro ve "abonelikler incelenir" üzerinden yazıldı. Hakan 100 EUR ve abonelik dahil diyorsa kod yanlıştır. O zaman notu da güncellemek gerekir.

Notta kodla doğrulanan kurallar şunlar:
- **Sipariş tarihi:** 1 Kasım 2026'dan önceki siparişlere yeni kurallar uygulanmaz. Bunlar elle işlenir.
- **Sipariş türü:** Tek seferlik olmayan siparişler her zaman incelemeye gider.
- **Hemen onay:** Tek seferlik siparişte üç koşulun hepsi gerekir.
  - Tutar en çok 50 euro olmalı (tam 50 dahil).
  - Hesap en az 30 günlük olmalı.
  - Son 90 günde en çok 2 iade olmalı.
- **İnceleme süresi:** Hemen onaylanmayan talepler 5 iş günü içinde yanıtlanır.

Kodda şu noktalar belli değil, bu yüzden notta bunlar için söz vermedim:
- **Para birimi:** Kodda yok, "euro" bilgisini commit mesajından aldım.
- **Son iade sayımı:** Mevcut talebin son 90 gündeki iade sayısına dahil olup olmadığı belli değil.
- **Elle işlenen siparişler:** Bunlar için kodda süre bilgisi yok. Notta "süre yok" yazdım.
- **Yayın durumu:** Kuralın canlıya alındığı da belli değil.