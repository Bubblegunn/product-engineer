# Contributing

Thank you for reading this far. The skill is short on purpose, so every change to it is
visible. Three kinds of contribution are welcome.

## Propose a rule change

Open an issue with the "Rule proposal" template. One before/after pair is required: show
what an agent writes today and what it would write under your rule, on a realistic task.
A rule that cannot be shown in a before/after is not ready.

A new rule, or a change to one, ships with an eval task under `evals/tasks/` and a
before/after pair in `references/`; a reference-only change needs the pair.

Changes to `skills/product-engineer/SKILL.md` keep it under 120 lines. Long material goes
into `references/`.

## Fix or extend a reference file

`references/plain-language.md`, `references/commit-template.md`, `references/five-questions.md`,
`references/definition-of-done.md` and `references/not-shipped.md` take pull requests directly.
Keep the tone: plain sentences, no jargon left unexplained, no em dashes.

## Translate

A `README.<lang>.md` next to `README.md`, and, if you want, a `plain-language.<lang>.md` in
`references/`. Keep the code blocks and the before/after examples in English so they match
what agents actually emit. Add your language to the language line at the top of `README.md`.

## Before you push

```
sh test/skill-structure.sh
sh test/commit-msg.test.sh
```

Both must print their `ok` / `passed` line. CI runs the same two scripts on Ubuntu and macOS.

## Commits

Every commit in this repository ends with the block the skill asks for:

```
For the customer:
What changed: ...
Why it matters: ...
```

`sh scripts/install-hook.sh` installs the hook that checks it. Merge, fixup and revert
commits pass without the block; `[no-customer]` in the message opts one commit out.
