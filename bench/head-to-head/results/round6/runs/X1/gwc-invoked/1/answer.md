Commit `c7b146a` oluşturuldu: `feat(discount): add SPRING15 code and make codes case-insensitive`. Hiçbir şey push edilmedi.

- **Skill:** `git-weekly-changelog` haftalık changelog üretiyor, commit yazmıyor. Skill'i yükledim, ama commit için kullanmadım. Mesajı sizin istediğiniz gibi kalıcı bir commit mesajı olarak yazdım.
- **Test dosyası:** Sadece `src/discount.js` stage'liydi. `test/discount.test.js` stage'li değildi. Testleri de commit'e dahil etmek için onu da stage'e aldım.
- **Davranış değişikliği:** Diff'te SPRING15 dışında bir değişiklik daha var. Kod artık `toUpperCase()` ile aranıyor. Bu yüzden `welcome10` gibi küçük harfli girişler de artık eşleşiyor. Commit mesajında bunu açıkça belirttim.
- **Testler:** Çalıştırmadım. Mesajda da "tests were not run" yazıyor.
- **`scratch.log`:** Commit'e almadım. Untracked olarak duruyor.
- **Mesaj formatı:** `CLAUDE.md` kuralı gereği "Sade dil" bölümünü ekledim. Bu iş manuel adımı azaltmadığı için "Otomasyon etkisi" satırını koymadım.