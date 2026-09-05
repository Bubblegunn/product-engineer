#!/usr/bin/env node
// product-engineer check: does a commit message or PR description carry the
// "For the customer" block, and does the block read the way the skill asks?
// Zero dependencies, Node 20 or newer. Exit 1 on a missing block unless --warn.
import { readFileSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { readability } from "./readability.mjs";

const HELP = `usage: product-engineer check [file|-|--stdin] [--pr <number>] [--warn] [--lang <code>] [--format text|github] [--comment]

Reads a commit message or pull request description and reports whether it
carries the "For the customer" block and whether the block reads the way the
skill asks. With no file it reads .git/COMMIT_EDITMSG when present.

  file, --stdin path to a message, or - / --stdin for standard input
  --pr <n>      fetch the pull request body: through the GitHub API when GITHUB_TOKEN
                and GITHUB_REPOSITORY are set (as in Actions), otherwise with gh pr view
  --comment     with --pr and a token: post the result as one comment on the pull
                request, updated in place on later runs; a failed post is a warning
  --format      text (default) or github: errors and warnings as ::error:: and
                ::warning:: workflow commands, so they annotate the run
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

// Rule 3: a passing test suite is a step, not an observation of what the customer gets.
const TEST_EVIDENCE = /\b(all\s+)?(\d[\d,]*\s+)?tests?\s+(pass\w*|green|succeed\w*)\b|\btest suite\s+(passes|is green)\b|\b(CI|the suite)\s+(is\s+)?green\b/i;
const OBSERVED = /\b(watched|saw|observed|checked (it|the|that)|verified (by|in|it|that)|in (the|production) (logs?|database|dashboard|output|data)|on (a|my|the) (device|phone|staging|server)|reproduced|measured|could not (check|verify|observe)|did not (check|verify|run)|unable to (check|verify))\b/i;

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

    if (TEST_EVIDENCE.test(blockText) && !OBSERVED.test(text)) {
      add("warn", "the block offers passing tests as the evidence; rule 3 asks for something observed (logs, the data, a device) or a line saying what you could not check");
    }

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

function summary(result) {
  const errors = result.findings.filter((f) => f.level === "error").length;
  const warns = result.findings.filter((f) => f.level === "warn").length;
  return errors ? `${errors} error${errors === 1 ? "" : "s"}, ${warns} warning${warns === 1 ? "" : "s"}` : `no errors, ${warns} warning${warns === 1 ? "" : "s"}`;
}

/** Text output, or GitHub workflow commands with `format: "github"` so errors and warnings annotate the run. */
export function render(result, format = "text") {
  const line =
    format === "github"
      ? (f) => (f.level === "error" ? `::error title=product-engineer::${f.message}` : f.level === "warn" ? `::warning title=product-engineer::${f.message}` : `${f.level.padEnd(5)} ${f.message}`)
      : (f) => `${f.level.padEnd(5)} ${f.message}`;
  return [...result.findings.map(line), summary(result)].join("\n");
}

export const COMMENT_MARKER = "<!-- product-engineer -->";

const TEMPLATE = `For the customer:
What changed: <what they can now do, or no longer suffer>
Why it matters: <the benefit, in their terms>
Automation effect: <only when a manual step disappeared or the system handles more alone; otherwise omit the line>`;

/** The sticky pull request comment: the verdict, the findings, and the block to paste when it is missing. */
export function commentBody(result, version) {
  const missing = result.findings.some((f) => f.level === "error" && /^no "For the customer:" block/.test(f.message));
  const lines = [COMMENT_MARKER, ""];
  if (result.skipped) lines.push("product-engineer check: skipped, the block is not required for this description.");
  else if (missing) lines.push("product-engineer check: the description has no \"For the customer\" block.", "", "Paste this at the end of the description and fill it in:", "", "```", TEMPLATE, "```");
  else lines.push("product-engineer check: the \"For the customer\" block is present.");
  const notes = result.findings.filter((f) => f.level === "error" || f.level === "warn").filter((f) => !(missing && /^no "For the customer:" block/.test(f.message)));
  if (notes.length) {
    lines.push("");
    for (const f of notes) lines.push(`- ${f.level === "error" ? "error" : "warning"}: ${f.message}`);
  }
  lines.push("", `<sub>${summary(result)} · product-engineer ${version} · updated on every push</sub>`);
  return lines.join("\n");
}

/** The body field of a pull request JSON document; an absent or null body is an empty description. */
export function prBodyFrom(json) {
  const pr = JSON.parse(json);
  return typeof pr.body === "string" ? pr.body : "";
}

function github(env) {
  const token = env.GITHUB_TOKEN || env.GH_TOKEN;
  const repo = env.GITHUB_REPOSITORY;
  if (!token || !repo) return null;
  const api = (env.GITHUB_API_URL || "https://api.github.com").replace(/\/$/, "");
  const call = async (method, path, body) => {
    const res = await fetch(`${api}/repos/${repo}${path}`, {
      method,
      headers: { authorization: `Bearer ${token}`, accept: "application/vnd.github+json", "user-agent": "product-engineer", ...(body ? { "content-type": "application/json" } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    const text = await res.text();
    if (!res.ok) throw new Error(`${method} ${path}: ${res.status} ${text.slice(0, 200)}`);
    return text;
  };
  return { call };
}

/** The pull request description through the API when a token is in the environment, otherwise through gh. */
export async function fetchPrBody(number, env = process.env) {
  const gh = github(env);
  if (gh) return prBodyFrom(await gh.call("GET", `/pulls/${number}`));
  return execFileSync("gh", ["pr", "view", String(number), "--json", "body", "--jq", ".body"], { encoding: "utf8", shell: process.platform === "win32" });
}

/** Post the comment, or update the one carrying the marker. Returns "created" or "updated". */
export async function upsertComment(number, body, env = process.env) {
  const gh = github(env);
  if (!gh) throw new Error("--comment needs GITHUB_TOKEN (or GH_TOKEN) and GITHUB_REPOSITORY");
  const existing = JSON.parse(await gh.call("GET", `/issues/${number}/comments?per_page=100`)).find((c) => typeof c.body === "string" && c.body.startsWith(COMMENT_MARKER));
  if (existing) {
    await gh.call("PATCH", `/issues/comments/${existing.id}`, { body });
    return "updated";
  }
  await gh.call("POST", `/issues/${number}/comments`, { body });
  return "created";
}

export function exitCode(result) {
  return result.findings.some((f) => f.level === "error") ? 1 : 0;
}

function prNumber(argv) {
  const prIndex = argv.indexOf("--pr");
  if (prIndex < 0) return null;
  const n = argv[prIndex + 1];
  if (!n || !/^\d+$/.test(n)) throw new Error("--pr needs a number");
  return n;
}

async function readInput(argv) {
  const pr = prNumber(argv);
  if (pr) return fetchPrBody(pr);
  const valued = [argv.indexOf("--lang"), argv.indexOf("--format")].filter((i) => i >= 0).map((i) => i + 1);
  const positional = argv.filter((a, i) => (!a.startsWith("-") || a === "-") && !valued.includes(i)).filter((a) => a !== "check");
  const file = positional[0];
  if (file === "-" || argv.includes("--stdin")) return readFileSync(0, "utf8");
  if (file) return readFileSync(file, "utf8");
  if (existsSync(".git/COMMIT_EDITMSG")) return readFileSync(".git/COMMIT_EDITMSG", "utf8");
  throw new Error("nothing to check: pass a file, -, or --pr <number> (see --help)");
}

const version = () => JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")).version;

async function main(argv) {
  if (argv.includes("--version")) {
    console.log(version());
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
  const formatIndex = argv.indexOf("--format");
  const format = formatIndex >= 0 ? argv[formatIndex + 1] : "text";
  if (format !== "text" && format !== "github") {
    console.error(`--format must be text or github, got: ${format}`);
    return 2;
  }
  let text;
  try {
    text = await readInput(argv);
  } catch (err) {
    console.error(err instanceof Error ? err.message : String(err));
    return 2;
  }
  const langIndex = argv.indexOf("--lang");
  const result = analyse(text, { warn: argv.includes("--warn"), lang: langIndex >= 0 ? argv[langIndex + 1] : undefined });
  console.log(render(result, format));
  if (argv.includes("--comment")) {
    const pr = prNumber(argv);
    if (!pr) {
      console.error("--comment needs --pr <number>");
      return 2;
    }
    try {
      const what = await upsertComment(pr, commentBody(result, version()));
      console.log(`comment ${what} on pull request #${pr}`);
    } catch (err) {
      // A read-only token (a pull request from a fork) cannot comment; the check still reports.
      const message = `could not post the comment: ${err instanceof Error ? err.message : String(err)}`;
      console.log(format === "github" ? `::warning title=product-engineer::${message}` : `warn  ${message}`);
    }
  }
  return argv.includes("--warn") ? 0 : exitCode(result);
}

const invoked = process.argv[1] && (fileURLToPath(import.meta.url) === process.argv[1] || /product-engineer$/.test(process.argv[1]));
if (invoked) main(process.argv.slice(2)).then((code) => process.exit(code));
