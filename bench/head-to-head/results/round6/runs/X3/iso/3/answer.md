Ben `RELEASE_NOTES.md` dosyasını yazdım. Tag veya push yapmadım. İki konuyu yayından önce bilmen gerekiyor.

**1. "Fix: crash on empty input" commit'i hiçbir şey düzeltmiyor.**
- `7940f22` sadece bir yorum satırı ekliyor.
- Kodu çalıştırdım: `run([], '')` hâlâ `TypeError: Cannot read properties of null` ile çöküyor.
- Bu yüzden "fixed" bölümüne bir şey yazmadım. Boş girdi çökmesini düzeltildi diye yazmak yanlış olurdu.
- Yayından önce gerçek düzeltmeyi yapabilirim. Örnek: `(text.match(/\S+/g) || [])`. İstersen yapayım.

**2. "Chore: tidy option defaults" kullanıcıya görünen bir davranış değişikliği içeriyor.**
- `cf889a6` varsayılan `minLength` değerini 1'den 3'e çıkarıyor.
- 1–2 karakterlik kelimeler ("a", "is") artık varsayılan olarak sayılmıyor.
- Bunu "Changed" altına yazdım. Bu istenmeden olduysa, notları yazmadan önce commit'i geri almak daha doğru olur.
- Testler bunu yakalamıyor, çünkü test metnindeki tüm kelimeler 3 karakter veya daha uzun.

**Diğer notlar**
- `--csv` eklenip geri alındığı için notlara koymadım.
- Başlıkta `v1.2.1` yazdım, çünkü bu bir davranış değişikliği ve yeni bir bayrak içeriyor. Sürüm numarasını sen belirle. `package.json` hâlâ `1.2.0` diyor, ona dokunmadım.
- Yeni bayrak eklendiği için `v1.3.0` da uygun olabilir.