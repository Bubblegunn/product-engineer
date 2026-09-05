import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { adapters, rulesFrom } from "../scripts/generate-adapters.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const script = join(root, "scripts", "generate-adapters.mjs");
const skill = readFileSync(join(root, "skills", "product-engineer", "SKILL.md"), "utf8");

test("rulesFrom drops the frontmatter and the title and keeps the seven rules", () => {
  const rules = rulesFrom(skill);
  assert.ok(!rules.startsWith("---"));
  assert.ok(!/^# product-engineer/m.test(rules));
  for (const n of [1, 2, 3, 4, 5, 6, 7]) assert.ok(new RegExp(`^## ${n}\\. `, "m").test(rules), `rule ${n}`);
});

test("adapters produce the nine files, each marked generated or copied and carrying the rules", () => {
  const out = adapters(skill, "0.3.0");
  const paths = Object.keys(out).sort();
  assert.deepEqual(paths, [
    ".clinerules/product-engineer.md",
    ".cursor/rules/product-engineer.mdc",
    ".github/copilot-instructions.md",
    ".kiro/steering/product-engineer.md",
    ".windsurf/rules/product-engineer.md",
    "AGENTS.md",
    "GEMINI.md",
    "examples/cursor/.cursor/rules/product-engineer.mdc",
    "gemini-extension.json",
  ]);
  for (const [p, text] of Object.entries(out)) {
    if (p.endsWith(".json")) continue;
    assert.ok(text.includes(p.startsWith("examples/") ? "Copied from Bubblegunn/product-engineer 0.3.0" : "Generated from skills/product-engineer/SKILL.md"), `${p} marked`);
    assert.ok(/^## 7\. /m.test(text), `${p} has rule 7`);
    assert.ok(!text.includes("—"), `${p} has no em dash`);
  }
  assert.ok(out[".cursor/rules/product-engineer.mdc"].startsWith("---\ndescription: "));
  assert.ok(out[".cursor/rules/product-engineer.mdc"].includes("alwaysApply: true"));
  const example = out["examples/cursor/.cursor/rules/product-engineer.mdc"];
  assert.ok(example.startsWith("---\ndescription: "));
  assert.ok(example.includes("alwaysApply: true"));
  assert.ok(!example.includes("scripts/generate-adapters.mjs"), "the copy does not point at this repository's generator");
  assert.ok(out[".kiro/steering/product-engineer.md"].startsWith("---\ninclusion: always\n---"));
  assert.ok(out[".windsurf/rules/product-engineer.md"].startsWith("---\ntrigger: always_on\n---"));
  const manifest = JSON.parse(out["gemini-extension.json"]);
  assert.equal(manifest.contextFileName, "GEMINI.md");
  assert.equal(manifest.version, "0.3.0");
});

test("the CLI writes into --root, and --check passes then fails after an edit", () => {
  const dir = mkdtempSync(join(tmpdir(), "pe-adapters-"));
  mkdirSync(join(dir, "skills", "product-engineer"), { recursive: true });
  writeFileSync(join(dir, "skills", "product-engineer", "SKILL.md"), skill);
  writeFileSync(join(dir, "package.json"), JSON.stringify({ version: "9.9.9" }));
  const gen = spawnSync("node", [script, "--root", dir], { encoding: "utf8" });
  assert.equal(gen.status, 0, gen.stderr);
  assert.ok(existsSync(join(dir, "AGENTS.md")));
  const ok = spawnSync("node", [script, "--check", "--root", dir], { encoding: "utf8" });
  assert.equal(ok.status, 0, ok.stdout + ok.stderr);
  writeFileSync(join(dir, "GEMINI.md"), "edited by hand\n");
  const stale = spawnSync("node", [script, "--check", "--root", dir], { encoding: "utf8" });
  assert.equal(stale.status, 1);
  assert.match(stale.stdout + stale.stderr, /GEMINI\.md/);
});
