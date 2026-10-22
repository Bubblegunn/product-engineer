Commit `ab739e1` yapıldı. Push yapmadım.

- **Mesaj:** başlık `feat(discount): add SPRING15 code (15% off) and make codes case-insensitive`. Gövde iki kod değişikliğini ve iki yeni testi anlatıyor. Sonda Türkçe "Sade dil" bölümü var. Otomasyon satırını yazmadım, çünkü elle yapılan bir adım kalkmadı.
- **Test dosyası:** `test/discount.test.js` staged değildi, sadece `src/discount.js` staged'di. Testleri de commit'e ekledim, böylece kod ve testleri aynı commit'te.
- **Kapsam dışı:** `scratch.log` commit'e girmedi, untracked olarak duruyor. İçinde Priya'ya sorulacak son kullanma tarihi notu var.
- **Test sonucu:** `npm test` çalıştı, 4 test geçti, 0 test başarısız.
- **Büyük/küçük harf değişikliği:** SPRING15'in yanında kodlar artık büyük/küçük harfe duyarsız. Bu WELCOME10 ve VIP20 için de geçerli. Bunu commit mesajına yazdım.
- **Son kullanma tarihi:** SPRING15 için tarih mantığı yok, kod süresiz geçerli. Mesajda "not checked" olarak belirttim.