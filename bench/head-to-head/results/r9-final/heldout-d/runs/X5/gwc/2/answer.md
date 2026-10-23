`DESTEK_NOTU.md` hazır. Notu commit mesajına değil `src/refund.js` koduna göre yazdım, çünkü ikisi birbirini tutmuyor.

| | Commit mesajı | Kod |
|---|---|---|
| Otomatik onay limiti | 100 EUR | **50** |
| Abonelikler | Otomatik onaya dahil | **Her zaman incelemeye gidiyor** |
| Testler | "eklendi" | Eklenmemiş. Repoda sadece `format.test.js` var. |

Hakan hangisini kastettiğini teyit etmeden notu ekibe vermeyin. Kod doğruysa not olduğu gibi kalır. Mesaj doğruysa kod düzeltilmeli ve not güncellenmeli.

İki şeyi daha bilmeniz gerekiyor:
- **Para birimi:** Kodda yok. "EUR" sadece commit mesajından geliyor. Notun başına teyit uyarısı koydum.
- **Tarih:** Yeni kurallar sadece **1 Kasım 2026 ve sonrası siparişler** için geçerli. Daha eski siparişler (bugün 23 Ekim) manuel işleniyor. Ekibin müşteriye bunu da söylemesi gerekir.

Koddaki kurallar şunlar:
- **Otomatik onay:** Dört şartın hepsi gerekiyor: tek seferlik sipariş, en fazla 50, hesap en az 30 günlük, son 90 günde en fazla 2 iade. Sınır değerlerin hepsi dahil.
- **Diğer her durum:** İncelemeye gidiyor, süre 5 iş günü.