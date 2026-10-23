# Destek Notu: Yeni İade Kuralları

Kaynak: 20 Ekim 2026 tarihli son değişiklik (`src/refund.js`). Not 23 Ekim 2026'da hazırlandı.

## ⚠️ Önce bunu bilin

Değişikliğin commit mesajı kodla **uyuşmuyor**. Müşteriye mesajdaki değil, aşağıdaki (koddaki) değerleri söyleyin:

| Commit mesajında yazan | Kodda gerçekte olan |
| --- | --- |
| Otomatik onay 100 EUR'ya kadar | Otomatik onay limiti **50 EUR** |
| Abonelikler dahil | Abonelikler otomatik onaylanmıyor, **inceleme**ye gidiyor |
| Testler eklendi | İade kuralları için test eklenmemiş |

Hakan'a (geliştirici) hangisinin doğru olduğunu teyit ettirmeden müşteriye "100 EUR" veya "abonelikler otomatik onaylanır" demeyin.

## Ne zaman geçerli?

- Yeni kurallar yalnızca **sipariş tarihi 1 Kasım 2026 veya sonrası** olan siparişler için geçerli (iade tarihi değil, sipariş tarihine bakılıyor).
- **1 Kasım 2026'dan önce verilen siparişlerin** iadeleri otomatik değerlendirilmez; **manuel** (elle) işlem görür. Bu siparişler için inceleme süresi (5 iş günü) kodda tanımlı değildir, bu yüzden müşteriye süre sözü vermeyin.
- Bugün (23 Ekim) itibarıyla bütün siparişler bu eski tarihli gruba girdiği için hepsi manuel işlenir.

## 1 Kasım 2026 ve sonrası siparişler

Önce iade türüne bakılır.

**1. Tek seferlik satın alma (`one-time`)**

İade, aşağıdaki **üç koşulun hepsi** sağlanırsa **otomatik onaylanır**:

- İade tutarı **50 EUR veya daha az** (tam 50 EUR dahil).
- Hesap en az **30 günlük** (30. gün dahil).
- Son 90 günde **en fazla 2 iade** yapılmış (3 veya daha fazlaysa otomatik onay yok).

Koşullardan **biri bile** sağlanmazsa iade **incelemeye** gider.

**2. Diğer tüm türler (abonelikler dahil)**

Tutar, hesap yaşı veya geçmiş iade sayısı ne olursa olsun otomatik onay **yok**. İade doğrudan **incelemeye** gider.

## İnceleme süresi

İncelemeye giden her iade için süre **5 iş günü**.

## Önceki durum

Bu değişiklikten önce her iade, koşul aranmadan "inceleme" durumuna alınıyordu (otomatik onay yoktu).

## Müşteriye kısa özet

- 1 Kasım 2026 ve sonrasındaki siparişlerde, tek seferlik alımlarda 50 EUR'ya kadar iadeler (hesap 30 günden eskiyse ve son 90 günde en fazla 2 iade varsa) otomatik onaylanır.
- Diğer tüm iadeler (abonelikler dahil, 50 EUR üstü, yeni hesaplar, sık iade edenler) 5 iş günü içinde incelenir.
- 1 Kasım 2026'dan önceki siparişlerin iadeleri manuel değerlendirilir.

## Doğrulanamayanlar

- Kodu çalıştırmadım ve test etmedim, yalnızca değişikliği okudum.
- "Son 90 günde en fazla 2 iade" sayısına şu anki iade talebinin dahil olup olmadığı kodda belli değil.
- Diğer iade türlerinin (`one-time` dışındakilerin) adları kodda listelenmiyor. Abonelik bunlardan biri olarak varsayıldı.
