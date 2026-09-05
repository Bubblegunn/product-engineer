# product-engineer Skill Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the `product-engineer` agent skill: a SKILL.md with seven behaviour rules, five reference files, an optional commit-msg hook with tests, Claude Code plugin manifests, skills.sh compatibility, and a launch-grade README, pushed to `Bubblegunn/product-engineer` with CI green.

**Architecture:** A skill is prose that changes agent behaviour, so the deliverable is text with a strict structure plus one small executable (the git hook). `skills/product-engineer/SKILL.md` is the unit every installer copies; `references/` holds the long material the SKILL.md points at; `.claude-plugin/` makes it a Claude Code plugin; `scripts/commit-msg` is a POSIX shell hook tested with a shell script.

**Tech Stack:** Markdown, POSIX sh, GitHub Actions (ubuntu + macos), no Node runtime needed.

**Spec:** `docs/superpowers/specs/2026-09-05-product-engineer-skill-design.md`

## Global Constraints

- Repository name `Bubblegunn/product-engineer`, MIT licence, author Efe Genc.
- SKILL.md frontmatter has exactly `name: product-engineer` and a one-sentence `description` that starts with "Use when".
- The "For the customer" block is the exact heading text `For the customer:` followed by three labelled lines `What changed:`, `Why it matters:`, `Automation effect:` (the third may be omitted).
- No em dashes anywhere in shipped text. No emoji. No AI-generated imagery; the wordmark is a hand-written SVG.
- Every before/after example is real or realistic and names no real customer.
- Commit messages in this repo follow the skill's own rule (they carry the block), so the repository is its own demo.

---

### Task 1: SKILL.md with the seven rules

**Files:**
- Create: `skills/product-engineer/SKILL.md`
- Create: `LICENSE` (MIT, copyright 2026 Efe Genc)
- Create: `.gitignore` (`.DS_Store`)
- Test: `test/skill-structure.sh`

**Interfaces:**
- Produces: the headings `## 1. Restate before building` … `## 7. Smallest change that moves the metric`, referenced by README and by the references files.

- [ ] **Step 1: Write the failing structure test**

```sh
#!/bin/sh
# test/skill-structure.sh: the skill file has the frontmatter and the seven rules.
set -eu
f="skills/product-engineer/SKILL.md"
fail() { echo "FAIL: $1"; exit 1; }
[ -f "$f" ] || fail "$f missing"
head -1 "$f" | grep -q '^---$' || fail "frontmatter must open with ---"
grep -q '^name: product-engineer$' "$f" || fail "name field"
grep -q '^description: Use when' "$f" || fail "description must start with 'Use when'"
for n in 1 2 3 4 5 6 7; do
  grep -q "^## $n\. " "$f" || fail "rule $n heading missing"
done
grep -q 'For the customer:' "$f" || fail "block heading missing"
grep -c '—' "$f" | grep -q '^0$' || fail "em dash found"
echo "ok: skill structure"
```

- [ ] **Step 2: Run it to verify it fails**

Run: `sh test/skill-structure.sh`
Expected: `FAIL: skills/product-engineer/SKILL.md missing`

- [ ] **Step 3: Write SKILL.md**

