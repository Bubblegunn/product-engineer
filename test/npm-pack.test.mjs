import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { extractPackedFiles } from "../scripts/npm-pack.mjs";

test("extracts files from the npm 11 array shape", () => {
  const packed = [
    {
      name: "product-engineer",
      files: [
        { path: "LICENSE" },
        { path: "package.json" },
      ],
    },
  ];

  assert.deepEqual(
    extractPackedFiles(packed, "product-engineer"),
    packed[0].files,
  );
});

test("extracts files from the npm 12 object shape by package name", () => {
  const packed = {
    "product-engineer": {
      name: "product-engineer",
      files: [
        { path: "LICENSE" },
        { path: "package.json" },
      ],
    },
  };

  assert.deepEqual(
    extractPackedFiles(packed, "product-engineer"),
    packed["product-engineer"].files,
  );
});

test("uses the requested package from the npm 12 object shape", () => {
  const packed = {
    "other-package": {
      name: "other-package",
      files: [{ path: "other.js" }],
    },
    "product-engineer": {
      name: "product-engineer",
      files: [{ path: "package.json" }],
    },
  };

  assert.deepEqual(
    extractPackedFiles(packed, "product-engineer"),
    packed["product-engineer"].files,
  );
});

test("rejects an unrecognized npm pack output shape", () => {
  assert.throws(
    () => extractPackedFiles({ unexpected: true }, "product-engineer"),
    /unexpected npm pack output shape/,
  );
});
// The licence notices ship with the package, and the two adapted files carry their copyright lines
// in the source headers.
const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const repoFile = (p) => readFileSync(join(repoRoot, p), "utf8");

test("THIRD_PARTY_NOTICES.md is in the package files and in the pack allowlist", () => {
  const pkg = JSON.parse(repoFile("package.json"));
  assert.ok(pkg.files.includes("THIRD_PARTY_NOTICES.md"), JSON.stringify(pkg.files));
  assert.ok(repoFile("scripts/pack-allowlist.txt").split("\n").includes("THIRD_PARTY_NOTICES.md"));
});

test("the adapted sources carry their copyright lines", () => {
  assert.match(repoFile("bin/stubs.mjs"), /Copyright \(c\) 2026 Atos Daniel de Assis Lins/);
  assert.match(repoFile("bin/diff.mjs"), /Smart Commits by Stefan Petrovici/);
  assert.match(repoFile("bin/diff.mjs"), /Copyright \(c\) 2026 Stefan Petrovici/);
});
