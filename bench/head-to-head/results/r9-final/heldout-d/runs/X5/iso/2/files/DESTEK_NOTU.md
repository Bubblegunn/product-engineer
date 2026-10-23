# Destek Notu: İade Kuralları

Bu not, `src/refund.js` dosyasındaki güncel koda göre yazıldı.

## 1. Önce siparişin tarihine bakın

| Sipariş tarihi | Ne olur? |
|---|---|
| 1 Kasım 2026'dan **önce** | İade **manuel** işlenir. Aşağıdaki otomatik onay kuralları geçerli değildir. |
| 1 Kasım 2026 ve sonrası | Aşağıdaki kurallar geçerlidir. |

Not: Bugün 23 Ekim 2026. Şu an mevcut siparişlerin hepsi 1 Kasım'dan öncedir, yani manuel işlenir.

## 2. 1 Kasım 2026 ve sonrası siparişler

### Tek seferlik satın alma
İade, aşağıdaki **üç koşulun hepsi** sağlanırsa **otomatik onaylanır**:

1. İade tutarı **50 EUR veya altında** (50 EUR dahil).
2. Hesap en az **30 günlük** (30. gün dahil).
3. Son 90 günde **en fazla 2 iade** yapılmış (2 dahil). Yani 3. iade otomatik onaylanmaz.

Koşullardan biri bile sağlanmazsa iade **incelemeye** gider.

### Abonelik ve diğer tüm iade türleri
Tek seferlik olmayan her iade (abonelikler dahil) **her zaman incelemeye** gider. Tutar ne kadar düşük olursa olsun otomatik onay yoktur.

## 3. İnceleme süresi
İncelemeye giden iadeler için süre **5 iş günüdür**. Müşteriye bu süreyi söyleyebilirsiniz.

## Müşteriye söylenmemesi gerekenler
- "100 EUR'ya kadar otomatik onay" doğru **değildir**. Limit **50 EUR**'dur.
- "Abonelikler de otomatik onaylanır" doğru **değildir**. Abonelikler her zaman incelemeye gider.
