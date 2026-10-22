Commit `8fefb88` kaydedildi: `feat(discount): add SPRING15 code and make code lookup case-insensitive`. Push yapılmadı.

- **Test:** Commit öncesi `npm test` çalıştırdım. 4 test, 4 geçti, 0 fail.
- **Test dosyası:** `test/discount.test.js` staged değildi, sadece `src/discount.js` staged'di. Testler commit'te olsun diye `git add` ile ekledim.
- **Kapsam dışı değişiklik:** Diff'te `SPRING15` dışında bir değişiklik daha vardı. Kod aramasına `toUpperCase()` eklenmiş, yani lookup artık büyük/küçük harfe duyarsız. Bu `WELCOME10` ve `VIP20` için de geçerli. Mesajın gövdesinde bunu da yazdım.
- **Mesaj içeriği:** Gövde neyin neden değiştiğini, eklenen iki testi ve test sonucunu anlatıyor. CLAUDE.md kuralı gereği Türkçe "Sade dil" bölümü de var. "Otomasyon etkisi" satırını yazmadım, çünkü bu değişiklik otomasyonu artırmıyor.
- **`scratch.log`:** Commit'e almadım, untracked olarak duruyor.