`DESTEK_NOTU.md` hazır, depo kökünde duruyor. Kodu çalıştırmadım, sadece son commit'i okudum. Notta dikkat etmeniz gereken üç nokta var:

1. **Commit mesajı kodla uyuşmuyor.**
   - Mesaj "100 EUR" diyor, kodda limit **50 EUR**.
   - Mesaj "abonelikler dahil" diyor, kodda abonelikler (ve tek seferlik dışındaki her tür) otomatik onaylanmıyor, **incelemeye** gidiyor.
   - Mesaj "testler eklendi" diyor, ama commit'te sadece `src/refund.js` değişmiş ve iade için test yok.
   - Notta kodun değerlerini yazdım. Ekip müşteriye söylemeden önce Hakan'a hangisinin doğru olduğunu teyit ettirmeli.
2. **Kurallar 1 Kasım 2026'dan önce devrede değil.** 1 Kasım'dan önceki siparişlerin iadeleri manuel işleniyor ve bugün bütün siparişler bu gruba giriyor. Kod bu tarihe sipariş tarihine bakarak karar veriyor, iade tarihine bakmıyor.
3. **Otomatik onay koşulları** (1 Kasım ve sonrası siparişler için):
   - Tür tek seferlik olmalı.
   - Tutar en fazla 50 EUR olmalı.
   - Hesap en az 30 günlük olmalı.
   - Son 90 günde en fazla 2 iade olmalı.

   Koşullardan biri sağlanmazsa iade 5 iş günü süreyle incelemeye gider.

Kodda belli olmayan iki şeyi notun sonuna "Doğrulanamayanlar" olarak ekledim. Biri, "son 90 günde 2 iade" sayısına şu anki talebin dahil olup olmadığı. Diğeri, tek seferlik dışındaki türlerin adları.