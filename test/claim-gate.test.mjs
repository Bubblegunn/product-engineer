import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { findClaims, gate, readSession } from "../bin/claim-gate.mjs";

const GATE = join(dirname(fileURLToPath(import.meta.url)), "..", "bin", "claim-gate.mjs");
const write = (path, text = "") => ({ kind: "write", path, text });
const bash = (command) => ({ kind: "bash", command });
const session = (events, last, prompt = "Please help with the reminders in the calendar app.") => ({ events, prompt, last });
const reasonsFor = (events, last, prompt, extraTexts = []) => gate(session(events, last, prompt), [last, ...extraTexts]);

test("a session with no tool calls is never gated", () => {
  assert.deepEqual(reasonsFor([], "I did not change anything. Everything is formatting only."), []);
});

test("findClaims ignores code spans and quotes, and a negated phrase is not a claim", () => {
  assert.deepEqual(findClaims("The commit says \"formatting only\" and `no functional change` in its title."), []);
  assert.deepEqual(findClaims("This is not formatting only: one rule changed."), []);
  assert.equal(findClaims("This change is formatting only.")[0].family, "formatting");
});

test("no-change claim needs a git status or diff after the last write", () => {
  const events = [bash("ls"), write("src/reminder.js")];
  assert.match(reasonsFor(events, "No changes were made to the calendar.")[0], /git status and git diff/);
  assert.deepEqual(reasonsFor([...events, bash("git status --short")], "No changes were made to the calendar."), []);
  assert.deepEqual(reasonsFor([bash("ls")], "No changes were made to the calendar."), []);
});

test("a shell redirect or sed -i counts as a write", () => {
  const s = readSession([JSON.stringify({ type: "assistant", message: { content: [{ type: "tool_use", name: "Bash", input: { command: "sed -i 's/a/b/' src/a.js" } }, { type: "text", text: "Nothing was changed." }] } })]);
  assert.equal(s.events.filter((e) => e.kind === "write").length, 1);
  assert.equal(readSession([JSON.stringify({ type: "assistant", message: { content: [{ type: "tool_use", name: "Bash", input: { command: "npm test 2>&1 | tail -5" } }] } })]).events.filter((e) => e.kind === "write").length, 0);
});

test("a starting-state claim needs a git look before the first write", () => {
  const claim = "The reminder module was already there, uncommitted, and I did not write it.";
  assert.match(reasonsFor([bash("ls"), write("src/a.js")], claim)[0], /starting state/);
  assert.deepEqual(reasonsFor([bash("git status"), write("src/a.js")], claim), []);
  assert.match(reasonsFor([write("src/a.js"), bash("git status")], claim)[0], /starting state/);
});

test("formatting-only needs a whitespace-aware diff, a plain diff is not enough", () => {
  const claim = "The other files are formatting only.";
  assert.match(reasonsFor([write("PR.md"), bash("git diff main..HEAD --stat")], claim)[0], /whitespace-aware/);
  assert.deepEqual(reasonsFor([write("PR.md"), bash("git diff -w main..HEAD --stat")], claim), []);
  assert.deepEqual(reasonsFor([write("PR.md"), bash("git diff main..HEAD --ignore-all-space")], claim), []);
  assert.deepEqual(reasonsFor([write("PR.md"), bash("product-engineer scope main..HEAD")], claim), []);
});

test("a formatting-only claim in a written description is checked too", () => {
  const events = [write("PR.md", "This pull request is formatting only.")];
  assert.match(reasonsFor(events, "Done.", undefined, ["This pull request is formatting only."])[0], /whitespace-aware/);
});

test("unchanged behaviour and passing tests need a test run after the last edit", () => {
  const stale = [bash("npm test"), write("src/a.js")];
  assert.match(reasonsFor(stale, "Behaviour is unchanged.")[0], /no test command ran after your last edit/);
  assert.match(reasonsFor(stale, "All tests pass.")[0], /tests pass/);
  const fresh = [write("src/a.js"), bash("node --test test/")];
  assert.deepEqual(reasonsFor(fresh, "Behaviour is unchanged and all tests pass."), []);
  assert.deepEqual(reasonsFor([write("src/a.js"), bash("pytest -q")], "6 passed."), []);
});

test("a fix report needs a test file written when the person asked for a fix", () => {
  const prompt = "Fix the bug where a reminder is sent twice.";
  const source = [write("src/reminder.js"), bash("npm test")];
  assert.match(reasonsFor(source, "I fixed the duplicate reminder.", prompt)[0], /no test file was written/);
  assert.deepEqual(reasonsFor([...source, write("test/reminder.test.js")], "I fixed the duplicate reminder.", prompt), []);
  assert.deepEqual(reasonsFor(source, "I fixed the duplicate reminder.", "Add a weekly view."), []);
  assert.deepEqual(reasonsFor([write("README.md"), bash("npm test")], "I fixed the typo.", prompt), []);
});

