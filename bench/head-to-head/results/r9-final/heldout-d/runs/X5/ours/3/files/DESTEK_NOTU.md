# Destek Notu: Yeni İade Kuralları

## Ne zamandan itibaren geçerli?

Yeni kurallar yalnızca **1 Kasım 2026 ve sonrasında verilen siparişler** için geçerlidir.
**1 Kasım 2026'dan önce verilen siparişlerin** iadeleri eskisi gibi **elle (manuel)** işlenir.

## Otomatik onay (anında onaylanan iade)

Bir iade, aşağıdaki **dört koşulun hepsi** sağlanırsa otomatik onaylanır:

1. Sipariş **tek seferlik** bir satın almadır (abonelik değildir).
2. İade tutarı **50 EUR veya altındadır** (tam 50 EUR dahildir).
3. Müşterinin hesabı **en az 30 günlük**tür (tam 30 gün dahildir).
4. Müşterinin **son 90 günde en fazla 2 iadesi** vardır (2 iade dahildir; 3 veya daha fazlaysa otomatik onay olmaz).

## İnceleme (otomatik onay olmayan iade)

Dört koşuldan **biri bile** sağlanmıyorsa iade **incelemeye** gider. İnceleme süresi **5 iş günüdür**.

**Abonelik iadeleri tutar ne olursa olsun her zaman incelemeye gider**, otomatik onaylanmaz.

## Müşteriye söylenecekler (özet)

| Durum | Sonuç |
|---|---|
| 1 Kasım 2026'dan önceki sipariş | Elle işlenir |
| Abonelik iadesi | İnceleme, 5 iş günü |
| Tek seferlik, 50 EUR'dan fazla | İnceleme, 5 iş günü |
| Tek seferlik, hesap 30 günden yeni | İnceleme, 5 iş günü |
| Tek seferlik, son 90 günde 3 veya daha fazla iade | İnceleme, 5 iş günü |
| Tek seferlik, 50 EUR veya altı, hesap en az 30 günlük, son 90 günde en fazla 2 iade | Otomatik onay |

## Dikkat

Hakan'ın son commit mesajında "100 EUR'ya kadar" ve "abonelikler dahil" yazıyor.
**Kod bunu yapmıyor:** limit **50 EUR**, abonelikler **otomatik onaya dahil değil**.
Bu not kodun gerçekte yaptığına göre yazılmıştır. Müşteriye bu kurallar iletilmeden önce
Hakan'dan hangisinin doğru olduğunu teyit edin.
