#!/usr/bin/env node
// product-engineer check: does a commit message or PR description carry the
// "For the customer" block, and does the block read the way the skill asks?
// Zero dependencies, Node 20 or newer. Exit 1 on a missing block unless --warn.
import { readFileSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { readability } from "./readability.mjs";

const HELP = `usage: product-engineer check [file|-] [--pr <number>] [--warn] [--lang <code>]

Reads a commit message or pull request description and reports whether it
carries the "For the customer" block and whether the block reads the way the
skill asks. With no file it reads .git/COMMIT_EDITMSG when present.

  file          path to a message, or - for stdin
  --pr <n>      fetch the pull request body with gh pr view
  --warn        report a missing block as a warning; always exit 0
  --lang <code> language of the block for the readability line: en (default) or tr
  -h, --help    this text
  --version     print the version

Exit codes: 0 no errors, 1 at least one error, 2 usage.`;

const here = dirname(fileURLToPath(import.meta.url));
const TABLE = join(here, "..", "skills", "product-engineer", "references", "plain-language.md");

/** Jargon terms from the plain-language table, lower-cased. */
export function jargonTerms(tablePath = TABLE) {
  if (!existsSync(tablePath)) return [];
  return readFileSync(tablePath, "utf8")
    .split("\n")
    .filter((l) => l.startsWith("| ") && !l.startsWith("| term") && !l.startsWith("|---"))
    .map((l) => l.split("|")[1].trim().toLowerCase())
    .filter(Boolean);
}

const METHOD = /`|\b(count(ed)?|git|ran|measured|out of|of the|in the (file|data|list|logs?)|per|of [0-9])\b/i;

/**
 * Analyse a message. Returns { skipped, findings: [{ level, message }] }.
 * level is "error", "warn", "ok" or "info".
 */
export function analyse(text, opts = {}) {
  const findings = [];
  const add = (level, message) => findings.push({ level, message });
  const lines = text.split("\n");
  const first = lines[0] ?? "";
  if (/^(Merge|fixup!|squash!|Revert)/.test(first) || /\[no-customer\]/.test(text)) {
    return { skipped: true, findings: [{ level: "ok", message: "merge, fixup, squash, revert or [no-customer]: the block is not required" }] };
  }

  const blockStart = lines.findIndex((l) => /^For the customer:\s*$/.test(l));
  const hasWhat = lines.some((l) => /^What changed:\s*\S/.test(l));
  if (blockStart < 0 || !hasWhat) {
    add(opts.warn ? "warn" : "error", blockStart < 0 ? 'no "For the customer:" block' : '"For the customer:" block has no "What changed:" line');
  } else {
    add("ok", '"For the customer:" block with "What changed:"');
  }

  // The block runs from its heading to the next blank line or the end.
  let block = [];
  if (blockStart >= 0) {
    for (let i = blockStart + 1; i < lines.length && lines[i].trim() !== ""; i++) block.push(lines[i]);
  }
  const blockText = block.join("\n");

  if (blockStart >= 0) {
    if (/^Why it matters:\s*\S/m.test(blockText)) add("ok", '"Why it matters:" present');
    else add("warn", '"Why it matters:" missing or empty');

    const auto = block.find((l) => /^Automation effect:/.test(l));
    if (!auto) add("ok", '"Automation effect:" omitted (fine when no manual step disappeared)');
    else if (/^Automation effect:\s*$/.test(auto)) add("error", '"Automation effect:" is present but empty; omit the line or say what became automatic');
    else add("ok", '"Automation effect:" present');

    const terms = jargonTerms(opts.tablePath);
    const lower = blockText.toLowerCase();
    const used = terms.filter((t) => new RegExp(`\\b${t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(lower));
    const explained = (t) => new RegExp(`${t}[^\\n]*(\\(|, that is|, which means|, meaning|: )`, "i").test(lower);
    const unexplained = used.filter((t) => !explained(t));
    if (unexplained.length) add("warn", `jargon in the customer block without a plain explanation: ${unexplained.join(", ")}`);
    else if (used.length) add("ok", "jargon in the block is explained");

    const r = readability(blockText.replace(/^[A-Z][a-z ]+:\s*/gm, ""), opts.lang ?? "en");
    add("info", `readability of the block: ${r.name} ${r.score} (${r.band}), LIX ${r.lix}`);
  }

  const ns = lines.findIndex((l) => /^Not shipped:\s*$/.test(l));
  if (ns >= 0) {
    const items = [];
    for (let i = ns + 1; i < lines.length && lines[i].trim() !== ""; i++) items.push(lines[i]);
    const bad = items.filter((l) => !/^- .+:.+/.test(l));
    if (!items.length) add("warn", '"Not shipped:" has no items');
    else if (bad.length) add("warn", `"Not shipped:" items should read "- <thing>: <why not now>" (${bad.length} do not)`);
    else add("ok", `"Not shipped:" lists ${items.length} item${items.length === 1 ? "" : "s"} with reasons`);
  }

  const sentences = text.split(/(?<=[.!?])\s+|\n+/).filter((s) => /\d/.test(s) && !/^\s*(Co-Authored-By|Claude-Session|Signed-off-by)/.test(s));
  const bare = sentences.filter((s) => !METHOD.test(s) && !/^(#|\s*-\s|\w+\(.*\):)/.test(s) && !/\b(v?\d+\.\d+(\.\d+)?|#\d+|20\d\d)\b/.test(s));
  if (bare.length) add("warn", `${bare.length} sentence${bare.length === 1 ? "" : "s"} with a number and no method or scope next to it: "${bare[0].trim().slice(0, 80)}"`);

  return { skipped: false, findings };
}

export function render(result) {
  const out = result.findings.map((f) => `${f.level.padEnd(5)} ${f.message}`);
  const errors = result.findings.filter((f) => f.level === "error").length;
  const warns = result.findings.filter((f) => f.level === "warn").length;
  out.push(errors ? `${errors} error${errors === 1 ? "" : "s"}, ${warns} warning${warns === 1 ? "" : "s"}` : `no errors, ${warns} warning${warns === 1 ? "" : "s"}`);
  return out.join("\n");
}

export function exitCode(result) {
  return result.findings.some((f) => f.level === "error") ? 1 : 0;
}

function readInput(argv) {
  const prIndex = argv.indexOf("--pr");
  if (prIndex >= 0) {
    const n = argv[prIndex + 1];
    if (!n) throw new Error("--pr needs a number");
    return execFileSync("gh", ["pr", "view", n, "--json", "body", "--jq", ".body"], { encoding: "utf8" });
  }
  const langIndex = argv.indexOf("--lang");
  const positional = argv.filter((a, i) => (!a.startsWith("-") || a === "-") && i !== langIndex + 1).filter((a) => a !== "check");
  const file = positional[0];
  if (file === "-") return readFileSync(0, "utf8");
  if (file) return readFileSync(file, "utf8");
  if (existsSync(".git/COMMIT_EDITMSG")) return readFileSync(".git/COMMIT_EDITMSG", "utf8");
  throw new Error("nothing to check: pass a file, -, or --pr <number> (see --help)");
}

function main(argv) {
  if (argv.includes("--version")) {
    console.log(JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")).version);
    return 0;
  }
  if (argv.includes("-h") || argv.includes("--help")) {
    console.log(HELP);
    return 0;
  }
  const command = argv[0];
  if (command && command !== "check" && !command.startsWith("-") && !existsSync(command)) {
    console.error(HELP);
    return 2;
  }
  let text;
  try {
    text = readInput(argv);
  } catch (err) {
    console.error(err instanceof Error ? err.message : String(err));
    return 2;
  }
  const langIndex = argv.indexOf("--lang");
  const result = analyse(text, { warn: argv.includes("--warn"), lang: langIndex >= 0 ? argv[langIndex + 1] : undefined });
  console.log(render(result));
  return argv.includes("--warn") ? 0 : exitCode(result);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  process.exit(main(process.argv.slice(2)));
} else if (process.argv[1] && /product-engineer$/.test(process.argv[1])) {
  process.exit(main(process.argv.slice(2)));
}
