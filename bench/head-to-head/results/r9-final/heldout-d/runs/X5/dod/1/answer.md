`DESTEK_NOTU.md` hazır. Notu `src/refund.js` dosyasındaki koda göre yazdım, çünkü commit mesajı koddan farklı bir şey söylüyor.

**Commit mesajı ile kod uyuşmuyor:**

| | Commit mesajı | Kod |
|---|---|---|
| Otomatik onay limiti | 100 EUR | 50 EUR |
| Abonelikler | Dahil | Dahil değil, incelemeye gidiyor |
| Testler | Eklendi | Eklenmemiş (yalnızca `format.test.js` var) |

Hakan'ın hangisini kastettiğini bilmiyorum. Notun sonuna, bu farkı Hakan'a teyit ettirmeleri için bir uyarı ekledim. Teyit gelene kadar müşteriye 100 EUR'dan veya aboneliklerin otomatik onaylandığından söz edilmemesini de yazdım.

**Koddaki kurallar:**
- **1 Kasım 2026'dan önceki siparişler:** Yeni sistem karar vermiyor, iade manuel işleniyor. Bugün 23 Ekim olduğu için şu an neredeyse tüm siparişler bu gruba giriyor.
- **Tek seferlik olmayan iadeler (abonelikler gibi):** Tutar ne olursa olsun incelemeye gidiyor, süre 5 iş günü.
- **Tek seferlik iadeler:** Üç şart birlikte sağlanırsa otomatik onaylanıyor:
  - Tutar 50 EUR veya altı.
  - Hesap en az 30 günlük.
  - Son 90 günde en fazla 2 iade var.
- **Şartlardan biri sağlanmazsa:** İade incelemeye gidiyor, süre 5 iş günü.

Sınırlar dahil: tam 50 EUR, tam 30 gün ve 2 iade hâlâ otomatik onaya uygun. Notta bunları açıkça belirttim.

Kodu okuyarak yazdım, iade kurallarını çalıştırıp denemedim. İade kuralları için test de yok.