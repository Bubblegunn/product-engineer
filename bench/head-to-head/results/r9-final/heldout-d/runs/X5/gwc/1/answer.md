`DESTEK_NOTU.md` hazır, ama commit mesajı ile kod birbirini tutmuyor. Notu **koda** göre yazdım.

| | Commit mesajı | Gerçek kod (`src/refund.js`) |
|---|---|---|
| Otomatik onay limiti | 100 EUR | **50** (para birimi belirtilmemiş) |
| Abonelikler | Dahil | **Dahil değil**, hepsi incelemeye gider |
| Testler | Eklendi | Commit'te test yok (yalnızca `refund.js` değişti) |

Ekip müşteriye rakam söyleyecek, bu yüzden Hakan'a hangisinin doğru olduğunu sormanızı öneririm. Kod yanlışsa not da değişmeli.

Notta ayrıca şunlar var:
- **1 Kasım 2026'dan önceki siparişler** her zaman "manuel" çıkıyor. Bugün 23 Ekim olduğu için şu an tüm siparişler manuel. "Manuel" sürecinin nasıl işleyeceği kodda tanımlı değil, notta da bunu belirttim.
- **Otomatik onay koşulları:** tek seferlik alım, tutar 50 ve altı (50 dahil), hesap yaşı en az 30 gün, son 90 günde en fazla 2 iade. Hepsi birlikte sağlanmalı.
- **Diğer talepler** incelemeye gider ve süre 5 iş günüdür.