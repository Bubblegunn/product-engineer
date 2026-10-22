Yazdım ve commit'ledim: `009896c`. Dosya `docs/late-fees.md`, aynı dosyada. Cümleler kısa ve basit. Hiçbir kural değişmedi.

**Kontrol:** `product-engineer facts` çıktısı: sayılar (21, 7, 3, 0.25, 1, 10, 5, 5, 12, 60) aynı. Düşen veya eklenen sayı yok. Kaynakta karşılığı olmayan cümle yok. Ortalama cümle 9,4 kelime. Sonuç: ok. Testleri çalıştırmadım, çünkü sadece doküman değişti. Çalışma ağacı commit sonrası temiz.

**Kod ile doküman uyuşmuyor:** `src/fees.js:1` içinde `GRACE_DAYS = 2`. Doküman ise 3 günlük ek süre diyor. Siz içeriği aynı tutmamı istediğiniz için dokümanda 3 bıraktım. Hangisi doğru, bilmiyorum. Bu yüzden ya kodu 3 yapmak ya da dokümanı 2 yapmak gerekir. Önce hangisinin doğru olduğuna siz karar verin. Personel hasta 3 gün derse, kod 2. günden sonra ücret kesebilir.

Kodda diğer sayılar doküman ile uyumlu: kitap 0,25, DVD 1,00, üst sınır 10, 12 yaş altı muaf, DVD'de ek süre yok. Kodda 21/7 gün ödünç süresi, yenileme, 5 dolar askıya alma ve 60 gün kayıp kuralı yok. Bunları karşılaştıramadım.