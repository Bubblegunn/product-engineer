# Commits since v5.0.0

Output of `git log --format='%h %ad %s' --date=short --name-only v5.0.0..HEAD`, oldest first.

2a8c5e1 2026-10-03 refactor(wait): move the wait-time rounding into its own helper
    files: src/wait.js

6e0b93d 2026-10-05 feat(sms): add a "text me when it is my turn" button to the queue page
    files: src/sms.js, src/queue.html

0f7d24a 2026-10-06 docs: explain the reminder setting in the README
    files: README.md

b41c8e9 2026-10-08 fix(security): escape patient notes on the printed slip so pasted markup cannot run
    Notes that contain angle brackets or quotes are written as plain text.
    files: src/slip.js

9d3f06a 2026-10-09 Revert "feat(sms): add a "text me when it is my turn" button to the queue page"
    files: src/sms.js, src/queue.html

c57e2b8 2026-10-10 chore: bump version to 5.0.1
    files: package.json

7a4d1fe 2026-10-11 fix(display): show the wait in minutes once a queue passes an hour
    files: src/display.js

e8f20c6 2026-10-12 perf(board): paginate the waiting board, 25 per page
    No timing was taken before or after the change.
    files: src/board.js
