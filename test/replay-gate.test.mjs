import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { cutLines, expandGlob, replay, loadGate, DEFAULT_GATE } from "../bench/head-to-head/tools/replay-gate.mjs";
import { readSession, gateItems } from "../bin/claim-gate.mjs";

const TOOL = join(dirname(fileURLToPath(import.meta.url)), "..", "bench", "head-to-head", "tools", "replay-gate.mjs");
const user = (text) => ({ type: "user", message: { content: text } });
const edit = (file) => ({ type: "assistant", message: { content: [{ type: "tool_use", name: "Edit", input: { file_path: file } }] } });
const say = (text) => ({ type: "assistant", message: { content: [{ type: "text", text }] } });
const ran = (command) => ({ type: "assistant", message: { content: [{ type: "tool_use", id: "t1", name: "Bash", input: { command } }] } });
const result = (output) => ({ type: "user", message: { content: [{ type: "tool_result", tool_use_id: "t1", content: output }] } });
const jsonl = (dir, name, events) => {
  const d = join(dir, name);
  mkdirSync(d, { recursive: true });
  const file = join(d, "out.jsonl");
  writeFileSync(file, events.map((e) => JSON.stringify(e)).join("\n"));
  return file;
};

test("replay: a transcript is cut at the first stop-hook feedback turn", () => {
  const lines = [user("Add a view."), edit("src/a.js"), say("All tests pass."), user("Stop hook feedback: a reason"), say("Done.")].map((e) => JSON.stringify(e));
  assert.equal(cutLines(lines).length, 3);
  assert.equal(cutLines(["not json", JSON.stringify(user("plain"))]).length, 2);
});

test("replay: counts the families that fire per transcript, before the cut", () => {
  const dir = mkdtempSync(join(tmpdir(), "replay-gate-"));
  const stale = jsonl(dir, "run-a", [user("Add a view."), edit("src/a.js"), say("All tests pass.")]);
  const green = jsonl(dir, "run-b", [user("Add a view."), edit("src/a.js"), ran("npm test"), result("ℹ fail 0\n"), say("All tests pass.")]);
  // the block (the feedback turn) is after the claim; the cut keeps only what came before it
  const cut = jsonl(dir, "run-c", [user("Add a view."), edit("src/a.js"), say("All tests pass."), user("Stop hook feedback: run the tests"), ran("npm test"), result("ℹ fail 0\n"), say("Done.")]);
  const gate = { readSession, gateItems };
  const r = replay([stale, green, cut], gate);
  assert.equal(r.transcripts, 3);
  assert.equal(r.fired, 2);
  const passing = r.families.find((f) => f.family === "passing");
  assert.equal(passing.count, 2);
  assert.deepEqual(passing.transcripts.map((n) => n.split("/").pop()), ["run-a", "run-c"]);
});

test("replay: the tool prints the table and accepts --gate and --json", () => {
  const dir = mkdtempSync(join(tmpdir(), "replay-gate-cli-"));
  const file = jsonl(dir, "run-x", [user("Add a view."), edit("src/a.js"), say("All tests pass.")]);
  const gate = join(dirname(fileURLToPath(import.meta.url)), "..", "bin", "claim-gate.mjs");
  const text = spawnSync("node", [TOOL, file, "--gate", gate], { encoding: "utf8" });
  assert.equal(text.status, 0);
  assert.match(text.stdout, /passing\t1\t\S*run-x\n/);
  assert.match(text.stdout, /total fired: 1 of 1/);
  const json = JSON.parse(spawnSync("node", [TOOL, join(dir, "*", "out.jsonl"), "--json", "--gate", gate], { encoding: "utf8" }).stdout);
  assert.equal(json.fired, 1);
  assert.equal(json.families[0].family, "passing");
  assert.equal(spawnSync("node", [TOOL], { encoding: "utf8" }).status, 2);
});

test("replay: the glob expands a single-segment wildcard and passes plain paths through", () => {
  const dir = mkdtempSync(join(tmpdir(), "replay-gate-glob-"));
  jsonl(dir, "a-ours-1", [user("x")]);
  jsonl(dir, "b-ours-2", [user("x")]);
  jsonl(dir, "c-base-1", [user("x")]);
  const hits = expandGlob(join(dir, "*-ours-*", "out.jsonl"));
  assert.equal(hits.length, 2);
  assert.deepEqual(expandGlob(join(dir, "nothing.jsonl")), [join(dir, "nothing.jsonl")]);
  assert.equal(typeof DEFAULT_GATE, "string");
});

test("replay: the default gate module loads and exposes the session reader and the item gate", async () => {
  const gate = await loadGate(DEFAULT_GATE);
  assert.equal(typeof gate.readSession, "function");
  assert.equal(typeof gate.gateItems, "function");
});
