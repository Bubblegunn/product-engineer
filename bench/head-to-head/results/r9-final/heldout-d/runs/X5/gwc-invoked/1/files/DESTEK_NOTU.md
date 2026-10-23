# Destek Notu: İade Kuralları Değişikliği

**Kaynak:** Hakan'ın son commit'i (20 Ekim 2026), `src/refund.js`. Aşağıdaki rakamlar commit mesajına değil, doğrudan koda göre yazılmıştır.

## Önceki durum

Her iade talebi "inceleme" durumuna düşüyordu. Otomatik onay yoktu.

## Yeni kurallar

Bir iade talebi **otomatik onaylanır**, ancak şu 4 koşulun **hepsi** sağlanırsa:

1. Sipariş tarihi **1 Kasım 2026 veya sonrası** olmalı.
2. Ürün **tek seferlik satın alma** olmalı (abonelik ve diğer türler dahil değil).
3. İade tutarı **50 EUR veya altında** olmalı (50 EUR dahil).
4. Hesap en az **30 günlük** olmalı (30. gün dahil) **ve** son 90 günde **en fazla 2 iade** yapılmış olmalı (2 dahil).

## Otomatik onay olmayan durumlar

| Durum | Ne olur? |
|---|---|
| Sipariş tarihi **1 Kasım 2026'dan önce** | Manuel işlem. Yeni kurallar uygulanmaz. |
| Abonelik veya tek seferlik olmayan herhangi bir ürün | İnceleme, **5 iş günü** içinde sonuçlanır. Tutarı ne olursa olsun otomatik onay yoktur. |
| Tek seferlik, ama tutar 50 EUR'dan fazla | İnceleme, **5 iş günü** içinde sonuçlanır. |
| Tek seferlik, ama hesap 30 günden yeni | İnceleme, **5 iş günü** içinde sonuçlanır. |
| Tek seferlik, ama son 90 günde 2'den fazla iade var | İnceleme, **5 iş günü** içinde sonuçlanır. |

## Müşteriye söylerken dikkat

- **Limit 100 EUR değil, 50 EUR'dur.** Commit mesajında "100 EUR" yazıyor ama kodda limit 50 EUR. Kod esas alındı.
- **Abonelikler otomatik onaya dahil değildir.** Commit mesajında "abonelikler dahil" yazıyor ama kod aboneliklerin hepsini incelemeye yönlendiriyor.
- Yeni kurallar yalnızca **1 Kasım 2026 ve sonrası siparişler** için geçerlidir. Bugün (23 Ekim 2026) verilen eski siparişler manuel işlenir.
- Teslim süresi "5 iş günü"dür, takvim günü değildir.

## Ekibin Hakan'a teyit ettirmesi gerekenler

1. 50 EUR mi, 100 EUR mi geçerli olacak? (Kod 50, mesaj 100 diyor.)
2. Abonelikler otomatik onaya dahil mi olacak? (Kod: hayır, mesaj: evet.)
3. "Son 90 günde en fazla 2 iade" kuralında, müşterinin şu an yaptığı iade sayılıyor mu? Kod, geçmişteki iade sayısının 2 veya daha az olmasını arıyor. Yani 2 önceki iadesi olan müşteri hâlâ otomatik onay alabilir.
4. Commit mesajı "testler eklendi" diyor ama commit'te test dosyası yok; iade kuralları için test bulunmuyor. Kodu çalıştırıp test etmedim, yalnızca okudum.

Bu teyitler gelene kadar müşteriye yukarıdaki tablodaki (kod) kuralları söylemeyin, tutar için kesin söz vermeyin.
