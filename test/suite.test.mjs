// @ts-check
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dirname, "..");

// Two test files once sat in the script as arguments to another command instead of to
// `node --test`, so they never ran and CI stayed green without them. This fails the moment
// a new test file is added and not named.
test("every test file is named in the npm test script", () => {
  const script = JSON.parse(readFileSync(join(root, "package.json"), "utf8")).scripts.test;
  const onDisk = readdirSync(join(root, "test")).filter((f) => f.endsWith(".test.mjs"));
  const nodeTestArgs = script.slice(script.indexOf("node --test")).split(/&&/)[0];
  const missing = onDisk.filter((f) => !nodeTestArgs.includes(`test/${f}`));
  assert.deepEqual(missing, [], `not run by npm test: ${missing.join(", ")}`);
});

test("every shell test is named in the npm test script", () => {
  const script = JSON.parse(readFileSync(join(root, "package.json"), "utf8")).scripts.test;
  const onDisk = readdirSync(join(root, "test")).filter((f) => f.endsWith(".sh"));
  const missing = onDisk.filter((f) => !script.includes(`test/${f}`));
  assert.deepEqual(missing, [], `not run by npm test: ${missing.join(", ")}`);
});
