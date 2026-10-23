import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { extractClaims } from "../bin/claims.mjs";

const CLI = join(dirname(fileURLToPath(import.meta.url)), "..", "bin", "check.mjs");
const git = (cwd, ...args) => execFileSync("git", ["-c", "user.name=Dev", "-c", "user.email=dev@example.com", "-c", "commit.gpgsign=false", "-c", "core.hooksPath=/dev/null", ...args], { cwd, encoding: "utf8" });
const claims = (args, input) => spawnSync(process.execPath, [CLI, "claims", ...args], { encoding: "utf8", input });

function repo() {
  const dir = mkdtempSync(join(tmpdir(), "claims-"));
  git(dir, "init", "-q", "-b", "main");
  mkdirSync(join(dir, "src"));
  writeFileSync(join(dir, "src", "slots.js"), "export const freeSlots = 7;\n// version 4.2.1 of the rules\n");
  writeFileSync(join(dir, "NOTES.txt"), "212 passed in the last run\nretention is 0.34\n");
  writeFileSync(join(dir, "big.bin"), Buffer.concat([Buffer.from("ghostword\0"), Buffer.alloc(100)]));
  git(dir, "add", "-A");
  git(dir, "commit", "-q", "-m", "base");
  writeFileSync(join(dir, "src", "slots.js"), "export const freeSlots = 8;\n");
  git(dir, "commit", "-q", "-am", "retire the old marker oldMarkerName");
  return dir;
}

test("extractClaims finds numbers with units, versions and backticked names, and ignores fence language tags", () => {
  const text = "I ran it: 212 passed, 0 failed in 3 days. Retention is 0.34 now. Version v1.2 and 4.2.1 apply. See `freeSlots` and `src/a.js`.\n```javascript\nconst x = 1;\n```\n";
  const found = extractClaims(text);
  const has = (kind, claim) => found.some((c) => c.kind === kind && c.claim === claim);
  assert.ok(has("number", "212 passed"), JSON.stringify(found));
  assert.ok(has("number", "3 days"));
  assert.ok(has("number", "0.34"));
  assert.ok(has("version", "v1.2"));
  assert.ok(has("version", "4.2.1"));
  assert.ok(has("name", "freeSlots"));
  assert.ok(has("name", "src/a.js"));
  assert.ok(!found.some((c) => /javascript/.test(c.claim)), "a fence language tag is not a claim");
  assert.equal(new Set(found.map((c) => `${c.kind}:${c.claim}`)).size, found.length, "no duplicates");
});

test("found and not found are printed per claim, with the footer", () => {
  const dir = repo();
  const r = claims(["-", "--repo", dir], "The run gave 212 passed and `freeSlots` is 7. Retention is 0.34, `oldMarkerName` went away, and `ghostword` stays. We kept 99 widgets.");
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /212 passed.*found NOTES\.txt/);
  assert.match(r.stdout, /freeSlots.*found src\/slots\.js/);
  assert.match(r.stdout, /0\.34.*found NOTES\.txt/);
  assert.match(r.stdout, /oldMarkerName.*found git log/);
  assert.match(r.stdout, /ghostword.*not found/, "a binary file is not searched");
  assert.match(r.stdout, /99 widgets.*not found/);
  assert.match(r.stdout, /candidates, not verdicts: a 'not found' item needs a command or a source/);
});

test("a file argument works and --json prints an array of claim, kind, found, where", () => {
  const dir = repo();
  const f = join(dir, "..", `answer-${Date.now()}.txt`);
  writeFileSync(f, "Total 212 passed. `freeSlots` yes, `nopeName` no.\n");
  const r = claims([f, "--repo", dir, "--json"]);
  assert.equal(r.status, 0, r.stderr);
  const out = JSON.parse(r.stdout);
  assert.ok(Array.isArray(out));
  for (const item of out) assert.deepEqual(Object.keys(item).sort(), ["claim", "found", "kind", "where"]);
  const by = Object.fromEntries(out.map((i) => [i.claim, i]));
  assert.deepEqual(by["freeSlots"], { claim: "freeSlots", kind: "name", found: true, where: "src/slots.js" });
  assert.deepEqual(by["nopeName"], { claim: "nopeName", kind: "name", found: false, where: null });
  assert.equal(by["212 passed"].where, "NOTES.txt");
});

test("empty input exits 1, a bad argument exits 2, a directory that is not a repository exits 3", () => {
  const dir = repo();
  assert.equal(claims(["-", "--repo", dir], "  \n").status, 1);
  assert.equal(claims([], "x").status, 2);
  assert.equal(claims(["-", "--nope"], "x").status, 2);
  assert.equal(claims(["-", "--repo"], "x").status, 2);
  assert.equal(claims([join(dir, "missing.txt"), "--repo", dir]).status, 2);
  const plain = mkdtempSync(join(tmpdir(), "claims-plain-"));
  const r = claims(["-", "--repo", plain], "It took 3 days.");
  assert.equal(r.status, 3);
  assert.match(r.stderr, /repository/);
  assert.equal(claims(["-", "--repo", join(plain, "gone")], "It took 3 days.").status, 3);
});

test("the claims file itself is not evidence for its own claims", () => {
  const dir = repo();
  writeFileSync(join(dir, "ANSWER.txt"), "We saw 5555 retries.\n");
  git(dir, "add", "ANSWER.txt");
  const r = claims([join(dir, "ANSWER.txt"), "--repo", dir]);
  assert.match(r.stdout, /5555 retries.*not found/);
});
