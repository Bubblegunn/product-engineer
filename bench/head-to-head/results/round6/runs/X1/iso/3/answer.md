Commit `4b4dcb4` created. Nothing pushed.

- **Staged test file:** Only `src/discount.js` was staged. Your test file was modified but unstaged, so I staged `test/discount.test.js` too. The message mentions the tests.
- **Case-insensitive lookup:** The diff did more than add SPRING15. It also uppercases codes before lookup, so `spring15`, `welcome10` and `vip20` now match. The message says this explicitly, because it changes behavior for the existing codes.
- **Tests:** All 4 tests pass with `node --test`.
- **Plain-language section:** I added the Turkish section from your CLAUDE.md. I left out the "Otomasyon etkisi" line, because this change doesn't reduce manual work.
- **`scratch.log`:** Left untracked and not committed.