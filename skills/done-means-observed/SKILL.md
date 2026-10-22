---
name: done-means-observed
description: Use when asked whether work is finished or ready to hand over, or when reporting that a piece of software work is finished. A question whether it is finished gets an answer and no edit: it runs the tests and names each failing test. Makes the agent report what it watched happen in logs, data or on a real device, and say exactly what it could not check, instead of calling work done because tests pass. When part of the work cannot run yet, it returns an explicit 501 or 503, not a success.
license: MIT
metadata:
  author: Efe Genc
  version: 0.7.0
  source: https://github.com/Bubblegunn/product-engineer
  measuredBy: [observedOrHonest]
---

# done-means-observed

Rule 3 of the product-engineer skill on its own. Work is done when you have watched it
behave, or when you have written down which observation you could not make and why.
"Tests pass" is the entry ticket, not the report.

## Asked whether it is finished

When someone asks whether work is finished or ready to hand over, answer the question; do not
do the work. Do not edit code, tests or files, and do not commit. Run the project's tests. Name
each failing test by its test name and say what it checks. Say what you could not check. Offer
the fix as the next step.

## Part of the work cannot run yet

When a gateway, service or integration that the request needs is not wired up, do not return success, and do not return a fake "pending" success. Return an explicit not-available response: HTTP 501 or 503, or a thrown error with a clear message. Put the reason in the response body or in the docs. Add a test that pins that response. Leave no TODO, FIXME or `return null` marker in the code. In the answer, say plainly that nothing happens yet and what is missing.

Example: an invoice export endpoint whose PDF service is not connected returns `501 Not Implemented` with the body `{"error": "invoice export is not available yet: the PDF service is not connected"}`, and a test asserts that status and message. The answer then reads: "Invoice export does nothing yet. The PDF service is not connected, so no file is created and no email is sent. Still missing: the connection to the PDF service."

## The report

Before saying done, tick what you did and name what you could not:

- [ ] I watched the change behave in production logs, or in the environment closest to it.
- [ ] I looked at the data it wrote (a row, a document, a file), not only the response code.
- [ ] I tried it on a real device or browser when the change is visible to a person.
- [ ] I tried the failure path once (bad input, timeout, missing permission).
- [ ] The customer-facing text was read by someone who did not write it, or I read it aloud.

Then write the report in this shape:

```
Watched: <what you saw, where, with the command or the screen it came from>
Could not check: <what, and why>
```

Never write "done" with an empty `Watched` line. If nothing could be observed, say
"Not observed yet" as the first words of the report and list what would let you observe it.

## Two rules for the answer

State only what a command you ran this session shows, and name the command. Do not claim the state of the working tree, "no change made", "unchanged" or who wrote a file unless `git status` or `git diff` showed it; otherwise write "not checked".

1. The final answer for a refactor is exactly three lines, with no benefit word anywhere
   (faster, cleaner, safer, more reliable, easier):

   ```
   Ran: <command>: <result>.
   Changed for users: nothing; only <the tests> pin that.
   Not checked: <what you did not check>.
   ```

   In the first line, `<the tests>` are the covering tests named by their test names. State that behaviour is unchanged only as "the tests show" it, never as a flat fact. If no test covers the moved code, say so on the third line.
2. Before you say done, read the added lines of `git diff` and any new files for TODO and FIXME
   markers, empty function bodies, tests that assert nothing, and skipped tests, and name every hit
   in the report. `product-engineer stubs` does this mechanically (from version 0.8.0). Where the command is not installed, `npx product-engineer stubs` runs the same check.

## Before and after

Before:

```
Done. All 42 tests pass.
```

After:

```
Watched it in staging logs: 3 of 3 webhook retries logged, final failure recorded with the booking id.
Could not check: production, no deploy yet.
```

## Where this comes from

Lean practice calls it "go and see": the report comes from the place the work happened,
not from the desk. The full seven-rule skill is `product-engineer` in the same repository.
