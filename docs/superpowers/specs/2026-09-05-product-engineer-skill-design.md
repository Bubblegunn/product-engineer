# product-engineer: design

Date: 2026-09-05. Status: approved in conversation, pending spec review.

## What it is

An agent skill that makes an AI coding agent think like a product engineer instead of a code
printer. It changes behaviour, not APIs: before building, while building, and when writing the
commit or pull request, the agent answers "what changed for the customer, and why does it matter"
in plain language, refuses to call unobserved work done, and names what it deliberately did not
build.

Hook: "Your agent ships code. product-engineer makes it ship outcomes."

## Why

Every coding agent optimises for producing a diff. Teams then pay twice: once to translate the
diff for the people who asked for it, and once when "done" turns out to mean "tests pass". The
rules below are the ones Efe Genc applied for four years across a marketplace platform, a proactive
assistant and field IT work; they are recorded as a commit convention in his own agent
configuration and as a public essay on the feature he chose not to ship.

## The seven rules (SKILL.md body)

1. **Restate before building.** Rewrite the request as one sentence of customer outcome
   ("a host sees the new booking within a second without refreshing"). If it cannot be written,
   ask one question, not five.
2. **For the customer, every time.** Every commit message and pull request carries a block:
   what changed for the customer, why it matters, and automation effect only when the change
   removes a manual step or widens what the system handles alone. No block for pure refactors
   beyond one line, never an invented effect.
3. **Done means observed.** Nothing is done until the agent has seen it behave in production
   logs, in the database, or on a real device, or has said explicitly which of those it could
   not check. "Tests pass" is a step, not a finish line.
4. **Build what was asked; name what you did not.** Deliver the requested scope in full, and
   list the things deliberately left out with the reason, in the PR, so a reader six months later
   finds the decision where the code is.
5. **No number without a count.** Any figure in prose, docs or commits is produced by a command
   or a query the reader could rerun, and carries its scope and method.
6. **Speak the stakeholder's language.** With non-technical people, use their nouns; the
   reference file has a jargon-to-plain table (idempotent, backfill, cache invalidation, race
   condition, migration, feature flag, p95, retry, queue, webhook).
7. **Smallest change that moves the metric.** Before a design, one ledger line: cost and
   complexity against customer value; propose the cheapest change that moves the outcome, and say
   what the bigger version would buy.

## Repository layout

```
product-engineer/
  README.md                      hook, 30-second install, before/after, rules, what it does not do, origin
  LICENSE                        MIT
  skills/product-engineer/
    SKILL.md                     frontmatter (name, description, triggers) + the seven rules, terse
    references/
      commit-template.md         the For-the-customer block, with three real before/after examples
      five-questions.md          what to answer before building anything
      definition-of-done.md      the observed-in-production checklist
      plain-language.md          jargon-to-plain table
      not-shipped.md             how to record a deliberate omission
  .claude-plugin/
    marketplace.json             Claude Code marketplace entry
    plugin.json                  plugin metadata (name, version, skills path)
  AGENTS.md                      one paragraph pointing agents at the skill (Codex, Cursor, Copilot, Gemini)
  scripts/
    commit-msg                   git hook: refuses a commit whose message lacks the block (opt in)
    install-hook.sh              copies the hook into .git/hooks
  test/
    commit-msg.test.sh           the hook accepts and rejects the right messages
  docs/superpowers/specs/        this file
```

Install paths: `npx skills add Bubblegunn/product-engineer` (21 agents via skills.sh),
`/plugin marketplace add Bubblegunn/product-engineer` then `/plugin install product-engineer`
in Claude Code, or copy `skills/product-engineer` into `.claude/skills/`, `.cursor/rules`,
`.codex/skills` by hand.

## What it does not do

- It does not run a process (no ticket flow, no spec ceremony). It is one behaviour layer that
  composes with any workflow skill.
- It does not write product strategy. It forces the agent to ask what the customer gets.
- It does not enforce anything unless the optional commit hook is installed.

## Testing

- The commit-msg hook has a shell test with accepted and rejected messages.
- Each rule has a before/after pair in `references/`; the README shows two of them.
- Manual: install into Claude Code, run a small task, confirm the PR block appears.

## Launch

Monday 7 September 2026, 14:00 UTC: Show HN, dev.to (#showdev #ai #productivity), LinkedIn,
Product Hunt, r/ClaudeAI, r/ChatGPTCoding, r/cursor, skills.sh listing, awesome-list PRs each with
Efe's per-action approval. Texts live in `GlobalTalent/launch/`.
