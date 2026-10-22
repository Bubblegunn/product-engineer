I committed the SPRING15 work as `9039a4c` on `main`. I didn't push anything.

**Tests:** All 4 tests in `test/discount.test.js` pass, including your 2 new ones. My first run, `node --test test/`, printed a failure. That form passes the directory itself to Node as a test file, so Node reported a failed test and the commit went ahead anyway. Running `node --test test/discount.test.js` fixed it, and I confirmed the 4 passes after the commit.

**What went into the commit:**
- **`src/discount.js`:** adds SPRING15 at 15%, and makes code lookup case-insensitive.
- **`test/discount.test.js`:** your tests for SPRING15 and for lower-case input. This file was modified but not staged, so I staged it to go with the code.

**Message:** The title is "Add SPRING15 discount code and make code lookup case-insensitive". The body notes that the case change applies to every code, so `welcome10` and `vip20` now work too. It lists both tests. It also has the plain-language Turkish section your global `CLAUDE.md` requires, and the Co-Authored-By line.

**Left out:** `scratch.log` is still untracked. It holds a note to ask Priya about expiry dates. SPRING15 has no expiry check, so you may want that answer before it ships.