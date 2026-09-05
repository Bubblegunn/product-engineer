# Install

## With skills.sh

```
npx skills add Bubblegunn/product-engineer
```

That is the [skills.sh](https://skills.sh) installer. It detects the agents in the current
project and places every skill in this repository for each of them; `--all` targets every
supported agent, `-g` installs for your user instead of the project, and the interactive
prompt lets you pick a subset.

## Where it lands

| agent | path after `npx skills add` |
|---|---|
| Claude Code | `.claude/skills/<skill>/` |
| Codex, Cursor, Copilot, Gemini CLI and other agents that read the shared skills directory | `.agents/skills/<skill>/` |
| Windsurf, Roo, Kiro, Trae, Qwen Code, CodeBuddy, Goose and others with their own directory | `.<agent>/skills/<skill>/` |

Verified on 5 September 2026 with `npx skills add Bubblegunn/product-engineer --all --copy`
in an empty repository: four skills found, placed for 56 agent directories.

## The pack

| skill | install it when |
|---|---|
| `product-engineer` | your agent writes code and you want all seven rules |
| `customer-block` | you only want the "For the customer" block in commits and pull requests |
| `done-means-observed` | you only want honest completion reports: what was watched, what could not be checked |
| `release-notes` | the agent writes release notes, changelogs or status updates rather than code |

## Agents that read instruction files instead

The repository also carries the seven rules as generated files for agents that never open
a skills folder: `.cursor/rules/product-engineer.mdc`, `.github/copilot-instructions.md`,
`GEMINI.md` with `gemini-extension.json`, `.clinerules/`, `.kiro/steering/`,
`.windsurf/rules/` and `AGENTS.md`. Copy the one your agent reads into your project. They
are generated from `skills/product-engineer/SKILL.md` by `scripts/generate-adapters.mjs`
and CI refuses a commit where they differ.

## Claude Code plugin

```
/plugin marketplace add Bubblegunn/product-engineer
/plugin install product-engineer@bubblegunn
```

Both commands were run and verified; `claude plugin validate .` passes.

## By hand

Copy `skills/<skill>/` into `.claude/skills/`, `.agents/skills/`, or your agent's skills
directory.

## Git hook

`sh scripts/install-hook.sh` copies `scripts/commit-msg` into `.git/hooks/`. A commit
without the block is refused with a two-line explanation. Merge, fixup, squash and revert
commits pass, and `[no-customer]` anywhere in the message opts one commit out.

## CI

```yaml
name: customer block
on: [pull_request]
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: Bubblegunn/product-engineer@v0.2.0
        # with: { warn: "true" }   # report instead of failing
```

The action fails the pull request when its description has no "For the customer" block and
prints the other findings as warnings. Nothing is posted to the PR; the check log is the
report.

## pre-commit, lefthook, husky, commitlint

See the headings below once 0.3.0 ships; until then the git hook above is the way.
