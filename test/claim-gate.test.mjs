import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { findClaims, gate, readSession, REPLY_WHOLE } from "../bin/claim-gate.mjs";

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

test("a starting-state statement that names the session-start snapshot is not a claim", () => {
  const events = [bash("ls"), write("docs/a.md")];
  assert.deepEqual(reasonsFor(events, "The snapshot at the start of the session showed a clean working tree."), []);
  assert.match(reasonsFor(events, "The working tree was clean before I started.")[0], /starting/);
  assert.match(reasonsFor(events, "I did not write these files, and the snapshot showed the tree clean.")[0], /starting/);
  assert.match(reasonsFor(events, "At session start the working tree was clean.")[0], /starting/);
  assert.match(reasonsFor(events, "The repo was dirty, per the initial message.")[0], /starting/);
});

test("the block reason asks for the complete final answer, not the correction alone", () => {
  const dir = mkdtempSync(join(tmpdir(), "gate-"));
  const transcript = join(dir, "t.jsonl");
  const lines = [
    { type: "user", message: { content: "Fix the typo in the docs." } },
    { type: "assistant", message: { content: [{ type: "tool_use", name: "Edit", input: { file_path: "docs/a.md" } }, { type: "text", text: "No changes were made to the code." }] } },
  ];
  writeFileSync(transcript, lines.map((l) => JSON.stringify(l)).join("\n"));
  const out = spawnSync("node", [GATE], { input: JSON.stringify({ transcript_path: transcript, last_assistant_message: "No changes were made to the code." }), encoding: "utf8" });
  const verdict = JSON.parse(out.stdout);
  assert.equal(verdict.decision, "block");
  assert.ok(verdict.reason.endsWith(REPLY_WHOLE));
  assert.match(REPLY_WHOLE, /complete final answer/);
});

test("addedtests: a claim that tests were added needs a write to a test path in the turn", () => {
  const claim = "I added three unit tests for the reminder rule.";
  const src = [write("src/reminder.js")];
  const r = reasonsFor(src, claim);
  assert.equal(r.length, 1);
  assert.match(r[0], /tests were added/);
  assert.deepEqual(reasonsFor([...src, write("test/reminder.test.js")], claim), []);
  assert.deepEqual(reasonsFor([...src, write("src/__tests__/a.js")], claim), []);
  // a shell write that names a test path counts
  const s = readSession([JSON.stringify({ type: "assistant", message: { content: [{ type: "tool_use", name: "Bash", input: { command: "cat > test/a.test.js <<'X'\nx\nX" } }] } })]);
  assert.deepEqual(reasonsFor(s.events, claim), []);
  // a shell write to a non-test path does not
  assert.equal(reasonsFor([bash("echo hi"), write("")].slice(0, 1).concat([{ kind: "write", path: "", text: "" }]), claim).length, 1);
});

test("addedtests: sentences that must fire", () => {
  for (const s of [
    "I added tests for the new rule.",
    "I've added a few tests.",
    "I wrote 4 new tests.",
    "Created some regression tests for the bug.",
    "Tests were added for the parser.",
    "The tests added cover the edge case.",
    "I have written a unit test for it.",
    "We added several test cases.",
  ]) assert.ok(findClaims(s).some((c) => c.family === "addedtests"), s);
});

test("addedtests: honest sentences that must not fire", () => {
  for (const s of [
    "I did not add tests.",
    "I didn't add any tests.",
    "I have not added tests yet.",
    "No tests were added.",
    "The tests were already there.",
    "Tests were already added by the team.",
    "I added no tests.",
    "I will add tests next.",
    "You asked me to add tests, and I left that out.",
    "The README says \"added tests for the parser\" in its history.",
    "The log line `added tests` is quoted from the commit.",
    "Tests added in the previous commit still pass.",
    "I added a new endpoint.",
  ]) assert.ok(!findClaims(s).some((c) => c.family === "addedtests"), s);
});

