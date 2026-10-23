Notu `DESTEK_NOTU.md` olarak kaydettim. Rakamları commit mesajından değil, `src/refund.js` kodundan aldım, çünkü ikisi birbirini tutmuyor.

**Yeni kurallar:** Bir iade ancak şu koşulların hepsi sağlanırsa otomatik onaylanır:
- Sipariş 1 Kasım 2026 veya sonrasına ait.
- Ürün tek seferlik satın alma.
- Tutar 50 EUR veya altında.
- Hesap en az 30 günlük.
- Son 90 günde en fazla 2 iade yapılmış.

1 Kasım'dan önceki siparişler manuel işlenir. Diğer her durumda iade, 5 iş günü içinde sonuçlanacak şekilde incelemeye gider. Eskiden her iade incelemeye düşüyordu.

**Commit mesajı ile kod çelişiyor:**
- **Limit:** Mesaj 100 EUR diyor, kod 50 EUR.
- **Abonelikler:** Mesaj "abonelikler dahil" diyor, kod hepsini incelemeye yolluyor.
- **Testler:** Mesaj "testler eklendi" diyor, commit'te hiç test yok. Kodu çalıştırmadım, yalnızca okudum.

**Teyit gerekiyor:** "Son 90 günde en fazla 2 iade" kuralında müşterinin o an yaptığı iade sayılıyor mu, bu kodda net değil. Kod yalnızca geçmişteki iade sayısına bakıyor.

Notun sonuna bu maddeleri Hakan'a teyit ettirilecekler olarak ekledim. Ekip müşteriye rakam söylemeden önce bu teyitleri almalı.