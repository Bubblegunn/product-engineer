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

import { table } from "../evals/score.mjs";

test("table refuses runs of different skills in one table", () => {
  const row = (condition, skill) => ({ task: "01", condition, run: 1, results: {}, extras: {}, meta: { skill }, final: "", commit: "", changed: [], allowed: [] });
  assert.throws(() => table([row("skill", "customer-block"), row("skill", "release-notes")]), /different skills/);
  assert.doesNotThrow(() => table([row("bare", null), row("skill", "customer-block")]));
  // A run recorded before meta.json named the skill installed the core pack, so it tables with one that names it.
  assert.doesNotThrow(() => table([row("skill", undefined), row("skill", "product-engineer")]));
  assert.throws(() => table([row("skill", undefined), row("skill", "customer-block")]), /different skills/);
});

import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

test("score.mjs accepts an absolute results directory as well as a relative one", () => {
  // `join(process.cwd(), dir)` turned an absolute path into cwd + path and failed with ENOENT.
  const script = fileURLToPath(new URL("../evals/score.mjs", import.meta.url));
  const results = fileURLToPath(new URL("../evals/results", import.meta.url));
  const run = spawnSync(process.execPath, [script, results], { encoding: "utf8" });
  assert.equal(run.status, 0, run.stderr);
  assert.match(run.stdout, /^\| metric \|/m);
});

// The release-notes task scores two heuristics that no other task has. They must apply to
// 09-release-notes only, and must fail an empty deliverable instead of passing it.
import { taskMetrics, failures } from "../evals/score.mjs";
const RN = "09-release-notes";
const clean = taskMetrics[RN].releaseNotesClean;
const quiet = taskMetrics[RN].noUnmeasuredEffect;

test("the two release-notes heuristics are scoped to the release-notes task", () => {
  assert.deepEqual(Object.keys(taskMetrics), [RN]);
  assert.deepEqual(Object.keys(taskMetrics[RN]).sort(), ["noUnmeasuredEffect", "releaseNotesClean"]);
});

test("releaseNotesClean passes plain owner-facing notes", () => {
  const notes = "Changes since v5.0.0 (commit 3a9f2c1 to 8d0b7e4)\n\nYou can now see 20 visits at a time on the waiting board, so a busy morning loads page by page.\n";
  assert.equal(clean.test({ notes }), true);
});

test("releaseNotesClean fails a commit-type prefix, an identifier, a file path, a docs line or a version bump", () => {
  const leaks = [
    "feat(sms): add a text button",
    "fix: the board skips finished visits",
    "Behind the scenes: roundMinutes helper moved",
    "The board calls waitingCount before it renders",
    "CSV export now escapes cells in src/export.js",
    "Docs: the README explains the export",
    "Chore: bump version to 5.0.1",
    "Release 5.0.1 is out",
    "Docs were updated for the export.",
    "The list calls loadPage before it renders",
  ];
  for (const line of leaks) assert.equal(clean.test({ notes: `Changes since v5.0.0\n\n${line}\n` }), false, line);
});

test("releaseNotesClean does not treat a camel-cased product name like iPad as an identifier", () => {
  assert.equal(clean.test({ notes: "Reception can now print on the iPad at the front desk.\n" }), true);
});

test("releaseNotesClean fails an empty deliverable instead of passing it", () => {
  assert.equal(clean.test({ notes: "" }), false);
  assert.equal(clean.test({ notes: "   \n" }), false);
});

test("noUnmeasuredEffect passes a true count and fails any speed claim, percentage or missing file", () => {
  assert.equal(quiet.test({ notes: "You can see 20 visits at a time." }), true);
  for (const line of ["The list is faster now.", "Pages load quicker.", "Less speed lag at checkout.", "Two times snappier.", "Loads instantly.", "The list is 40% smaller.", "A 25 percent cut in the list size."]) {
    assert.equal(quiet.test({ notes: `${line}\n` }), false, line);
  }
  assert.equal(quiet.test({ notes: "" }), false);
});

