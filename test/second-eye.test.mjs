import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { secondEye, parseVerdict, buildPrompt } from "../bin/second-eye.mjs";

// The log and the temp directory go to a private directory for this file.
const TMP = mkdtempSync(join(tmpdir(), "pe-eye-home-"));
process.env.TMPDIR = TMP;
const GATE = join(dirname(fileURLToPath(import.meta.url)), "..", "bin", "claim-gate.mjs");
const ANSWER = "I read the reminder module and the scheduler it calls. The rule sends one message per day to each person with an open task, and the check runs in the function shown in the listing above. The change I describe is limited to that function, and the rest of the scheduler stays as it was before this turn. Review the output and tell me which part you want changed next.";

/** A stub `claude` as a shell script in its own directory; the body is the script after the shebang. */
function stub(body) {
  const dir = mkdtempSync(join(TMP, "stub-"));
  const path = join(dir, "claude");
  writeFileSync(path, `#!/bin/sh\n${body}\n`);
  chmodSync(path, 0o755);
  return path;
}
const outFile = () => join(mkdtempSync(join(TMP, "out-")), "out.txt");
const ok = (claim = "There are 12 commits ahead of main.") => `printf '%s' '{"unchecked":[{"claim":"${claim}","why":"no rev-list was run"}]}'`;
const CMDS = ["git log --oneline main..HEAD | head -3", "npm test"];

test("parseVerdict takes the first complete JSON object and ignores braces inside strings", () => {
  assert.deepEqual(parseVerdict('Here: {"unchecked":[{"claim":"a } b","why":"x"}]} thanks {"x":1}'), { unchecked: [{ claim: "a } b", why: "x" }] });
  assert.deepEqual(parseVerdict('{"unchecked":[]}'), { unchecked: [] });
  assert.equal(parseVerdict("no json at all"), null);
  assert.equal(parseVerdict('{"unchecked": [oops}'), null);
  assert.equal(parseVerdict('{"other":1}'), null);
  assert.equal(parseVerdict('{"unchecked":{}}'), null);
});

test("parseVerdict keeps at most five items and drops items without a claim", () => {
  const many = { unchecked: [...Array.from({ length: 7 }, (_, i) => ({ claim: `c${i}`, why: "w" })), { why: "no claim" }, null] };
  const v = parseVerdict(JSON.stringify(many));
  assert.equal(v.unchecked.length, 5);
  assert.equal(v.unchecked[4].claim, "c4");
});

test("buildPrompt carries the answer, the last commands truncated, and the files", () => {
  const long = "x".repeat(300);
  const commands = Array.from({ length: 45 }, (_, i) => `cmd-${i}`).concat(long);
  const p = buildPrompt({ answer: "THE-ANSWER", commands, files: ["src/a.js", "src/a.js"] });
  assert.match(p, /THE-ANSWER/);
  assert.match(p, /last 30 of 46/);
  assert.ok(!p.includes("cmd-0\n"), "only the last 30 commands");
  assert.ok(p.includes("- " + "x".repeat(157) + "..."), "a long command is cut to 160 characters");
  assert.equal(p.split("src/a.js").length - 1, 1, "files are listed once");
});

test("the stub receives the answer text, the commands and the fixed flags", async () => {
  const out = outFile();
  const bin = stub(`printf '%s\\n' "$@" > "${out}"\nprintf 'nogate=%s\\n' "$PRODUCT_ENGINEER_NO_GATE" >> "${out}"\n${ok()}`);
  const r = await secondEye({ answer: ANSWER, commands: CMDS, files: ["src/a.js"], env: { PRODUCT_ENGINEER_SECOND_EYE: "1", PE_SECOND_EYE_CLAUDE: bin } });
  assert.equal(r.skipped, null);
  const got = readFileSync(out, "utf8");
  assert.ok(got.includes(ANSWER), "the answer is on the prompt");
  assert.ok(got.includes("git log --oneline main..HEAD | head -3") && got.includes("npm test"), "the commands are on the prompt");
  assert.ok(got.includes("src/a.js"), "the written file is on the prompt");
  for (const flag of ["-p", "--model", "claude-haiku-5-5", "--output-format", "text", "--setting-sources", "--disable-slash-commands", "--no-session-persistence"]) assert.ok(got.split("\n").includes(flag), flag);
  assert.ok(got.includes("nogate=1"), "the child runs with the gate off");
});

