# Security

Report a vulnerability privately through GitHub's security advisories:
https://github.com/Bubblegunn/product-engineer/security/advisories/new

Do not open a public issue for a security problem. You will get a first response within
72 hours, and a fix or a written assessment within 14 days of confirmation.

## Supported versions

Only the latest minor release receives security fixes. Upgrade before reporting if you are
behind; if the problem reproduces on the latest release, report it.

## Scope

The skill is text plus a POSIX shell hook. In scope: the hook (`scripts/commit-msg`, `scripts/install-hook.sh`) and the eval runner (`evals/run.sh`), which executes Claude Code on fixture repositories.