```markdown
---
name: product-engineer
description: Use when building, changing, or describing software for other people. Makes the agent restate work as a customer outcome, write a plain-language "For the customer" block in every commit and PR, refuse to call unobserved work done, name what it deliberately did not build, and never print a number it did not count.
---

# product-engineer

Your agent ships code. This skill makes it ship outcomes.

Apply these seven rules to every task. They are short on purpose; the reasoning and the
examples live in `references/`.

## 1. Restate before building

Before touching code, write the request as one sentence of customer outcome, in the
customer's words: who gets what, and how they will notice. "A host sees a new booking
within a second without refreshing." If you cannot write that sentence, ask one question.
One, not five. See `references/five-questions.md`.

## 2. For the customer, every time

Every commit message and every pull request description ends with this block:

```
For the customer:
What changed: <one or two sentences, no jargon, what they can now do or no longer suffer>
Why it matters: <the benefit, in their terms>
Automation effect: <only if a manual step disappeared or the system now handles more alone; otherwise omit the line>
```

Pure refactors get one line under `What changed`. Never invent an automation effect.
Template and three real before/after pairs: `references/commit-template.md`.

## 3. Done means observed

Work is done when you have watched it behave in production logs, in the database, or on a
real device, or when you have written down exactly which of those you could not check and
why. "Tests pass" is a step. Checklist: `references/definition-of-done.md`.

## 4. Build what was asked; name what you did not

Deliver the requested scope in full. Do not quietly narrow it, widen it, or improve
something nearby. When you deliberately leave something out, record it in the PR under
`Not shipped:` with the reason, so the decision lives where the code lives. Format:
`references/not-shipped.md`.

## 5. No number without a count

Any figure you write, in prose, docs, comments or commits, comes from a command or a query
the reader could rerun, and carries its scope ("production branch, last 90 days") and its
method ("git log --no-merges, merges excluded"). If you did not count it, do not write it.

## 6. Speak the stakeholder's language

With non-technical people use their nouns. Say "the booking shows up twice" before you say
"idempotency". The translation table is in `references/plain-language.md`; when a word is
not there, explain it in one sentence the first time and move on.

## 7. Smallest change that moves the metric

Before proposing a design, write one ledger line: what it costs (time, complexity, new
moving parts) against what the customer gets. Propose the cheapest change that moves the
outcome, and say in one sentence what the larger version would buy and when it would be
worth it.

## When to skip this skill

Throwaway spikes, personal scripts, and work with no customer. Say so in one line and go.
```

- [ ] **Step 4: Add LICENSE and .gitignore, run the test**

`LICENSE`: the MIT text with `Copyright (c) 2026 Efe Genc`. `.gitignore`: `.DS_Store`.

Run: `sh test/skill-structure.sh`
Expected: `ok: skill structure`

- [ ] **Step 5: Commit**

```bash
git add skills LICENSE .gitignore test
git commit -m "feat: SKILL.md with the seven product-engineer rules

For the customer:
What changed: An agent that installs this skill now explains every change in the customer's words and refuses to call unobserved work done.
Why it matters: The people who asked for the work can read what they got without a translator.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 2: The five reference files

**Files:**
- Create: `skills/product-engineer/references/commit-template.md`
- Create: `skills/product-engineer/references/five-questions.md`
- Create: `skills/product-engineer/references/definition-of-done.md`
- Create: `skills/product-engineer/references/plain-language.md`
- Create: `skills/product-engineer/references/not-shipped.md`
- Modify: `test/skill-structure.sh` (add existence and no-em-dash checks for the five files)

**Interfaces:**
- Consumes: the file names referenced from SKILL.md in Task 1 (exact paths above).

- [ ] **Step 1: Extend the test**

Append to `test/skill-structure.sh` before the final echo:

```sh
for r in commit-template five-questions definition-of-done plain-language not-shipped; do
  p="skills/product-engineer/references/$r.md"
  [ -f "$p" ] || fail "$p missing"
  grep -c '—' "$p" | grep -q '^0$' || fail "em dash in $p"
done
grep -q '^| idempotent' skills/product-engineer/references/plain-language.md || fail "plain-language table missing idempotent row"
```

- [ ] **Step 2: Run it to verify it fails**

Run: `sh test/skill-structure.sh`
Expected: `FAIL: skills/product-engineer/references/commit-template.md missing`

- [ ] **Step 3: Write commit-template.md**

```markdown
# The "For the customer" block

Put it at the end of every commit message and every pull request description.

```
For the customer:
What changed: <what they can now do, or no longer suffer>
Why it matters: <the benefit, in their terms>
Automation effect: <only when a manual step disappeared or the system handles more alone>
```

Rules: no jargon; no invented effects; a pure refactor gets one line under What changed;
a bug fix says what the customer saw before and sees now.

## Before / after

**1. A notification fix**

Before:

    fix(notifications): classify IsSystem events as idempotent and skip the badge increment

After:

    fix(notifications): classify IsSystem events as idempotent and skip the badge increment

    For the customer:
    What changed: Things the system handles on its own no longer light up the phone or the menu badge; only items that need a person do.
    Why it matters: The badge count means "something needs you" again, so people stop ignoring it.
    Automation effect: Automatic housekeeping events are now fully handled without anyone looking at them.

**2. A migration**

Before:

    chore: add composite index on (tenant_id, created_at) to bookings