test("a valid reply is returned as unchecked items", async () => {
  const r = await secondEye({ answer: ANSWER, commands: CMDS, env: { PRODUCT_ENGINEER_SECOND_EYE: "1", PE_SECOND_EYE_CLAUDE: stub(ok()) } });
  assert.equal(r.skipped, null);
  assert.deepEqual(r.unchecked, [{ claim: "There are 12 commits ahead of main.", why: "no rev-list was run" }]);
  assert.equal(typeof r.ms, "number");
});

test("JSON wrapped in prose is accepted, an empty list is no finding", async () => {
  const r = await secondEye({ answer: ANSWER, commands: CMDS, env: { PRODUCT_ENGINEER_SECOND_EYE: "1", PE_SECOND_EYE_CLAUDE: stub("echo 'Result: {\"unchecked\":[]} done'") } });
  assert.deepEqual(r, { unchecked: [], skipped: null, ms: r.ms });
});

test("garbage output is skipped as unparseable", async () => {
  const r = await secondEye({ answer: ANSWER, commands: CMDS, env: { PRODUCT_ENGINEER_SECOND_EYE: "1", PE_SECOND_EYE_CLAUDE: stub("echo 'I cannot help with that'") } });
  assert.equal(r.skipped, "unparseable");
  assert.deepEqual(r.unchecked, []);
});

test("a non-zero exit is skipped with the exit code", async () => {
  const r = await secondEye({ answer: ANSWER, commands: CMDS, env: { PRODUCT_ENGINEER_SECOND_EYE: "1", PE_SECOND_EYE_CLAUDE: stub("echo partial; exit 1") } });
  assert.equal(r.skipped, "exit-1");
});

test("a child that runs past the timeout is killed and skipped as timeout", async () => {
  const pidFile = join(TMP, `pid-${Date.now()}.txt`);
  const bin = stub(`echo $$ > "${pidFile}"\nsleep 30`);
  const r = await secondEye({ answer: ANSWER, commands: CMDS, timeoutMs: 800, env: { PRODUCT_ENGINEER_SECOND_EYE: "1", PE_SECOND_EYE_CLAUDE: bin } });
  assert.equal(r.skipped, "timeout");
  assert.ok(r.ms < 20000, `returned in ${r.ms} ms`);
  const pid = Number(readFileSync(pidFile, "utf8").trim());
  assert.ok(pid > 0);
  assert.throws(() => process.kill(pid, 0), "the child process is gone");
});

test("a missing binary is skipped and nothing throws", async () => {
  const r = await secondEye({ answer: ANSWER, commands: CMDS, env: { PRODUCT_ENGINEER_SECOND_EYE: "1", PE_SECOND_EYE_CLAUDE: join(TMP, "no-such-binary") } });
  assert.equal(r.skipped, "missing-binary");
});

test("the call is skipped when disabled, when the answer is short, and when there is no evidence", async () => {
  const out = outFile();
  const bin = stub(`echo called > "${out}"\n${ok()}`);
  assert.equal((await secondEye({ answer: ANSWER, commands: CMDS, env: { PE_SECOND_EYE_CLAUDE: bin, PRODUCT_ENGINEER_SECOND_EYE: "0" } })).skipped, "disabled");
  assert.equal((await secondEye({ answer: "Too short.", commands: CMDS, env: { PRODUCT_ENGINEER_SECOND_EYE: "1", PE_SECOND_EYE_CLAUDE: bin } })).skipped, "short-answer");
  assert.equal((await secondEye({ answer: ANSWER, commands: [], files: [], env: { PRODUCT_ENGINEER_SECOND_EYE: "1", PE_SECOND_EYE_CLAUDE: bin } })).skipped, "no-evidence");
  assert.equal(existsSync(out), false, "the binary was never run");
});

test("each call writes one line to the log", async () => {
  await secondEye({ answer: "short", env: { PRODUCT_ENGINEER_SECOND_EYE: "1" } });
  const log = readFileSync(join(TMP, "product-engineer-second-eye.log"), "utf8");
  assert.match(log, /skipped=short-answer unchecked=0/);
});

// cwd is a directory that is not a git repository, so the repository checks stay quiet and the test does not depend on this clone.
function runHook(transcriptLines, env, lastMessage, extra = {}) {
  const dir = mkdtempSync(join(TMP, "hook-"));
  const transcript = join(dir, "t.jsonl");
  writeFileSync(transcript, transcriptLines.map((l) => JSON.stringify(l)).join("\n"));
  const cwd = mkdtempSync(join(TMP, "nogit-"));
  return spawnSync("node", [GATE], { input: JSON.stringify({ transcript_path: transcript, cwd, last_assistant_message: lastMessage, ...extra }), encoding: "utf8", env: { ...process.env, ...env } });
}
// A turn that wrote a notes file (a document, so no repository check applies) and ran one command.
const turn = (prompt) => [
  { type: "user", message: { content: prompt } },
  { type: "assistant", message: { content: [{ type: "tool_use", name: "Edit", input: { file_path: "NOTES.md" } }, { type: "tool_use", name: "Bash", input: { command: "ls" } }, { type: "text", text: ANSWER }] } },
];

