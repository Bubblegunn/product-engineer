# İade kuralları: müşteriye ne söyleyeceğiz

Amaç: Bir iade talebinin nasıl sonuçlanacağını müşteriye doğru anlatmak.
Okuyucu: Müşteri destek ekibi (teknik bilgi gerekmez).
Tarih: 23 Ekim 2026. Kaynak: `src/refund.js`, Hakan'ın son değişikliği.

> Onay bekliyor: Hakan'ın commit mesajı kodla çelişiyor. Mesaj "100 EUR'ya kadar, abonelikler dahil" diyor. Kod ise 50 EUR sınırı koyuyor ve abonelikleri otomatik onaya almıyor. Bu not kodu esas alır. Müşteriye söylemeden önce Hakan'a sorun.

## Özet: üç sonuç mümkün

Her iade talebi şu üç sonuçtan birini alır:

- **Otomatik onay:** Sistem talebi hemen onaylar. Kimse elle bakmaz.
- **İnceleme:** Ekip talebi inceler. Süre en çok 5 iş günüdür.
- **Elle işlem:** 1 Kasım 2026'dan önceki siparişler eski usulle, elle işlenir.

Sonucu sırayla şu sorular belirler. İlk uyan satır geçerlidir.

| Sıra | Soru | Cevap | Sonuç |
|------|------|-------|-------|
| 1 | Sipariş tarihi 1 Kasım 2026'dan önce mi? | Evet | Elle işlem |
| 2 | İade tek seferlik bir satın alma için mi? | Hayır (örneğin abonelik) | İnceleme, en çok 5 iş günü |
| 3 | Aşağıdaki üç şartın hepsi sağlanıyor mu? | Evet | Otomatik onay |
| 4 | Üç şarttan biri sağlanmıyor mu? | Evet | İnceleme, en çok 5 iş günü |

## Otomatik onay için üç şartın hepsi gerekir

Sipariş 1 Kasım 2026 veya sonrasında verilmiş, tek seferlik bir satın alma olmalıdır. Bunun yanında şu üç şartın hepsi sağlanmalıdır:

1. **Tutar:** İade tutarı 50 EUR veya daha azdır. Tam 50 EUR de otomatik onay alır.
2. **Hesap yaşı:** Hesap en az 30 günlüktür. Tam 30 gün de yeterlidir.
3. **Son iadeler:** Müşterinin son 90 günde en fazla 2 iadesi vardır. Üçüncü iade bu sınırı aşar ve incelemeye gider.

Bir şart bile sağlanmazsa talep otomatik onay almaz. İncelemeye gider ve sonuç en çok 5 iş günü içinde çıkar.

## Müşteriye şunları söyleyin

- **Abonelik iadesi:** Abonelik iadeleri otomatik onay almaz. Her biri incelenir ve sonuç en çok 5 iş günü içinde çıkar. Tutar küçük olsa da bu böyledir.
- **50 EUR üzeri iade:** Talep incelenir. Sonuç en çok 5 iş günü içinde çıkar.
- **Yeni hesap:** Hesabı 30 günden gençse talep incelenir.
- **Sık iade:** Son 90 günde 2'den fazla iadesi varsa talep incelenir.
- **Eski sipariş:** 1 Kasım 2026'dan önceki siparişler elle işlenir. Bu siparişler için bu notta bir süre sözü yoktur. Süreyi söylemeden önce ekip liderinize sorun.

## Bu notta olmayanlar

- **Para birimi:** Kod para birimini kontrol etmez. EUR bilgisi commit mesajından gelir.
- **Üçüncü iade sayımı:** Kod, "son 90 günde iade sayısı" değerini dışarıdan alır. Mevcut talebin bu sayıya dahil olup olmadığı kodda yazmaz.
- **Kasım öncesi işlem:** Elle işlenen siparişler için süre veya kural kodda yoktur.
