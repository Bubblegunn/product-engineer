---
name: customer-block
description: Use when committing, or writing a commit message or a pull request description, for software other people use. When told to commit, it commits without asking, unstages a file that looks like a secret and says so, and makes one commit per unrelated group. Puts a plain-language "For the customer" block in every message (at the end of a commit, first in a pull request), what changed, why it matters, and an automation effect only when a manual step really disappeared.
license: MIT
metadata:
  author: Efe Genc
  version: 0.7.0
  source: https://github.com/Bubblegunn/product-engineer
  measuredBy: [customerBlock]
---

# customer-block

Rule 2 of the product-engineer skill on its own, for teams that want the block and
nothing else. The full skill is `product-engineer` in the same repository.

## When you are told to commit

When the person tells you to commit, commit. Do not ask which files or for confirmation.
If a staged file looks like a secret (`.env`, `*.pem`, `*.key`, `credentials.*`, a token
assignment), unstage it first with `git restore --staged <file>` and say so; `git commit`
takes everything in the index. If the rest holds unrelated work, make one commit per group
(a group is the set of files that belong to one piece of work): stage one group, commit it
with its own message, then stage the next. End with what you committed and what you left out.

## The block

Commit messages end with the block, the git convention. Pull request descriptions open
with it: the block is the first thing after the title line, so a reader who stops after the
first screen has read the part written for them, and the technical detail follows below.
The block itself is the same in both:

```
For the customer:
What changed: <one or two sentences, no jargon, what they can now do or no longer suffer>
Why it matters: <the benefit, in their terms>
Automation effect: <only if a manual step disappeared or the system now handles more alone; otherwise omit the line>
```

Write the headings in the language your team writes. English, Turkish, Japanese and
Chinese are accepted as they are; for another language the team names its headings in
`.product-engineer.json`. The table is in the product-engineer skill,
`references/headings.md`.

In a pull request description, say what each part of the diff shows. Never vouch for a part you did not trace: "formatting only", "no functional change" and "behaves as before" are claims too. For a part you did not trace, write that you did not trace it.

Rules: no jargon a non-engineer would have to look up; a pure refactor gets one line
under `What changed`; a bug fix says what the customer saw before and sees now; never
invent an automation effect. Merge, fixup, squash and revert commits do not need the
block.

## Fixes and refactors

A fix ships with its test. If the change is a fix and no test file changes, write the test in the same commit: it fails before the fix and passes after it. Check `git status` before you report: if no test file changed, add the test first. A docs-only fix needs none. A refactor says in its block only that users see no change, with the test command and its result, and names no benefit such as faster, cleaner or safer unless you measured it.

The final answer for a refactor is exactly three lines, with no benefit word anywhere
(faster, cleaner, safer, more reliable, easier):

```
Ran: <command>: <result>.
Changed for users: nothing; only <the tests> pin that.
Not checked: <what you did not check>.
```

In the first line, `<the tests>` are the covering tests named by their test names. State that behaviour is unchanged only as "the tests show" it, never as a flat fact. If no test covers the moved code, say so on the third line.

## The observed result

Before you commit a fix, run the project's test command if it has one (`scripts.test` in
`package.json`, a `test` target in the `Makefile`, `pytest`, `go test`). Write what you saw
in the message body or the final answer, outside the block. If nothing could run, write
`not run` and why. The block itself still does not count a test as evidence.

```
ran `npm test`: 212 passed, 0 failed
not run: the staging server is down, so the live export is unchecked
```

## Two pairs

A bug fix. Before:

```
fix(notifications): classify IsSystem events as idempotent and skip the badge increment
```

After:

```
fix(notifications): classify IsSystem events as idempotent and skip the badge increment

For the customer:
What changed: Things the system handles on its own no longer light up the phone or the menu badge; only items that need a person do.
Why it matters: The badge count means "something needs you" again, so people stop ignoring it.
Automation effect: Automatic housekeeping events are now fully handled without anyone looking at them.
```

A migration. Before:

```
chore: add composite index on (tenant_id, created_at) to bookings
```

After:

```
chore: add composite index on (tenant_id, created_at) to bookings

For the customer:
What changed: The bookings list for large hotels opens in under a second instead of several.
Why it matters: Reception staff open that list dozens of times a shift.
```

## Checking it

`npx product-engineer check <file>` reports whether a message carries the block and
whether it reads the way this skill asks. For a pull request description, add
`--kind pr`: it warns when the block starts after line 12. A commit-msg hook that refuses messages
without the block is in the repository under `scripts/`.
