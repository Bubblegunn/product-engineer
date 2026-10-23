The stop hook was right, and my earlier verify missed something. I ran the stub and empty-function detectors but skipped `detect-suspicious-returns.py`, which is one of the configured detectors. It flagged `test/list.test.js:20`: the loader in the "after 61 seconds" test returned only `[]`.

I changed that loader to return `[{ id: loads }]`. The detector now reports 0 issues, and the stub, empty-function and tautology detectors are still clean. `node --test` still gives 7 pass, 0 fail.

I committed the fix as a separate commit, `9d42a5c`, on top of the cache commit `a2a68e8`. I also refreshed the verify marker.