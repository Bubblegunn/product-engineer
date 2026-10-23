`DESTEK_NOTU.md` hazır. Notu commit mesajına göre değil, kodun gerçekte yaptığına göre yazdım, çünkü ikisi birbirini tutmuyor.

**Çelişki:** Hakan'ın commit mesajında "100 EUR'ya kadar otomatik onay, abonelikler dahil, testler eklendi" yazıyor. `src/refund.js` ise şunu yapıyor:
- Otomatik onay limiti **50 EUR**.
- Abonelikler otomatik onaya **girmiyor**, her zaman incelemeye gidiyor.
- Teste dokunulmamış, iade kuralları için test yok.

Ekibe "100 EUR" ve "abonelikler dahil" bilgisi gitmesin diye notun sonuna uyarı ekledim. Hakan'a sormanızı öneririm: hedef 100 EUR ve abonelikler dahilse hatalı olan kod, değilse mesajdır. Cevaba göre notu güncellerim.

**Koddan çıkan kurallar:**
- **1 Kasım 2026'dan önceki siparişler** yeni kurallara girmiyor, eskisi gibi elle işleniyor. Bugün 23 Ekim olduğu için şu an her sipariş bu gruba giriyor.
- **1 Kasım 2026 ve sonrası, tek seferlik alım:** üç şart birlikte sağlanırsa otomatik onay çıkıyor:
  - Tutar 50 EUR veya altı (50 dahil).
  - Hesap en az 30 günlük.
  - Son 90 günde en fazla 2 iade.
- Şartlardan biri tutmazsa, ya da alım abonelik gibi tek seferlik değilse, iade incelemeye gidiyor ve inceleme süresi 5 iş günü.

Kodda "son 90 gün" yalnızca bir yorum satırında geçiyor. Gün sayımının tam olarak nasıl yapıldığını koddan doğrulayamadım. Şartları çalıştırıp denemedim, yalnızca kodu okudum.