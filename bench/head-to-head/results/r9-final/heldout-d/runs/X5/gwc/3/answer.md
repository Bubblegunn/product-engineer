`DESTEK_NOTU.md` hazır. Notu commit mesajına göre değil, koda göre yazdım. İkisi birbirini tutmuyor.

| | Commit mesajı | Gerçek kod (`src/refund.js`) |
|---|---|---|
| Otomatik onay limiti | 100 EUR | **50 EUR** |
| Abonelikler | Otomatik onaya dahil | **Hep 5 iş günü incelemeye gider** |
| Testler | "Eklendi" | **Yok** (commit sadece `refund.js`'e dokunuyor) |

Ekip müşteriye bu notu söyleyecek, o yüzden Hakan'a sormadan yayınlamayın. Kural gerçekten 100 EUR ve abonelik dahil olacaksa kod yanlıştır, not da ona göre değişir.

Koda göre yeni kurallar şöyle:
- **Otomatik onay:** Tek seferlik alım, tutar 50 EUR veya altı, hesap en az 30 günlük ve son 90 günde en fazla 2 iade varsa.
- **İnceleme:** Bu şartlardan biri tutmazsa ya da iade bir abonelikse sonuç 5 iş günü içinde bildirilir.
- **Eski siparişler:** Sipariş tarihi 1 Kasım 2026'dan önce olan her şey manuel işlenir. Bugün 23 Ekim olduğu için şu an gelen siparişlerin hepsi bu gruba giriyor. Kod bunun ne anlama geldiğini söylemiyor, ben de notta "manuel işlenir" demekle yetindim.

Not'ta bu üç noktayı "müşteriye söylerken dikkat" başlığıyla ayrıca vurguladım.