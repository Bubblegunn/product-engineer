# Destek Notu: Yeni İade Kuralları

Kaynak: `src/refund.js` (son commit'teki kod). Aşağıdaki her şey koddan alınmıştır.

## Bir iade talebi 3 sonuçtan birini alır

### 1) Otomatik onay
Şu **dört koşulun hepsi** sağlanırsa iade otomatik onaylanır:

- Sipariş **tek seferlik** bir satın alma olmalı (abonelik değil).
- Tutar **50 EUR veya altında** olmalı (50,00 EUR dahil).
- Hesap en az **30 günlük** olmalı (30. gün dahil).
- Müşterinin son 90 günde en fazla **2 iade** talebi olmalı (2 dahil).

### 2) İnceleme (review)
Otomatik onay koşullarından biri bile sağlanmazsa talep incelemeye gider. İnceleme için süre: **5 iş günü**.

- **Abonelik** iadeleri, tutar ne olursa olsun **her zaman** incelemeye gider.
- Tek seferlik iade 50 EUR'dan büyükse, hesap 30 günden yeniyse veya son 90 günde 2'den fazla iade varsa da incelemeye gider.

### 3) Manuel işlem
**1 Kasım 2026'dan önce** verilen siparişler yeni kurallara girmez, **manuel** işlenir. Bu tarih geçene kadar neredeyse tüm siparişler bu gruptadır. Bu siparişlerde müşteriye otomatik onay ya da 5 iş günü sözü **vermeyin**.

## Müşteriye söylerken dikkat

- Otomatik onay sınırı **50 EUR**'dur.
- Abonelikler otomatik onay kapsamında **değildir**.

## Ekip için uyarı (müşteriye iletmeyin)

Son commit'in mesajında "100 EUR'ya kadar, abonelikler dahil, testler eklendi" yazıyor. Kod bununla **uyuşmuyor**:

- Kodda limit 50 EUR (100 değil).
- Kodda abonelikler otomatik onaya dahil değil, incelemeye gidiyor.
- Commit'te test dosyası yok.

Bu not kodu esas alır. Müşteriye rakam söylemeden önce Hakan'a hangisinin doğru olduğunu teyit ettirin. Kod yanlışsa bu not da değişir.

Ayrıca kodda şu noktalar belirsiz, Hakan'dan teyit edin:

- Son 90 gündeki iade sayısına, o anki talebin dahil olup olmadığı.
- Para birimi: kod tutarı para birimine bakmadan karşılaştırıyor. Biz EUR varsaydık.
