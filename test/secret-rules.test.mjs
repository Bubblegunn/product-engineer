// Token-shape rules in bin/diff.mjs. Every secret-shaped value is assembled from parts at run time,
// so this file contains no credential-shaped literal. Each rule has a positive case, a near miss that
// must not match, and the kind it reports is checked by exact name. The matched value must never
// appear in the output.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { secretHitsIn } from "../bin/diff.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const ALNUM = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
const UPPER_DIGITS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
const HEX = "0123456789abcdef";
const B64 = `${ALNUM}+/`;
const B64URL = `${ALNUM}-_`;

// A deterministic run of characters from an alphabet; varied enough to have high entropy.
const run = (n, alphabet, seed) => {
  let x = seed + 1;
  let out = "";
  for (let i = 0; i < n; i++) {
    x = (Math.imul(x, 1103515245) + 12345) & 0x7fffffff;
    out += alphabet[x % alphabet.length];
  }
  return out;
};

const patch = (path, lines) =>
  `diff --git a/${path} b/${path}\n+++ b/${path}\n@@ -0,0 +1,${lines.length} @@\n${lines.map((l) => `+${l}`).join("\n")}\n`;
const hitsOf = (lines, path = "src/config.ts") => secretHitsIn(patch(path, lines));
const kindsOf = (line) => hitsOf([line]).map((h) => h.kind);

// One row per rule: the kind it reports, a line that must report it, and a near miss that must not.
const CASES = [
  { kind: "an Azure storage account key", pos: `const c = "AccountName=s;AccountKey=${run(88, B64, 3)};";`, near: `const c = "AccountKey=${"A".repeat(88)}";` },
  { kind: "a Google service account key id", pos: `  "private_key_id": "${run(40, HEX, 5)}",`, near: `  "private_key_id": "abc123",` },
  { kind: "a Twilio API key", pos: `const sid = "SK${run(32, HEX, 2)}";`, near: `const sid = "SK${run(32, HEX, 2).toUpperCase()}";` },
  { kind: "a SendGrid API key", pos: `const k = "SG.${run(22, ALNUM, 1)}.${run(43, ALNUM, 4)}";`, near: `const k = "SG.${run(21, ALNUM, 1)}.${run(43, ALNUM, 4)}";` },
  { kind: "a Mailgun API key", pos: `const k = "key-${run(32, HEX, 6)}";`, near: `const k = "monkey-${run(32, HEX, 6)}";` },
  { kind: "an npm access token", pos: `const reg = "npm_${run(36, ALNUM, 7)}";`, near: `const k = "npm_${run(35, ALNUM, 7)}";` },
  { kind: "a PyPI upload token", pos: `const t = "pypi-AgEIcHlwaS5vcmc${run(60, B64URL, 8)}";`, near: `const t = "pypi-AgEIcHlwaS5vcmc${run(20, B64URL, 8)}";` },
  { kind: "a Shopify access token", pos: `const t = "shpat_${run(32, HEX, 9)}";`, near: `const t = "shpat_${run(31, HEX, 9)}";` },
  { kind: "a Docker Hub access token", pos: `const t = "dckr_pat_${run(27, B64URL, 10)}";`, near: `const t = "dckr_pat_${run(10, B64URL, 10)}";` },
  { kind: "a Discord bot token", pos: `const bot = "M${run(24, ALNUM, 11)}.${run(6, ALNUM, 12)}.${run(30, B64URL, 13)}";`, near: `const bot = "M${"A".repeat(24)}.AAAAAA.${"B".repeat(30)}";` },
  { kind: "a Telegram bot token", pos: `const tg = "123456789:${run(35, B64URL, 14)}";`, near: `const tg = "12345:${run(35, B64URL, 14)}";` },
  { kind: "a New Relic API key", pos: `const t = "NRAK-${run(27, UPPER_DIGITS, 15)}";`, near: `const t = "NRAK-${run(26, UPPER_DIGITS, 15)}";` },
  { kind: "a DigitalOcean token", pos: `const t = "dop_v1_${run(64, HEX, 16)}";`, near: `const t = "dop_v1_${run(63, HEX, 16)}";` },
  { kind: "a Hugging Face access token", pos: `const t = "hf_${run(34, ALNUM, 17)}";`, near: `const t = "hf_${run(33, ALNUM, 17)}";` },
  { kind: "a GitLab personal access token", pos: `const t = "glpat-${run(20, B64URL, 18)}";`, near: `const t = "glpat-${run(19, B64URL, 18)}";` },
  { kind: "a JSON Web Token", pos: `const jwt = "eyJ${run(20, B64URL, 19)}.eyJ${run(30, B64URL, 21)}.${run(20, B64URL, 22)}";`, near: `const jwt = "eyJabc.eyJdef.ghi";` },
  { kind: "a basic authorization header with credentials", pos: `const h = "Authorization: Basic ${run(28, B64, 20)}";`, near: `const h = "Authorization: Basic ${"a".repeat(28)}";` },
  { kind: "a PGP private key header", pos: `-----BEGIN ${["PGP", "PRIVATE KEY BLOCK-----"].join(" ")}`, near: `-----BEGIN PGP PUBLIC KEY BLOCK-----` },
  { kind: "a Slack webhook URL", pos: `const hook = "https://hooks.slack.com/services/T${run(9, UPPER_DIGITS, 21)}/B${run(9, UPPER_DIGITS, 23)}/${run(24, ALNUM, 24)}";`, near: `const hook = "https://hooks.slack.com/services/docs-only";` },
  { kind: "a Google OAuth client secret", pos: `const s = "GOCSPX-${run(28, B64URL, 25)}";`, near: `const s = "GOCSPX-${run(27, B64URL, 25)}";` },
  { kind: "a Linear API key", pos: `const k = "lin_api_${run(40, ALNUM, 26)}";`, near: `const k = "lin_api_${run(39, ALNUM, 26)}";` },
  { kind: "a Sentry user token", pos: `const t = "sntryu_${run(64, HEX, 27)}";`, near: `const t = "sntryu_${run(63, HEX, 27)}";` },
  { kind: "a Notion integration secret", pos: `const s = "secret_${run(43, ALNUM, 28)}";`, near: `const s = "secret_${run(42, ALNUM, 28)}";` },
  { kind: "a Postman API key", pos: `const k = "PMAK-${run(24, HEX, 29)}-${run(34, HEX, 30)}";`, near: `const k = "PMAK-${run(23, HEX, 29)}-${run(34, HEX, 30)}";` },
  { kind: "a Fly.io access token", pos: `const t = "fo1_${run(43, B64URL, 31)}";`, near: `const t = "fo1_${run(42, B64URL, 31)}";` },
  { kind: "a Doppler service token", pos: `const t = "dp.pt.${run(43, ALNUM, 32)}";`, near: `const t = "dp.pt.${run(42, ALNUM, 32)}";` },
  { kind: "a Replicate API token", pos: `const t = "r8_${run(37, ALNUM, 33)}";`, near: `const t = "r8_${run(36, ALNUM, 33)}";` },
  { kind: "a Groq API key", pos: `const t = "gsk_${run(52, ALNUM, 34)}";`, near: `const t = "gsk_${run(51, ALNUM, 34)}";` },
];

