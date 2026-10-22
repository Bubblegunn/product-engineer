---
name: release-notes
description: Use when writing release notes, a changelog entry, a status update or a "what's new" message for people who do not read code. Notes never contain code identifiers or file names, and the agent runs `product-engineer notes <file>` and fixes every error before saving. Makes the agent lead with what the reader can do now, keep one line per change, explain every term, count every number, state the range the notes cover, and list what is not in this release (that section is left out when it would be empty).
license: MIT
metadata:
  author: Efe Genc
  version: 0.7.0
  source: https://github.com/Bubblegunn/product-engineer
  measuredBy: [notShipped, numbersWithMethod]
  measuredGap: the core metrics are scored on coding tasks; evals/tasks/09-release-notes is the release-notes task and is scored by releaseNotesClean and noUnmeasuredEffect, which apply to that task only, so this skill is measured through those and through the rules it shares with the core skill
---

# release-notes

The product-engineer rules for an agent that writes about software rather than writing
it: release notes, changelog entries, status updates to a founder or a client, a
"what's new" message.

## Check before you save

Notes never contain code identifiers or file names: no function, variable or module
names, no paths, no backticks, no commit prefixes, no file with an extension. Write the
notes to their file, then run `product-engineer notes <file>` (`npx product-engineer notes
<file>` where it is not installed; from version 0.8.0). Fix every error it reports and run
it again until it passes. Only then say the notes are done.

## Seven rules

1. Lead with what the reader can do now. The first line of every entry is the
   outcome in the reader's words, not the component that changed. "You can export a
   month of events as a file" before "Added iCalendar export endpoint".
2. One line per change, and the why in the same line. "You can X, so that Y." A
   docs-only, version-bump, formatting or test-only commit gets no line at all. Only a
   refactor that unblocks a named next visible thing gets a single line: "Behind the
   scenes: groundwork for <the next visible thing>."
3. Explain every term the first time. A word the reader would have to look up gets
   a short explanation in the sentence, then their word is used from then on.
4. Every number has its method next to it. "Loads in under a second (measured on the
   largest calendar, 12,000 events)". A number without its scope is not written.
5. Say what is not in this release. A closing `Not in this release:` list lists only
   what a reader would expect from the commits in the range: a reverted item, a flag
   left off, a known limit. One line each with the reason. Omit the section when there
   is nothing to list, and never list something nobody was promised. A thing added and
   reverted inside the range is not announced as available.
6. Describe the cause, not an unmeasured effect. "Shows 20 events at a time" is true;
   "opens faster" needs a measurement or is left out. A security fix says what it
   protects, for example "Exported calendar files can no longer run code when a colleague
   opens them", and gives no steps that show how to abuse the flaw.
7. State the range on the first line: `Changes since v2.3.0 (commit abc1234 to def5678)`,
   or "the last 6 commits: abc1234 to def5678". A version number goes on that line only.
   Name the new version only when the person gives it to you; a version bump in the range
   is not a change. Check the range against `git log` before writing. Naming the range is common
   changelog practice; the wording here is this skill's own.

## Shape

```
Changes since v2.3.0 (commit abc1234 to def5678)

You can now <outcome>, so that <why it matters>.
You no longer <suffering>, because <what changed, in plain words>.
Behind the scenes: groundwork for <the named next visible thing>, one line; only for a refactor.

Not in this release: (omit this section when empty)
- <thing>: <why not now>
```

## Before and after

Before:

```
- Added iCalendar export endpoint with pagination
- Refactored colour module
- Fixed race condition in badge counter
```

After:

```
Changes since v2.3.0 (commit 3a9f2c1 to 8d0b7e4)

You can now export a month of events as a file, so sharing a schedule with a colleague stops being a copy-paste job.
Cancelled events no longer send a reminder; only events that are still on the calendar do.
Behind the scenes: the colour rules moved into their own file, groundwork for custom event colours.
```

## When to skip this skill

Internal engineering changelogs read by engineers only. Say so in one line and use
conventional commit titles instead. The full skill is `product-engineer` in
the same repository.
