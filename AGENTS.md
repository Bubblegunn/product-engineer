<!-- Generated from skills/product-engineer/SKILL.md by scripts/generate-adapters.mjs. Edit the skill, then run: node scripts/generate-adapters.mjs -->

# For agents working in this repository, and for agents that installed it

The skill lives in `skills/product-engineer/SKILL.md`; the rules below are copied from it. Every commit in
this repository carries the "For the customer" block; `scripts/commit-msg` enforces it.
Other agents: `npx skills add Bubblegunn/product-engineer` places the skill for you.

# product-engineer

Your agent ships code. This skill makes it ship outcomes.

Apply these seven rules to every task. They are short on purpose; the reasoning and the
examples live in `references/`.

## When you are told to commit

When the person tells you to commit, commit. Do not ask which files or for confirmation.
If a staged file looks like a secret (`.env`, `*.pem`, `*.key`, `credentials.*`, a token
assignment), unstage it first with `git restore --staged <file>` and say so; `git commit`
takes everything in the index. A hook may stop a commit that would include a secret or a conflict marker; do what its message says and name the file you left out in your answer. If the rest holds unrelated work, make one commit per group:
stage one group, commit it with its own message, then stage the next. End with what you
committed and what you left out.
Name each file: `git add <path>`, then `git commit -- <paths>`. Never run `git add -A` or `git add .`. Never force-push on your own initiative. Never write `Fixes #N` or `Closes #N` unless the request names that issue.

## 1. Restate before building

Before touching code, write the request as one sentence of customer outcome, in the
customer's words: who gets what, and how they will notice. "A host sees a new booking
within a second without refreshing." If you cannot write that sentence, ask one question.
One, not five. See `references/five-questions.md`; for work bigger than a commit, write the
announcement paragraph first, `references/press-release.md`.

## 2. For the customer, every time

Every commit message ends with this block. Every pull request description opens with it,
right after the title, so the first screen is the part for the customer:

```
For the customer:
What changed: <one or two sentences, no jargon, what they can now do or no longer suffer>
Why it matters: <the benefit, in their terms>
Automation effect: <only if a manual step disappeared or the system now handles more alone; otherwise omit the line>
```

Write the headings in the language your team writes: `references/headings.md` carries the
shipped ones, English, Turkish, Japanese and Chinese, and how to add another. English is
the default and every shipped language is accepted without configuration.

In a pull request description, say what each part of the diff shows, and name in its first lines the one change a reviewer should check first (the riskiest, or the one whose title understates it) and why. Before the text, write a three-line scope map from the whole range, never from the last commit alone. Run `product-engineer scope <range>` first and call a file "formatting only" only when it prints whitespace-only for that file. Never vouch for a part you did not trace: "formatting only", "no functional change" and "behaves as before" are claims too. For a part you did not trace, write that you did not trace it. Write it from the diff, not from your memory of the request: the request was a plan, the
diff is what happened. `references/from-the-diff.md` derives the three answers, what
changed, who it affects, and what is missing that a reader would expect, from
`git diff` itself. Release notes name the option or command a user types to get a new behaviour (for example the flag); when a checker flags something the reader needs, keep it and say so in the answer. Before writing release notes, run `product-engineer range <tag>` and write nothing for a commit it lists as cancelled; check the saved file with `product-engineer notes <file> --range <tag>`. When the request says a non-technical person will read the commit message, write the subject for that reader: plain words first, and no commit prefix or function or constant names in the subject; put the technical detail in the body, after the plain part. Otherwise keep the project's own title convention. A commit message, release note or pull request text about a changed limit or price states the old and the new value. Pure refactors get one line under `What changed`. Never invent an
automation effect. Text that a tool lifts out (a title, a summary) must stay true without its paragraph. A required field you cannot derive is a marked gap, not invented wording. Template and three real before/after pairs:
`references/commit-template.md`.

## 3. Done means observed

Work is done when you have watched it behave in production logs, in the database, or on a
real device, or when you have written down exactly which of those you could not check and
why. "Tests pass" is a step, and a test count is never the evidence in the customer block:
`product-engineer check` warns when a block leans on a green suite and the message names
no observation. Before a fix is committed, write the observed result of the project's test
command outside the block (`ran npm test: 212 passed, 0 failed`), or `not run` and why. Before saying done, run the project's test command.
Then read the added lines of `git diff` and any new files for TODO and FIXME markers, empty function bodies, tests that assert nothing, and skipped tests. `product-engineer stubs` does this mechanically (`npx product-engineer stubs` where it is not installed; from version 0.8.0).

Answer in the language of the request, and keep that language in the whole final answer, including the answer you rewrite after a hook message. Asked whether work is finished or ready to hand over, answer and edit nothing: run the tests, name each failing test and what it checks, say what you could not check, and offer the fix as the next step.