test("gate integration: an unsupported claim becomes one finding in the block reason", () => {
  const out = outFile();
  const bin = stub(`printf 'called\\n' > "${out}"\n${ok("There are 12 commits ahead of main.")}`);
  // A lone second-eye finding is advice, and a session's first block drops advice. This run is the second block, so it is sent.
  const sid = `pe-eye-second-${process.pid}`;
  writeFileSync(join(TMP, `product-engineer-gate-${sid}.json`), JSON.stringify({ blocks: 1, hash: null, ids: [] }));
  const r = runHook(turn("Look at the reminder rule."), { PRODUCT_ENGINEER_SECOND_EYE: "1", PE_SECOND_EYE_CLAUDE: bin }, ANSWER, { session_id: sid });
  const reason = JSON.parse(r.stdout).reason;
  assert.equal(reason.split("A second reading of your answer found claims with no supporting command:").length - 1, 1);
  assert.match(reason, /command: There are 12 commits ahead of main\. Check each/);
  assert.match(reason, /Check each \(name the command\) or remove it\./);
  assert.equal(existsSync(out), true);
});

test("gate integration: an empty verdict adds nothing and the hook stays silent", () => {
  const r = runHook(turn("Look at the reminder rule."), { PRODUCT_ENGINEER_SECOND_EYE: "1", PE_SECOND_EYE_CLAUDE: stub('echo \'{"unchecked":[]}\'') }, ANSWER);
  assert.equal(r.stdout, "");
});

test("gate integration: with one other block the second eye adds its finding to the same block", () => {
  const bin = stub(ok("There are 12 commits ahead of main."));
  const lines = [
    { type: "user", message: { content: "Look at the reminder rule." } },
    { type: "assistant", message: { content: [{ type: "tool_use", name: "Edit", input: { file_path: "NOTES.md" } }, { type: "tool_use", name: "Bash", input: { command: "ls" } }, { type: "text", text: "All tests pass." }] } },
  ];
  const reason = JSON.parse(runHook(lines, { PRODUCT_ENGINEER_SECOND_EYE: "1", PE_SECOND_EYE_CLAUDE: bin }, `${ANSWER} All tests pass.`).stdout).reason;
  assert.match(reason, /tests pass/);
  assert.equal(reason.split("A second reading").length - 1, 1);
});

test("gate integration: with two other blocks the second eye does not run", () => {
  const out = outFile();
  const bin = stub(`echo called > "${out}"\n${ok()}`);
  const lines = [
    { type: "user", message: { content: "Look at the reminder rule." } },
    { type: "assistant", message: { content: [{ type: "tool_use", name: "Edit", input: { file_path: "NOTES.md" } }, { type: "tool_use", name: "Bash", input: { command: "ls" } }, { type: "text", text: "All tests pass." }] } },
  ];
  const reason = JSON.parse(runHook(lines, { PRODUCT_ENGINEER_SECOND_EYE: "1", PE_SECOND_EYE_CLAUDE: bin }, `${ANSWER} All tests pass. The change is pushed to origin.`).stdout).reason;
  assert.match(reason, /tests pass/);
  assert.match(reason, /pushed|remote/);
  assert.equal(reason.includes("A second reading"), false);
  assert.equal(existsSync(out), false);
});

test("gate integration: the hook is silent with PRODUCT_ENGINEER_SECOND_EYE=0", () => {
  const out = outFile();
  const r = runHook(turn("Look at the reminder rule."), { PE_SECOND_EYE_CLAUDE: stub(`echo called > "${out}"\n${ok()}`), PRODUCT_ENGINEER_SECOND_EYE: "0" }, ANSWER);
  assert.equal(r.stdout, "");
  assert.equal(existsSync(out), false);
});