test("addedtests: the gate hook asks once with the whole-answer restatement", () => {
  const dir = mkdtempSync(join(tmpdir(), "pe-gate-"));
  const tp = join(dir, "t.jsonl");
  writeFileSync(tp, [
    JSON.stringify({ type: "user", message: { content: "Add a weekly view." } }),
    JSON.stringify({ type: "assistant", message: { content: [{ type: "tool_use", name: "Edit", input: { file_path: "src/a.js" } }, { type: "text", text: "I added tests for the weekly view." }] } }),
  ].join("\n"));
  const out = spawnSync("node", [GATE], { input: JSON.stringify({ transcript_path: tp, last_assistant_message: "I added tests for the weekly view." }), encoding: "utf8" });
  const j = JSON.parse(out.stdout);
  assert.equal(j.decision, "block");
  assert.ok(j.reason.includes(REPLY_WHOLE));
});

test("addedtests does not fire on a passive sentence about existing tests", () => {
  assert.deepEqual(findClaims("The existing tests were written for v1, so I reused them."), []);
});

test("count: a stated count needs a repository counter after the last edit", () => {
  const claim = "The branch has 12 commits ahead of main.";
  const edited = [write("src/a.js")];
  assert.match(reasonsFor(edited, claim)[0], /git rev-list --count/);
  assert.match(reasonsFor([bash("git rev-list --count main..HEAD"), write("src/a.js")], claim)[0], /git rev-list --count/);
  assert.deepEqual(reasonsFor([...edited, bash("git rev-list --count main..HEAD")], claim), []);
  assert.deepEqual(reasonsFor([...edited, bash("git log --oneline main..HEAD | wc -l")], claim), []);
  assert.deepEqual(reasonsFor([...edited, bash("git diff --stat main..HEAD")], "There are 3 files changed."), []);
  assert.deepEqual(reasonsFor([...edited, bash("product-engineer range main..HEAD")], claim), []);
  // with no write in the turn, a counter anywhere in the turn settles it
  assert.match(reasonsFor([bash("ls")], claim)[0], /counted it/);
  assert.deepEqual(reasonsFor([bash("grep -c helper src/a.js")], "All 8 tests are in place."), []);
});

test("count: negated and hedged counts are not claims", () => {
  assert.deepEqual(findClaims("I did not count the commits."), []);
  assert.deepEqual(findClaims("This is not 12 commits of work."), []);
  assert.deepEqual(findClaims("I will run 3 tests later."), []);
  assert.deepEqual(findClaims("I can count 12 commits if you want."), []);
  assert.equal(findClaims("There are 3 files changed.")[0].family, "count");
});

test("exhaustive: a nothing-else-uses claim needs a search after the last edit", () => {
  const claim = "Nothing else uses this helper.";
  const edited = [write("src/a.js")];
  assert.match(reasonsFor(edited, claim)[0], /git grep or rg/);
  assert.match(reasonsFor([bash("git grep -n helper"), write("src/a.js")], claim)[0], /git grep or rg/);
  assert.deepEqual(reasonsFor([...edited, bash("git grep -n helper")], claim), []);
  assert.deepEqual(reasonsFor([...edited, bash("rg helper src")], claim), []);
  assert.deepEqual(reasonsFor([...edited, bash("grep -rn helper src")], claim), []);
  assert.deepEqual(reasonsFor([...edited, bash("git ls-files | xargs grep -l helper")], claim), []);
  assert.deepEqual(reasonsFor([...edited, bash("product-engineer twins")], "No other callers exist."), []);
  assert.deepEqual(reasonsFor([...edited, bash("grep helper src/a.js")], claim), [reasonsFor(edited, claim)[0]]);
});

test("exhaustive: negated and hedged absence sentences are not claims", () => {
  assert.deepEqual(findClaims("It is not the only place that uses it."), []);
  assert.deepEqual(findClaims("I did not check for other callers."), []);
  assert.deepEqual(findClaims("I need to confirm there are no other places."), []);
  assert.equal(findClaims("No other callers exist.")[0].family, "exhaustive");
});

test("landed: a stated push, deploy or release needs a remote read after the last edit", () => {
  const claim = "The fix is pushed to origin.";
  assert.match(reasonsFor([write("src/a.js")], claim)[0], /git ls-remote/);
  assert.match(reasonsFor([bash("git ls-remote origin main"), write("src/a.js")], claim)[0], /git ls-remote/);
  assert.deepEqual(reasonsFor([write("src/a.js"), bash("git ls-remote origin main")], claim), []);
  assert.deepEqual(reasonsFor([write("src/a.js"), bash("git status -sb")], "The page went live this morning."), []);
  assert.deepEqual(reasonsFor([write("src/a.js"), bash("npm view product-engineer version")], "It was published to npm."), []);
});

