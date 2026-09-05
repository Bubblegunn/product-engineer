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

test("the fake judge always answers A, so the winner follows the order", async () => {
  const first = await judgePair({ diff: "+ a", bare: "b", skill: "s" }, { command: fake, random: () => 0.1 });
  const second = await judgePair({ diff: "+ a", bare: "b", skill: "s" }, { command: fake, random: () => 0.9 });
  assert.notEqual(first.winner, second.winner);
});
