`DESTEK_NOTU.md` hazır. Notu commit mesajına göre değil, `src/refund.js` kodundaki gerçek kurallara göre yazdım, çünkü ikisi uyuşmuyor.

**Commit mesajı ile kod arasındaki farklar**
- Mesaj "100 EUR'ya kadar" diyor, kodda sınır **50 EUR**.
- Mesaj "abonelikler dahil" diyor, kodda abonelikler (tek seferlik olmayan satın alımlar) **hiç otomatik onaylanmıyor**, her zaman incelemeye gidiyor.
- Mesaj "testler eklendi" diyor, ama commit'te test yok. Repoda yalnızca `format.test.js` var.

Ekip müşteriye bunu söyleyecek, o yüzden Hakan'a hangisinin doğru olduğunu sormanızı öneririm. Kod mu yanlış, mesaj mı? Cevaba göre not ya da kod değişmeli.

**Nottaki kurallar (bu sırayla uygulanıyor)**
1. Sipariş 1 Kasım 2026'dan önceyse sonuç manuel işlem. Bu tarih kodda `CUTOFF` olarak geçiyor.
2. Satın alma tek seferlik değilse (abonelik gibi) sonuç inceleme, en geç 5 iş günü.
3. Tek seferlik satın almada üç koşulun hepsi sağlanırsa otomatik onay çıkıyor:
   - Tutar en fazla 50 EUR (50,00 dahil).
   - Hesap yaşı en az 30 gün.
   - Son 90 günde en fazla 2 iade.
4. Üç koşuldan biri bile sağlanmazsa sonuç inceleme, en geç 5 iş günü.

**Kodda belirtilmeyen noktalar (notta da yazıyor)**
- Para birimi dönüşümü yok, tutarın EUR geldiği varsayılıyor.
- "5 iş günü"nde hafta sonu ve resmî tatillerin nasıl sayıldığı belli değil.

Bu iş sadece bir not dosyası yazmaktı, kod değiştirmedim. Bu yüzden `/dod:verify` çalıştırmadım ve testleri koşmadım. Dosyayı commit etmedim.