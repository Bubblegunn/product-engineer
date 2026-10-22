Commit `0d5a446` yaptım: `feat(discount): add SPRING15 code and make code lookup case-insensitive`. Hiçbir şey push etmedim.

- **Test dosyası:** `test/discount.test.js` stage'de değildi, sadece `src/discount.js` vardı. Testler commit'te olsun diye test dosyasını da ekledim.
- **`scratch.log`:** Dokunmadım, hâlâ untracked.
- **Mesajın içeriği:**
  - SPRING15 %15 indirim koduyla geliyor.
  - Kod aramasındaki `toUpperCase()` değişikliğini ayrıca yazdım. Bu değişiklik SPRING15'e özel değil, tüm kodları etkiliyor.
  - Eklediğiniz iki test listeleniyor: 200 → 170 ve `spring15` küçük harf.
  - Kodlar için son kullanma tarihi eklenmediğini not ettim. Önceki commit'teki "Priya'ya expiry sor" notunu bu yüzden hatırlatma olarak koydum.
  - Global kuralınız gereği "Sade dil" bölümünü ve Co-Authored-By satırını ekledim. "Otomasyon etkisi" satırını eklemedim, çünkü bu değişiklik otomasyonu artırmıyor.