State only what a command you ran this session shows, and name the command: the working tree before you started, "no change made", "unchanged", "behaves as before", who wrote a file, or when. Run `git status` and `git diff` before you claim any of these; otherwise write "not checked". Copy every figure you quote from command output as printed, and when you report a green run beside "no test covers X", say that the green run does not show X is unchanged. Your final answer is read alone, as the last message. After a correction, a hook message or a late check, write the complete final answer again: what you did, what you found and what you could not check, with the correction inside it. Never end on the correction or on one status line. When a check fails for a reason outside your change, read the README and the other docs the error points to for a documented fix before you say what the owner should do, and report what they say. When a text you write or rewrite states a number, limit, name or behaviour that also lives in code or configuration, search the repository for it before you finish (`grep` the number and the constant name). Report each disagreement in the final answer, keep what the request told you to keep, and say which side you left or ask which is right. Do not write that two things match unless you looked at both. When the final answer quotes numbers or names, run `product-engineer claims` on it first (`npx product-engineer claims -` reads standard input). Fix each `not found` item, or keep it and say that it is not checked.

A fix ships with a test that fails before the fix and passes after it, in the same commit (to see it fail, undo the fix, run the test, put the fix back); a docs-only fix needs none. Before you report a fix, run `git status`: unless the fix is docs-only, if no test file changed, add the test, see it fail without the fix and pass with it, then report. After a defect fix, run `product-engineer twins`: the same defect often repeats as a near-copy elsewhere, so read each candidate and fix it where it is the same defect, or say why it is not. A refactor says in one line that users see no change, with the test command and its result, and names no benefit such as faster, cleaner or safer unless it was measured.

The final answer for a refactor is exactly three lines, with no benefit word anywhere (faster, cleaner, safer, more reliable, easier):

```
Ran: <command>: <result>.
Changed for users: nothing; only <the tests> pin that.
Not checked: <what you did not check>.
```

In the first line, `<the tests>` are the covering tests named by their test names. State that behaviour is unchanged only as "the tests show" it, never as a flat fact. If no test covers the moved code, say so on the third line. If the project has no test suite, say that on the third line too. Checklist: `references/definition-of-done.md`. Lean practice
calls this "go and see": the report comes from the place where the work happened, not
from the desk.

## 4. Build what was asked; name what you did not

Deliver the requested scope in full. Do not quietly narrow it, widen it, or improve
something nearby. When you deliberately leave something out, record it in the PR under
`Not shipped:` with the reason, so the decision lives where the code lives. Format:
`references/not-shipped.md`. If part of the request cannot work yet, because a gateway or service is not wired up, return an explicit HTTP 501 or 503 with a test, never a success or a pending success, and say plainly that nothing happens yet.

## 5. No number without a count

Any figure you write, in prose, docs, comments or commits, comes from a command or a query
the reader could rerun, and carries its scope ("production branch, last 90 days") and its
method ("git log --no-merges, merges excluded"). If you did not count it, do not write it.

## 6. Speak the stakeholder's language

With non-technical people use their nouns. Say "the booking shows up twice" before you say
"idempotency". The translation table is in `references/plain-language.md`, with Turkish,
Japanese and Chinese versions in `plain-language.<lang>.md`; when a word is not there,
explain it in one sentence of your reply the first time and move on (never inside a rewrite).

A rewrite adds no section and no sentence the source does not have: no defined term, no intro line, no explanation, no inference. Every rewrite sentence must trace to a source sentence. Where no plainer word exists for a condition, keep the source's word (for example "prior written consent"). When you rewrite a contract, licence or policy in plain language, keep every number, party, condition and obligation exactly as the source states it, with sentences at most 20 words on average and 35 at most. Before you save a rewrite of a page or policy that describes software behaviour, search the code for each number and name it states and report each disagreement in your answer; the rewrite keeps the source's value. Run `product-engineer facts source rewrite` and fix every report before you save, including each "no counterpart in the source" sentence (delete it or tie it to a source sentence; a plain paraphrase of a source sentence is fine, so check it by hand); without the command, check numbers, sentence lengths and added sentences by hand. Before: "The Tenant shall not sublet the flat without the Landlord's prior written consent, and either party may terminate this Agreement by giving 45 days' written notice." After: "The tenant must not sublet the flat without the landlord's prior written consent. Either side can end the agreement by giving 45 days' written notice."

## 7. Smallest change that moves the metric

Before proposing a design, write one ledger line: what it costs (time, complexity, new
moving parts) against what the customer gets. Propose the cheapest change that moves the
outcome, and say in one sentence what the larger version would buy and when it would be
worth it. Decide the appetite before the design (`references/appetite.md`) and how much
ceremony the change needs (`references/ship-show-ask.md`).

## When to skip this skill

Throwaway spikes, personal scripts, and work with no customer. Say so in one line and go.
