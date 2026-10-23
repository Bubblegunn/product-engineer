# Destek Notu: İade Kuralları

> **DİKKAT – müşteriye söylemeden önce okuyun:** Hakan'ın son commit mesajında "100 EUR'ya kadar otomatik onay, abonelikler dahil" yazıyor. **Koddaki gerçek kurallar farklı:** limit 50 (100 değil) ve abonelikler otomatik onaya dahil değil. Bu not **kodun yaptığı şeye** göre yazıldı. Müşteriye 100 EUR veya "abonelikler dahil" demeyin; önce Hakan'la teyit edin (bkz. en alttaki "Teyit edilmesi gerekenler").

## Hangi siparişlere uygulanır?

- **1 Kasım 2026 ve sonrasında verilen siparişler** aşağıdaki kurallara göre değerlendirilir.
- **1 Kasım 2026'dan önce verilen siparişler** (31 Ekim 2026 dahil) otomatik değerlendirilmez; sonuç **"manuel"** olur (elle ele alınır). Bu siparişlerde otomatik onay ve 5 iş günü sözü geçerli değildir.

## Otomatik onay (anında)

İade ancak **aşağıdaki dört koşulun hepsi** sağlanırsa otomatik onaylanır:

1. Ürün **tek seferlik satın alma** olmalı ("one-time").
2. İade tutarı **50'yi geçmemeli** (50 dahil).
3. Hesap en az **30 gün** önce açılmış olmalı (30. gün dahil).
4. Son **90 gün** içindeki önceki iade sayısı **en fazla 2** olmalı (yani 2 önceki iadesi olan müşteri hâlâ uygun; 3 veya daha fazlası uygun değil).

## İnceleme (otomatik onay olmazsa)

- Yukarıdaki koşullardan **biri bile** sağlanmazsa iade **incelemeye** gider.
- İnceleme süresi: **5 iş günü**.
- **Abonelikler (tek seferlik olmayan her şey)** tutar, hesap yaşı ya da iade geçmişi ne olursa olsun **her zaman incelemeye** gider; otomatik onaylanmaz.

## Hızlı özet

| Durum | Sonuç |
|---|---|
| Sipariş 1 Kasım 2026'dan önce | Manuel |
| Abonelik / tek seferlik olmayan | İnceleme, 5 iş günü |
| Tek seferlik, tutar > 50 | İnceleme, 5 iş günü |
| Tek seferlik, hesap 30 günden yeni | İnceleme, 5 iş günü |
| Tek seferlik, son 90 günde 3+ iade | İnceleme, 5 iş günü |
| Tek seferlik, tutar ≤ 50, hesap ≥ 30 gün, son 90 günde ≤ 2 iade | Otomatik onay |

## Teyit edilmesi gerekenler (Hakan'a sorun)

1. **Limit 50 mi, 100 mü?** Kod 50 diyor, commit mesajı 100 EUR diyor.
2. **Abonelikler dahil mi?** Kod dahil etmiyor, commit mesajı ediyor.
3. **Para birimi:** Kodda para birimi yok, sadece sayı var. 50'nin EUR olduğu koddan doğrulanamıyor.
4. **Testler:** Commit mesajı "testler eklendi" diyor, ama commit'te hiç test dosyası yok (iade için test bulunmuyor).
5. **1 Kasım 2026 tarihi** commit mesajında geçmiyor; kodda var. Bilinçli mi, teyit edin.
