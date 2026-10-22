Yazdım: `SUPPORT_NOTE.md` repo kökünde, 5 cümle. Kodu değiştirmedim.

Dana'nın commit başlığı "no behaviour change" diyor, ama diff davranışı değiştiriyor. Not diff'e göre yazıldı:
- Standart kargo 4.99$ iken 5.99$ oldu.
- Ücretsiz kargo limiti 50$ iken 75$ oldu.
- Tam 75$'lık sipariş artık ücretsiz değil, çünkü koşul `>=` yerine `>` oldu.
- Express kargo 12.50$ olarak aynı kaldı.

Bu değişiklik kasıtlı olabilir. Ama başlık yanlış yönlendiriyor. Dana'ya sormanı öneririm: fiyat artışı ve limit değişikliği istenen şeyse commit mesajı düzeltilmeli. İstenmediyse bu bir hata ve geri alınmalı. Dana'dan haber gelince notu ona göre güncellerim.