test("failures explains a failing release-notes cell with the line that caused it", () => {
  // A row shaped as score() builds it: every sample field present, every metric evaluated.
  const sample = { task: RN, condition: "skill", run: 1, final: "", commit: "", changed: [], allowed: [], notes: "Changes since v5.0.0\n\nfeat(sms): add a text button\n" };
  const results = Object.fromEntries(Object.entries({ ...metrics, ...taskMetrics[RN] }).map(([k, m]) => [k, m.test(sample)]));
  const out = failures([{ ...sample, results, extras: {} }]);
  assert.match(out, /09-release-notes, skill: release notes name no commit type/);
  assert.match(out, /feat\(sms\)/);
});

// Fix round 1. A notes task (kind: notes) commits nothing, so the core metrics do not score it.
import { mkdirSync as mkdirTree, mkdtempSync, writeFileSync as writeTree } from "node:fs";
import { tmpdir } from "node:os";
import { join as joinPath } from "node:path";
import { kindOf, score as scoreRuns, table as tableOf, perTask as perTaskOf } from "../evals/score.mjs";

const writeRun = (base, task, condition, files) => {
  const dir = joinPath(base, task, condition);
  mkdirTree(dir, { recursive: true });
  for (const [name, text] of Object.entries(files)) writeTree(joinPath(dir, name), text);
};
const codeRun = { "final.md": "I checked the export and saw the file open.\n", "commit.txt": "fix: export\n\nFor the customer:\nWhat changed: export works.\nWhy it matters: owners can open it.\n", "changed.txt": "src/export.js\n", "meta.json": "{}" };

test("kindOf reads the kind from TASK.md front matter and defaults to code", () => {
  assert.equal(kindOf("09-release-notes"), "notes");
  assert.equal(kindOf("01-export-safari"), "code");
});

test("a notes task leaves the eight-task tables and per-task rows exactly as they were", () => {
  const base = mkdtempSync(joinPath(tmpdir(), "pe-kind-"));
  writeRun(base, "01-export-safari", "bare", codeRun);
  writeRun(base, "01-export-safari", "skill", codeRun);
  const before = tableOf(scoreRuns(base)) + "\n" + perTaskOf(scoreRuns(base));
  writeRun(base, "09-release-notes", "skill", { "final.md": "Done.\n", "commit.txt": "", "changed.txt": "RELEASE_NOTES.md\n", "meta.json": "{}", "RELEASE_NOTES.md": "You can see 20 visits at a time.\n" });
  const after = tableOf(scoreRuns(base)) + "\n" + perTaskOf(scoreRuns(base));
  assert.equal(after, before);
});

test("a notes task is scored by its two heuristics only and reports no committed-nothing failure", () => {
  const base = mkdtempSync(joinPath(tmpdir(), "pe-kind-"));
  writeRun(base, "09-release-notes", "skill", { "final.md": "Done.\n", "commit.txt": "", "changed.txt": "RELEASE_NOTES.md\n", "meta.json": "{}", "RELEASE_NOTES.md": "You can see 20 visits at a time.\n" });
  const [row] = scoreRuns(base);
  assert.deepEqual(Object.keys(row.results).sort(), ["noUnmeasuredEffect", "releaseNotesClean"]);
  assert.equal(failures([row]), "No failing cells.");
});

test("noUnmeasuredEffect accepts a line that says the effect was not measured", () => {
  assert.equal(quiet.test({ notes: "Speed was not measured, so no speed is claimed.\n" }), true);
  assert.equal(quiet.test({ notes: "We did not measure speed.\n" }), true);
  assert.equal(quiet.test({ notes: "Page load is unmeasured.\n" }), true);
  assert.equal(quiet.test({ notes: "Page load has no measurement yet.\n" }), true);
  assert.equal(quiet.test({ notes: "The list is faster.\nSpeed was not measured.\n" }), false);
});
