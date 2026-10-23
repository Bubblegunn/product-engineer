`DESTEK_NOTU.md` hazır. Ekibe vermeden önce bilmeniz gereken bir sorun var: Hakan'ın commit mesajı ile koddaki kurallar birbirini tutmuyor. Notu koddaki kurallara göre yazdım.

| | Commit mesajı | Kod (`src/refund.js`) |
|---|---|---|
| Otomatik onay limiti | 100 EUR | 50 (para birimi kodda yok) |
| Abonelikler | Dahil | Dahil değil, her zaman incelemeye gider |
| Testler | "Eklendi" | Commit'te iade için test yok |

Koddaki kurallar, nota yazdıklarım:
- **Otomatik onay:** Dört koşulun hepsi gerekiyor. Ürün tek seferlik olacak, tutar 50 veya altı olacak, hesap en az 30 günlük olacak ve son 90 günde en fazla 2 iade olacak.
- **İnceleme:** Koşullardan biri sağlanmazsa 5 iş günü inceleme olur. Abonelikler her zaman buraya girer.
- **Tarih sınırı:** 1 Kasım 2026'dan önceki siparişler "manuel" olur. Bugün 23 Ekim olduğu için şu an verilen siparişler bu gruba giriyor ve otomatik onay almıyor. Bu tarih commit mesajında geçmiyor.

Notun başında bu uyarıyı, sonunda da Hakan'a sorulacak maddeleri ekledim. Önce Hakan'dan hangisinin doğru olduğunu (kod mu, commit mesajı mı) öğrenin. Kod yanlışsa notu ona göre güncelleyin. O zamana kadar ekip müşteriye "100 EUR" veya "abonelikler dahil" demesin.