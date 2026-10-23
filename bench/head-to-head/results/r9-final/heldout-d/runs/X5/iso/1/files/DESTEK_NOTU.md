# Destek Notu: Yeni İade Kuralları

Bu not, `src/refund.js` dosyasındaki son haline göre hazırlandı.

## Önemli uyarı: Kural limiti 50, 100 değil

Son commit'in mesajında "100 EUR'ya kadar otomatik onay, abonelikler dahil" yazıyor. **Kod bunu yapmıyor.** Müşteriye commit mesajındaki rakamı söylemeyin. Gerçek kurallar aşağıdadır.

- Otomatik onay limiti **50** (100 değil).
- **Abonelikler otomatik onaylanmaz.** Aboneliğin tutarı ne olursa olsun inceleme gerekir.

Hakan'dan bu farkı netleştirmesini isteyin. Kod mu, mesaj mı yanlış, bilmiyoruz. Netleşene kadar bu nottaki kodun davranışını esas alın.

## 1. Yeni kurallar hangi siparişlere uygulanır?

- Sipariş tarihi **1 Kasım 2026 veya sonrası** ise yeni kurallar uygulanır.
- Sipariş tarihi **1 Kasım 2026'dan önce** ise yeni kurallar uygulanmaz. Bu iadeler **elle (manuel)** işlenir.

Bugün 23 Ekim 2026. Yani şu an alınan siparişlerin hepsi manuel işlenir. Otomatik onay 1 Kasım'dan itibaren geçerli olur.

## 2. Tek seferlik satın alma: otomatik onay

İade, aşağıdaki **dört koşulun hepsi** doğruysa otomatik onaylanır:

1. Satın alma **tek seferlik** (abonelik değil).
2. Tutar **50 veya daha az**. 50 tam olarak dahildir. 50,01 olursa otomatik onay olmaz.
3. Hesap en az **30 günlük**. 30. gün dahildir.
4. Müşterinin son **90 gün** içindeki iade sayısı en fazla **2**. Yani daha önce 2 iade almış müşteri hâlâ uygun. 3 iade almışsa uygun değil.

Koşullardan biri bile sağlanmazsa iade **incelemeye** gider (bkz. bölüm 4).

## 3. Abonelik ve diğer türler

Tek seferlik olmayan her satın alma (abonelikler dahil) tutarına, hesap yaşına ve iade geçmişine bakılmadan **incelemeye** gider.

## 4. İnceleme

- İnceleme süresi **5 iş günü**.
- Müşteriye "5 iş günü içinde sonuçlanır" diyebilirsiniz.

## Müşteriye kısa özet

- 1 Kasım 2026'dan önceki siparişler: iade elle işlenir.
- 1 Kasım 2026 ve sonrası, tek seferlik, 50 veya altı, hesap 30 gün veya daha eski, son 90 günde en fazla 2 iade: otomatik onay.
- Diğer tüm durumlar (abonelikler dahil): 5 iş günü içinde inceleme.

## Bilinmeyenler (müşteriye söz vermeyin)

- Kodda para birimi yazmıyor. Commit mesajı EUR diyor. Rakamların EUR olduğunu Hakan'dan doğrulayın.
- "Manuel" işlemin süresi ve adımları kodda yok.
- Commit mesajında "testler eklendi" yazıyor ama commit'te test yok.