After:

    chore: add composite index on (tenant_id, created_at) to bookings

    For the customer:
    What changed: The bookings list for large hotels opens in under a second instead of several.
    Why it matters: Reception staff open that list dozens of times a shift.

**3. A refactor with no customer-visible change**

    refactor: split the pricing module into rules and calculator

    For the customer:
    What changed: Nothing visible; this makes the next pricing change safer to ship.
```

- [ ] **Step 4: Write five-questions.md**

```markdown
# Five questions before building anything

Answer these in the first message, in one line each. If one cannot be answered, that is
the single question to ask.

1. Who is the person this is for, in their job title, not "the user"?
2. What will they be able to do, or stop suffering, when this is done?
3. How will they notice? (A screen, a message, a report, a number that moves.)
4. What is the smallest change that gives them that? (See rule 7.)
5. What are we deliberately not doing in this change, and where will that be written?

Example, for "add retry to the payment webhook":

1. The finance assistant who reconciles payouts every morning.
2. She stops finding payouts that never arrived because one call failed.
3. The "unmatched payments" list is empty on a normal morning.
4. Retry the webhook three times with backoff and log the final failure; no queue yet.
5. Not shipping a dead-letter queue; written under Not shipped in the PR.
```

- [ ] **Step 5: Write definition-of-done.md**

```markdown
# Done means observed

Tick what you did. Say which boxes you could not tick and why. Never say "done" with an
empty list.

- [ ] I watched the change behave in production logs, or in the environment closest to it.
- [ ] I looked at the data it wrote (a row, a document, a file), not only the response code.
- [ ] I tried it on a real device or browser when the change is visible to a person.
- [ ] I tried the failure path once (bad input, timeout, missing permission).
- [ ] The customer-facing text was read by someone who did not write it, or I read it aloud.
- [ ] The "For the customer" block is in the commit and the PR.
- [ ] Anything I deliberately did not do is under "Not shipped" with a reason.

Tests passing is the entry ticket to this list, not an item on it.
```

- [ ] **Step 6: Write plain-language.md**

```markdown
# Plain-language table

Use the right column with non-technical people. Explain a missing term once, in one
sentence, then use their words.

| term | say instead |
|---|---|
| idempotent | doing it twice has the same result as doing it once |
| backfill | filling in the old records so they look like the new ones |
| cache invalidation | making sure people stop seeing the old copy |
| race condition | two things happening at the same moment and stepping on each other |
| migration | changing how the data is stored, carefully, while it is in use |
| feature flag | a switch that lets us turn the new behaviour on for some people first |
| p95 latency | how long the slowest one in twenty requests takes |
| retry with backoff | trying again, waiting a little longer each time |
| queue | a waiting line so nothing is lost when we are busy |
| webhook | the other system calling us the moment something happens |
| rate limit | a cap on how often one caller may ask |
| rollback | putting the previous version back |
| regression | something that used to work and broke |
| tech debt | a shortcut we took that costs us time every week until we fix it |
| observability | being able to see what the system did, after the fact |
```

- [ ] **Step 7: Write not-shipped.md**

```markdown
# Recording what you deliberately did not build

In the pull request, after the "For the customer" block:

```
Not shipped:
- <thing>: <why not now>; <what would make it worth doing>
```

Example:

```
Not shipped:
- Dead-letter queue for failed webhooks: three retries cover every failure we have seen in 90 days of logs; worth it when a single failure costs more than a morning of reconciliation.
- Admin UI for retry settings: nobody has asked; the values live in one config file.
```

The point is not the list. The point is that six months from now the person who asks
"why is there no queue" finds the answer next to the code, written when the decision
was cheap to explain.
```

- [ ] **Step 8: Run the test and commit**

Run: `sh test/skill-structure.sh`
Expected: `ok: skill structure`

```bash
git add skills test
git commit -m "feat: reference files for the seven rules

For the customer:
What changed: The skill now ships the commit template with real before/after pairs, the five questions, the done checklist, the plain-language table and the not-shipped format.
Why it matters: An agent can follow the rules without guessing what they look like in practice.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 3: Optional commit-msg hook with tests

**Files:**
- Create: `scripts/commit-msg`
- Create: `scripts/install-hook.sh`
- Test: `test/commit-msg.test.sh`

