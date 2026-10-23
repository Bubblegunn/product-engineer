`DESTEK_NOTU.md` hazır, ama ekibe vermeden önce Hakan'a sormanız gereken bir çelişki var. Commit mesajı ile koddaki kurallar uyuşmuyor. Notu **kodu** esas alarak yazdım.

| | Commit mesajı | Gerçek kod (`src/refund.js`) |
|---|---|---|
| Otomatik onay limiti | 100 EUR | **50 EUR** |
| Abonelikler | Otomatik onaya dahil | **Hep incelemeye gider** |
| Testler | "Eklendi" | Yok. Commit'te sadece `refund.js` değişti, `test/` altında iade testi de yok. |

Nota yazdığım kurallar (kodda var):
- **1 Kasım 2026'dan önceki siparişler:** otomatik karar yok, manuel süreç.
- **Tek seferlik alımlar:** üç koşulun hepsi sağlanırsa otomatik onay. Tutar en fazla 50 EUR, hesap en az 30 günlük, son 90 günde en fazla 2 iade.
- **Diğer her durum:** incelemeye gider, en fazla 5 iş günü sürer. Bu, abonelikleri ve tek seferlik olmayan her alımı da kapsar.

Kodda olmayan iki şey var:
- Manuel sürecin ne olduğu ve ne kadar süreceği kodda yok, notta da yazmadım.
- Tarihler metin olarak karşılaştırılıyor. `orderDate` `YYYY-MM-DD` biçiminde gelmiyorsa 1 Kasım kontrolü yanlış çalışabilir. Bunu doğrulamadım.

Hakan 100 EUR ve abonelikleri kastettiyse hata kodda demektir. O zaman koddaki rakamı düzeltmeli, ben de notu güncellerim.