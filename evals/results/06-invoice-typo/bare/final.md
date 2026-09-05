Fixed and committed.

- `src/invoice.js:5` — "welcom" → "welcome"
- Committed as `0a7bea7` on a new branch `fix-invoice-footer-typo` (you were on `main`, so I branched first rather than committing directly to the default branch). Not pushed.

Two unrelated things I noticed in that file but left alone: `var unused = hotel.vatNumber;` on line 3 is dead code, and there's a TODO about moving to the template engine. Say the word if you want either handled.
