`DESTEK_NOTU.md` hazır, ama ekibe vermeden önce Hakan'a bir şey sormalısınız. Not kodu esas alıyor, commit mesajı ise kodla çelişiyor.

| | Commit mesajı | Kod (`src/refund.js`) |
|---|---|---|
| Otomatik onay sınırı | 100 EUR | 50 EUR |
| Abonelikler | Otomatik onaya dahil | Otomatik onaya girmez, 5 iş günü içinde incelenir |
| Testler | "Eklendi" | Commit'te test dosyası yok |

Not, kodun yaptığını anlatıyor ve en üstte bu çelişkiyi uyarı olarak gösteriyor. Hakan kodun yanlış olduğunu söylerse notu düzeltmek kolay.

Notta şunlar var:
- **Sıra:** 1 Kasım 2026'dan önceki siparişler elle işlenir. Sonra abonelikler (tek seferlik olmayanlar) incelemeye gider. Kalanlarda otomatik onay için üç şartın hepsi gerekir.
- **Şartlar:** Tutar en fazla 50 EUR (tam 50 dahil). Hesap en az 30 günlük. Son 90 günde en fazla 2 iade.
- **Sonuç:** Bir şart bile sağlanmazsa talep incelenir ve sonuç en çok 5 iş günü içinde çıkar.

Kodda olmayan, notta açıkça "belirsiz" diye işaretlediğim üç nokta var:
- **Para birimi:** Kod para birimine bakmıyor. "EUR" bilgisi yalnızca commit mesajından geliyor.
- **Üçüncü iade:** Kod, mevcut talebin "son 90 günde iade sayısına" dahil olup olmadığını söylemiyor.
- **Eski siparişler:** Elle işlenen siparişler için kodda süre ya da kural yok.

Not bugün (23 Ekim) için de önemli: kural 1 Kasım'dan önce her siparişi elle işleme gönderiyor. O tarihe kadar otomatik onay fiilen çalışmaz.