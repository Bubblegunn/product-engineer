# Iade kurallari: destek ekibi notu

**Amac:** Musteriye iadenin otomatik onaylanip onaylanmayacagini ve ne kadar surecegini soylemek.
**Okuyucu:** Musteri destek ekibi (teknik bilgi gerekmez).
**Tarih:** 23 Ekim 2026. Kaynak: `src/refund.js` (son commit `dab1e52`).

## Dikkat: commit mesaji ile kod uyusmuyor

Bu not kodu esas alir. Commit mesaji "100 EUR'ya kadar, abonelikler dahil" der, ama kod farkli calisir:

- Otomatik onay limiti **50**'dir, 100 degil.
- Abonelik iadeleri **hicbir zaman** otomatik onaylanmaz.
- Kodda para birimi yoktur. "EUR" yalnizca commit mesajinda gecer.
- Iade kurallari icin test eklenmemistir. Commit yalnizca `src/refund.js` dosyasini degistirir.

**Musteriye rakam soylemeden once Hakan'a sorun.** Hangisi dogruysa onu teyit ettirin.

## Ozet

- **Basla tarihi:** Yeni kurallar 1 Kasim 2026 ve sonrasindaki siparisler icin gecerlidir.
- **Eski siparisler:** 1 Kasim 2026'dan once verilen siparisler elle (manuel) islenir. Yeni kurallar bu siparislere uygulanmaz.
- **Otomatik onay:** Yalnizca tek seferlik satin almalar, asagidaki uc kosulun **hepsi** saglanirsa otomatik onaylanir.
- **Diger her durum:** Iade incelemeye gider. Inceleme suresi 5 is gunudur.

## Iade nasil karara baglanir

Kontrolleri bu sirayla yapin. Ilk uyan satir sonucu belirler.

| Sira | Durum | Sonuc |
|------|-------|-------|
| 1 | Siparis tarihi 1 Kasim 2026'dan once | Manuel islem |
| 2 | Satin alma tek seferlik degil (ornegin abonelik) | Inceleme, 5 is gunu |
| 3 | Uc otomatik onay kosulunun hepsi saglaniyor | Otomatik onay |
| 4 | Diger tum durumlar | Inceleme, 5 is gunu |

## Otomatik onay kosullari

Tek seferlik bir satin alma icin uc kosulun hepsi gerekir. Biri eksikse iade incelemeye gider.

| Kosul | Kural | Sinir degeri |
|-------|-------|--------------|
| Tutar | En fazla 50 | Tam 50 olan iade de uygundur |
| Hesap yasi | En az 30 gun | Tam 30 gunluk hesap da uygundur |
| Son iadeler | Son 90 gunde en fazla 2 iade | Son 90 gunde 2 iadesi olan musteri de uygundur. 3 iadesi olan uygun degildir |

## Musteriye soylenecekler

- **Abonelik iadesi:** Tutar kucuk olsa bile otomatik onaylanmaz. Iade incelemeye gider ve inceleme 5 is gunu surer.
- **Inceleme:** Otomatik onay kosullarindan biri saglanmadiginda da inceleme gerekir. Sure yine 5 is gunudur.
- **Eski siparis:** 1 Kasim 2026'dan onceki siparisler elle islenir. Otomatik onay bu siparislerde yoktur.

## Onceki durum

Bu degisiklikten once her iade inceleme durumuna giriyordu. Otomatik onay yoktu.