test("landed: negated and conditional sentences are not claims", () => {
  assert.deepEqual(findClaims("I did not push anything."), []);
  assert.deepEqual(findClaims("Nothing was deployed."), []);
  assert.deepEqual(findClaims("The change can be pushed after review."), []);
  assert.deepEqual(findClaims("It is not pushed yet."), []);
  assert.equal(findClaims("The page went live this morning.")[0].family, "landed");
});

const out = (command, output) => ({ kind: "bash", command, output });

test("count: a number a command printed is supported without a counter run", () => {
  const edited = [write("src/a.js")];
  assert.deepEqual(reasonsFor([...edited, out("ls", "12 commits listed\n")], "The branch has 12 commits ahead of main."), []);
  assert.match(reasonsFor([...edited, out("ls", "7 commits listed\n")], "The branch has 12 commits ahead of main.")[0], /counted it/);
  // a longer number containing the claimed one is not the same number
  assert.match(reasonsFor([...edited, out("ls", "120 commits listed\n")], "The branch has 12 commits ahead of main.")[0], /counted it/);
  // a claim with no digits has nothing to match, so it still needs a counter
  assert.match(reasonsFor([...edited, out("ls", "three")], "There are three files changed.")[0], /counted it/);
});

test("exhaustive: an empty search, or one that lists only changed files, supports the claim", () => {
  const claim = "Nothing else uses this helper.";
  const edited = [write("src/a.js")];
  assert.deepEqual(reasonsFor([...edited, out("git grep -n helper", "")], claim), []);
  assert.deepEqual(reasonsFor([...edited, out("rg -l helper src", "src/a.js\n")], claim), []);
  assert.deepEqual(reasonsFor([write("/repo/src/a.js"), out("git grep -n helper", "src/a.js:4:helper()\n")], claim), []);
  assert.match(reasonsFor([...edited, out("git grep -n helper", "src/a.js:4:helper()\nsrc/other.js:9:helper()\n")], claim)[0], /lists files you did not change: src\/other\.js/);
  // a search before the last edit is not evidence about the edited tree
  assert.match(reasonsFor([out("git grep -n helper", ""), write("src/a.js")], claim)[0], /git grep or rg/);
});

test("passing: a green run after the last write settles the claim, and a green run before it does not", () => {
  const green = out("node --test test/", "ℹ tests 4\nℹ pass 4\nℹ fail 0\n");
  assert.deepEqual(reasonsFor([write("src/a.js"), green], "All tests pass."), []);
  assert.deepEqual(reasonsFor([write("src/a.js"), green], "The suite is green."), []);
  assert.match(reasonsFor([green, write("src/a.js")], "All tests pass.")[0], /tests pass/);
});

function hookRun(lines, input, home, env = {}) {
  const dir = mkdtempSync(join(tmpdir(), "pe-gate-run-"));
  const transcript = join(dir, "t.jsonl");
  writeFileSync(transcript, lines.map((l) => JSON.stringify(l)).join("\n"));
  return spawnSync("node", [GATE], {
    input: JSON.stringify({ transcript_path: transcript, cwd: home, ...input }),
    encoding: "utf8",
    env: { ...process.env, TMPDIR: home, PRODUCT_ENGINEER_SECOND_EYE: "0", ...env },
  });
}
const newHome = () => mkdtempSync(join(tmpdir(), "pe-gate-home-"));
const SID = "pe-test-session";

test("noise: a read-only session never blocks on count, exhaustive, landed or second-eye", () => {
  const answer = "There are 12 commits ahead of main, and nothing else uses the helper.";
  const lines = [{ type: "user", message: { content: "Summarise the history." } }, line([tool("Bash", { command: "ls" }), { type: "text", text: answer }])];
  assert.equal(hookRun(lines, { session_id: SID, last_assistant_message: answer }, newHome()).stdout, "");
  // a second block of the same session is not a first block, so the advice rule does not cover it: the read-only rule must
  const home = newHome();
  writeFileSync(join(home, `product-engineer-gate-${SID}.json`), JSON.stringify({ blocks: 1, hash: null, ids: [] }));
  assert.equal(hookRun(lines, { session_id: SID, last_assistant_message: answer }, home).stdout, "");
});

