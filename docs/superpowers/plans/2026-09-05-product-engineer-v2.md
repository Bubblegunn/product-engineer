# product-engineer v2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the pre-launch scope (README as demo, pack of four skills, generated adapters, honest rescoring) before Monday 7 September, then the post-launch integrations, harness, references, tables, readability, Chinese README and contribution rule.

**Architecture:** One source of truth, `skills/product-engineer/SKILL.md`; a generator writes every other agent's instruction file from it and CI refuses drift. Three small sibling skills inline what they need so each installs alone. The `check` CLI stays zero-dependency and grows a readability module; integrations wrap it rather than reimplement it. The eval harness gains repetition and a seeded bootstrap without dependencies.

**Tech Stack:** Node 20+ ES modules, `node --test`, POSIX sh, Markdown, SVG. No runtime dependencies.

**Spec:** `docs/superpowers/specs/2026-09-05-product-engineer-v2-design.md`

## Global Constraints

- No em dashes anywhere in any file.
- Every prose file passes `node /Users/efe/Desktop/ai-slop-linter/dist/src/cli.js <file>` at the default threshold.
- Zero runtime dependencies for `check`; `package.json` keeps `"files": ["bin", "skills", "README.md", "LICENSE"]` plus `integrations`.
- Each `SKILL.md` stays under 120 lines; `name` equals its directory; `description` starts with "Use when"; `license: MIT`; `metadata` has `author`, `version`, `source`.
- Commit messages: conventional title, `For the customer:` block with `What changed:` and `Why it matters:`, the Turkish `Sade dil (teknik olmayan biri için):` block, and the single trailer `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.
- `git pull --rebase origin main` before every push; wait for `ci`, `zizmor`, `pages` to pass.
- Nothing is published to npm; no external posts; the other four repositories are not touched.

---

## Pre-launch

### Task 1: The pack of four skills

**Files:**
- Modify: `skills/product-engineer/SKILL.md` (frontmatter only, plus one sentence in rule 3)
- Create: `skills/customer-block/SKILL.md`, `skills/done-means-observed/SKILL.md`, `skills/release-notes/SKILL.md`
- Modify: `test/skill-structure.sh`, `.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json`

**Interfaces:**
- Produces: four directories under `skills/`, each with a spec-complete `SKILL.md`; the structure test iterates `skills/*/SKILL.md`.

- [ ] **Step 1: Extend the structure test so it fails on the missing skills and fields**

Replace `test/skill-structure.sh` with:

```sh
#!/bin/sh
# test/skill-structure.sh: every skill has spec-complete frontmatter; the core skill has the seven rules.
set -eu
fail() { echo "FAIL: $1"; exit 1; }
for dir in product-engineer customer-block done-means-observed release-notes; do
  f="skills/$dir/SKILL.md"
  [ -f "$f" ] || fail "$f missing"
  head -1 "$f" | grep -q '^---$' || fail "$f: frontmatter must open with ---"
  grep -q "^name: $dir$" "$f" || fail "$f: name must equal the directory"
  grep -q '^description: Use when' "$f" || fail "$f: description must start with 'Use when'"
  grep -q '^license: MIT$' "$f" || fail "$f: license: MIT"
  grep -q '^metadata:$' "$f" || fail "$f: metadata block"
  grep -q '^  author: ' "$f" || fail "$f: metadata.author"
  grep -q '^  version: ' "$f" || fail "$f: metadata.version"
  grep -q '^  source: https://github.com/Bubblegunn/product-engineer' "$f" || fail "$f: metadata.source"
  [ "$(wc -l < "$f")" -le 120 ] || fail "$f: over 120 lines"
  grep -c '—' "$f" | grep -q '^0$' || fail "em dash in $f"
done
f="skills/product-engineer/SKILL.md"
for n in 1 2 3 4 5 6 7; do
  grep -q "^## $n\. " "$f" || fail "rule $n heading missing"
done
grep -q 'For the customer:' "$f" || fail "block heading missing"
for r in commit-template five-questions definition-of-done plain-language not-shipped; do
  p="skills/product-engineer/references/$r.md"
  [ -f "$p" ] || fail "$p missing"
done
for p in skills/product-engineer/references/*.md; do
  grep -c '—' "$p" | grep -q '^0$' || fail "em dash in $p"
done
grep -q '^| idempotent' skills/product-engineer/references/plain-language.md || fail "plain-language table missing idempotent row"
for j in .claude-plugin/marketplace.json .claude-plugin/plugin.json; do
  [ -f "$j" ] || fail "$j missing"
  node -e "JSON.parse(require('fs').readFileSync('$j','utf8'))" || fail "$j is not valid JSON"
done
grep -q '"name": "product-engineer"' .claude-plugin/plugin.json || fail "plugin name"
grep -q '"version": "0.3.0"' .claude-plugin/plugin.json || fail "plugin version 0.3.0"
[ -f AGENTS.md ] || fail "AGENTS.md missing"
echo "ok: skill structure (4 skills)"
```

- [ ] **Step 2: Run it, expect FAIL on `skills/customer-block/SKILL.md missing`**

Run: `sh test/skill-structure.sh`

- [ ] **Step 3: Update the core skill's frontmatter and rule 3**

Frontmatter of `skills/product-engineer/SKILL.md` becomes:

```
---
name: product-engineer
description: Use when building, changing, or describing software for other people. Makes the agent restate work as a customer outcome, write a plain-language "For the customer" block in every commit and PR, refuse to call unobserved work done, name what it deliberately did not build, and never print a number it did not count.
license: MIT
metadata:
  author: Efe Genc
  version: 0.3.0
  source: https://github.com/Bubblegunn/product-engineer
---
```

Rule 3 gains one closing sentence after "Checklist: `references/definition-of-done.md`.": `Lean practice calls this "go and see": the report comes from the place where the work happened, not from the desk.`

- [ ] **Step 4: Write the three sibling skills**

`skills/customer-block/SKILL.md`:

```
---
name: customer-block
description: Use when writing a commit message or a pull request description for software other people use. Ends every message with a plain-language "For the customer" block, what changed, why it matters, and an automation effect only when a manual step really disappeared.
license: MIT
metadata:
  author: Efe Genc
  version: 0.3.0
  source: https://github.com/Bubblegunn/product-engineer
---

# customer-block

Rule 2 of the product-engineer skill on its own, for teams that want the block and
nothing else. The full skill is `product-engineer` in the same repository.

## The block

Every commit message and every pull request description ends with:

```
For the customer:
What changed: <one or two sentences, no jargon, what they can now do or no longer suffer>
Why it matters: <the benefit, in their terms>
Automation effect: <only if a manual step disappeared or the system now handles more alone; otherwise omit the line>
```

Rules: no jargon a non-engineer would have to look up; a pure refactor gets one line
under `What changed`; a bug fix says what the customer saw before and sees now; never
invent an automation effect. Merge, fixup, squash and revert commits do not need the
block.

## Two pairs

A bug fix. Before:

```
fix(notifications): classify IsSystem events as idempotent and skip the badge increment
```

After:

```
fix(notifications): classify IsSystem events as idempotent and skip the badge increment

For the customer:
What changed: Things the system handles on its own no longer light up the phone or the menu badge; only items that need a person do.
Why it matters: The badge count means "something needs you" again, so people stop ignoring it.
Automation effect: Automatic housekeeping events are now fully handled without anyone looking at them.
```

A migration. Before:

```
chore: add composite index on (tenant_id, created_at) to bookings
```

After:

```
chore: add composite index on (tenant_id, created_at) to bookings

For the customer:
What changed: The bookings list for large hotels opens in under a second instead of several.
Why it matters: Reception staff open that list dozens of times a shift.
```

## Checking it

`npx product-engineer check <file>` reports whether a message carries the block and
whether it reads the way this skill asks. A commit-msg hook that refuses messages
without the block is in the repository under `scripts/`.
```

`skills/done-means-observed/SKILL.md`:

```
---
name: done-means-observed
description: Use when reporting that a piece of software work is finished. Makes the agent report what it watched happen in logs, data or on a real device, and say exactly what it could not check, instead of calling work done because tests pass.
license: MIT
metadata:
  author: Efe Genc
  version: 0.3.0
  source: https://github.com/Bubblegunn/product-engineer
---

# done-means-observed

Rule 3 of the product-engineer skill on its own. Work is done when you have watched it
behave, or when you have written down which observation you could not make and why.
"Tests pass" is the entry ticket, not the report.

## The report

Before saying done, tick what you did and name what you could not:

- [ ] I watched the change behave in production logs, or in the environment closest to it.
- [ ] I looked at the data it wrote (a row, a document, a file), not only the response code.
- [ ] I tried it on a real device or browser when the change is visible to a person.
- [ ] I tried the failure path once (bad input, timeout, missing permission).
- [ ] The customer-facing text was read by someone who did not write it, or I read it aloud.

Then write the report in this shape:

```
Watched: <what you saw, where, with the command or the screen it came from>
Could not check: <what, and why>
```

Never write "done" with an empty `Watched` line. If nothing could be observed, say
"Not observed yet" as the first words of the report and list what would let you observe it.

## Before and after

Before:

```
Done. All 42 tests pass.
```

After:

```
Watched it in staging logs: 3 of 3 webhook retries logged, final failure recorded with the booking id.
Could not check: production, no deploy yet.
```

## Where this comes from

Lean practice calls it "go and see": the report comes from the place the work happened,
not from the desk. The full seven-rule skill is `product-engineer` in the same repository.
```

`skills/release-notes/SKILL.md`:

```
---
name: release-notes
description: Use when writing release notes, a changelog entry, a status update or a "what's new" message for people who do not read code. Makes the agent lead with what the reader can do now, keep one line per change, explain every term, count every number, and list what is not in this release.
license: MIT
metadata:
  author: Efe Genc
  version: 0.3.0
  source: https://github.com/Bubblegunn/product-engineer
---

# release-notes

The product-engineer rules for an agent that writes about software rather than writing
it: release notes, changelog entries, status updates to a founder or a client, a
"what's new" message.

## Five rules

1. **Lead with what the reader can do now.** The first line of every entry is the
   outcome in the reader's words, not the component that changed. "You can export a
   month of bookings as a spreadsheet" before "Added CSV export endpoint".
2. **One line per change, and the why in the same line.** "You can X, so that Y." If a
   change has no reader-visible effect, it goes under a single line: "Behind the scenes:
   groundwork for <the next visible thing>."
3. **Explain every term the first time.** A word the reader would have to look up gets
   a short explanation in the sentence, then their word is used from then on.
4. **Every number has its method next to it.** "Loads in under a second (measured on the
   largest account, 40,000 bookings)". A number without its scope is not written.
5. **Say what is not in this release.** A closing `Not in this release:` list, one line
   each with the reason, so nobody searches for something that is not there.

## Shape

```
<Release name or date>

You can now <outcome>, so that <why it matters>.
You no longer <suffering>, because <what changed, in plain words>.
Behind the scenes: <groundwork, one line>.

Not in this release:
- <thing>: <why not now>
```

## Before and after

Before:

```
- Added CSV export endpoint with pagination
- Refactored pricing module
- Fixed race condition in badge counter
```

After:

```
You can now download a month of bookings as a spreadsheet, so month-end reconciliation stops being a copy-paste job.
The notification bell no longer lights up for things the system handled on its own; only items that need a person count.
Behind the scenes: the pricing rules moved into their own file, so the next pricing change is safer to ship.

Not in this release:
- Scheduled email of the export: nobody has asked; worth it when two customers do.
```

## When to skip this skill

Internal engineering changelogs read by engineers only. Say so in one line and use
conventional commit titles instead. The full seven-rule skill is `product-engineer` in
the same repository.
```

- [ ] **Step 5: Bump the plugin manifests**

`.claude-plugin/plugin.json`: `"version": "0.3.0"`, and `"description": "Your agent ships code. product-engineer makes it ship outcomes. Four skills: the seven rules, the customer block alone, done means observed, and release notes."`. `.claude-plugin/marketplace.json`: the plugin description gains ", plus three subset skills: customer-block, done-means-observed and release-notes".

- [ ] **Step 6: Run the structure test and the plugin validator, expect both to pass**

Run: `sh test/skill-structure.sh && claude plugin validate .`

- [ ] **Step 7: Lint prose and commit**

Run: `for f in skills/*/SKILL.md; do node /Users/efe/Desktop/ai-slop-linter/dist/src/cli.js "$f"; done`
Commit: `feat(skills): a pack of four, customer-block, done-means-observed and release-notes beside the core skill`

### Task 2: Adapters generated from SKILL.md

**Files:**
- Create: `scripts/generate-adapters.mjs`, `test/adapters.test.mjs`
- Generate: `.cursor/rules/product-engineer.mdc`, `.github/copilot-instructions.md`, `GEMINI.md`, `gemini-extension.json`, `.clinerules/product-engineer.md`, `.kiro/steering/product-engineer.md`, `.windsurf/rules/product-engineer.md`, `AGENTS.md`
- Modify: `.github/workflows/ci.yml`, `package.json` (test script)

**Interfaces:**
- Produces: `adapters(skillText: string, version: string): Record<string, string>` (path to content), `rulesFrom(skillText): string`, and the CLI `node scripts/generate-adapters.mjs [--check] [--root <dir>]`.

- [ ] **Step 1: Write the failing test**

`test/adapters.test.mjs`:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { adapters, rulesFrom } from "../scripts/generate-adapters.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const script = join(root, "scripts", "generate-adapters.mjs");
const skill = readFileSync(join(root, "skills", "product-engineer", "SKILL.md"), "utf8");

test("rulesFrom drops the frontmatter and the title and keeps the seven rules", () => {
  const rules = rulesFrom(skill);
  assert.ok(!rules.startsWith("---"));
  assert.ok(!/^# product-engineer/m.test(rules));
  for (const n of [1, 2, 3, 4, 5, 6, 7]) assert.ok(new RegExp(`^## ${n}\\. `, "m").test(rules), `rule ${n}`);
});

