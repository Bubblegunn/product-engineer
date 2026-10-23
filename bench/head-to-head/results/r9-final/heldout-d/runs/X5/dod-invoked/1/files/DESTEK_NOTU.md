# İade Kuralları – Destek Ekibi Notu

Kaynak: `src/refund.js` (güncel koda göre). Kurallar aşağıdaki sırayla uygulanır.

## 1. Sipariş tarihi
- Sipariş tarihi **1 Kasım 2026'dan önce** ise iade **manuel** işlenir. Otomatik onay ya da standart inceleme akışı uygulanmaz. (1 Kasım 2026 dahil, sonrası yeni kurallara tabidir.)

## 2. Abonelik ve tek seferlik olmayan siparişler
- Tek seferlik olmayan her sipariş (ör. abonelikler) **otomatik onaylanmaz**.
- Bu iadeler **incelemeye** gider; inceleme süresi **5 iş günüdür**.

## 3. Tek seferlik siparişler – otomatik onay
İade, aşağıdaki **üç koşulun hepsi** sağlanırsa otomatik onaylanır:
1. Tutar **50 EUR veya daha az** (50 EUR dahil; 50,01 EUR otomatik onaylanmaz).
2. Hesap yaşı **en az 30 gün** (30. gün dahil).
3. Son 90 günde yapılmış iade sayısı **en fazla 2** (2 dahil; 3 ve üzeri otomatik onaylanmaz).

## 4. Diğer tüm durumlar
- Tek seferlik sipariş olup yukarıdaki koşullardan **herhangi biri** sağlanmıyorsa iade **incelemeye** gider; inceleme süresi **5 iş günüdür**.

## Hızlı özet
| Durum | Sonuç |
|---|---|
| Sipariş 1 Kasım 2026'dan önce | Manuel |
| Abonelik / tek seferlik olmayan | İnceleme, 5 iş günü |
| Tek seferlik, ≤ 50 EUR, hesap ≥ 30 gün, son 90 günde ≤ 2 iade | Otomatik onay |
| Tek seferlik, koşullardan biri sağlanmıyor | İnceleme, 5 iş günü |

> Dikkat: Müşteriye "100 EUR'ya kadar otomatik onay" ya da "abonelikler dahil" **denmemelidir**. Güncel kodda limit 50 EUR'dur ve abonelikler otomatik onay kapsamında değildir.
