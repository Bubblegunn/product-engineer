# Destek Notu: İade Kuralları

Bu not, `src/refund.js` dosyasındaki güncel koda göre hazırlandı.

## Önce sipariş tarihine bakın

- **1 Kasım 2026'dan önceki siparişler:** Yeni kurallar uygulanmaz. İade **manuel** işlenir.
- **1 Kasım 2026 ve sonrası siparişler:** Aşağıdaki kurallar uygulanır.

## Tek seferlik satın alımlar

İade, **otomatik onaylanır**. Bunun için şu üç koşulun **üçü de** gerekir:

1. İade tutarı **50 EUR veya daha az** (50 EUR dahil).
2. Hesap en az **30 günlük** (30. gün dahil).
3. Müşterinin son 90 günde en fazla **2 iadesi** var (2 dahil).

Koşullardan biri bile sağlanmazsa iade **incelemeye** gider.

## Abonelikler (ve tek seferlik olmayan her şey)

Tutar ne olursa olsun otomatik onay **yok**. İade her zaman **incelemeye** gider.

## İnceleme süresi

İncelemeye giden iadeler için süre **5 iş günüdür**.

## Müşteriye kısa özet

- 1 Kasım 2026 öncesi sipariş: iade manuel işlenir.
- Tek seferlik satın alma, 50 EUR'ya kadar, hesap 30 gün veya daha eski, son 90 günde en fazla 2 iade: otomatik onay.
- Diğer tüm durumlar ve tüm abonelik iadeleri: 5 iş günü içinde inceleme.
