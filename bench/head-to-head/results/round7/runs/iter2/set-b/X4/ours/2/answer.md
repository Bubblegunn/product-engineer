Aramayı hızlandırdım ve Marta için `PR.md` dosyasını yazdım. Commit atmadım, çünkü bunu istemediniz.

**Değişiklik:** `src/availability.js` eskiden her bisikleti 50.000 rezervasyonun hepsiyle karşılaştırıyordu. Şimdi rezervasyonlara bir kez bakıyor ve istenen tarihle çakışan bisikletleri bir kümeye ekliyor. Sonra bu bisikletleri listeden çıkarıyor. Çakışma kuralı ve fiyat, sonra id sıralaması aynı kaldı.

**Testler:** Son düzenlemeden sonra `npm test` (`node --test`) çalıştırdım. Çıktısı şöyle:
- `✔ booked bike is not offered`
- `✔ back-to-back bookings are allowed`
- `ℹ tests 2`, `ℹ pass 2`, `ℹ fail 0`

"Davranış değişmedi" sözüm bu iki teste ve aşağıdaki karşılaştırmaya dayanıyor. Bu testler sadece 3 bisiklet ve 1 rezervasyonu kapsıyor. Büyük veri için kanıt karşılaştırma betiğinden geliyor.

**Ölçüm:** 400 bisiklet, 50.000 rezervasyon ve 3 günlük bir istekle, tohumlu rastgele veride eski ve yeni kodu karşılaştırdım. Gerçek veride ölçmedim. İki kod da aynı 234 bisikleti aynı sırayla döndürdü (`same result: true`).

| | Arama başına süre, ilk ölçüm | Arama başına süre, son ölçüm |
|---|---|---|
| Önce | yaklaşık 101 ms | yaklaşık 78 ms |
| Sonra | yaklaşık 0,95 ms | yaklaşık 0,82 ms |

İki ölçüm arasında fark var, çünkü süre makinenin o anki yüküne göre değişiyor. İkisinde de fark yaklaşık 100 kat.

**PR.md:** Marta için sade dille yazdım. Ne değiştiğini, ne kadar hızlandığını ve onun bir şey yapmasına gerek olmadığını anlatıyor. Dosyadaki rakamlar ilk ölçümden (101 ms ve 0,95 ms). "Yaklaşık 100 kat" ifadesi iki ölçümde de geçerli, bu yüzden dosyayı değiştirmedim.