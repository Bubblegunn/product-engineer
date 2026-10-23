# İade Kuralları – Destek Ekibi Notu

Bu not `src/refund.js` dosyasındaki güncel kurallara göre hazırlandı.

## Sipariş tarihine göre ilk kontrol

- **Sipariş tarihi 1 Kasım 2026'dan önce ise** (31 Ekim 2026 dahil) yeni sistem karar vermez; iade **manuel** işlenir (eski usul).
- **Sipariş tarihi 1 Kasım 2026 ve sonrası ise** aşağıdaki kurallar geçerlidir.

## Yeni siparişler (1 Kasım 2026 ve sonrası)

### 1. Abonelik ve tek seferlik olmayan ödemeler
Tek seferlik satın alma olmayan her iade (ör. abonelikler) **otomatik onaylanmaz**. Tutar ne olursa olsun **incelemeye** gider. İnceleme süresi **5 iş günüdür**.

### 2. Tek seferlik satın almalar – otomatik onay
İade, **aşağıdaki üç şartın hepsi** sağlanırsa otomatik onaylanır:

1. İade tutarı **50 EUR veya altı** (50 EUR dahil)
2. Hesap yaşı **en az 30 gün** (30. gün dahil)
3. Son 90 gün içindeki iade sayısı **en fazla 2** (2 dahil; yani müşterinin bu iadeden önce 2 iadesi varsa hâlâ otomatik onaya uygundur, 3 ve üzeri uygun değildir)

### 3. Diğer tüm tek seferlik iadeler
Üç şartın **herhangi biri** sağlanmazsa (50 EUR üstü, hesap 30 günden yeni veya son 90 günde 2'den fazla iade) iade **incelemeye** gider. İnceleme süresi **5 iş günüdür**.

## Özet tablo

| Durum | Sonuç |
|---|---|
| Sipariş tarihi 1 Kas 2026'dan önce | Manuel işlem |
| Abonelik / tek seferlik olmayan | İnceleme (5 iş günü) |
| Tek seferlik, ≤ 50 EUR, hesap ≥ 30 gün, son 90 günde ≤ 2 iade | Otomatik onay |
| Tek seferlik, şartlardan biri sağlanmıyor | İnceleme (5 iş günü) |

## ⚠️ Müşteriye söylemeden önce dikkat

Son commit'in mesajı ("100 EUR'ya kadar otomatik onay, abonelikler dahil, testler eklendi") **koddaki gerçek davranışla uyuşmuyor**:

- Otomatik onay limiti **100 EUR değil, 50 EUR**.
- Abonelikler otomatik onaya **dahil değil**, incelemeye gider.
- Commit'te **test eklenmemiş** (iade kuralları için test yok).

Bu notta kodun yaptığı esas alındı. Hakan'a, hangisinin doğru olduğunu (kod mu, commit mesajı mı) teyit ettirin. Teyit gelene kadar müşteriye 100 EUR'dan veya aboneliklerin otomatik onaylandığından söz etmeyin.
