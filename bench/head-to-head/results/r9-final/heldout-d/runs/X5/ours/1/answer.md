`DESTEK_NOTU.md` hazır, ama Hakan'ın commit mesajı koddaki kurallarla uyuşmuyor. Notu mesaja göre değil, koda göre yazdım.

| | Commit mesajı | Gerçek kod (`src/refund.js`) |
|---|---|---|
| Otomatik onay limiti | 100 EUR | **50 EUR** |
| Abonelikler | Dahil | **Dahil değil**, hep incelemeye gider |
| Testler | "eklendi" | Commit'te test yok |

**Notta yazan kurallar:**
- **Eski siparişler:** 1 Kasım 2026'dan önceki siparişler elle işlenir.
- **Otomatik onay:** Aşağıdaki dört koşulun hepsi gerekir.
  - Sipariş tek seferlik olmalı.
  - Tutar 50 EUR veya altı olmalı.
  - Hesap en az 30 günlük olmalı.
  - Son 90 günde en fazla 2 iade olmalı.
- **İnceleme:** Koşullardan biri bile sağlanmazsa iade incelemeye gider ve süre 5 iş günüdür.

Notun sonundaki "Dikkat" bölümünde ekibin 100 EUR veya "abonelikler otomatik" dememesini yazdım.

Hakan'a sormanız gereken iki şey var:
1. Niyet 100 EUR ve abonelikler dahil ise kodun düzeltilmesi gerekir. Bu durumda not da değişir.
2. "Son 90 günde en fazla 2 iade" sayımına mevcut talebin dahil olup olmadığı kodda belli değil. Notta bunu belirsiz olarak işaretledim.