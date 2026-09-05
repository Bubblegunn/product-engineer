# Cursor

Two ways to give Cursor the seven rules. Pick one; both read the same text.

## As a skill (recommended)

```
npx skills add Bubblegunn/product-engineer
```

Cursor reads the shared skills directory, so the installer places the pack under
`.agents/skills/<skill>/` and Cursor loads a skill when its description matches the task.

## As a rule that always applies

Copy [`examples/cursor/.cursor/rules/product-engineer.mdc`](../examples/cursor/.cursor/rules/product-engineer.mdc)
into your project at the same path. Cursor reads every `.mdc` file under `.cursor/rules/`.
The frontmatter is what makes it apply to every conversation:

```
---
description: "Use when building, changing, or describing software for other people. ..."
alwaysApply: true
---
```

Set `alwaysApply: false` and add `globs: ["src/**"]` if you want the rule only when Cursor
touches matching files. The body is the skill's seven rules, copied by
`scripts/generate-adapters.mjs` from `skills/product-engineer/SKILL.md`; the first line of
the file names the version it was copied from.

## What you should see

Every commit message and pull request description the agent writes ends with the block:

```
For the customer:
What changed: <what they can now do, or no longer suffer>
Why it matters: <the benefit, in their terms>
Automation effect: <only when a manual step disappeared>
```

The pairs in [`examples.md`](examples.md) come from the evaluation, which ran with Claude
Code, not Cursor. A paste from a Cursor session that shows the block is welcome as a pull
request to this page.

## Check it

`npx product-engineer check .git/COMMIT_EDITMSG` reports whether the block is there; the
git hook and the CI action in [`install.md`](install.md) refuse a commit or a pull request
without it.
