Commit `455f1fb` yapıldı. Push yok.

- **Test:** `node --test` çalıştırıldı: 4 test geçti, 0 fail.
- **Test dosyası:** `test/discount.test.js` staged değildi, sadece `src/discount.js` staged'di. Test dosyasını da ekledim, böylece commit'te kod ve testler birlikte.
- **Kapsam:** Staged diff'te SPRING15'in yanında ek bir değişiklik vardı: kod aramasında büyük/küçük harf duyarsızlığı (`toUpperCase()`). Bu WELCOME10 ve VIP20'yi de etkiliyor. Commit başlığında ve gövdesinde belirttim. İstemiyorsan söyle, ayırırım.
- **Mesaj:** Teknik gövde, test listesi ve CLAUDE.md'deki "Sade dil" bölümü var. "Otomasyon etkisi" satırını atladım, çünkü bu iş otomasyonu artırmıyor.
- **`scratch.log`:** Untracked kaldı, commit'e girmedi.