test("second eye is off unless PRODUCT_ENGINEER_SECOND_EYE is exactly 1", async () => {
  const out = outFile();
  const bin = stub(`echo called > "${out}"\n${ok()}`);
  for (const value of [undefined, "0", "", "true", "yes", "01", " 1"]) {
    const env = value === undefined ? { PE_SECOND_EYE_CLAUDE: bin } : { PE_SECOND_EYE_CLAUDE: bin, PRODUCT_ENGINEER_SECOND_EYE: value };
    assert.equal((await secondEye({ answer: ANSWER, commands: CMDS, env })).skipped, "disabled", `value ${JSON.stringify(value)}`);
  }
  assert.equal(existsSync(out), false, "the binary was never run");
  assert.equal((await secondEye({ answer: ANSWER, commands: CMDS, env: { PE_SECOND_EYE_CLAUDE: bin, PRODUCT_ENGINEER_SECOND_EYE: "1" } })).skipped, null);
  assert.equal(existsSync(out), true, "the flag set to 1 runs the binary");
});

test("gate integration: with the flag unset the hook makes no second-eye call and stays silent", () => {
  const out = outFile();
  const env = { ...process.env, PE_SECOND_EYE_CLAUDE: stub(`echo called > "${out}"\n${ok()}`) };
  delete env.PRODUCT_ENGINEER_SECOND_EYE;
  const dir = mkdtempSync(join(TMP, "hook-"));
  const transcript = join(dir, "t.jsonl");
  writeFileSync(transcript, turn("Look at the reminder rule.").map((l) => JSON.stringify(l)).join("\n"));
  const r = spawnSync("node", [GATE], { input: JSON.stringify({ transcript_path: transcript, cwd: mkdtempSync(join(TMP, "nogit-")), last_assistant_message: ANSWER }), encoding: "utf8", env });
  assert.equal(r.stdout, "");
  assert.equal(existsSync(out), false);
});

/** A temp git repository with one commit; the caller writes new files into it. */
function repoWithCommit() {
  const repo = mkdtempSync(join(TMP, "repo-"));
  execFileSync("git", ["init", "-q"], { cwd: repo });
  writeFileSync(join(repo, "README.md"), "start\n");
  execFileSync("git", ["add", "README.md"], { cwd: repo });
  execFileSync("git", ["-c", "user.name=t", "-c", "user.email=t@example.com", "commit", "-q", "-m", "init"], { cwd: repo });
  return repo;
}
const writeTurn = (prompt, repo, names) => [
  { type: "user", message: { content: prompt } },
  ...names.map((n) => {
    const file = join(repo, "src", `${n}.js`);
    return { type: "assistant", message: { content: [{ type: "tool_use", name: "Write", input: { file_path: file, content: "export const value = 1;\n" } }] } };
  }),
  { type: "assistant", message: { content: [{ type: "tool_use", name: "Bash", input: { command: "ls" } }, { type: "text", text: ANSWER }] } },
];

test("gate integration: three findings from the other checks keep the second eye from running", () => {
  const repo = repoWithCommit();
  for (const n of ["alpha", "beta", "gamma"]) {
    mkdirSync(join(repo, "src"), { recursive: true });
    writeFileSync(join(repo, "src", `${n}.js`), "export const value = 1;\n");
  }
  const out = outFile();
  const bin = stub(`echo called > "${out}"\n${ok()}`);
  const dir = mkdtempSync(join(TMP, "hook-"));
  const transcript = join(dir, "t.jsonl");
  writeFileSync(transcript, writeTurn("Look at the reminder rule.", repo, ["alpha", "beta", "gamma"]).map((l) => JSON.stringify(l)).join("\n"));
  const r = spawnSync("node", [GATE], { input: JSON.stringify({ transcript_path: transcript, cwd: repo, last_assistant_message: ANSWER }), encoding: "utf8", env: { ...process.env, PRODUCT_ENGINEER_SECOND_EYE: "1", PE_SECOND_EYE_CLAUDE: bin } });
  assert.equal(r.status, 0);
  assert.ok(JSON.parse(r.stdout).reason.includes("referenced nowhere"), "the three unwired-file findings block");
  assert.equal(existsSync(out), false, "the second eye did not run");
});

test("gate integration: one finding from the other checks still lets the second eye run", () => {
  const repo = repoWithCommit();
  mkdirSync(join(repo, "src"), { recursive: true });
  writeFileSync(join(repo, "src", "alpha.js"), "export const value = 1;\n");
  const bin = stub(ok("There are 12 commits ahead of main."));
  const dir = mkdtempSync(join(TMP, "hook-"));
  const transcript = join(dir, "t.jsonl");
  writeFileSync(transcript, writeTurn("Look at the reminder rule.", repo, ["alpha"]).map((l) => JSON.stringify(l)).join("\n"));
  const r = spawnSync("node", [GATE], { input: JSON.stringify({ transcript_path: transcript, cwd: repo, last_assistant_message: ANSWER }), encoding: "utf8", env: { ...process.env, PRODUCT_ENGINEER_SECOND_EYE: "1", PE_SECOND_EYE_CLAUDE: bin } });
  const reason = JSON.parse(r.stdout).reason;
  assert.ok(reason.includes("referenced nowhere"));
  assert.equal(reason.split("A second reading").length - 1, 1);
});

