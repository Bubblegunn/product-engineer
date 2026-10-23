`DESTEK_NOTU.md` hazır. Not ASCII Türkçe yazıldı (ş, ı, ğ gibi harfler yok). Dosyayı ekibe vermeden önce istersen düzeltebilirim.

**Commit mesajı ile kod uyuşmuyor.** Notu kodu esas alarak yazdım ve bu çelişkiyi notun en başına koydum.

| | Commit mesajı | Kod (`src/refund.js`) |
|---|---|---|
| Otomatik onay limiti | 100 EUR | 50 (para birimi kodda yok) |
| Abonelikler | Dahil | Hiçbir zaman otomatik onaylanmaz, her zaman incelemeye gider |
| Testler | "Eklendi" | `src/refund.js` dışında dosya değişmemiş, iade testi yok |

Ekip müşteriye rakam söylemeden önce Hakan'a hangisinin doğru olduğunu sormalı. Kod doğruysa not olduğu gibi kalır. Mesaj doğruysa kod hatalıdır ve not değişmeli.

**Kodun uyguladığı kurallar** (notta bu sırayla var):
1. 1 Kasım 2026'dan önceki siparişler elle (manuel) işlenir. Yeni kurallar bugün (23 Ekim) için henüz geçerli değil.
2. Tek seferlik olmayan satın almalar (örneğin abonelik) 5 iş günü incelemeye gider.
3. Tek seferlik satın almada üç koşulun hepsi sağlanırsa iade otomatik onaylanır:
   - Tutar en fazla 50.
   - Hesap en az 30 günlük.
   - Son 90 günde en fazla 2 iade.
4. Diğer her durum 5 iş günü incelemeye gider.

Notta sınır değerleri açıkça yazılı: tam 50, tam 30 gün ve son 90 günde tam 2 iade uygundur, 3 iade uygun değildir.

Kodda "manual" durumunun ne anlama geldiği (kim işler, ne kadar sürer) yazmıyor. Notta bunu uydurmadım.