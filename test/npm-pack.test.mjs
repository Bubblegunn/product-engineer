import { test } from "node:test";
import assert from "node:assert/strict";
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