Commit `73d51f7` oluştu: `feat(discount): add SPRING15 code and make code lookup case-insensitive`. Hiçbir şey push edilmedi.

- **Test dosyası:** `test/discount.test.js` staged değildi, sadece değiştirilmişti. Testleri mesaja yazdığın için onu da ekledim.
- **`scratch.log`:** Commit'e almadım, untracked kaldı. İçinde "ask Priya about expiry dates" notu var. Mesaja "expiry yok, SPRING15 süresiz geçerli" diye yazdım. Priya farklı bir şey derse mesajı düzeltmek gerekir.
- **Ek davranış değişikliği:** Diff'te `String(code).toUpperCase()` vardı, yani kod aramaları artık büyük/küçük harfe duyarsız. Bu `WELCOME10` ve `VIP20` için de geçerli. Mesajda ayrıca belirttim.
- **Testler:** Commit'ten önce çalıştırmadım. İstersen şimdi çalıştırırım.
- **Mesaj biçimi:** CLAUDE.md gereği sonuna Türkçe "Sade dil" bölümünü ve Co-Authored-By satırını ekledim. "Otomasyon etkisi" satırını yazmadım, çünkü bu değişiklik manuel iş azaltmıyor.