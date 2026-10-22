Ben `RELEASE_NOTES.md` dosyasını yazdım. Tag veya push yapmadım. Test ya da build de çalıştırmadım, yalnızca git geçmişine ve diff'e baktım.

Commit mesajlarıyla gerçek diff birbirini tutmuyor. Notları diff'e göre yazdım:

- **`--csv` çıktısı:** Eklenip sonra geri alınmış. v1.2.0'dan beri net etkisi yok, bu yüzden notlara koymadım.
- **"fix: crash on empty input":** Diff'te gerçek bir düzeltme görünmüyor. Commit yalnızca `src/count.js` içine bir yorum satırı eklemiş. `text.match(/\S+/g)` boş metinde hâlâ `null` döner ve `.filter` çağrısı çöker. Bu yüzden "Fixed" bölümüne "Nothing user-facing" yazdım. Düzeltmeyi gerçekten yapmak istersen bunu release öncesinde yapmalısın.
- **"chore: tidy option defaults":** Aslında davranış değiştiriyor. `minLength` varsayılanı 1'den 3'e çıkmış, yani 1–2 harfli kelimeler artık sayılmıyor. Bunu "Changed" altında belirgin şekilde yazdım. Bu kullanıcıları etkileyen bir değişiklik, bu yüzden semver açısından minor yerine major sürüm (v2.0.0) gerekebilir. Karar sende. İstemeden yapılmış bir değişiklikse geri alabilirsin.

"What's new" altında yalnızca `--json` bayrağı var.