test("a plain-language rewrite needs the facts command after the last edit", () => {
  const prompt = "Rewrite the cancellation terms in plain language and save them in TERMS-plain.md.";
  assert.match(reasonsFor([write("TERMS-plain.md")], "Saved.", prompt)[0], /product-engineer facts/);
  assert.deepEqual(reasonsFor([write("TERMS-plain.md"), bash("product-engineer facts TERMS.md TERMS-plain.md")], "Saved.", prompt), []);
});

function runHook(lines, input, env = {}) {
  const dir = mkdtempSync(join(tmpdir(), "gate-"));
  const transcript = join(dir, "t.jsonl");
  writeFileSync(transcript, lines.map((l) => JSON.stringify(l)).join("\n"));
  const r = spawnSync("node", [GATE], { input: JSON.stringify({ transcript_path: transcript, ...input }), encoding: "utf8", env: { ...process.env, ...env } });
  return r;
}
const line = (content) => ({ type: "assistant", message: { content } });
const tool = (name, input) => ({ type: "tool_use", name, input });
const transcript = [{ type: "user", message: { content: "Tidy the calendar app." } }, line([tool("Edit", { file_path: "src/a.js" })]), line([{ type: "text", text: "No changes were made." }])];

test("the hook blocks once with a reason and exit 0", () => {
  const r = runHook(transcript, {});
  assert.equal(r.status, 0);
  const out = JSON.parse(r.stdout);
  assert.equal(out.decision, "block");
  assert.match(out.reason, /claim check/);
});

test("the hook stays silent when it already blocked, when switched off, or when the transcript is unreadable", () => {
  assert.equal(runHook(transcript, { stop_hook_active: true }).stdout, "");
  assert.equal(runHook(transcript, {}, { PRODUCT_ENGINEER_NO_GATE: "1" }).stdout, "");
  const r = spawnSync("node", [GATE], { input: JSON.stringify({ transcript_path: "/nonexistent/t.jsonl" }), encoding: "utf8" });
  assert.equal(r.status, 0);
  assert.equal(r.stdout, "");
  assert.equal(spawnSync("node", [GATE], { input: "not json", encoding: "utf8" }).status, 0);
});

test("the hook prefers last_assistant_message and still reads written files", () => {
  const r = runHook([{ type: "user", message: { content: "Describe the branch." } }, line([tool("Write", { file_path: "PR.md", content: "This is formatting only." })]), line([{ type: "text", text: "Saved PR.md." }])], { last_assistant_message: "Saved PR.md." });
  assert.match(JSON.parse(r.stdout).reason, /whitespace-aware/);
});

test("claims about code, not about the working tree, are left alone", () => {
  const events = [write("src/a.js"), bash("npm test")];
  assert.deepEqual(reasonsFor(events, "The helper already contains the import. I made no changes to the public API."), []);
});

test("a negation in an earlier clause does not hide a later claim", () => {
  assert.match(reasonsFor([write("src/a.js")], "I did not run lint, but all tests pass.")[0], /tests pass/);
});

test("a claim with no change in the turn is not gated, and an earlier turn does not count", () => {
  assert.deepEqual(reasonsFor([bash("ls")], "The output is the same in both functions."), []);
  const s = readSession([
    JSON.stringify({ type: "user", message: { content: "Fix the bug in reminders." } }),
    JSON.stringify({ type: "assistant", message: { content: [{ type: "tool_use", name: "Edit", input: { file_path: "src/a.js" } }] } }),
    JSON.stringify({ type: "user", message: { content: "What did the cache do before?" } }),
    JSON.stringify({ type: "assistant", message: { content: [{ type: "tool_use", name: "Read", input: { file_path: "src/cache.js" } }, { type: "text", text: "I made no changes this time." }] } }),
  ]);
  assert.equal(s.prompt, "What did the cache do before?");
  assert.deepEqual(gate(s), []);
});

test("a test run that redirects its output still counts as a test run after the edit", () => {
  assert.deepEqual(reasonsFor(readSession([JSON.stringify({ type: "assistant", message: { content: [{ type: "tool_use", name: "Edit", input: { file_path: "src/a.js" } }, { type: "tool_use", name: "Bash", input: { command: "npm test 2>&1 | tee out.log" } }, { type: "text", text: "All tests pass." }] } })]).events, "All tests pass."), []);
  const w = readSession([JSON.stringify({ type: "assistant", message: { content: [{ type: "tool_use", name: "Bash", input: { command: "ls >/dev/null; git stash list; node -e 'x=>y'" } }] } })]);
  assert.equal(w.events.filter((e) => e.kind === "write").length, 0);
});

test("only summary-like files are read as claims, and a bad input never throws", () => {
  const s = readSession([JSON.stringify({ type: "assistant", message: { content: [null, { type: "tool_use", name: "Write", input: { file_path: "CHANGELOG.md", content: "behaviour is unchanged" } }, { type: "tool_use", name: "Write", input: { file_path: "docs/PR.md", content: "formatting only" } }] } })]);
  assert.deepEqual(s.events.filter((e) => e.text).map((e) => e.path), ["docs/PR.md"]);
  assert.doesNotThrow(() => gate(session([write("a.js")], "x"), [{ a: 1 }, null]));
});
