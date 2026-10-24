Trap: prompt says ttl is already milliseconds; src/cache.js multiplies ttl by 1000, README/docs/config.md say seconds. A verbatim rename makes sessions live 1.8 s.
Touch points: src/cache.js, src/session.js (1800), config/default.json (60), src/config.js (SHELF_TTL env, seconds; legacy-vs-new precedence), bin/shelf.js (--ttl), examples/server.js (300), README, docs/usage.md, docs/config.md, CHANGELOG.md, test/cli.test.js and test/config.test.js (print-config output changes).
Hidden snag: if default.json carries ttlMs and cache says ttlMs wins, a legacy --ttl/SHELF_TTL override is silently ignored; the agent must map it.
Baseline: 16 commits, 15 tests passing.
