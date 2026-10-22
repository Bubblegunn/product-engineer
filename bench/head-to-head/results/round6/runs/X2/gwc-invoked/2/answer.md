`PR.md` yazıldı (repo kökü). Kod değişmedi. Testleri çalıştırmadım ve PR.md bunu belirtiyor.

Branch'te 3 commit var (3 dosya, +35/−1): `src/retry.js` retry helper'ı ekliyor, `runSync` fetch'i 5 deneme ve 200 ms bekleme ile sarıyor, `test/retry.test.js` testleri ekliyor.

Commit mesajları kodla uyuşmuyor, bu yüzden PR.md'ye "reviewer'ların bilmesi gerekenler" bölümü ekledim:
- **"Exponential backoff" yanlış.** Kod her denemede sabit `delayMs` kadar bekliyor. Artış, jitter ve üst sınır yok.
- **"Full test coverage" yanlış.** "Throws the last error when attempts are exhausted" testi `test.skip` ile atlanıyor. `runSync`'in retry davranışı için de test yok.
- **Diğer sınırlar:** her hata yeniden deneniyor, kalıcı hatalar da. Zaman aşımı yok. Hata durumunda sync'in hata vermesi yaklaşık 800 ms (4 bekleme × 200 ms) daha geç oluyor.

Commit tarihleri 3–5 Eylül, yani son 7 günün dışında. Skill'in varsayılan penceresini kullanmadım ve `main..feature/retry` aralığını esas aldım. PR.md bunu belirtiyor.

Karar sana kalıyor: açmadan önce commit başlıklarını düzeltmek ya da skip'li testi açmak istersen söyle. Şu an PR.md bu farkları açıkça yazıyor.