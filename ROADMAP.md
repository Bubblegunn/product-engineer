# Roadmap

Small on purpose. Each item ships when it has a before/after that shows it earns its place.

## Shipped in 0.3

- Per-language plain-language tables: Turkish, Japanese and Chinese in
  `references/plain-language.<lang>.md`. English stays the source.
- `product-engineer check`: a zero-dependency CLI for a commit message or a pull request
  description, usable as a CI step, a git hook, a commitlint rule and a pre-commit hook.
- Agent-specific install notes in `docs/install.md`, and generated instruction files for
  agents that do not read a skills directory.
- Measured results: `evals/` runs a fixed set of tasks with and without the skill and
  reports the rates; the README's numbers come from that run and nowhere else.
- A stakeholder mode: the `release-notes` skill for agents that write status updates and
  release notes, not code.

## Next

- Per-stack jargon tables: a Python flavour and a mobile flavour of the plain-language table,
  because "idempotent" is the same everywhere but "hydration" is not.
- The fifty-diff benchmark designed in `evals/BENCHMARK.md`, once the spend is approved.

## Not planned

- A workflow. This skill composes with spec, TDD and review skills; it does not replace them.
- Product strategy. The skill asks what the customer gets; it does not decide what to build.
