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

## Add a skill

`skills/` is the pack. A skill joins it when an eval task measures what it claims, and lives in
`skills/.experimental/` until then. `test/skill-structure.sh` enforces this: a skill in the pack
must declare `metadata.measuredBy` naming metrics that `evals/score.mjs` actually scores, and the
test fails on a missing declaration or an invented metric name. Copying a directory into `skills/`
is not enough to join the pack.

An experimental skill is still installed. `npx skills add` walks the repository to a depth of five
and skips only `node_modules`, `.git`, `dist`, `build` and `__pycache__`, verified by reading
`skills@1.5.23`, so a dotted directory hides nothing. The only marker that travels with the file is
its own description, which is why a skill in `.experimental/` must open its description with
`Experimental:` and must not declare `measuredBy`.

To promote one: add a task under `evals/tasks/` that exercises the skill, run `sh evals/run.sh`,
put the numbers in `evals/RESULTS.md`, then move the directory up and declare the metrics.

What the eval covers today is narrower than the pack, and the gate does not pretend otherwise:
`evals/run.sh` copies only `skills/product-engineer` into the work tree, so the other three are
measured through the rules they share with it rather than on their own. `release-notes` is the
weakest case and says so in its own `measuredGap`. A task that writes release notes is the most
useful contribution this repository could take.

## Translate

A `README.<lang>.md` next to `README.md`, and, if you want, a `plain-language.<lang>.md` in
`references/`. Keep the code blocks and the before/after examples in English so they match
what agents actually emit. Add your language to the language line at the top of `README.md`.

## Before you push

```
npm test
```

That runs the structure script, the hook test, the check, adapter, scorer, integration and
readability tests, and refuses generated adapters that disagree with `SKILL.md` (run
`node scripts/generate-adapters.mjs` after editing it). CI runs the same on Ubuntu and macOS.

## Commits

Every commit in this repository ends with the block the skill asks for:

```
For the customer:
What changed: ...
Why it matters: ...
```

`sh scripts/install-hook.sh` installs the hook that checks it. Merge, fixup and revert
commits pass without the block; `[no-customer]` in the message opts one commit out.

## Releasing

Maintainers only. One command; the workflow does the rest.

1. Write the `## X.Y.Z (unreleased)` entry in `CHANGELOG.md` and merge it.
2. On a clean, green `main`: `npm run release -- X.Y.Z` (or `patch`, `minor`, `major`; add `--dry-run` to see the plan). It dates the entry, sets the version in `package.json`, `CITATION.cff`, `.claude-plugin/plugin.json` and the pinned `uses:` line in the README, runs the tests, commits, tags `vX.Y.Z`, pushes, and then moves the major tag (`v0` today) to the release and force-pushes it, so `uses: Bubblegunn/product-engineer@v0` follows the newest release in that major. The major tag moves from this command and not from the workflow because release tags are admin-only by ruleset; a workflow token could not move it.
3. Watch the `release` workflow: it publishes to npm with provenance, creates the GitHub release from the CHANGELOG entry, and installs the published version from the registry on three operating systems.

CI runs `scripts/release-gate.mjs` on every push: the version must agree across those files and `npm pack` may ship only the paths in `scripts/pack-allowlist.txt` (regenerate with `node scripts/release-gate.mjs --update` when the package layout changes on purpose).

The workflow uses npm trusted publishing and holds no token. Before the first tagged release the maintainer configures the trusted publisher on npmjs.com: package settings, Trusted publishing, GitHub Actions, repository `Bubblegunn/product-engineer`, workflow `release.yml`, "Allow npm publish" ticked.
