Fixed and committed on branch `fix-invoice-footer-typo` (you were on `main`, so I branched; nothing is pushed).

**The change** — `src/invoice.js:5`, one word: `welcom` → `welcome`.

**What I observed**, rather than just assuming:
- Called `footer()` and read the rendered output aloud: "Thank you for staying with us. We hope to welcome you again."
- Confirmed no other `welcom` typo remains in `src/`.

**What I could not check:**
- I did not see a real rendered invoice PDF. The README says this module renders a PDF footer, but the repo has no PDF pipeline in it — I only verified the string this function returns. If the PDF is assembled elsewhere, someone should eyeball one real invoice.
- `npm test` runs clean but reports **0 tests** — there is no test suite here, so passing tests is not evidence of anything.
- The corrected text was read only by me, not by a second person.

**Not shipped** (recorded in the commit message, with reasons): the file's TODO about moving to the template engine, and two nearby cleanups — the unused `hotel.vatNumber` variable and the `var` loop counter in `total()`. All real, none related to the guest's report; I kept this to one reviewable change rather than improving things nearby.
