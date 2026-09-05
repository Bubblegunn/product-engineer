# Roadmap

Small on purpose. Each item ships when it has a before/after that shows it earns its place.

## 0.2

- Per-language plain-language tables: `references/plain-language.<lang>.md`, starting with
  Turkish, then whatever contributors bring. English stays the source.
- Per-stack jargon tables: a Python flavour and a mobile flavour of the plain-language table,
  because "idempotent" is the same everywhere but "hydration" is not.
- `product-engineer check`: a small CLI that lints a pull request description or a commit
  message for the block, the `Not shipped:` list, and numbers without a source. Zero
  dependencies, usable as a CI step and as a pre-push hook.
- Agent-specific install notes for Codex, Cursor, Copilot and Gemini: where the file lands,
  how the agent discovers it, how to confirm it is active.

## 0.3

- Measured results: a reproducible evaluation that runs a fixed set of tasks with and
  without the skill and reports the rate of customer blocks, unverified "done" claims and
  unrequested scope changes. Numbers in the README come from that run and nowhere else.
- A stakeholder mode: a shorter set of rules for agents that only write status updates
  and release notes, not code.

## Not planned

- A workflow. This skill composes with spec, TDD and review skills; it does not replace them.
- Product strategy. The skill asks what the customer gets; it does not decide what to build.
