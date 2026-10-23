# Destek Notu: İade Kuralları

Bu not, `src/refund.js` dosyasındaki güncel koda göre hazırlanmıştır.

## Önemli uyarı

Son commit mesajı "100 EUR'ya kadar otomatik onay, abonelikler dahil" diyor. **Kod bunu yapmıyor.** Müşteriye commit mesajındaki bilgiyi değil, aşağıdaki kuralları söyleyin:

- Otomatik onay sınırı **50 EUR**'dur (100 EUR değil).
- **Abonelik iadeleri otomatik onaylanmaz**, her zaman incelemeye gider.

## Karar türleri

Her iade talebi üç sonuçtan birini alır:

1. **Otomatik onay:** İade hemen onaylanır.
2. **İnceleme:** İade ekip tarafından incelenir, sonuç **en geç 5 iş günü** içinde bildirilir.
3. **Manuel işlem:** İade eski usulle, elle işlenir (aşağıya bakın).

## Kurallar (bu sırayla uygulanır)

### 1. Sipariş tarihi 1 Kasım 2026'dan önceyse → Manuel
Tutar ne olursa olsun ve ürün türü ne olursa olsun, siparişi **1 Kasım 2026'dan önce** verilmiş iadeler otomatik sisteme girmez, manuel işlenir. (1 Kasım 2026'nın kendisi yeni sisteme dahildir.)

### 2. Tek seferlik olmayan satın alımlar (abonelikler) → İnceleme
Satın alma türü "tek seferlik" değilse (ör. abonelik), iade **her zaman incelemeye** gider. Tutar küçük olsa bile otomatik onay yoktur. İnceleme süresi en geç 5 iş günüdür.

### 3. Tek seferlik satın alımlar → Otomatik onay için üç koşulun **hepsi** gerekir
- İade tutarı **50,00 EUR veya daha az** (50,00 EUR dahil; 50,01 EUR üzeri otomatik onaylanmaz),
- Hesap yaşı **en az 30 gün** (30. gün dahil; 29 gün yetmez),
- Son 90 gün içindeki iade sayısı **en fazla 2** (2 dahil; 3 veya daha fazla iade varsa otomatik onay yoktur).

Üç koşuldan **biri bile** sağlanmıyorsa iade **incelemeye** gider (en geç 5 iş günü).

## Hızlı özet tablo

| Durum | Sonuç |
|---|---|
| Sipariş 1 Kasım 2026'dan önce | Manuel |
| Abonelik / tek seferlik olmayan (1 Kasım 2026 ve sonrası) | İnceleme (5 iş günü) |
| Tek seferlik, ≤ 50 EUR, hesap ≥ 30 gün, son 90 günde ≤ 2 iade | Otomatik onay |
| Tek seferlik, koşullardan biri sağlanmıyor | İnceleme (5 iş günü) |

## Notlar

- Kodda para birimi dönüşümü yoktur. Tutarın EUR cinsinden geldiği varsayılmıştır (projedeki biçimlendirme de EUR kullanıyor).
- "5 iş günü" kodda sabit olarak tanımlıdır. Hafta sonu ve resmî tatillerin nasıl sayıldığı kodda belirtilmemiştir.
- Son commit'te test eklendiği yazıyor, ancak iade kuralları için test bulunmuyor. Bu kurallar otomatik olarak doğrulanmamıştır. Emin olmadığınız bir durumda Hakan'a sorun.
