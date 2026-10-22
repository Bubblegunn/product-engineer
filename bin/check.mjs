#!/usr/bin/env node
// product-engineer check: does a commit message or PR description carry the
// "For the customer" block, and does the block read the way the skill asks?
// Zero dependencies, Node 22 or newer. Exit 1 on a missing block unless --warn.
import { readFileSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { readability } from "./readability.mjs";
import { acceptedHeadings, preferredHeadings, shippedHeadings, isHeading, headingWithText, normalise } from "./headings.mjs";
import { referenceFindings } from "./references.mjs";
import { renderJson } from "./json-report.mjs";
import { maybeShowStarHint } from "./star-hint.mjs";

const HELP = `usage: product-engineer check [file|-|--stdin] [--pr <number>] [--kind commit|pr] [--warn] [--quiet] [--lang <code>] [--format text|github] [--comment]
       product-engineer template [--lang <code>]
       product-engineer doctor
       product-engineer facts <source> <rewrite> [--max-sentence N] [--avg-sentence N] [--json]
       product-engineer stubs [--staged | --range <a..b>] [--json] [--warn] [-q]
       product-engineer notes <file> [--json]
       product-engineer scope [range] [--json]

Reads a commit message or pull request description and reports whether it
carries the "For the customer" block and whether the block reads the way the
skill asks. With no file it reads .git/COMMIT_EDITMSG when present.

  file, --stdin path to a message, or - / --stdin for standard input
  --pr <n>      fetch the pull request body: through the GitHub API when GITHUB_TOKEN
                and GITHUB_REPOSITORY are set (as in Actions), otherwise with gh pr view.
                --pr <n> implies --kind pr unless --kind is given
  --kind        commit (default) or pr, as --kind pr or --kind=pr. In a pr the block goes first: it
                must start within the first 12 lines, or pr warns (block-not-first), so the first
                screen is the customer's part
  --comment     with --pr and a token: post the result as one comment on the pull
                request, updated in place on later runs; a failed post is a warning
  --format      text (default), github or json. github writes errors and warnings as ::error::
                and ::warning:: workflow commands, so they annotate the run. json prints one
                object, { ok, findings: [{ level, code, message }], readability }, and nothing else
  --diff [range] also read the change itself and report where the message and the
                diff disagree: tests claimed but no test file touched, a fix title with no test file touched, "documentation
                only" over a source change, a stated file count that is wrong, a path
                named that is neither in the change nor in the repository, a file that
                looks like a secret, an added line that holds a secret-shaped value (path
                and line only), and, for the staged change, a change that mixes unrelated groups
                (a range is a pull request and is not checked for that). With no
                range it reads the staged change. Reports warnings only
  --warn        report a missing block as a warning; always exit 0
  -q, --quiet   text and github output shows only errors and warnings, and no star hint.
                The exit code does not change. -q hides the star hint on every subcommand: check,
                doctor (which otherwise prints it) and stubs (which accepts -q for this only).
                template never prints the hint. PRODUCT_ENGINEER_NO_STAR_HINT=1 turns the hint off
                for good. --json and --format json never carry the hint
--references <mode>  resolve the paths and run URLs the message cites: warn (default),
              error, or off. A message that cites nothing is never a failure.
  --lang <code> language of the block for the readability line: en (default) or tr
  -h, --help    this text
  --version     print the version

stubs reads the lines a change adds: the working tree against HEAD (staged and unstaged edits)
and new files git does not ignore, or --staged for the index only, or --range A..B. It reports
TODO, FIXME and XXX comments, placeholder or empty function bodies, tests that assert
nothing or a literal or the same expression on both sides, and newly skipped tests. Each
finding names its file, line and reason. It exits 1 when there are findings; --warn exits 0.
--json prints { count, findings: [{ file, line, code, reason }] } and nothing else. The text
output names the scope it scanned and how many files and added lines it read.

notes reads release notes for people who do not read code. Errors: a conventional commit
prefix at a line start or the word refactor or chore, a code identifier or file name (a
backticked word, camelCase or snake_case, a call such as name(), a path, a file with an
extension), a line about docs, a README, a changelog or a version bump, an effect word
(faster, instant) or a percentage on a line that does not say it was measured, and a version
number after the first line. Warning: the first line names no range (a tag, a commit hash,
"since", "the last N commits").
--json prints { ok, errors, warnings, findings: [{ level, code, line, text, message }] }.

scope lists each changed file of a range (or the staged change, or the working tree) with lines
added and removed, its class, and whether git sees the change as whitespace-only; small changes
are shown line by line. Use it before calling a file formatting-only.

doctor lists the agents on this machine that carry the skill, in this project and
in your home directory, and whether each copy still matches the packaged rules.

Exit codes: 0 no errors, 1 at least one error (doctor: a copy is out of date; stubs: a finding;
notes: an error), 2 usage.`;

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

/** A pull request block must start on one of these lines (1-based), counting the title as line 1. */
const PR_BLOCK_WITHIN = 12;

// Words that claim a benefit. A refactor may not claim one unless it was measured (rule 3).
const REFACTOR_BENEFITS = ["faster", "quicker", "speed", "more\\s+reliable", "safer", "cleaner", "better", "improved", "easier", "fewer\\s+bugs"];

// A negation within the three words before a benefit word governs it ("no change in speed", "nothing is faster").
const NEGATORS = new Set(["no", "not", "nothing", "neither", "nor", "never"]);

/**
 * The first occurrence of a benefit word that is a word of its own (better-sqlite3 is a name, not a claim)
 * and is not negated, or undefined.
 */
function benefitIn(text, word) {
  for (const m of text.matchAll(new RegExp(`(?<![-\\w])${word}(?![-\\w])`, "gi"))) {
    // The window is the three words before the benefit word, within its own clause: a full stop, a comma, a semicolon,
    // a colon, a question or exclamation mark, or but, just or only ends it.
    const clause = text.slice(0, m.index).split(/[.,;:!?]|\b(?:but|just|only)\b/i).pop();
    const before = clause.split(/\s+/).filter(Boolean).slice(-3).map((w) => w.toLowerCase().replace(/[^a-z]/g, ""));
    if (before.some((w) => NEGATORS.has(w))) continue;
    return m[0];
  }
  return undefined;
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
  const add = (level, message, code) => findings.push({ level, message, code });
  const lines = text.split("\n");
  const first = lines[0] ?? "";
  if (/^(Merge|fixup!|squash!|Revert)/.test(first) || /\[no-customer\]/.test(text)) {
    return { skipped: true, findings: [{ level: "ok", message: "merge, fixup, squash, revert or [no-customer]: the block is not required", code: "block-not-required" }] };
  }

  // The block may be written in the team's language: any row of references/headings.md is
  // accepted, and .product-engineer.json adds a language the table does not ship.
  const sets = opts.headings ? [opts.headings] : acceptedHeadings(opts.cwd);
  const preferred = opts.headings ?? preferredHeadings(opts.cwd);
  let blockStart = -1;
  let heading = preferred;
  for (let i = 0; i < lines.length && blockStart < 0; i++) {
    const set = sets.find((s) => isHeading(lines[i], s.block));
    if (set) {
      blockStart = i;
      heading = set;
    }
  }
  const hasWhat = lines.some((l) => headingWithText(l, heading.what));
  // Rule 2 in a pull request: the block is the first thing after the title, so a reader who stops
  // after the first screen has read the part written for them. A commit keeps the block at the end.
  if (opts.kind === "pr" && blockStart >= 0) {
    const line = blockStart + 1;
    if (line > PR_BLOCK_WITHIN) add("warn", `the ${heading.block.replace(/:$/, "")} block starts on line ${line}; in a pull request description put it first, so the first screen is the part for the customer`, "block-not-first");
    else add("ok", `the ${heading.block.replace(/:$/, "")} block starts on line ${line}, within the first ${PR_BLOCK_WITHIN} lines`, "block-first");
  }

  if (blockStart < 0 || !hasWhat) {
    add(opts.warn ? "warn" : "error", blockStart < 0 ? `no "${preferred.block}" block` : `"${heading.block}" block has no "${heading.what}" line`, blockStart < 0 ? "block-missing" : "what-changed-missing");
  } else {
    add("ok", `"${heading.block}" block with "${heading.what}"`, "block-present");
  }

  // The block runs from its heading to the next blank line or the end.
  let block = [];
  if (blockStart >= 0) {
    for (let i = blockStart + 1; i < lines.length && lines[i].trim() !== ""; i++) block.push(lines[i]);
  }
  const blockText = block.join("\n");
  let readabilityOf = null;

  if (blockStart >= 0) {
    if (block.some((l) => headingWithText(l, heading.why))) add("ok", `"${heading.why}" present`, "why-present");
    else add("warn", `"${heading.why}" missing or empty`, "why-missing");

    const auto = block.find((l) => normalise(l).startsWith(normalise(heading.automation)));
    if (!auto) add("ok", `"${heading.automation}" omitted (fine when no manual step disappeared)`, "automation-omitted");
    else if (!headingWithText(auto, heading.automation)) add("error", `"${heading.automation}" is present but empty; omit the line or say what became automatic`, "automation-empty");
    else add("ok", `"${heading.automation}" present`, "automation-present");

    const terms = jargonTerms(opts.tablePath);
    const lower = blockText.toLowerCase();
    const used = terms.filter((t) => new RegExp(`\\b${t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(lower));
    const explained = (t) => new RegExp(`${t}[^\\n]*(\\(|, that is|, which means|, meaning|: )`, "i").test(lower);
    const unexplained = used.filter((t) => !explained(t));
    if (unexplained.length) add("warn", `jargon in the customer block without a plain explanation: ${unexplained.join(", ")}`, "jargon-unexplained");
    else if (used.length) add("ok", "jargon in the block is explained", "jargon-explained");

    // A refactor shows users no change, so its block may say only that and what ran. A benefit word in it
    // is a claim nobody measured; the warning names the word.
    if (/^refactor\b/i.test(first)) {
      for (const word of REFACTOR_BENEFITS) {
        const hit = benefitIn(blockText, word);
        if (hit) add("warn", `the customer block of a refactor says "${hit}"; a refactor shows users no change, so say only that and what ran, or measure the benefit first`, "refactor-benefit-claim");
      }
    }

    if (TEST_EVIDENCE.test(blockText) && !OBSERVED.test(text)) {
      add("warn", "the block offers passing tests as the evidence; rule 3 asks for something observed (logs, the data, a device) or a line saying what you could not check", "tests-as-evidence");
    }

    // Strip this block's own labels, whatever language they are in, so the score reads the
    // prose rather than the scaffolding.
    const labels = [heading.what, heading.why, heading.automation].map((h) => normalise(h));
    const prose = blockText
      .split("\n")
      .map((l) => {
        const n = normalise(l);
        const label = labels.find((h) => n.startsWith(h));
        return label ? n.slice(label.length).trim() : l;
      })
      .join("\n");
    const r = readability(prose, opts.lang ?? (heading.language !== "custom" ? heading.language : "en"));
    readabilityOf = r;
    add(
      "info",
      r.name
        ? `readability of the block: ${r.name} ${r.score} (${r.band}), LIX ${r.lix}`
        : `readability of the block: not scored, because ${r.reason}. Rule 5: a number comes from a count.`,
      "readability",
    );
  }

  const ns = lines.findIndex((l) => isHeading(l, heading.notShipped));
  if (ns >= 0) {
    const items = [];
    for (let i = ns + 1; i < lines.length && lines[i].trim() !== ""; i++) items.push(lines[i]);
    const bad = items.filter((l) => !/^- .+:.+/.test(l));
    if (!items.length) add("warn", `"${heading.notShipped}" has no items`, "not-shipped-empty");
    else if (bad.length) add("warn", `"${heading.notShipped}" items should read "- <thing>: <why not now>" (${bad.length} do not)`, "not-shipped-format");
    else add("ok", `"${heading.notShipped}" lists ${items.length} item${items.length === 1 ? "" : "s"} with reasons`, "not-shipped-ok");
  }

  // A sentence ends at a full stop in any of the scripts this tool accepts a block in:
  // the ideographic stop closes Japanese and Chinese sentences, the danda closes Devanagari.
  // Without them a Japanese block is one long sentence and the count in the warning is wrong.
  const sentences = text.split(/(?<=[.!?])\s+|(?<=[。！？।])\s*|\n+/).filter((s) => /\d/.test(s) && !/^\s*(Co-Authored-By|Claude-Session|Signed-off-by)/.test(s));
  const bare = sentences.filter((s) => !METHOD.test(s) && !/^(#|\s*-\s|\w+\(.*\):)/.test(s) && !/\b(v?\d+\.\d+(\.\d+)?|#\d+|20\d\d)\b/.test(s));
  if (bare.length) add("warn", `${bare.length} sentence${bare.length === 1 ? "" : "s"} with a number and no method or scope next to it: "${bare[0].trim().slice(0, 80)}"`, "number-without-method");

  // Evidence that points somewhere is checked against that somewhere. Whole message, not the block:
  // the path or run URL behind a claim usually sits in the technical body above it.
  for (const f of referenceFindings(text, { mode: opts.references, cwd: opts.cwd })) findings.push(f);

  return { skipped: false, findings, readability: readabilityOf };
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

/** The block to paste, in the heading language the team writes. */
export function template(heading) {
  return [
    heading.block,
    `${heading.what} <what they can now do, or no longer suffer>`,
    `${heading.why} <the benefit, in their terms>`,
    `${heading.automation} <only when a manual step disappeared or the system handles more alone; otherwise omit the line>`,
  ].join("\n");
}

/** The sticky pull request comment: the verdict, the findings, and the block to paste when it is missing. */
export function commentBody(result, version, opts = {}) {
  const heading = opts.headings ?? preferredHeadings(opts.cwd);
  const isMissing = (f) => f.level === "error" && f.message.startsWith("no \"") && f.message.endsWith("\" block");
  const missing = result.findings.some(isMissing);
  const lines = [COMMENT_MARKER, ""];
  if (result.skipped) lines.push("product-engineer check: skipped, the block is not required for this description.");
  else if (missing) lines.push(`product-engineer check: the description has no ${JSON.stringify(heading.block.replace(/:$/, ""))} block.`, "", "Paste this at the end of the description and fill it in:", "", "```", template(heading), "```");
  else lines.push(`product-engineer check: the ${JSON.stringify(heading.block.replace(/:$/, ""))} block is present.`);
  const notes = result.findings.filter((f) => f.level === "error" || f.level === "warn").filter((f) => !(missing && isMissing(f)));
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

/** Index of --diff when the next argument is its range rather than another flag or a file. */
function diffRangeIndex(argv) {
  const i = argv.indexOf("--diff");
  if (i < 0) return -1;
  const next = argv[i + 1];
  return next && !next.startsWith("-") && !existsSync(next) ? i : -1;
}

/**
 * The value of --kind: commit or pr. The value follows the flag after a space or after an equals
 * sign. --pr implies pr when --kind is not given. Throws with the message to print on a bad value.
 */
export function kindFrom(argv) {
  const eq = argv.find((a) => a.startsWith("--kind="));
  let kind;
  if (eq !== undefined) kind = eq.slice("--kind=".length);
  else {
    const i = argv.indexOf("--kind");
    if (i >= 0) {
      const next = argv[i + 1];
      if (!next || next.startsWith("-")) throw new Error("--kind needs a value (commit or pr)");
      kind = next;
    } else return argv.includes("--pr") ? "pr" : "commit";
  }
  if (kind !== "commit" && kind !== "pr") throw new Error(`--kind must be commit or pr, got: ${kind}`);
  return kind;
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
  const valued = [argv.indexOf("--lang"), argv.indexOf("--format"), argv.indexOf("--references"), argv.indexOf("--kind"), diffRangeIndex(argv)].filter((i) => i >= 0).map((i) => i + 1);
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
  if (command === "stubs") {
    const { runStubs } = await import("./stubs.mjs");
    return runStubs(argv.slice(1));
  }
  if (command === "notes") {
    const { runNotes } = await import("./notes.mjs");
    return runNotes(argv.slice(1));
  }
  if (command === "scope") {
    const { runScope } = await import("./scope.mjs");
    return runScope(argv.slice(1));
  }
  if (command === "facts") {
    const { runFacts } = await import("./facts.mjs");
    return runFacts(argv.slice(1));
  }
  if (command === "doctor") {
    const { doctor, render: renderDoctor } = await import("./doctor.mjs");
    const report = doctor();
    console.log(renderDoctor(report));
    return report.stale ? 1 : 0;
  }
  if (command === "template") {
    const langIndex = argv.indexOf("--lang");
    const lang = langIndex >= 0 ? argv[langIndex + 1] : undefined;
    let heading;
    if (lang) {
      heading = shippedHeadings().find((r) => r.language === lang);
      if (!heading) {
        console.error(`unknown --lang: ${lang}`);
        return 2;
      }
    } else {
      heading = preferredHeadings(process.cwd());
    }
    console.log(template(heading));
    return 0;
  }
  if (command && command !== "check" && !command.startsWith("-") && !existsSync(command)) {
    console.error(HELP);
    return 2;
  }
  const formatIndex = argv.indexOf("--format");
  const format = formatIndex >= 0 ? argv[formatIndex + 1] : "text";
  if (format !== "text" && format !== "github" && format !== "json") {
    console.error(`--format must be text, github or json, got: ${format}`);
    return 2;
  }
  let kind;
  try {
    kind = kindFrom(argv);
  } catch (err) {
    console.error(err instanceof Error ? err.message : String(err));
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
  const refIndex = argv.indexOf("--references");
  const result = analyse(text, {
    kind,
    warn: argv.includes("--warn"),
    lang: langIndex >= 0 ? argv[langIndex + 1] : undefined,
    references: refIndex >= 0 ? argv[refIndex + 1] : undefined,
  });
  if (argv.includes("--diff")) {
    const ri = diffRangeIndex(argv);
    try {
      const { readDiff, crossCheck } = await import("./diff.mjs");
      const diff = readDiff({ range: ri >= 0 ? argv[ri + 1] : undefined });
      result.findings.push(...crossCheck(text, diff, { cwd: process.cwd() }));
    } catch (err) {
      // Outside a repository, or a range git does not know: say so and check the message alone.
      const message = `--diff could not read the change: ${err instanceof Error ? err.message.split("\n")[0] : String(err)}`;
      result.findings.push({ level: "warn", message, code: "diff-unreadable" });
    }
  }
  // --quiet keeps the errors and warnings of a text or github report; json is never filtered.
  const quiet = argv.includes("--quiet") || argv.includes("-q");
  const shown = quiet && format !== "json" ? { ...result, findings: result.findings.filter((f) => f.level === "error" || f.level === "warn") } : result;
  console.log(format === "json" ? renderJson(result, { warn: argv.includes("--warn") }) : render(shown, format));
  // With --format json, standard output is one JSON document and nothing else.
  const say = format === "json" ? console.error : console.log;
  if (argv.includes("--comment")) {
    const pr = prNumber(argv);
    if (!pr) {
      console.error("--comment needs --pr <number>");
      return 2;
    }
    try {
      const what = await upsertComment(pr, commentBody(result, version()));
      say(`comment ${what} on pull request #${pr}`);
    } catch (err) {
      // A read-only token (a pull request from a fork) cannot comment; the check still reports.
      const message = `could not post the comment: ${err instanceof Error ? err.message : String(err)}`;
      say(format === "github" ? `::warning title=product-engineer::${message}` : `warn  ${message}`);
    }
  }
  return argv.includes("--warn") ? 0 : exitCode(result);
}

const invoked = process.argv[1] && (fileURLToPath(import.meta.url) === process.argv[1] || /product-engineer$/.test(process.argv[1]));
// Every subcommand returns its exit code to this one place. The star hint is printed here, on a
// successful run only; help and version are not runs, so they never carry it.
if (invoked) {
  main(process.argv.slice(2)).then((code) => {
    const args = process.argv.slice(2);
    if (!args.includes("--help") && !args.includes("-h") && !args.includes("--version")) {
      try {
        maybeShowStarHint({ exitCode: code, argv: args });
      } catch {
        // The hint is a courtesy: a failure to show it never changes the run.
      }
    }
    process.exit(code);
  });
}
