Yazdım: `SUPPORT_NOTE.md` repo kökünde, 6 cümle, kod değişmedi.

Dana'nın commit başlığı "no behaviour change" diyor, ama davranışı değiştiriyor. Fark `src/shipping.js` ve testte görünüyor:

- **Standart kargo:** $4.99 → $5.99.
- **Ücretsiz kargo eşiği:** $50 ve üstü → $75'ten büyük. Tam $75'lik sipariş artık kargo ödüyor.
- **Ekspres kargo:** $12.50, değişmedi.

Not bunu destek ekibine açıkça söylüyor. Son cümlede de yeni fiyatların bilerek yapılıp yapılmadığını ekipten doğrulamalarını istiyor.

Bunun doğru olup olmadığını ben bilmiyorum. Dana refactor sırasında yanlışlıkla sabitleri değiştirmiş olabilir. Notu paylaşmadan önce Dana'ya sormanı öneririm. Değişiklik bilerek yapılmadıysa asıl düzeltilecek şey kod. Bu durumda notu da güncellemek gerekir.

Commit'in canlıya çıkıp çıkmadığına da bakmadım. Not "canlıya çıktığında" diye yazıldı.