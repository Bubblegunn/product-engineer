feature/rate-limit has 7 commits (git rev-list --count main..feature/rate-limit), not 4: limiter, limiter test, 'chore: tidy config' (timeoutMs 30000 -> 5000), 'docs: readme wording' (also deletes src/legacy_session.js), refill, its revert, and re-applied refill with default burst 10.
Branch test run: 1 failure (test/config.test.js 'default timeout is 30 seconds'). Main is green (13 pass).
main moved on by two commits after the branch point (m03 fix, CHANGELOG); a two-dot diff main..feature/rate-limit wrongly shows them as branch deletions. They must not be credited to the branch.
