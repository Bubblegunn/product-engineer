`DESTEK_NOTU.md` hazır, ama müşteriye söylemeden önce Hakan'a bir şey sormanız gerekiyor: commit mesajı ile kod birbirini tutmuyor. Notu **kodun gerçekte yaptığına** göre yazdım.

| | Commit mesajı | Kod (`src/refund.js`) |
|---|---|---|
| Otomatik onay limiti | 100 EUR | **50 EUR** |
| Abonelikler | Dahil | **Dahil değil**, hep incelemeye gidiyor |
| Testler | "Eklendi" | **Eklenmemiş**, commit'te yalnızca `refund.js` var |

Not, kodun sonucunu yansıtıyor: limit 50 EUR ve abonelikler her zaman incelemeye gidiyor. Hakan'ın niyeti 100 EUR ve abonelikler dahilse kod yanlıştır. Bu durumda notu ona göre güncellemem gerekir.

Hakan'a ayrıca şunu sormak da iyi olur: "son 90 günde en fazla 2 iade" kuralı bu iadeyi de sayıyor mu? Kodda yalnızca `refundsLast90Days <= 2` yazıyor. Notta bunu "son 90 günde en fazla 2 iade" diye yazdım.

Notta olanlar:
- **Geçerlilik:** Kurallar 1 Kasım 2026 ve sonrası siparişler için geçerli. Daha eski siparişler manuel işleniyor.
- **Otomatik onay:** Dört şartın hepsi gerekiyor. Tek seferlik satın alma, en fazla 50 EUR, hesap en az 30 günlük ve son 90 günde en fazla 2 iade.
- **İnceleme:** Şartlardan biri bile sağlanmazsa iade incelemeye gidiyor. Süre 5 iş günü.