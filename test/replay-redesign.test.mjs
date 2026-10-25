import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { asHookSaw, cellsOf, toolCalls } from "../bench/head-to-head/tools/replay-redesign.mjs";
import { readSession } from "../bin/claim-gate.mjs";

const j = (e) => JSON.stringify(e);

test("asHookSaw puts the request back as the first person turn, marks injected turns isMeta, and cuts before the first stop-hook message", () => {
  const stream = [
    j({ type: "user", isSynthetic: true, message: { role: "user", content: [{ type: "text", text: "Base directory for this skill: /x\nUse plain-language rules." }] } }),
    j({ type: "assistant", message: { content: [{ type: "tool_use", name: "Write", input: { file_path: "/r/a.md", content: "x" } }, { type: "text", text: "Done." }] } }),
    j({ type: "user", isSynthetic: true, message: { role: "user", content: [{ type: "text", text: "Stop hook feedback:\nproduct-engineer claim check" }] } }),
    j({ type: "assistant", message: { content: [{ type: "text", text: "After the block." }] } }),
  ];
  const lines = asHookSaw(stream, "Write the notes.");
  const s = readSession(lines);
  assert.equal(s.prompt, "Write the notes.", "an injected skill text is not the request");
  assert.equal(s.last, "Done.", "the answer is the one before the first stop-hook message");
  assert.equal(s.events.filter((e) => e.kind === "write").length, 1);
  assert.equal(readSession(stream).prompt.startsWith("Stop hook feedback"), true, "without the conversion the stream reads the hook message as the request");
});

test("cellsOf lists the ours cells that have a transcript, in task and run order", () => {
  const dir = mkdtempSync(join(tmpdir(), "replay-cells-"));
  try {
    for (const name of ["X10-ours-2", "X9-ours-1", "X9-base-1", "X10-ours-1", "X11-ours-1"]) {
      mkdirSync(join(dir, name), { recursive: true });
      if (name !== "X11-ours-1") writeFileSync(join(dir, name, "out.jsonl"), "");
    }
    assert.deepEqual(cellsOf(dir).map((c) => c.id), ["X9-ours-1", "X10-ours-1", "X10-ours-2"]);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("toolCalls lists the tool calls of the main thread in order and skips malformed lines and sidechains", () => {
  const calls = toolCalls([
    "not json",
    j({ type: "assistant", message: { content: [{ type: "tool_use", name: "Bash", input: { command: "ls" } }] } }),
    j({ type: "assistant", isSidechain: true, message: { content: [{ type: "tool_use", name: "Edit", input: {} }] } }),
    j({ type: "assistant", message: { content: [{ type: "text", text: "hi" }, { type: "tool_use", name: "Edit", input: { file_path: "/a" } }] } }),
  ]);
  assert.deepEqual(calls.map((c) => c.name), ["Bash", "Edit"]);
});
