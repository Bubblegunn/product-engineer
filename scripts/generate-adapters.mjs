#!/usr/bin/env node
// Writes the seven rules from skills/product-engineer/SKILL.md into every instruction
// file the surveyed agents read, so an agent that never loads SKILL.md still gets them.
//   node scripts/generate-adapters.mjs            # write the files
//   node scripts/generate-adapters.mjs --check    # exit 1 when any file is out of date
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const SOURCE = "skills/product-engineer/SKILL.md";
const NOTE = `Generated from ${SOURCE} by scripts/generate-adapters.mjs. Edit the skill, then run: node scripts/generate-adapters.mjs`;

/** The rules: the skill body without frontmatter and without the title line. */
export function rulesFrom(skillText) {
  const parts = skillText.split(/^---\s*$/m);
  const body = parts.length >= 3 ? parts.slice(2).join("---") : skillText;
  return body.trim().replace(/^# product-engineer\s*\n/, "").trim();
}

export function descriptionFrom(skillText) {
  const m = skillText.match(/^description:\s*(.+)$/m);
  return m ? m[1].trim() : "";
}

export function adapters(skillText, version) {
  const rules = rulesFrom(skillText);
  const description = descriptionFrom(skillText);
  const body = `# product-engineer\n\n${rules}\n`;
  const marked = `<!-- ${NOTE} -->\n\n${body}`;
  const preface = [
    "# For agents working in this repository, and for agents that installed it",
    "",
    `The skill lives in \`${SOURCE}\`; the rules below are copied from it. Every commit in`,
    'this repository carries the "For the customer" block; `scripts/commit-msg` enforces it.',
    "Other agents: `npx skills add Bubblegunn/product-engineer` places the skill for you.",
    "",
  ].join("\n");
  return {
    ".cursor/rules/product-engineer.mdc": `---\ndescription: ${JSON.stringify(description)}\nalwaysApply: true\n---\n${marked}`,
    ".github/copilot-instructions.md": marked,
    "GEMINI.md": marked,
    "gemini-extension.json": `${JSON.stringify({ name: "product-engineer", version, description, contextFileName: "GEMINI.md" }, null, 2)}\n`,
    ".clinerules/product-engineer.md": marked,
    ".kiro/steering/product-engineer.md": `---\ninclusion: always\n---\n${marked}`,
    ".windsurf/rules/product-engineer.md": `---\ntrigger: always_on\n---\n${marked}`,
    "AGENTS.md": `<!-- ${NOTE} -->\n\n${preface}\n${body}`,
  };
}

function main(argv) {
  const rootIndex = argv.indexOf("--root");
  const root = resolve(rootIndex >= 0 ? argv[rootIndex + 1] : join(dirname(fileURLToPath(import.meta.url)), ".."));
  const check = argv.includes("--check");
  const skill = readFileSync(join(root, SOURCE), "utf8");
  const version = JSON.parse(readFileSync(join(root, "package.json"), "utf8")).version;
  const files = adapters(skill, version);
  const stale = [];
  for (const [rel, content] of Object.entries(files)) {
    const path = join(root, rel);
    if (check) {
      if (!existsSync(path) || readFileSync(path, "utf8") !== content) stale.push(rel);
      continue;
    }
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, content);
    console.log(`wrote ${rel}`);
  }
  if (check && stale.length) {
    console.error(`out of date: ${stale.join(", ")}\nrun: node scripts/generate-adapters.mjs`);
    return 1;
  }
  if (check) console.log(`adapters up to date (${Object.keys(files).length} files)`);
  return 0;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) process.exit(main(process.argv.slice(2)));
