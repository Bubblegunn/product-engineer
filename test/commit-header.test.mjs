// Header and trailer rules of the commit-message checker, at warn level. Each message is written in this
// file. A rule's warning names its code; a message that obeys the rule must not carry that code.
import { test } from "node:test";
import assert from "node:assert/strict";
import { analyse } from "../bin/check.mjs";

const BLOCK = "For the customer:\nWhat changed: People can export their bookings.\nWhy it matters: Accountants asked for it every month.";
const codes = (text) => analyse(text, { kind: "commit" }).findings.filter((f) => f.level === "warn").map((f) => f.code);

test("a long header is not warned: the length is commitlint's job, not ours", () => {
  const header = `feat: ${"a".repeat(90)}`;
  assert.ok(!codes(`${header}\n\n${BLOCK}`).includes("header-too-long"));
});

test("a body that starts on the line after the header, with no blank line, is warned", () => {
  assert.ok(codes(`feat: thing\n${BLOCK}`).includes("header-body-blank"));
  assert.ok(!codes(`feat: thing\n\n${BLOCK}`).includes("header-body-blank"));
  // A header with nothing after it has no body to separate.
  assert.ok(!codes("feat: thing").includes("header-body-blank"));
});

test("a breaking change marked with ! and no BREAKING CHANGE footer is warned", () => {
  assert.ok(codes(`feat(api)!: drop the old export\n\n${BLOCK}`).includes("breaking-missing-footer"));
  assert.ok(!codes(`feat(api)!: drop the old export\n\n${BLOCK}\n\nBREAKING CHANGE: the old export is gone.`).includes("breaking-missing-footer"));
});

test("a BREAKING CHANGE footer without the ! in the type is warned, and BREAKING-CHANGE counts as the footer", () => {
  assert.ok(codes(`feat: drop the old export\n\n${BLOCK}\n\nBREAKING CHANGE: the old export is gone.`).includes("breaking-no-bang"));
  assert.ok(codes(`feat: drop the old export\n\n${BLOCK}\n\nBREAKING-CHANGE: the old export is gone.`).includes("breaking-no-bang"));
  assert.ok(!codes(`feat!: drop the old export\n\n${BLOCK}\n\nBREAKING-CHANGE: the old export is gone.`).includes("breaking-no-bang"));
  assert.ok(!codes(`feat: plain change\n\n${BLOCK}`).includes("breaking-no-bang"));
});

test("a Co-authored-by trailer with no email in angle brackets is warned", () => {
  assert.ok(codes(`feat: thing\n\n${BLOCK}\n\nCo-authored-by: Claude`).includes("trailer-malformed"));
  assert.ok(codes(`feat: thing\n\n${BLOCK}\n\nCo-Authored-By: Claude <noreply@anthropic.com`).includes("trailer-malformed"));
  assert.ok(!codes(`feat: thing\n\n${BLOCK}\n\nCo-Authored-By: Claude <noreply@anthropic.com>`).includes("trailer-malformed"));
});

test("the header rules are warnings and never errors", () => {
  const NEW = new Set(["header-body-blank", "breaking-missing-footer", "breaking-no-bang", "trailer-malformed"]);
  const mine = analyse(`feat(api)!: ${"x".repeat(80)}\nno blank line\nCo-authored-by: nobody`, { kind: "commit" }).findings.filter((f) => NEW.has(f.code));
  assert.equal(mine.length, 3);
  assert.ok(mine.every((f) => f.level === "warn"), JSON.stringify(mine));
});

test("a pull request description is not read for commit header rules", () => {
  const prText = `${"a".repeat(90)}\n${BLOCK}`;
  assert.ok(!analyse(prText, { kind: "pr" }).findings.some((f) => f.code === "header-too-long"));
});