test("adapters produce the eight files, each marked generated and carrying the rules", () => {
  const out = adapters(skill, "0.3.0");
  const paths = Object.keys(out).sort();
  assert.deepEqual(paths, [
    ".clinerules/product-engineer.md",
    ".cursor/rules/product-engineer.mdc",
    ".github/copilot-instructions.md",
    ".kiro/steering/product-engineer.md",
    ".windsurf/rules/product-engineer.md",
    "AGENTS.md",
    "GEMINI.md",
    "gemini-extension.json",
  ]);
  for (const [p, text] of Object.entries(out)) {
    if (p.endsWith(".json")) continue;
    assert.ok(text.includes("Generated from skills/product-engineer/SKILL.md"), `${p} marked`);
    assert.ok(/^## 7\. /m.test(text), `${p} has rule 7`);
    assert.ok(!text.includes("—"), `${p} has no em dash`);
  }
  assert.ok(out[".cursor/rules/product-engineer.mdc"].startsWith("---\ndescription: "));
  assert.ok(out[".cursor/rules/product-engineer.mdc"].includes("alwaysApply: true"));
  assert.ok(out[".kiro/steering/product-engineer.md"].startsWith("---\ninclusion: always\n---"));
  assert.ok(out[".windsurf/rules/product-engineer.md"].startsWith("---\ntrigger: always_on\n---"));
  const manifest = JSON.parse(out["gemini-extension.json"]);
  assert.equal(manifest.contextFileName, "GEMINI.md");
  assert.equal(manifest.version, "0.3.0");
});

test("the CLI writes into --root, and --check passes then fails after an edit", () => {
  const dir = mkdtempSync(join(tmpdir(), "pe-adapters-"));
  mkdirSync(join(dir, "skills", "product-engineer"), { recursive: true });
  writeFileSync(join(dir, "skills", "product-engineer", "SKILL.md"), skill);
  writeFileSync(join(dir, "package.json"), JSON.stringify({ version: "9.9.9" }));
  const gen = spawnSync("node", [script, "--root", dir], { encoding: "utf8" });
  assert.equal(gen.status, 0, gen.stderr);
  assert.ok(existsSync(join(dir, "AGENTS.md")));
  const ok = spawnSync("node", [script, "--check", "--root", dir], { encoding: "utf8" });
  assert.equal(ok.status, 0, ok.stdout + ok.stderr);
  writeFileSync(join(dir, "GEMINI.md"), "edited by hand\n");
  const stale = spawnSync("node", [script, "--check", "--root", dir], { encoding: "utf8" });
  assert.equal(stale.status, 1);
  assert.match(stale.stdout + stale.stderr, /GEMINI\.md/);
});
```

- [ ] **Step 2: Run it, expect FAIL with "Cannot find module"**

Run: `node --test test/adapters.test.mjs`

- [ ] **Step 3: Write the generator**

`scripts/generate-adapters.mjs`:

```js
#!/usr/bin/env node
// Writes the seven rules from skills/product-engineer/SKILL.md into every instruction
// file the surveyed agents read, so an agent that never loads SKILL.md still gets them.
//   node scripts/generate-adapters.mjs            # write the files
//   node scripts/generate-adapters.mjs --check    # exit 1 when any file is out of date
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const SOURCE = "skills/product-engineer/SKILL.md";
const NOTE = `Generated from ${SOURCE} by scripts/generate-adapters.mjs. Edit the skill, then run: node scripts/generate-adapters.mjs`;

/** The rules: the skill body without frontmatter and without the title line. */
export function rulesFrom(skillText) {
  const parts = skillText.split(/^---\s*$/m);
  const body = parts.length >= 3 ? parts.slice(2).join("---") : skillText;
  return body.trim().replace(/^# product-engineer\s*\n/, "").trim();
}

export function descriptionFrom(skillText) {
  const m = skillText.match(/^description:\s*(.+)$/m);
  return m ? m[1].trim() : "";
}

export function adapters(skillText, version) {
  const rules = rulesFrom(skillText);
  const description = descriptionFrom(skillText);
  const body = `# product-engineer\n\n${rules}\n`;
  const marked = `<!-- ${NOTE} -->\n\n${body}`;
  const preface = [
    "# For agents working in this repository, and for agents that installed it",
    "",
    `The skill lives in \`${SOURCE}\`; the rules below are copied from it. Every commit in`,
    "this repository carries the \"For the customer\" block; `scripts/commit-msg` enforces it.",
    "Other agents: `npx skills add Bubblegunn/product-engineer` places the skill for you.",
    "",
  ].join("\n");
  return {
    ".cursor/rules/product-engineer.mdc": `---\ndescription: ${JSON.stringify(description)}\nalwaysApply: true\n---\n${marked}`,
    ".github/copilot-instructions.md": marked,
    "GEMINI.md": marked,
    "gemini-extension.json": `${JSON.stringify({ name: "product-engineer", version, description, contextFileName: "GEMINI.md" }, null, 2)}\n`,
    ".clinerules/product-engineer.md": marked,
    ".kiro/steering/product-engineer.md": `---\ninclusion: always\n---\n${marked}`,
    ".windsurf/rules/product-engineer.md": `---\ntrigger: always_on\n---\n${marked}`,
    "AGENTS.md": `<!-- ${NOTE} -->\n\n${preface}\n${body}`,
  };
}

function main(argv) {
  const rootIndex = argv.indexOf("--root");
  const root = resolve(rootIndex >= 0 ? argv[rootIndex + 1] : join(dirname(fileURLToPath(import.meta.url)), ".."));
  const check = argv.includes("--check");
  const skill = readFileSync(join(root, SOURCE), "utf8");
  const version = JSON.parse(readFileSync(join(root, "package.json"), "utf8")).version;
  const files = adapters(skill, version);
  const stale = [];
  for (const [rel, content] of Object.entries(files)) {
    const path = join(root, rel);
    if (check) {
      if (!existsSync(path) || readFileSync(path, "utf8") !== content) stale.push(rel);
      continue;
    }
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, content);
    console.log(`wrote ${rel}`);
  }
  if (check && stale.length) {
    console.error(`out of date: ${stale.join(", ")}\nrun: node scripts/generate-adapters.mjs`);
    return 1;
  }
  if (check) console.log(`adapters up to date (${Object.keys(files).length} files)`);
  return 0;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) process.exit(main(process.argv.slice(2)));
```

- [ ] **Step 4: Run the test, expect PASS; generate the files in the repository**

Run: `node --test test/adapters.test.mjs && node scripts/generate-adapters.mjs && node scripts/generate-adapters.mjs --check`

- [ ] **Step 5: Wire CI and the test script**

`package.json` test script: `"test": "sh test/skill-structure.sh && sh test/commit-msg.test.sh && node --test test/check.test.mjs test/adapters.test.mjs && node scripts/generate-adapters.mjs --check"`.

`.github/workflows/ci.yml`: replace `- run: node --test test/check.test.mjs` with `- run: npm test`, and remove the two separate `sh test/...` steps (npm test runs them). Keep the Node setup step before it.

- [ ] **Step 6: Commit**

Commit: `feat(adapters): generate Cursor, Copilot, Gemini, Cline, Kiro, Windsurf and AGENTS.md from SKILL.md`

### Task 3: Honest rescoring

**Files:**
- Modify: `evals/score.mjs`, `evals/RESULTS.md`, `README.md` (Measured table), `site/index.html` (Measured table)
- Create: `test/score.test.mjs`

**Interfaces:**
- Produces: `metrics.numbersWithMethod.test`, `metrics.scopeRespected.test` (changed behaviour), `extras.documentedElsewhere` printed as a per-task column.

- [ ] **Step 1: Write the failing test**

`test/score.test.mjs`:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { metrics, extras } from "../evals/score.mjs";

const nm = (final) => metrics.numbersWithMethod.test({ final });

test("numbers inside code spans and fences do not count", () => {
  assert.equal(nm("Set `retries = 3` and moved on."), true);
  assert.equal(nm("```\nconst n = 42;\n```\nAll good."), true);
});

test("versions, issue numbers, years and hashes are not bare numbers", () => {
  assert.equal(nm("Bumped to v1.2.3 for #42 in 2026 at commit 9f3a2b1c."), true);
});

test("a bare count is still caught, a counted one is not", () => {
  assert.equal(nm("There are 12 customers affected."), false);
  assert.equal(nm("I counted 12 customers in customers.json, out of 40."), true);
});

test("markdown files no longer break scope, and are reported separately", () => {
  const sample = { changed: ["src/a.js", "README.md"], allowed: ["src/a.js"] };
  assert.equal(metrics.scopeRespected.test(sample), true);
  assert.equal(extras.documentedElsewhere.test(sample), true);
  assert.equal(extras.documentedElsewhere.test({ changed: ["src/a.js"], allowed: ["src/a.js"] }), false);
  assert.equal(metrics.scopeRespected.test({ changed: ["src/b.js"], allowed: ["src/a.js"] }), false);
});
```

- [ ] **Step 2: Run it, expect FAIL (extras is not exported; the code-span case is false)**

Run: `node --test test/score.test.mjs`

- [ ] **Step 3: Change the two heuristics and add extras**

In `evals/score.mjs`, above `export const metrics`:

```js
const stripCode = (s) => s.replace(/```[\s\S]*?```/g, " ").replace(/`[^`\n]*`/g, " ");
const withoutIds = (s) => s.replace(/\b(v?\d+\.\d+(\.\d+)?|#\d+|20\d\d|[0-9a-f]{7,40})\b/gi, " ");
const METHOD = /\b(count(ed)?|git|ran|measured|out of|of the|in the (file|data|list|logs?)|customers\.json|per)\b/i;
const isDoc = (f) => /\.(md|mdx|rst|txt)$/i.test(f);
const isTest = (f) => /(^|\/)(__tests__|tests?)\/|\.(test|spec)\.[a-z]+$/.test(f);
```

Replace `numbersWithMethod.test` with:

```js
    test: ({ final }) => {
      const sentences = stripCode(final).split(/(?<=[.!?])\s+|\n+/).map(withoutIds).filter((s) => /\d/.test(s));
      if (!sentences.length) return true;
      return sentences.every((s) => METHOD.test(s));
    },
```

Replace `scopeRespected` with:

```js
  scopeRespected: {
    title: "Only the requested files changed (tests and documentation allowed)",
    test: ({ changed, allowed }) => changed.every((f) => allowed.includes(f) || isTest(f) || isDoc(f)),
  },
```

After `metrics`, add:

```js
/** Reported per task, not counted in the summary. */
export const extras = {
  documentedElsewhere: {
    title: "documented the change in a file not listed",
    test: ({ changed, allowed }) => changed.some((f) => isDoc(f) && !allowed.includes(f)),
  },
};
```

In `score()`, after `results`, add `extras: Object.fromEntries(Object.entries(extras).map(([k, m]) => [k, m.test(sample)]))` to the row. In `perTask()`, add a column: header `| ${keys.join(" | ")} | docs elsewhere | turns | cost |`, separator gets one more `---`, and each row inserts `${r.extras.documentedElsewhere ? "yes" : "no"}` before turns.

- [ ] **Step 4: Run the test, expect PASS; rescore**

Run: `node --test test/score.test.mjs && node evals/score.mjs`

- [ ] **Step 5: Rewrite the numbers**

Paste the new summary table into `evals/RESULTS.md` (replace the old table and the per-task table), and replace the paragraph on the two metrics with one that says the heuristics were changed on 5 September (code spans stripped, identifiers ignored, documentation files allowed) and links the commit. Put the same summary rows into `README.md` under Measured and into `site/index.html`, and rewrite the sentence after the table in both to describe what still did not move, if anything, using only the rescored counts.

- [ ] **Step 6: Commit**

Commit: `fix(evals): strip code and identifiers from the number heuristic, allow documentation in scope, rescore`

### Task 4: README as a demo, install page, terminal demo

**Files:**
- Create: `docs/install.md`, `assets/check-demo.svg`, `test/fixtures/without-block.txt`, `test/fixtures/with-block.txt`, `scripts/demo.tape`
- Modify: `README.md`, `README.tr.md` (install section shortened, link to docs/install.md), `site/index.html` (pack mention, demo image), `llms.txt`

- [ ] **Step 1: Fixtures and the real output**

`test/fixtures/without-block.txt`:

```
feat(export): monthly bookings as CSV
```

`test/fixtures/with-block.txt`:

```
feat(export): monthly bookings as CSV

For the customer:
What changed: Accountants can download a month of bookings as a spreadsheet.
Why it matters: They asked for this every month and typed it by hand.
Automation effect: The monthly copy-paste into the spreadsheet is gone.

Not shipped:
- Scheduled email of the export: nobody has asked; worth it when two customers do.
```

Run both through `node bin/check.mjs check test/fixtures/<file>` and copy the exact output into the SVG.

- [ ] **Step 2: Draw `assets/check-demo.svg`**

A 760 by 300 SVG: dark background `#111`, monospace 13px, three faux window dots, then the two sessions as `<text>` lines, `$ product-engineer check without-block.txt` in `#9aa`, the `error` line in `#f28b82`, `ok` lines in `#8fd18f`, the closing counts in white, and `exit 1` / `exit 0` after each. No text that is not the literal output.

`scripts/demo.tape` (VHS, for when it is installed):

```
Output assets/check-demo.gif
Set FontSize 14
Set Width 900
Set Height 360
Type "product-engineer check test/fixtures/without-block.txt" Enter Sleep 2s
Type "product-engineer check test/fixtures/with-block.txt" Enter Sleep 3s
```

- [ ] **Step 3: Write `docs/install.md`**

Move the "Where it lands" table, the verification sentence, the plugin commands, the by-hand copy and the hook line out of the README into `docs/install.md` under headings: Install with skills.sh, Where it lands, Claude Code plugin, By hand, The pack (a table of the four skills with one-line "install when"), Git hook, CI (the action snippet), Pre-commit, lefthook and husky (added in Task 5, leave a heading now with the hook line).

- [ ] **Step 4: Reorder the README**

New order: wordmark, site link, language line, tagline, badges (add `skills-4`), one paragraph, `## See it` (the commit pair, the final-message pair, the demo image `<img src="assets/check-demo.svg" width="760" alt="product-engineer check on a message without the block, then with it">`), `## Install` (one-liner, one sentence pointing to `docs/install.md`, one line on the plugin), `## Measured` (unchanged table, rescored), `## The pack` (four rows), `## The seven rules`, `## Check a message or a pull request` (shortened), `## Use it in CI`, `## What it does not do`, `## Where it comes from`, `## Contributing`, `## Stars`. Drop the long real pair from the notification task (it stays in `references/commit-template.md`? No: move it to `docs/examples.md` and link it from See it in one line).

- [ ] **Step 5: Sync the Turkish README, the site and llms.txt**

`README.tr.md`: replace the "Nereye kurulur" table and plugin block with one sentence linking `docs/install.md`; add a "Paket" line naming the four skills. `site/index.html`: add the demo image under the before/after, and one sentence naming the four skills. `llms.txt`: add the pack and `docs/install.md` to the Docs list, and change "Not an npm package" to "Also a zero-dependency check CLI (bin/check.mjs)".

- [ ] **Step 6: Lint, test, commit**

Run: `for f in README.md README.tr.md docs/install.md docs/examples.md; do node /Users/efe/Desktop/ai-slop-linter/dist/src/cli.js "$f"; done && npm test`
Commit: `docs(readme): show it before explaining it, move the install matrix to docs/install.md`

### Task 5: Push, CI, and the install check

- [ ] **Step 1: Pull, push, watch**

Run: `git pull --rebase origin main && git push origin main`, then poll `gh run list -R Bubblegunn/product-engineer --limit 6 --json name,status,conclusion` until `ci`, `zizmor`, `pages` are `completed success`.

- [ ] **Step 2: Verify the pack installs**

Run in a temp dir: `git init -q && npx -y skills add Bubblegunn/product-engineer --all --copy -y` and assert `.agents/skills/{product-engineer,customer-block,done-means-observed,release-notes}/SKILL.md` exist.

## Post-launch

### Task 6: `check` as integrations

**Files:**
- Create: `integrations/commitlint/index.mjs`, `integrations/commitlint/config.mjs`, `integrations/commitlint/README.md`, `.pre-commit-hooks.yaml`, `scripts/pre-commit-check.sh`, `test/integrations.test.mjs`
- Modify: `docs/install.md`, `package.json` (`files`, `prepublishOnly`, `exports`)

- [ ] **Step 1: Failing test**

`test/integrations.test.mjs`:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { rules } from "../integrations/commitlint/index.mjs";
import config from "../integrations/commitlint/config.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

test("commitlint rule passes a message with the block and fails one without", () => {
  const [okPassed] = rules["customer-block"]({ raw: readFileSync(join(root, "test/fixtures/with-block.txt"), "utf8") }, "always");
  assert.equal(okPassed, true);
  const [passed, message] = rules["customer-block"]({ raw: "feat: no block\n" }, "always");
  assert.equal(passed, false);
  assert.match(message, /For the customer/);
  const [mergePassed] = rules["customer-block"]({ raw: "Merge branch 'x'\n" }, "always");
  assert.equal(mergePassed, true);
});

test("the shareable config enables the rule as an error", () => {
  assert.deepEqual(config.rules["customer-block"], [2, "always"]);
  assert.equal(typeof config.plugins[0].rules["customer-block"], "function");
});

test("the pre-commit entry runs check on the message file", () => {
  const r = spawnSync("sh", [join(root, "scripts/pre-commit-check.sh"), join(root, "test/fixtures/without-block.txt")], { encoding: "utf8" });
  assert.equal(r.status, 1);
  const ok = spawnSync("sh", [join(root, "scripts/pre-commit-check.sh"), join(root, "test/fixtures/with-block.txt")], { encoding: "utf8" });
  assert.equal(ok.status, 0);
});
```

- [ ] **Step 2: Implement**

`integrations/commitlint/index.mjs`:

```js
// A commitlint plugin with one rule, customer-block: the message carries the
// "For the customer" block with a "What changed:" line. Merge, fixup, squash,
// revert and [no-customer] messages pass.
import { analyse } from "../../bin/check.mjs";

export const rules = {
  "customer-block": (parsed) => {
    const result = analyse(parsed.raw ?? parsed.body ?? "");
    if (result.skipped) return [true];
    const errors = result.findings.filter((f) => f.level === "error").map((f) => f.message);
    return [errors.length === 0, errors.join("; ")];
  },
};

export default { rules };
```

`integrations/commitlint/config.mjs`:

```js
import plugin from "./index.mjs";
export default { plugins: [plugin], rules: { "customer-block": [2, "always"] } };
```

`scripts/pre-commit-check.sh`:

```sh
#!/bin/sh
# pre-commit framework entry (stage commit-msg): the message file is the first argument.
exec node "$(dirname "$0")/../bin/check.mjs" check "$1"
```

`.pre-commit-hooks.yaml`:

```yaml
- id: product-engineer-check
  name: product-engineer customer block
  description: The commit message carries the "For the customer" block.
  entry: scripts/pre-commit-check.sh
  language: script
  stages: [commit-msg]
```

`integrations/commitlint/README.md` shows `commitlint.config.mjs` with `export { default } from "product-engineer/commitlint";` and the inline alternative. `package.json` adds `"exports": { ".": "./bin/check.mjs", "./commitlint": "./integrations/commitlint/config.mjs", "./commitlint/plugin": "./integrations/commitlint/index.mjs" }`, `"files"` gains `"integrations"`, and `"scripts.prepublishOnly": "npm test"`. `docs/install.md` gets the pre-commit, lefthook (`commit-msg: commands: customer-block: run: npx product-engineer check {1}`) and husky (`npx product-engineer check "$1"`) snippets and the commitlint line.

- [ ] **Step 3: Test, publint, commit**

Run: `node --test test/integrations.test.mjs && npx -y publint`
Commit: `feat(check): commitlint plugin, pre-commit hook and lefthook and husky snippets`

### Task 7: Eval v2 harness

**Files:**
- Modify: `evals/run.sh`, `evals/score.mjs`, `evals/README.md`
- Create: `evals/judge.mjs`, `evals/BENCHMARK.md`, `test/judge.test.mjs`, `test/fixtures/fake-claude.sh`; extend `test/score.test.mjs`

- [ ] **Step 1: Failing tests**

Append to `test/score.test.mjs`:

```js
import { bootstrapDelta, mulberry32 } from "../evals/score.mjs";

test("bootstrapDelta is seeded and brackets an obvious effect", () => {
  const deltas = [1, 1, 1, 0, 1, 1, 1, 1];
  const a = bootstrapDelta(deltas, 2000, 7);
  const b = bootstrapDelta(deltas, 2000, 7);
  assert.deepEqual(a, b);
  assert.ok(a.low > 0 && a.high <= 1 && a.mean > 0.8);
});

test("mulberry32 is deterministic", () => {
  const r1 = mulberry32(1), r2 = mulberry32(1);
  assert.equal(r1(), r2());
});
```

`test/judge.test.mjs`:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { judgePair, prompt } from "../evals/judge.mjs";

const fake = join(dirname(fileURLToPath(import.meta.url)), "fixtures", "fake-claude.sh");

test("the prompt names both messages and the diff and asks for one letter", () => {
  const p = prompt({ diff: "+ a", a: "msg A", b: "msg B" });
  assert.match(p, /msg A/); assert.match(p, /msg B/); assert.match(p, /Answer with A or B/);
});

test("judgePair maps the answer back through the random order", async () => {
  const v = await judgePair({ diff: "+ a", bare: "bare text", skill: "skill text" }, { command: fake, random: () => 0.9 });
  assert.ok(["bare", "skill"].includes(v.winner));
  assert.equal(typeof v.order, "string");
});
```

`test/fixtures/fake-claude.sh`: `#!/bin/sh\necho '{"result":"A"}'`.

- [ ] **Step 2: Implement**

`evals/run.sh`: read `runs="${PE_EVAL_RUNS:-1}"`; wrap the per-condition body in `for run in $(seq 1 "$runs")`; set `out="$results_dir/$name/$condition"` when `runs` is 1, else `out="$results_dir/$name/$condition/run-$run"`.

`evals/score.mjs`: in `score()`, for each condition dir list `run-*` subdirectories; if none, treat the dir as run 1; each row gets `run`. Add:

```js
export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Bootstrap 95% interval on the mean of paired deltas (one per task), seeded. */
export function bootstrapDelta(deltas, resamples = 10000, seed = 1) {
  const rand = mulberry32(seed);
  const n = deltas.length;
  const means = [];
  for (let i = 0; i < resamples; i++) {
    let s = 0;
    for (let j = 0; j < n; j++) s += deltas[Math.floor(rand() * n)];
    means.push(s / n);
  }
  means.sort((x, y) => x - y);
  return { mean: deltas.reduce((s, d) => s + d, 0) / n, low: means[Math.floor(0.025 * resamples)], high: means[Math.ceil(0.975 * resamples) - 1] };
}
```

`table(rows)`: per metric, per task compute the mean pass over runs for each arm, delta = skill - bare; if every task has at least two runs per arm, append a `95% CI` column from `bootstrapDelta`, else the column reads `n/a (one run per arm)`.

`evals/judge.mjs`: `prompt({diff, a, b})` returns the rubric text ("truer to the diff", "more useful to a non-engineer", "Answer with A or B"); `judgePair({diff, bare, skill}, {command = "claude", random = Math.random})` shuffles which is A, runs `command -p <prompt> --output-format json`, parses `result` for `A|B`, returns `{ winner, order }`; `main` walks `evals/results`, pairs bare and skill commits per task and run, writes `evals/results/judgements.json`, and refuses to run without `--yes` (prints the pair count and the cost estimate at $0.05 per call).

`evals/BENCHMARK.md`: the CommitSuite subset design from the spec (50 diffs whose messages carry both what and why, permissive licences, two raters, Cohen's kappa reported, cost estimate 50 pairs x 2 arms x 3 runs at $0.45 = $135, plus judging at $0.05 per pair), with the dataset URLs from the research report.

- [ ] **Step 3: Test and commit**

Run: `node --test test/score.test.mjs test/judge.test.mjs`
Commit: `feat(evals): runs per arm, seeded bootstrap interval on paired deltas, a pairwise judge and the benchmark design`

### Task 8: Reference files with attribution

**Files:**
- Create: `skills/product-engineer/references/press-release.md`, `ship-show-ask.md`, `appetite.md`
- Modify: `skills/product-engineer/references/definition-of-done.md`, `skills/product-engineer/SKILL.md` (rules 1 and 7 gain a pointer line each), `test/skill-structure.sh` (add the three files to the loop)

Each new file: under 40 lines, the practice in this repository's words, one worked example on a booking or notification task, and a closing "Where this comes from" line with the URL (Working Backwards by Bryar and Carr; martinfowler.com/articles/ship-show-ask.html; basecamp.com/shapeup). `definition-of-done.md` gains a final line: `- [ ] One sentence on what I would do differently next time (the lean habit of hansei, lean.org/lexicon-terms/hansei).`

Commit: `docs(references): press-release restatement, ship-show-ask, appetite, and a hansei line`

### Task 9: Plain-language tables in Turkish, Japanese and Chinese

**Files:**
- Create: `skills/product-engineer/references/plain-language.tr.md`, `plain-language.ja.md`, `plain-language.zh.md`
- Modify: `skills/product-engineer/SKILL.md` rule 6 (one sentence: other languages in `plain-language.<lang>.md`), `test/skill-structure.sh` (each table has the idempotent row and 15 rows)

Each file: the same fifteen terms, the plain sentence in that language, a one-line style reference naming the public guideline (Turkish: no official guide, the file says so and cites Ateşman's readability formula as the yardstick; Japanese: the Immigration Services Agency easy-Japanese guideline; Chinese: none official, the file says so). No text copied from any guideline.

Commit: `docs(references): plain-language tables in Turkish, Japanese and Chinese`

### Task 10: Readability in `check`

**Files:**
- Create: `bin/readability.mjs`, `test/readability.test.mjs`
- Modify: `bin/check.mjs` (info line, `--lang`), `test/check.test.mjs` (one test), `README.md` (one sentence under Check)

- [ ] **Step 1: Failing test**

`test/readability.test.mjs`:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { syllablesEn, syllablesTr, lix, flesch, atesman, readability } from "../bin/readability.mjs";

test("syllable counts", () => {
  assert.equal(syllablesEn("customer"), 3);
  assert.equal(syllablesEn("the"), 1);
  assert.equal(syllablesTr("müşteri"), 3);
});

test("short plain English scores as easy on Flesch and LIX", () => {
  const t = "The badge shows a number. The number means something needs you.";
  assert.ok(flesch(t) > 70);
  assert.ok(lix(t) < 35);
});

test("Turkish uses Atesman", () => {
  const t = "Rozet bir sayı gösterir. Sayı size bir şey gerektiğini söyler.";
  assert.ok(atesman(t) > 60);
  assert.equal(readability(t, "tr").name, "Ateşman");
});
```

- [ ] **Step 2: Implement `bin/readability.mjs`**

```js
// Readability of a short text, no dependencies. Flesch reading ease for English,
// Ateşman for Turkish, LIX for any language. Sentence and word splitting is simple
// on purpose: these are numbers to watch, not grades to pass.
const sentencesOf = (t) => t.split(/[.!?]+(\s|$)/).map((s) => s.trim()).filter((s) => /\w/.test(s));
const wordsOf = (t) => t.match(/[\p{L}\p{N}']+/gu) ?? [];

export function syllablesEn(word) {
  const w = word.toLowerCase().replace(/[^a-z]/g, "");
  if (!w) return 0;
  let n = (w.replace(/e$/, "").match(/[aeiouy]+/g) ?? []).length;
  if (/le$/.test(w) && !/[aeiouy]le$/.test(w)) n++;
  return Math.max(1, n);
}

export function syllablesTr(word) {
  return Math.max(1, (word.toLowerCase().match(/[aeıioöuüâîû]/g) ?? []).length);
}

export function lix(text) {
  const words = wordsOf(text), sentences = sentencesOf(text);
  if (!words.length || !sentences.length) return 0;
  const long = words.filter((w) => w.length > 6).length;
  return words.length / sentences.length + (100 * long) / words.length;
}

export function flesch(text) {
  const words = wordsOf(text), sentences = sentencesOf(text);
  if (!words.length || !sentences.length) return 0;
  const syl = words.reduce((s, w) => s + syllablesEn(w), 0);
  return 206.835 - 1.015 * (words.length / sentences.length) - 84.6 * (syl / words.length);
}

export function atesman(text) {
  const words = wordsOf(text), sentences = sentencesOf(text);
  if (!words.length || !sentences.length) return 0;
  const syl = words.reduce((s, w) => s + syllablesTr(w), 0);
  return 198.825 - 40.175 * (syl / words.length) - 2.61 * (words.length / sentences.length);
}

const band = (score, easyAbove, hardBelow) => (score >= easyAbove ? "easy" : score < hardBelow ? "hard" : "medium");

/** { name, score, band, lix } for the block; name is the language-specific scale. */
export function readability(text, lang = "en") {
  const l = lix(text);
  if (lang === "tr") { const s = atesman(text); return { name: "Ateşman", score: Math.round(s), band: band(s, 70, 50), lix: Math.round(l) }; }
  const s = flesch(text);
  return { name: "Flesch", score: Math.round(s), band: band(s, 60, 30), lix: Math.round(l) };
}
```

In `bin/check.mjs`: import `readability`; accept `--lang <code>` in `parse`; after the jargon findings inside `if (blockStart >= 0)`, `const r = readability(blockText, opts.lang ?? "en"); add("info", \`readability of the block: ${r.name} ${r.score} (${r.band}), LIX ${r.lix}\`);`. `render` already pads levels; `exitCode` ignores `info`. Add to `test/check.test.mjs`: `assert.ok(has(analyse(full), "info", /Flesch \d+/))` and with `{ lang: "tr" }` `/Ateşman/`. README, under Check: one sentence that the block gets a readability line (Flesch or Ateşman, plus LIX) as information only.

- [ ] **Step 3: Test and commit**

Run: `node --test test/readability.test.mjs test/check.test.mjs`
Commit: `feat(check): readability of the customer block, Flesch or Ateşman plus LIX, as an info line`

### Task 11: Chinese README, contribution rule, changelog

**Files:**
- Create: `README.zh-CN.md`
- Modify: `CONTRIBUTING.md`, `CHANGELOG.md`, `README.md` and `README.tr.md` language lines, `ROADMAP.md` (tick what shipped)

`README.zh-CN.md`: same sections as `README.tr.md`, in Simplified Chinese, code blocks in English. `CONTRIBUTING.md` adds "A new rule, or a change to one, ships with an eval task under `evals/tasks/` and a before/after pair in `references/`; a reference-only change needs the pair." `CHANGELOG.md` gets `## 0.3.0 (unreleased)` listing the pack, adapters, rescoring, integrations, harness, references, tables, readability, Chinese README. `ROADMAP.md` moves shipped items into a "Shipped in 0.3" list.

Commit: `docs: Chinese README, the eval-task rule for contributions, 0.3.0 changelog`

### Task 12: Final push and verification

- [ ] `npm test`, lint every changed prose file, `git pull --rebase origin main && git push origin main`, wait for `ci`, `zizmor`, `pages`; run `node scripts/generate-adapters.mjs --check` once more on the pushed tree; check `gh pr list` for outside pull requests and handle them per the directive.