for (const { kind, pos, near } of CASES) {
  test(`${kind}: a value of the right shape is reported by kind`, () => {
    assert.ok(kindsOf(pos).includes(kind), `expected ${kind}; got ${JSON.stringify(kindsOf(pos))}`);
  });
  test(`${kind}: a near miss of the same family is not reported as that kind`, () => {
    assert.ok(!kindsOf(near).includes(kind), `near miss reported as ${kind}`);
  });
}

test("the reported finding names the kind, the path and the line, never the value", () => {
  const value = run(36, ALNUM, 40);
  const line = `const t = "npm_${value}";`;
  const [hit] = hitsOf([line], "src/publish.ts");
  assert.deepEqual(Object.keys(hit).sort(), ["kind", "line", "path"]);
  assert.equal(hit.path, "src/publish.ts");
  assert.equal(hit.line, 1);
  assert.ok(!JSON.stringify(hit).includes(value), "the matched value was stored");
});

test("a documented sample or a placeholder is skipped", () => {
  assert.deepEqual(kindsOf(`const t = "npm_EXAMPLE${run(29, ALNUM, 41)}";`), []);
  assert.deepEqual(kindsOf(`const t = "npm_${"x".repeat(36)}";`), []);
  assert.deepEqual(kindsOf(`const t = "npm_your_token_here_placeholder_____";`), []);
});

test("a generic shape with low entropy is skipped, a varied value of the same shape is not", () => {
  assert.deepEqual(kindsOf(`const jwt = "eyJ${"a".repeat(20)}.eyJ${"a".repeat(30)}.${"a".repeat(20)}";`), []);
  assert.ok(kindsOf(`const jwt = "eyJ${run(20, B64URL, 50)}.eyJ${run(30, B64URL, 51)}.${run(20, B64URL, 52)}";`).includes("a JSON Web Token"));
});

test("a line longer than the cap is not read for the new rules", () => {
  const long = `const t = "npm_${run(36, ALNUM, 60)}";${" ".repeat(5000)}`;
  assert.deepEqual(kindsOf(long), []);
});

test("the existing rules still report what they reported", () => {
  assert.ok(kindsOf(`const k = "AKIA${run(16, UPPER_DIGITS, 70)}";`).includes("an AWS access key id"));
  assert.ok(kindsOf(`-----BEGIN RSA PRIVATE KEY-----`).includes("a private key header"));
});

test("a five megabyte change is read in under two seconds, and a secret at its end is still found", () => {
  const filler = `const value = compute(1, "padding text for the change"); // generated line`;
  const lines = [];
  let size = 0;
  while (size < 5 * 1024 * 1024) {
    lines.push(filler);
    size += filler.length + 1;
  }
  lines.push(`const t = "npm_${run(36, ALNUM, 80)}";`);
  const text = patch("src/generated.ts", lines);
  const started = performance.now();
  const hits = secretHitsIn(text);
  const elapsed = performance.now() - started;
  assert.ok(elapsed < 2000, `took ${Math.round(elapsed)} ms`);
  assert.ok(hits.some((h) => h.kind === "an npm access token" && h.line === lines.length));
});

test("the repository's own text carries no false alarm from the new rules", () => {
  const newKinds = new Set(CASES.map((c) => c.kind));
  const files = [];
  const walk = (dir) => {
    for (const name of readdirSync(dir)) {
      const full = join(dir, name);
      if (statSync(full).isDirectory()) walk(full);
      else if (/\.(mjs|js|ts|md|json|ya?ml|txt)$/.test(name)) files.push(full);
    }
  };
  for (const d of ["bin", "skills", "docs", "integrations"]) walk(join(ROOT, d));
  files.push(join(ROOT, "README.md"));
  const found = [];
  for (const full of files) {
    const rel = relative(ROOT, full);
    if (rel === join("test", "secret-rules.test.mjs")) continue;
    const lines = readFileSync(full, "utf8").split("\n");
    for (const h of hitsOf(lines, rel)) if (newKinds.has(h.kind)) found.push(`${rel}:${h.line} ${h.kind}`);
  }
  assert.deepEqual(found, []);
});