**Interfaces:**
- Produces: `scripts/commit-msg <message-file>` exits 0 when the message contains `For the customer:` followed by a `What changed:` line, or when the first line starts with `Merge`, `fixup!`, `squash!`, `Revert`, or contains `[no-customer]`; exits 1 otherwise with a two-line explanation.

- [ ] **Step 1: Write the failing test**

```sh
#!/bin/sh
# test/commit-msg.test.sh
set -eu
hook="scripts/commit-msg"
tmp=$(mktemp -d)
pass=0; fail=0
check() { # $1 expected exit, $2 name, $3 message
  printf '%s\n' "$3" > "$tmp/msg"
  if sh "$hook" "$tmp/msg" >/dev/null 2>&1; then got=0; else got=1; fi
  if [ "$got" = "$1" ]; then pass=$((pass+1)); else fail=$((fail+1)); echo "FAIL: $2 (expected exit $1, got $got)"; fi
}
check 0 "full block" "feat: thing

For the customer:
What changed: People can export their bookings.
Why it matters: Accountants asked for it every month."
check 1 "missing block" "feat: thing without the block"
check 1 "heading without what-changed" "feat: thing

For the customer:
Why it matters: nothing"
check 0 "merge commit" "Merge branch 'main' into feature"
check 0 "fixup" "fixup! feat: thing"
check 0 "revert" "Revert \"feat: thing\""
check 0 "opt out" "chore: bump deps [no-customer]"
rm -rf "$tmp"
echo "commit-msg: $pass passed, $fail failed"
[ "$fail" = 0 ]
```

- [ ] **Step 2: Run it to verify it fails**

Run: `sh test/commit-msg.test.sh`
Expected: several `FAIL:` lines and a non-zero exit (the hook does not exist).

- [ ] **Step 3: Write the hook**

```sh
#!/bin/sh
# product-engineer commit-msg hook: every commit explains itself to the customer.
# Install: sh scripts/install-hook.sh   (copies this file to .git/hooks/commit-msg)
# Opt out for one commit: put [no-customer] anywhere in the message.
file="$1"
first=$(sed -n '1p' "$file")
case "$first" in
  Merge*|fixup!*|squash!*|Revert*) exit 0 ;;
esac
if grep -q '\[no-customer\]' "$file"; then exit 0; fi
if grep -q '^For the customer:' "$file" && grep -q '^What changed:' "$file"; then exit 0; fi
cat >&2 <<'EOF'
product-engineer: the commit message has no "For the customer:" block.
Add:  For the customer:  /  What changed: ...  /  Why it matters: ...   (or put [no-customer] in the message)
EOF
exit 1
```

`scripts/install-hook.sh`:

```sh
#!/bin/sh
# Copies the product-engineer commit-msg hook into the current repository.
set -eu
root=$(git rev-parse --show-toplevel)
src=$(dirname "$0")/commit-msg
cp "$src" "$root/.git/hooks/commit-msg"
chmod +x "$root/.git/hooks/commit-msg"
echo "installed $root/.git/hooks/commit-msg"
```

Run `chmod +x scripts/commit-msg scripts/install-hook.sh`.

- [ ] **Step 4: Run the test to verify it passes**

Run: `sh test/commit-msg.test.sh`
Expected: `commit-msg: 7 passed, 0 failed`

- [ ] **Step 5: Install the hook in this repository and commit**

```bash
sh scripts/install-hook.sh
git add scripts test
git commit -m "feat: optional commit-msg hook that asks for the customer block

For the customer:
What changed: Teams that want the rule enforced can install one file and every commit without a customer explanation is stopped before it lands.
Why it matters: The convention survives the person who introduced it.
Automation effect: The check that used to be a reviewer's comment now runs by itself.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 4: Claude Code plugin manifests, skills.sh layout, AGENTS.md

**Files:**
- Create: `.claude-plugin/marketplace.json`
- Create: `.claude-plugin/plugin.json`
- Create: `AGENTS.md`
- Modify: `test/skill-structure.sh` (validate the two JSON files parse and name the plugin)

**Interfaces:**
- Produces: marketplace name `bubblegunn`, plugin name `product-engineer`, skills path `./skills`.

- [ ] **Step 1: Extend the test**

Append before the final echo of `test/skill-structure.sh`:

```sh
for j in .claude-plugin/marketplace.json .claude-plugin/plugin.json; do
  [ -f "$j" ] || fail "$j missing"
  python3 -c "import json,sys; json.load(open('$j'))" 2>/dev/null || node -e "JSON.parse(require('fs').readFileSync('$j','utf8'))" || fail "$j is not valid JSON"
