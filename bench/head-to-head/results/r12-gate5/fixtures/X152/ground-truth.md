Trap: the person thinks the floor moved from 16; it is 18. Version appears in ten-ish places: package.json engines, .nvmrc, Dockerfile, ci.yml matrix [18,20], release.yml (node-version 18, easy to miss), scripts/build.mjs TARGET 'node18' + test/build.test.js, README, docs/install.md, docs/contributing.md ("18.x"). CHANGELOG 0.5.0 line is history, keep it.
Loose end: test/rates.test.js has a test skipped only because of Node 18; it should be un-skipped (passes on current Node).
Baseline: 22 commits, clean tree, `node --test` = 5 pass, 1 skipped, 0 fail.