test("gate integration: a repair round (stop_hook_active) makes no second-eye call", () => {
  const out = outFile();
  const bin = stub(`echo called > "${out}"\n${ok()}`);
  const dir = mkdtempSync(join(TMP, "hook-"));
  const transcript = join(dir, "t.jsonl");
  writeFileSync(transcript, turn("Look at the reminder rule.").map((l) => JSON.stringify(l)).join("\n"));
  const r = spawnSync("node", [GATE], { input: JSON.stringify({ transcript_path: transcript, cwd: mkdtempSync(join(TMP, "nogit-")), session_id: "pe-repair-round", stop_hook_active: true, last_assistant_message: ANSWER }), encoding: "utf8", env: { ...process.env, PRODUCT_ENGINEER_SECOND_EYE: "1", PE_SECOND_EYE_CLAUDE: bin } });
  assert.equal(r.stdout, "");
  assert.equal(existsSync(out), false);
});

test("second eye: each command's printed output goes on the prompt, the last 300 characters only", () => {
  const big = `HEADMARK${"y".repeat(400)}TAILMARK\n`;
  const p = buildPrompt({ answer: ANSWER, commands: [{ command: "git log -1", output: "4f2a9c1 newest commit\n" }, { command: "npm test", output: big }, { command: "git status", output: "" }], files: [] });
  assert.ok(p.includes("4f2a9c1 newest commit"), "the printed output is on the prompt");
  assert.ok(p.includes("TAILMARK"), "the end of a long output is kept");
  assert.ok(!p.includes("HEADMARK"), "the start of a long output is cut");
  assert.ok(p.includes("(empty)"), "an empty output is shown as empty");
  assert.match(p, /printed output/);
  assert.match(p, /SUPPORTED/);
});

test("second eye: the string form of commands still works", () => {
  const p = buildPrompt({ answer: ANSWER, commands: ["git status --short"], files: [] });
  assert.ok(p.includes("- git status --short"));
  assert.ok(p.includes("(empty)"));
});

test("second eye: the stub receives the printed output of each command", async () => {
  const out = outFile();
  const bin = stub(`printf '%s' "$2" > "${out}"\n${ok()}`);
  const r = await secondEye({ answer: ANSWER, commands: [{ command: "git rev-list --count main..HEAD", output: "12\n" }], env: { PRODUCT_ENGINEER_SECOND_EYE: "1", PE_SECOND_EYE_CLAUDE: bin } });
  assert.equal(r.skipped, null);
  assert.ok(readFileSync(out, "utf8").includes("git rev-list --count main..HEAD"));
  assert.ok(readFileSync(out, "utf8").includes("12"));
});

test("gate integration: the gate passes each command's paired output to the second eye", () => {
  const out = outFile();
  const bin = stub(`printf '%s' "$2" > "${out}"\n${ok()}`);
  const lines = [
    { type: "user", message: { content: "Look at the reminder rule." } },
    { type: "assistant", message: { content: [{ type: "tool_use", id: "t1", name: "Bash", input: { command: "git log --oneline -3" } }] } },
    { type: "user", message: { content: [{ type: "tool_result", tool_use_id: "t1", content: "4f2a9c1 newest commit line\n" }] } },
    { type: "assistant", message: { content: [{ type: "tool_use", name: "Edit", input: { file_path: "NOTES.md" } }, { type: "text", text: ANSWER }] } },
  ];
  const r = runHook(lines, { PRODUCT_ENGINEER_SECOND_EYE: "1", PE_SECOND_EYE_CLAUDE: bin }, ANSWER);
  assert.equal(r.status, 0);
  assert.ok(readFileSync(out, "utf8").includes("4f2a9c1 newest commit line"), "the output is on the prompt");
});

test("noise: a read-only session makes no second-eye call and does not block", () => {
  const out = outFile();
  const bin = stub(`echo called > "${out}"\n${ok()}`);
  const lines = [
    { type: "user", message: { content: "Look at the reminder rule." } },
    { type: "assistant", message: { content: [{ type: "tool_use", name: "Bash", input: { command: "ls" } }, { type: "text", text: ANSWER }] } },
  ];
  assert.equal(runHook(lines, { PRODUCT_ENGINEER_SECOND_EYE: "1", PE_SECOND_EYE_CLAUDE: bin }, ANSWER).stdout, "");
  assert.equal(existsSync(out), false);
});
