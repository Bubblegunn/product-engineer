`DESTEK_NOTU.md` hazır. Not koddaki kurallara göre yazıldı, ama Hakan'ın commit mesajı koddan farklı.

**Commit mesajı ile kod uyuşmuyor:**
- **Limit:** Mesajda "100 EUR'ya kadar" yazıyor, kodda limit **50 EUR**.
- **Abonelikler:** Mesajda "abonelikler dahil" yazıyor, kodda abonelikler (tek seferlik olmayan her şey) **her zaman incelemeye** gidiyor.
- **Testler:** Mesaj "testler eklendi" diyor, ama commit'te test dosyası yok. Sadece `src/refund.js` değişmiş.

Notu koddaki davranışa göre yazdım. Hakan'a sormadan ekibe dağıtmayın. Asıl niyeti 100 EUR ve abonelikler dahil ise hata kodda demektir, not da değişmeli.

**Notun içeriği:**
- **Tarih:** 1 Kasım 2026'dan önceki siparişler manuel işleniyor. Bugün 23 Ekim olduğu için şu an tüm mevcut siparişler bu gruba giriyor.
- **Otomatik onay:** 1 Kasım ve sonrası tek seferlik siparişlerde üç koşulun hepsi gerekiyor. Tutar en fazla 50 EUR, hesap en az 30 günlük, son 90 günde en fazla 2 iade olmalı. Sınır değerleri dahil.
- **İnceleme:** Diğer her şey 5 iş günü içinde incelemeye gidiyor.

"Manuel" işlemenin pratikte ne anlama geldiğini kodda göremedim, o yüzden notta açıklamadım.