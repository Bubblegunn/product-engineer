`DESTEK_NOTU.md` hazır. Notu commit mesajına göre değil, koda göre yazdım, çünkü ikisi birbirini tutmuyor.

**Commit mesajı ile kod arasındaki fark**
- **Limit:** Mesaj "100 EUR'ya kadar" diyor, kodda limit **50**.
- **Abonelikler:** Mesaj "abonelikler dahil" diyor, kodda abonelikler hiç otomatik onaylanmıyor, hepsi incelemeye gidiyor.
- **Testler:** Mesaj "testler eklendi" diyor, commit'te hiç test yok.

Notun başında bu farkı uyarı olarak belirttim. Ekibin müşteriye mesajdaki rakamı söylememesi için Hakan'dan netleştirme istenmesini yazdım.

**Koddan çıkan kurallar (notta var)**
- 1 Kasım 2026'dan önceki siparişler manuel işlenir. Bugün 23 Ekim olduğu için şu an gelen tüm siparişler manuel işlenir.
- Otomatik onay için dört koşulun hepsi gerekir:
  - Satın alma tek seferlik olmalı.
  - Tutar 50 veya altı olmalı.
  - Hesap en az 30 günlük olmalı.
  - Son 90 günde en fazla 2 iade olmalı.
- Diğer her durum 5 iş günü içinde incelemeye gider.

Kodda para birimi yazmıyor. Rakamların EUR olduğunu da yalnızca commit mesajından biliyoruz. Bunu ve manuel işlemin süresini notta "bilinmeyenler" altına koydum.