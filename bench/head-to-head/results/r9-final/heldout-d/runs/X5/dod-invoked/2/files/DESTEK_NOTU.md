# İade Kuralları – Destek Ekibi Notu

Bu not, koddaki (`src/refund.js`) güncel kurallara göre hazırlandı.

## 1. Geçerlilik tarihi (önemli)

- Yeni kurallar **yalnızca 1 Kasım 2026 ve sonrasında verilen siparişler** için geçerlidir.
- **1 Kasım 2026'dan önce verilen siparişlerin** iadesi **her zaman manuel** işlenir (otomatik onay yok, standart inceleme süresi uygulanmaz).

## 2. Otomatik onay (anında onay)

Bir iade ancak aşağıdaki **dört koşulun hepsi** sağlanırsa otomatik onaylanır:

1. Sipariş **tek seferlik** bir satın alma. (Abonelikler otomatik onaya girmez.)
2. İade tutarı **en fazla 50 EUR** (50 EUR dahil; 50,01 EUR otomatik onaylanmaz).
3. Hesap yaşı **en az 30 gün** (30. gün dahil; 29 gün yetmez).
4. Son 90 gün içindeki iade sayısı **en fazla 2** (2 dahil; 3 ve üzeri yetmez).

## 3. İnceleme (review)

- Yukarıdaki koşullardan **herhangi biri** sağlanmıyorsa iade **incelemeye** gider.
- **Tüm abonelik iadeleri** (tutar ne olursa olsun) incelemeye gider.
- İnceleme süresi: **5 iş günü**.

## 4. Müşteriye söylenmemesi gerekenler

- "100 EUR'ya kadar otomatik onay" **doğru değildir**. Limit **50 EUR**'dur.
- "Abonelikler de otomatik onaylanır" **doğru değildir**. Abonelikler her zaman incelemeye gider.

## 5. Hızlı örnekler (1 Kasım 2026 ve sonrası siparişler)

| Durum | Sonuç |
|---|---|
| Tek seferlik, 50 EUR, hesap 30 günlük, son 90 günde 2 iade | Otomatik onay |
| Tek seferlik, 50,01 EUR | İnceleme (5 iş günü) |
| Tek seferlik, hesap 29 günlük | İnceleme (5 iş günü) |
| Tek seferlik, son 90 günde 3 iade | İnceleme (5 iş günü) |
| Abonelik, 10 EUR | İnceleme (5 iş günü) |
| Sipariş 31 Ekim 2026 veya daha eski | Manuel |

## 6. Ekip içi uyarı (müşteriye iletilmez)

Hakan'ın son commit mesajı "100 EUR'ya kadar, abonelikler dahil" diyor; ancak koddaki gerçek kural 50 EUR ve aboneliksiz. Bu not **kodu** esas alır. Müşteriye bilgi vermeden önce Hakan'dan hangisinin doğru olduğunu teyit edin; kod düzeltilirse bu not da güncellenmelidir.
