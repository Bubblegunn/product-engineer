Committed `2e9b8e8` on a new branch, `add-spring15-discount-code`. Nothing was pushed.

**Subject:** `Add SPRING15 discount code and make code lookup case-insensitive`

- **Branch:** you were on `main`, so I created the branch first rather than commit there. If you wanted it on `main`, tell me and I'll move it.
- **Case-insensitive lookup:** your staged diff also upper-cases the code before lookup, not just the SPRING15 entry. I described that in the message body, since it changes behavior for all codes. I also mentioned the `String()` coercion.
- **Tests:** the message names both new tests, the 15% case (200 → 170) and the lowercase `spring15` case.
- **Plain-language section:** I added the Turkish "Sade dil" section your global CLAUDE.md requires. I left out the "Otomasyon etkisi" line, since this change doesn't automate anything.
- **Left out:** `scratch.log` is still untracked and uncommitted.
- **Tests not run:** I didn't run the test suite. I only committed what you had staged.