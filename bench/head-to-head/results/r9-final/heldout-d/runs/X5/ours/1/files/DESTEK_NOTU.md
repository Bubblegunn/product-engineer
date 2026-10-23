# İade Kuralları – Destek Ekibi Notu

Bu not, iade kararlarının şu an nasıl verildiğini anlatır. Kurallar `src/refund.js` dosyasındaki koda göre yazılmıştır.

## 1. Sipariş tarihine göre

- **1 Kasım 2026'dan önce verilen siparişler:** Yeni kurallar uygulanmaz. İade **elle (manuel)** işlenir.
- **1 Kasım 2026 ve sonrası siparişler:** Aşağıdaki kurallar uygulanır.

## 2. Otomatik onay (müşteri beklemeden iadesini alır)

İade, **aşağıdaki dört koşulun hepsi** sağlanırsa otomatik onaylanır:

1. Sipariş **tek seferlik** bir satın alma olmalı (abonelik değil).
2. Tutar **50 EUR veya daha az** olmalı (tam 50,00 EUR dahil).
3. Hesap **en az 30 günlük** olmalı (tam 30. gün dahil).
4. Müşterinin **son 90 günde en fazla 2 iadesi** olmalı.

## 3. İnceleme (otomatik onay yok)

Dört koşuldan **biri bile** sağlanmıyorsa iade **incelemeye** gider. İnceleme süresi **5 iş günüdür**. Örnekler:

- Tutar 50 EUR'dan fazla (ör. 50,01 EUR)
- Hesap 30 günden yeni
- Son 90 günde 2'den fazla iade
- **Abonelik iadeleri:** Tutar ne kadar düşük olursa olsun, her zaman incelemeye gider.

## Müşteriye söylenebilecekler

- "Tek seferlik alımlarda 50 EUR'ya kadar olan iadeler, koşullar uygunsa otomatik onaylanır."
- "İncelemeye giden iadeler için süre 5 iş günüdür."
- "Abonelik iadeleri her zaman incelenir."

## Dikkat

- **Otomatik onay limiti 100 EUR değil, 50 EUR'dur.** Son değişikliğin açıklama satırında "100 EUR'ya kadar, abonelikler dahil" yazıyor; kod bunu yapmıyor. Müşteriye 100 EUR veya "abonelikler otomatik onaylanır" demeyin.
- "Son 90 günde en fazla 2 iade" kuralında, mevcut talebin bu sayıya dahil olup olmadığı kodda belirtilmemiş. Müşteri 2 iadesi olduğu sınırda ise kesin söz vermeyin.
- Kodda para birimi kontrolü yok; tutarlar EUR kabul edilmiştir.
