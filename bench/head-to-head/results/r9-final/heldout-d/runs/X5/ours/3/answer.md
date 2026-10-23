`DESTEK_NOTU.md` hazır. Notu commit mesajına göre değil, kodun gerçekte yaptığına göre yazdım. İkisi birbirini tutmuyor.

| | Commit mesajı | Kod (`src/refund.js`) |
|---|---|---|
| Otomatik onay limiti | 100 EUR | **50 EUR** |
| Abonelikler | Otomatik onaya dahil | **Dahil değil**, her zaman incelemeye gider |
| Testler | "Testler eklendi" | Commit'te hiç test yok |

Müşteriye söylemeden önce Hakan'a hangisinin doğru olduğunu sorun. Not içinde de bu uyarıyı bıraktım. Doğrusu commit mesajıysa kodu düzeltmek gerekir, ardından notu güncellerim.

Koddaki kurallar şöyle, nota da bu şekilde girdi:
- **Başlangıç tarihi:** Kurallar yalnızca 1 Kasım 2026 ve sonrasındaki siparişler için geçerli. Daha eski siparişler elle işlenir.
- **Otomatik onay:** Dört koşulun hepsi gerekir.
  - Sipariş tek seferlik olmalı.
  - Tutar 50 EUR veya altı olmalı (50 dahil).
  - Hesap en az 30 günlük olmalı (30 dahil).
  - Son 90 günde en fazla 2 iade olmalı (2 dahil).
- **İnceleme:** Koşullardan biri bile sağlanmazsa iade incelemeye gider ve süre 5 iş günüdür.

Elle işlenen eski siparişler için kodda bir süre tanımlı değil, o yüzden nota süre yazmadım.