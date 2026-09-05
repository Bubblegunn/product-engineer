import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { analyse, exitCode, render } from "../bin/check.mjs";

const cli = join(dirname(fileURLToPath(import.meta.url)), "..", "bin", "check.mjs");
const levels = (r) => r.findings.map((f) => f.level);
const has = (r, level, re) => r.findings.some((f) => f.level === level && re.test(f.message));

const full = `feat: export bookings

For the customer:
What changed: Accountants can download all bookings for a month as a spreadsheet.
Why it matters: They asked for this every month and typed it by hand.
Automation effect: The monthly copy-paste into the spreadsheet is gone.

Not shipped:
- Scheduled email of the export: nobody has asked; worth it when two customers do.
`;

test("the block gets a readability line as information only", () => {
  assert.ok(has(analyse(full), "info", /Flesch \d+/));
  assert.ok(has(analyse(full, { lang: "tr" }), "info", /Ateşman/));
  assert.equal(exitCode(analyse(full)), 0);
});

test("a full block passes with no errors", () => {
  const r = analyse(full);
  assert.equal(exitCode(r), 0);
  assert.ok(has(r, "ok", /block with "What changed:"/));
  assert.ok(has(r, "ok", /Why it matters/));
  assert.ok(has(r, "ok", /Automation effect:" present/));
  assert.ok(has(r, "ok", /Not shipped:" lists 1 item with reasons/));
  assert.ok(!levels(r).includes("error"));
});

test("a missing block is an error, or a warning with --warn", () => {
  const r = analyse("feat: thing without the block\n");
  assert.equal(exitCode(r), 1);
  assert.ok(has(r, "error", /no "For the customer:" block/));
  const w = analyse("feat: thing without the block\n", { warn: true });
  assert.equal(exitCode(w), 0);
  assert.ok(has(w, "warn", /no "For the customer:" block/));
});

test("a heading without What changed is an error; a missing Why it matters is a warning", () => {
  const r = analyse("feat: x\n\nFor the customer:\nWhy it matters: because\n");
  assert.ok(has(r, "error", /no "What changed:" line/));
  const w = analyse("feat: x\n\nFor the customer:\nWhat changed: People can export.\n");
  assert.equal(exitCode(w), 0);
  assert.ok(has(w, "warn", /Why it matters:" missing/));
});

test("an empty Automation effect line is an error; an omitted one is fine", () => {
  const r = analyse("feat: x\n\nFor the customer:\nWhat changed: A.\nWhy it matters: B.\nAutomation effect:\n");
  assert.ok(has(r, "error", /Automation effect:" is present but empty/));
  const ok = analyse("feat: x\n\nFor the customer:\nWhat changed: A.\nWhy it matters: B.\n");
  assert.ok(has(ok, "ok", /omitted/));
});

test("Not shipped items need a thing and a reason", () => {
  const r = analyse("feat: x\n\nFor the customer:\nWhat changed: A.\nWhy it matters: B.\n\nNot shipped:\n- just a thing\n");
  assert.ok(has(r, "warn", /items should read/));
  const e = analyse("feat: x\n\nFor the customer:\nWhat changed: A.\nWhy it matters: B.\n\nNot shipped:\n");
  assert.ok(has(e, "warn", /has no items/));
});

test("numbers without a method or scope in the sentence are warned; numbers with one are not", () => {
  const bare = analyse("feat: x\n\nWe made it 40 percent faster.\n\nFor the customer:\nWhat changed: A.\nWhy it matters: B.\n");
  assert.ok(has(bare, "warn", /number and no method/));
  const counted = analyse("feat: x\n\nThe list opens in 0.8s instead of 3s, measured with the browser profiler.\n\nFor the customer:\nWhat changed: A.\nWhy it matters: B.\n");
  assert.ok(!has(counted, "warn", /number and no method/));
});

test("jargon in the block is warned unless explained on the line", () => {
  const j = analyse("feat: x\n\nFor the customer:\nWhat changed: The webhook is now idempotent.\nWhy it matters: B.\n");
  assert.ok(has(j, "warn", /jargon.*idempotent/));
  const e = analyse("feat: x\n\nFor the customer:\nWhat changed: The webhook is idempotent (doing it twice has the same result as once).\nWhy it matters: B.\n");
  assert.ok(!has(e, "warn", /jargon/));
});

test("merge, fixup, revert and [no-customer] are skipped", () => {
  for (const msg of ["Merge branch 'x'", "fixup! feat", "Revert \"feat\"", "chore: deps [no-customer]"]) {
    const r = analyse(msg + "\n");
    assert.equal(r.skipped, true, msg);
    assert.equal(exitCode(r), 0);
  }
});

test("the CLI exits 1 on a missing block, 0 with --warn, 2 on usage, and reads stdin", () => {
  const bad = spawnSync("node", [cli, "check", "-"], { input: "feat: nothing\n", encoding: "utf8" });
  assert.equal(bad.status, 1);
  assert.match(bad.stdout, /1 error/);
  const warn = spawnSync("node", [cli, "check", "-", "--warn"], { input: "feat: nothing\n", encoding: "utf8" });
  assert.equal(warn.status, 0);
  const good = spawnSync("node", [cli, "check", "-"], { input: full, encoding: "utf8" });
  assert.equal(good.status, 0, good.stdout + good.stderr);
  assert.match(good.stdout, /no errors/);
  const usage = spawnSync("node", [cli, "check", "/definitely/not/a/file.txt"], { encoding: "utf8" });
  assert.equal(usage.status, 2);
  const help = execFileSync("node", [cli, "--help"], { encoding: "utf8" });
  assert.match(help, /usage: product-engineer check/);
  assert.match(render(analyse(full)), /no errors/);
});
