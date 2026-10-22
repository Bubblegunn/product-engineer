// ours-verify.mjs <copy dir> <shim> <arms.json>: checks the immutable copy of the commit under test before any run uses it
// (ours.sh calls it once, when it builds the copy). Exits 0 when the copy passes, 1 with a message otherwise.
// ours-verify.mjs --digest <copy dir>: prints the tree digest of the copy (sha256 over the sorted list of paths, each with
// its type, its executable bit and the sha256 of its content or link target). ours.sh stores it in ours-commit.txt and
// compares it again before every reuse, so a changed file in the copy stops the round.
//   1. node bin/check.mjs --version prints the version in the copy's package.json.
//   2. Each probe in arms.json "ours".probes passes through the shim: the probe is an argument list, and its last
//      element is the string that must appear in the combined output, for example ["--help", "stubs"].
// Zero dependencies. Node 22.
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { lstatSync, readdirSync, readFileSync, readlinkSync } from "node:fs";
import { join } from "node:path";

// treeDigest(dir): the digest described above. Symbolic links are hashed by their target, never followed.
export function treeDigest(dir) {
  const entries = [];
  const walk = (rel) => {
    for (const name of readdirSync(join(dir, rel)).sort()) {
      const path = rel === "" ? name : `${rel}/${name}`;
      const stat = lstatSync(join(dir, path));
      if (stat.isDirectory()) {
        entries.push(`d ${path}`);
        walk(path);
      } else if (stat.isSymbolicLink()) {
        entries.push(`l ${path} ${createHash("sha256").update(readlinkSync(join(dir, path))).digest("hex")}`);
      } else {
        const content = createHash("sha256").update(readFileSync(join(dir, path))).digest("hex");
        entries.push(`f ${(stat.mode & 0o111) !== 0 ? "x" : "-"} ${path} ${content}`);
      }
    }
  };
  walk("");
  return createHash("sha256").update(entries.join("\n")).digest("hex");
}

if (process.argv[2] === "--digest") {
  if (!process.argv[3]) {
    process.stderr.write("usage: ours-verify.mjs --digest <copy dir>\n");
    process.exit(2);
  }
  process.stdout.write(`${treeDigest(process.argv[3])}\n`);
  process.exit(0);
}

const [copy, shim, armsFile] = process.argv.slice(2);
if (!copy || !shim || !armsFile) {
  process.stderr.write("usage: ours-verify.mjs <copy dir> <shim> <arms.json>\n");
  process.exit(2);
}

function fail(message) {
  process.stderr.write(`ours-verify: ${message}\n`);
  process.exit(1);
}

const pkg = JSON.parse(readFileSync(join(copy, "package.json"), "utf8"));
const version = spawnSync(process.execPath, [join(copy, "bin", "check.mjs"), "--version"], { encoding: "utf8" });
if (version.status !== 0) fail(`node bin/check.mjs --version exited ${version.status}: ${version.stderr.trim()}`);
if (version.stdout.trim() !== pkg.version) {
  fail(`--version printed "${version.stdout.trim()}", but the copy's package.json says "${pkg.version}"`);
}

const arms = JSON.parse(readFileSync(armsFile, "utf8"));
const probes = (arms.ours && arms.ours.probes) || [];
for (const probe of probes) {
  if (!Array.isArray(probe) || probe.length < 2 || probe.some((part) => typeof part !== "string")) {
    fail(`malformed probe ${JSON.stringify(probe)}: an argument list, then the expected string`);
  }
  const args = probe.slice(0, -1);
  const expected = probe[probe.length - 1];
  const run = spawnSync(shim, args, { encoding: "utf8" });
  const output = `${run.stdout ?? ""}${run.stderr ?? ""}`;
  if (!output.includes(expected)) {
    fail(`probe "${args.join(" ")}" did not print "${expected}" (exit ${run.status})`);
  }
}
process.exit(0);