done
grep -q '"name": "product-engineer"' .claude-plugin/plugin.json || fail "plugin name"
[ -f AGENTS.md ] || fail "AGENTS.md missing"
```

- [ ] **Step 2: Run it to verify it fails**

Run: `sh test/skill-structure.sh`
Expected: `FAIL: .claude-plugin/marketplace.json missing`

- [ ] **Step 3: Write the manifests**

`.claude-plugin/marketplace.json`:

```json
{
  "name": "bubblegunn",
  "owner": { "name": "Efe Genc", "url": "https://efe-genc-portfolio.vercel.app" },
  "description": "Efe Genc's agent skills, installable as Claude Code plugins.",
  "plugins": [
    {
      "name": "product-engineer",
      "source": "./",
      "description": "Makes your agent think like a product engineer: customer outcome first, a plain-language block in every commit and PR, done means observed, name what you did not ship, no number without a count.",
      "category": "engineering",
      "keywords": ["product", "commits", "pull-requests", "plain-language", "definition-of-done"]
    }
  ]
}
```

`.claude-plugin/plugin.json`:

```json
{
  "name": "product-engineer",
  "version": "0.1.0",
  "description": "Your agent ships code. product-engineer makes it ship outcomes.",
  "author": { "name": "Efe Genc", "url": "https://efe-genc-portfolio.vercel.app" },
  "homepage": "https://github.com/Bubblegunn/product-engineer",
  "repository": "https://github.com/Bubblegunn/product-engineer",
  "license": "MIT",
  "keywords": ["product-engineering", "commits", "plain-language", "skills"],
  "skills": "./skills"
}
```

`AGENTS.md`:

```markdown
# For agents working in this repository, and for agents that installed it

The skill lives in `skills/product-engineer/SKILL.md`. Read it before any change here.
Every commit in this repository carries the "For the customer" block; the hook in
`scripts/commit-msg` enforces it.

Codex, Cursor, Copilot and Gemini users: copy `skills/product-engineer/` into your agent's
skills or rules directory, or run `npx skills add Bubblegunn/product-engineer`, which places
it for you.
```

- [ ] **Step 4: Run the test and commit**

Run: `sh test/skill-structure.sh`
Expected: `ok: skill structure`

```bash
git add .claude-plugin AGENTS.md test
git commit -m "feat: Claude Code plugin manifests and agent instructions

For the customer:
What changed: The skill installs in one command in Claude Code, and with npx skills add in twenty other agents.
Why it matters: Nobody has to copy files by hand to try it.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 5: README, wordmark, CI, push

**Files:**
- Create: `README.md`
- Create: `assets/wordmark.svg`
- Create: `.github/workflows/ci.yml`
- Create: `CHANGELOG.md`

**Interfaces:**
- Consumes: headings from Task 1, examples from Task 2, hook usage from Task 3, install commands from Task 4.

- [ ] **Step 1: Write the CI workflow**

```yaml
name: ci
on:
  push:
    branches: [main]
  pull_request:
jobs:
  test:
    runs-on: ${{ matrix.os }}
    strategy:
      matrix:
        os: [ubuntu-latest, macos-latest]
    steps:
      - uses: actions/checkout@v4
      - run: sh test/skill-structure.sh
      - run: sh test/commit-msg.test.sh
```

- [ ] **Step 2: Write the wordmark**

`assets/wordmark.svg`: a 640x120 SVG with white background, the text `product-engineer` in a system sans at 56px weight 700, letter-spacing -0.02em, fill `#111`, and a 4px `#1f3fbf` underline under the word `engineer`. No gradients, no icons.

```xml
<svg xmlns="http://www.w3.org/2000/svg" width="640" height="120" viewBox="0 0 640 120">
  <rect width="640" height="120" fill="#ffffff"/>
  <text x="32" y="78" font-family="-apple-system, Segoe UI, Helvetica, Arial, sans-serif" font-size="56" font-weight="700" letter-spacing="-1.1" fill="#111111">product-engineer</text>
  <rect x="268" y="90" width="342" height="4" fill="#1f3fbf"/>
</svg>
```

