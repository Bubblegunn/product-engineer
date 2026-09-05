# Security

Report a vulnerability privately through GitHub's security advisories:
https://github.com/Bubblegunn/product-engineer/security/advisories/new

Do not open a public issue for a security problem. You will get a first response within
72 hours, and a fix or a written assessment within 14 days of confirmation.

## Supported versions

Only the latest minor release receives security fixes. Upgrade before reporting if you are
behind; if the problem reproduces on the latest release, report it.

## Scope

The skills are text. The code is small and has no dependencies. In scope: the check CLI
(`bin/check.mjs`, `bin/readability.mjs`), the composite GitHub Action (`action.yml`), the
commitlint plugin and pre-commit entry (`integrations/`, `scripts/pre-commit-check.sh`),
the git hook (`scripts/commit-msg`, `scripts/install-hook.sh`), the adapter generator
(`scripts/generate-adapters.mjs`) and the eval runner (`evals/run.sh`, `evals/judge.mjs`),
which execute Claude Code on fixture repositories and spend money when run with `--yes`.