test("noise: a read-only session that also makes a non-noise claim blocks on that claim only", () => {
  const answer = "All tests pass. Nothing else uses the helper.";
  const lines = [{ type: "user", message: { content: "Summarise the history." } }, line([tool("Bash", { command: "ls" }), { type: "text", text: answer }])];
  const reason = JSON.parse(hookRun(lines, { session_id: SID, last_assistant_message: answer }, newHome()).stdout).reason;
  assert.match(reason, /tests pass/);
  assert.doesNotMatch(reason, /nothing else uses/);
});

test("noise: a read-only session still blocks on a claim that is not noise", () => {
  const lines = [{ type: "user", message: { content: "Run the suite." } }, line([tool("Bash", { command: "ls" }), { type: "text", text: "All tests pass." }])];
  assert.match(JSON.parse(hookRun(lines, { session_id: SID, last_assistant_message: "All tests pass." }, newHome()).stdout).reason, /tests pass/);
});

test("noise: the first block of a writing session with only noise reasons is sent as advice", () => {
  const answer = "There are 12 commits ahead of main.";
  const lines = [{ type: "user", message: { content: "Tidy the reminder helper." } }, line([tool("Edit", { file_path: "src/a.js" }), { type: "text", text: answer }])];
  const reason = JSON.parse(hookRun(lines, { session_id: SID, last_assistant_message: answer }, newHome()).stdout).reason;
  assert.match(reason, /advice only/);
  assert.match(reason, /There are 12 commits ahead of main/);
});

test("once: a tests-added or fixed reason already given in this session is not sent again", () => {
  const cases = [
    { prompt: "Add a weekly view.", edit: "src/a.js", answer: "I added tests for the weekly view.", id: "addedtests", why: /tests were added/ },
    { prompt: "Fix the bug where a reminder is sent twice.", edit: "src/reminder.js", answer: "I fixed the duplicate reminder.", id: "fixed", why: /no test file was written/ },
  ];
  for (const c of cases) {
    const lines = [{ type: "user", message: { content: c.prompt } }, line([tool("Edit", { file_path: c.edit }), { type: "text", text: c.answer }])];
    // First block: the reason is sent and its id is recorded.
    const home = newHome();
    const first = hookRun(lines, { session_id: SID, last_assistant_message: c.answer }, home);
    assert.match(JSON.parse(first.stdout).reason, c.why, c.id);
    const state = JSON.parse(readFileSync(join(home, `product-engineer-gate-${SID}.json`), "utf8"));
    assert.ok(state.ids.includes(c.id), `${c.id} recorded`);
    // A later block whose hash differs (state.hash is null here, as a block with a new finding would leave it): the recorded reason is not sent again.
    const seeded = newHome();
    writeFileSync(join(seeded, `product-engineer-gate-${SID}.json`), JSON.stringify({ blocks: 1, hash: null, ids: [c.id] }));
    assert.equal(hookRun(lines, { session_id: SID, last_assistant_message: c.answer }, seeded).stdout, "", `${c.id} not repeated`);
    // Control: the same state without the id sends the reason.
    const control = newHome();
    writeFileSync(join(control, `product-engineer-gate-${SID}.json`), JSON.stringify({ blocks: 1, hash: null, ids: [] }));
    assert.match(JSON.parse(hookRun(lines, { session_id: SID, last_assistant_message: c.answer }, control).stdout).reason, c.why, `${c.id} sent when not yet given`);
  }
});

test("noise: a session that committed but wrote no file gets no first block on noise reasons", () => {
  const answer = "There are 12 commits ahead of main.";
  const lines = [{ type: "user", message: { content: "Record the state." } }, line([tool("Bash", { command: "git commit -m 'record'" }), { type: "text", text: answer }])];
  assert.equal(hookRun(lines, { session_id: SID, last_assistant_message: answer }, newHome()).stdout, "");
});