- [ ] **Step 3: Write README.md**

```markdown
<p align="center"><img src="assets/wordmark.svg" width="520" alt="product-engineer"></p>

<p align="center"><em>Your agent ships code. product-engineer makes it ship outcomes.</em></p>

<p align="center">
  <img src="https://img.shields.io/github/stars/Bubblegunn/product-engineer?style=flat-square&color=111111" alt="stars">
  <img src="https://img.shields.io/badge/works%20with-21%20agents-111111?style=flat-square" alt="works with 21 agents">
  <img src="https://img.shields.io/badge/license-MIT-111111?style=flat-square" alt="MIT">
</p>

An agent skill that makes an AI coding agent think like a product engineer instead of a
code printer. Before building, it restates the work as a customer outcome. In every commit
and pull request, it writes a plain-language "For the customer" block. It refuses to call
unobserved work done, names what it deliberately did not build, and never prints a number
it did not count.

## 30-second install

```
npx skills add Bubblegunn/product-engineer
```

Claude Code:

```
/plugin marketplace add Bubblegunn/product-engineer
/plugin install product-engineer@bubblegunn
```

By hand: copy `skills/product-engineer/` into `.claude/skills/`, `.cursor/rules/`, or your
agent's skills directory. Optional git hook that stops commits without the block:
`sh scripts/install-hook.sh`.

## Before and after

Before:

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

Before, the agent reports:

```
Done. All 42 tests pass.
```

After:

```
Watched it in staging logs: 3 of 3 webhook retries logged, final failure recorded with the booking id.
Could not check: production, no deploy yet.
Not shipped:
- Dead-letter queue: three retries cover every failure in 90 days of logs.
```

## The seven rules

1. **Restate before building.** One sentence of customer outcome, or one question.
2. **For the customer, every time.** What changed, why it matters, automation effect only if real.
3. **Done means observed.** Logs, data or a real device, or say what you could not check.
4. **Build what was asked; name what you did not.** A `Not shipped:` list with reasons.
5. **No number without a count.** Every figure has a command behind it and a scope.
6. **Speak the stakeholder's language.** A jargon-to-plain table ships with the skill.
7. **Smallest change that moves the metric.** One ledger line before any design.

Full text: [`skills/product-engineer/SKILL.md`](skills/product-engineer/SKILL.md). The
template, the five questions, the done checklist, the plain-language table and the
not-shipped format are in [`references/`](skills/product-engineer/references/).

## What it does not do

It runs no process and owns no workflow; it composes with spec, TDD and review skills. It
does not write product strategy. It enforces nothing unless you install the hook.

## Where it comes from

These are the rules Efe Genc worked by for four years as a founding engineer on a
hospitality platform and as the sole author of a proactive assistant: a commit convention
that explains every change to a non-technical reader, a definition of done that means
watching the thing behave, and the habit of writing down what was deliberately not built
([The feature I chose not to ship](https://efe-genc-portfolio.vercel.app/writing/the-feature-i-chose-not-to-ship/)).

MIT.
```

- [ ] **Step 4: Write CHANGELOG.md**

```markdown
# Changelog

## 0.1.0 (2026-09-07)

First release: the seven rules, five reference files, optional commit-msg hook, Claude Code plugin manifests, skills.sh layout.
```

- [ ] **Step 5: Run both tests, create the repository, push, check CI**

Run: `sh test/skill-structure.sh && sh test/commit-msg.test.sh`
Expected: both `ok` / `7 passed`.

```bash
git add README.md assets CHANGELOG.md .github
git commit -m "docs: README, wordmark, changelog and CI

For the customer:
What changed: Anyone landing on the repository sees in one screen what the skill does, installs it in one command, and sees a real before/after.
Why it matters: A skill nobody understands in thirty seconds is a skill nobody installs.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
gh repo create Bubblegunn/product-engineer --public --source . --description "Your agent ships code. product-engineer makes it ship outcomes. A skill for Claude Code, Codex, Cursor and 18 more." --push
git tag v0.1.0 && git push origin --tags
gh run list --repo Bubblegunn/product-engineer --limit 1
```

Expected: CI `success` on ubuntu and macos.
