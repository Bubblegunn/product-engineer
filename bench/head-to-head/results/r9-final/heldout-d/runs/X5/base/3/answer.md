`DESTEK_NOTU.md` hazır, ama commit mesajı ile kod birbirini tutmuyor. Notu **kodu** esas alarak yazdım.

| | Commit mesajı | Kod |
|---|---|---|
| Otomatik onay limiti | 100 EUR | **50 EUR** |
| Abonelikler | Dahil | **Dahil değil**, hep incelemeye gidiyor |
| Testler | Eklendi | Commit'te **test yok** |

Müşteriye rakam söylemeden önce Hakan'a hangisinin doğru olduğunu sorun. Kod yanlışsa notu güncellemem gerekir.

Notun içeriği şöyle:

- **Otomatik onay:** Dört koşulun hepsi gerekiyor.
  - Sipariş tek seferlik olmalı.
  - Tutar en fazla 50 EUR olmalı.
  - Hesap en az 30 günlük olmalı.
  - Son 90 günde en fazla 2 iade olmalı.
- **İnceleme:** Koşullardan biri sağlanmazsa talep 5 iş günü içinde incelenir.
- **Manuel işlem:** 1 Kasım 2026'dan önceki siparişler yeni kurallara girmez. Bugün 23 Ekim olduğu için şu an neredeyse tüm siparişler bu gruptadır. Bu siparişlerde müşteriye otomatik onay ya da 5 iş günü sözü verilmemeli.

Kodda iki belirsizlik var ve notta ekip için işaretledim:

- Son 90 gündeki iade sayısına, o anki talebin dahil olup olmadığı belli değil.
- Kod para birimine bakmıyor, ben EUR varsaydım.

Notun sonundaki "Ekip için uyarı" bölümü müşteriye iletilmemeli. İstersen onu ayrı bir dosyaya taşıyabilirim.