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
