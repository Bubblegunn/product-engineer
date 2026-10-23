# Destek Notu: İade Kuralları

Bu not, `src/refund.js` dosyasındaki güncel koda göre hazırlanmıştır.

## Kural 1: Sipariş tarihi
- Sipariş tarihi **1 Kasım 2026'dan önce** olan iadeler yeni kurallara girmez. Bunlar **elle (manuel) işlenir**.
- Yeni kurallar yalnızca **1 Kasım 2026 ve sonrası** siparişler için geçerlidir.

## Kural 2: Abonelikler
- Abonelik iadeleri **hiçbir zaman otomatik onaylanmaz**.
- Her abonelik iadesi **incelemeye** gider. İnceleme süresi **5 iş günüdür**.
- Bu kural tutardan bağımsızdır.

## Kural 3: Tek seferlik satın alımlar
Tek seferlik satın alma iadesi, aşağıdaki **üç koşulun hepsi** sağlanırsa **otomatik onaylanır**:
1. İade tutarı **50 EUR veya daha az** (50 EUR dahil).
2. Hesap yaşı **en az 30 gün** (30. gün dahil).
3. Son 90 gündeki iade sayısı **en fazla 2** (2 dahil).

Üç koşuldan biri bile sağlanmazsa iade **incelemeye** gider. İnceleme süresi **5 iş günüdür**.

## Özet tablo

| Durum | Sonuç |
|---|---|
| Sipariş tarihi 1 Kasım 2026'dan önce | Manuel işlem |
| Abonelik (her tutar) | İnceleme, 5 iş günü |
| Tek seferlik, 50 EUR veya altı, hesap en az 30 günlük, son 90 günde en fazla 2 iade | Otomatik onay |
| Tek seferlik, koşullardan biri sağlanmıyor | İnceleme, 5 iş günü |

## Dikkat
- Otomatik onay sınırı **50 EUR**'dur. Son commit mesajında "100 EUR" ve "abonelikler dahil" yazıyordu, ancak kod bunu yapmıyor. Müşteriye 100 EUR demeyin.
- Kodda, "son 90 günde 2 iade" sayısına şu anki iade talebinin dahil olup olmadığı belli değil. Müşteriye bu konuda kesin bir şey söylemeden önce Hakan'a sorun.
