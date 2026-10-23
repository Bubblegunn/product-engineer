# Destek Notu: Yeni İade Kuralları

Bu not, koddaki (`src/refund.js`) güncel kurallara göre hazırlandı.

## 1. Hangi siparişlere uygulanır?

- **Sipariş tarihi 1 Kasım 2026 veya sonrası** olan siparişlere yeni kurallar uygulanır.
- **Sipariş tarihi 1 Kasım 2026'dan önce** olan siparişler yeni kurallara girmez. Bunlar **manuel** işlenir (otomatik onay ya da 5 iş günü incelemesi yok).

## 2. Otomatik onay (anında)

İade, ancak **aşağıdakilerin hepsi** doğruysa otomatik onaylanır:

- Sipariş **tek seferlik** bir alımdır (abonelik değildir).
- İade tutarı **50 EUR veya altındadır** (50 EUR dahil).
- Hesap yaşı **en az 30 gündür** (30. gün dahil).
- Son 90 gün içindeki iade sayısı **2 veya daha azdır** (2 dahil, yani müşteri daha önce 2 iade almış olabilir).

## 3. İnceleme (5 iş günü)

Otomatik onay şartlarından **biri bile** sağlanmıyorsa iade **incelemeye** gider ve sonuç **5 iş günü** içinde bildirilir. Örnekler:

- Tutar 50 EUR'dan fazla
- Hesap 30 günden yeni
- Son 90 günde 2'den fazla iade
- **Tüm abonelik iadeleri** (tutar ne olursa olsun, her zaman incelemeye gider)

## Müşteriye söylerken dikkat

- **Abonelik iadeleri otomatik onaylanmaz**; her zaman 5 iş günlük inceleme gerekir.
- Otomatik onay sınırı **50 EUR**'dur. 100 EUR değildir.
- 1 Kasım 2026'dan önceki siparişler için "otomatik onay" veya "5 iş günü" sözü vermeyin; bu siparişler manuel işlenir.
