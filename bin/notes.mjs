// product-engineer notes: reads release notes written for people who do not read code and
// reports the lines a reader would trip over: a conventional commit prefix or commit word, a code
// identifier or file name, a line about docs or a version bump, an effect nobody measured, and a version
// number anywhere but the first line. It warns when the first line names no range.
//
// Zero dependencies. Every rule is a pattern on one line. A pattern can flag a word that only
// looks like code (a brand with an inner capital that is not on the list) and can miss code it does not
// recognise; the exit code is for a person to read, not a verdict.
import { readFileSync } from "node:fs";

const USAGE = "usage: product-engineer notes <file> [--json]";

const COMMIT_PREFIX = /^(?:feat|fix|chore|docs|refactor|perf|test|style|build|ci|revert)(?:\([^)]*\))?!?:/i;
const EXTENSIONS =
  "js|mjs|cjs|ts|tsx|jsx|json|md|py|rb|go|rs|java|kt|swift|c|h|cpp|cs|php|sh|yml|yaml|toml|lock|css|scss|html|sql|txt|env|ini|cfg|xml|csv";
// Framework names that end in .js are product names, not files in the change.
const JS_NAMES = /^(?:node|next|vue|nuxt|express|react|angular|ember|three|chart|d3)\.js$/i;
const FILE_NAME = new RegExp(`(?:^|[^\\w/.-])(\\.?[\\w-]+(?:\\.[\\w-]+)*\\.(?:${EXTENSIONS}))(?![\\w.])`, "gi");
const DOT_FILE = /(?:^|\s)(\.(?:env|gitignore|npmrc|nvmrc|editorconfig)[\w.-]*)\b/gi;
const PATH_DIRS = "src|lib|test|tests|bin|app|docs|scripts|config|packages|public|assets|spec";
const PATH = new RegExp(`(?:^|[\\s(\\["'])((?:\\.{1,2}/|/)?(?:${PATH_DIRS})/[\\w./-]+|(?:\\.{1,2}/|/)[\\w.-]+(?:/[\\w.-]+)+|[\\w.-]+/[\\w.-]+/[\\w./-]+|[\\w-]+/[\\w-]+\\.[a-z]{1,5})`, "gi");
const BACKTICK = /`[^`\n]+`/g;
// Brand names written with an inner capital are words a reader knows, not code.
const BRANDS = new Set(["iPhone", "iPad", "iPod", "iCloud", "iOS", "macOS", "eBay", "PayPal", "WordPress", "YouTube", "LinkedIn", "TripAdvisor", "GitHub", "WhatsApp", "TikTok", "JavaScript", "PowerPoint", "OpenTable", "HubSpot", "QuickBooks", "MailChimp", "DoorDash"]);
const CAMEL = /\b[a-z]+[A-Z][A-Za-z0-9]*\b/g;
const PASCAL = /\b[A-Z][a-z0-9]+[A-Z][A-Za-z0-9]*\b/g;
const SNAKE = /\b[A-Za-z0-9]+(?:_[A-Za-z0-9]+)+\b/g;
const KEBAB = /\b[a-z0-9]+(?:-[a-z0-9]+)+\b/g;
// A lowercase word with digits glued to its end is a helper or format name (a step3 helper, utf8).
const LETTERS_DIGITS = /\b[a-z]{3,}\d+\b/g;
// Hyphenated English ("day-to-day", "up-to-date") is not code: a kebab word counts only when one
// part holds a digit next to letters, or it has three or more parts and none is a short joining word.
const JOINERS = new Set(["a", "an", "the", "to", "of", "in", "on", "by", "and", "or", "for", "at", "per", "as"]);
const CALL = /\b[A-Za-z_$][\w$.]*\((?:\s*[A-Za-z_$'"][\w$.'"]*(?:\s*,\s*[\w$.'"]+)*\s*)?\)/g;
const PLURAL_PARENS = /\((?:s|es)\)$/i;
const URL = /\b(?:https?:\/\/|www\.)\S+/gi;
const DOCS_LINE =
  /\b(?:docs?|documentation|readme|changelog|change log|version bump|bump(?:ed|s)? (?:the )?version|(?:new|next) version number)\b/i;
// Words from commit titles that mean nothing to a reader of the notes.
const COMMIT_WORD = /\b(?:refactor(?:s|ed|ing)?|chores?)\b/i;
const EFFECT = /\b(?:faster|quicker|speed(?:s|ed|ier|y)?|speed-?up|snappier|instant(?:ly)?)\b/i;
const PERCENT = /\d\s*%|\bper ?cent\b/i;
// A percentage that is a price term (a discount, a fee, a tax rate) is a fact, not a claimed effect.
const PRICE_TERM = /\b(?:discount|off|fee|fees|tax|vat|rate|commission|deposit|surcharge|tip|charge)\b/i;
// "measured" counts only when it is not negated: "not measured" and "unmeasured" say the opposite.
const MEASURED = /(?<!\b(?:not|never|un)\s?)\bmeasured\b/i;
const NEGATED_MEASURED = /\b(?:not|never)\s+(?:been\s+)?measured\b|\bunmeasured\b/i;
const VERSION = /\bv\d+(?:\.\d+)+\b|\b\d+\.\d+\.\d+\b/;
const RANGE = /\bv?\d+\.\d+(?:\.\d+)?\b|\b[0-9a-f]{7,40}\b|\bsince\b|\blast \d+ commits\b/i;

function kebabIsCode(word) {
  const parts = word.split("-");
  if (parts.some((p) => /\d/.test(p) && /[a-z]/.test(p))) return true;
  return parts.length >= 3 && !parts.some((p) => JOINERS.has(p));
}

/** The code identifiers and file names on one line of release notes, in the order found. */
export function identifiersIn(line) {
  const found = [];
  const seen = new Set();
  const add = (word) => {
    if (!seen.has(word)) {
      seen.add(word);
      found.push(word);
    }
  };
  for (const m of line.matchAll(BACKTICK)) add(m[0]);
  const text = line.replace(BACKTICK, " ").replace(URL, " ");
  for (const m of text.matchAll(FILE_NAME)) if (!JS_NAMES.test(m[1])) add(m[1]);
  for (const m of text.matchAll(DOT_FILE)) add(m[1]);
  for (const m of text.matchAll(PATH)) add(m[1].replace(/[.,;:)\]]+$/, ""));
  for (const m of text.matchAll(CALL)) if (!PLURAL_PARENS.test(m[0])) add(m[0]);
  for (const re of [CAMEL, PASCAL]) for (const m of text.matchAll(re)) if (!BRANDS.has(m[0])) add(m[0]);
  for (const re of [SNAKE, LETTERS_DIGITS]) for (const m of text.matchAll(re)) add(m[0]);
  for (const m of text.matchAll(KEBAB)) if (kebabIsCode(m[0])) add(m[0]);
  return found;
}

// The text of a line without its Markdown list marker, heading marks or emphasis.
const bare = (line) =>
  line
    .trim()
    .replace(/^#{1,6}\s+/, "")
    .replace(/^(?:[-*+]|\d+[.)])\s+/, "")
    .replace(/^[*_]{1,2}(?=\S)/, "");

/**
 * Checks release notes. Returns { ok, errors, warnings, findings: [{ level, code, line, text, message }] },
 * where line is 1-based and ok means no error.
 */
export function notes(text) {
  const findings = [];
  const lines = text.split(/\r?\n/);
  const first = lines.findIndex((l) => l.trim() !== "");
  const report = (level, code, i, message) => findings.push({ level, code, line: i + 1, text: lines[i].trim(), message });
  if (first === -1) {
    findings.push({ level: "error", code: "empty", line: 0, text: "", message: "the notes are empty" });
  } else if (!RANGE.test(lines[first])) {
    report("warn", "no-range", first, "the first line names no range: give the tag, the commit hashes, \"since ...\" or \"the last N commits\"");
  }
  lines.forEach((raw, i) => {
    if (raw.trim() === "") return;
    const line = bare(raw);
    if (COMMIT_PREFIX.test(line)) report("error", "commit-prefix", i, "a conventional commit prefix: write what the reader can do now instead");
    if (!COMMIT_PREFIX.test(line) && COMMIT_WORD.test(line)) report("error", "commit-word", i, `a word from commit titles (${line.match(COMMIT_WORD)[0]}): say what the reader can do now, or leave the line out`);
    const ids = identifiersIn(raw);
    if (ids.length) report("error", "code-identifier", i, `code a reader cannot follow: ${ids.join(", ")}; say what it does for them in plain words`);
    if (DOCS_LINE.test(line)) report("error", "docs-or-version", i, "a line about docs, a changelog, a README or a version bump: these change nothing for the reader, leave the line out");
    const measured = MEASURED.test(line) && !NEGATED_MEASURED.test(line);
    if (!measured && EFFECT.test(line)) report("error", "unmeasured-effect", i, "an effect nobody measured: describe the cause (\"shows 20 at a time\") or give the measurement");
    if (!measured && PERCENT.test(line) && !PRICE_TERM.test(line)) report("error", "unmeasured-percent", i, "a percentage with no measurement: give how it was measured or leave it out");
    if (i !== first && VERSION.test(line)) report("error", "version-number", i, "a version number after the first line: the version is not a change, name it only in the range line");
  });
  const errors = findings.filter((f) => f.level === "error").length;
  return { ok: errors === 0, errors, warnings: findings.length - errors, findings };
}

export function runNotes(argv) {
  const files = argv.filter((a) => !a.startsWith("-"));
  const unknown = argv.filter((a) => a.startsWith("-") && a !== "--json");
  if (files.length !== 1 || unknown.length) {
    console.error(USAGE);
    return 2;
  }
  let text;
  try {
    text = readFileSync(files[0], "utf8");
  } catch (err) {
    console.error(`notes: cannot read ${files[0]}: ${err instanceof Error ? err.message.split("\n")[0] : String(err)}`);
    return 2;
  }
  const r = notes(text);
  if (argv.includes("--json")) {
    console.log(JSON.stringify(r, null, 2));
    return r.ok ? 0 : 1;
  }
  for (const f of r.findings) {
    const where = f.line ? `line ${f.line}: ` : "";
    console.log(`${f.level === "error" ? "error" : "warn "} ${where}${f.message}`);
    if (f.text) console.log(`        ${f.text}`);
  }
  console.log(r.ok ? `notes: ok (${r.warnings} warning${r.warnings === 1 ? "" : "s"})` : `notes: ${r.errors} error${r.errors === 1 ? "" : "s"}, ${r.warnings} warning${r.warnings === 1 ? "" : "s"}; fix them and run it again`);
  return r.ok ? 0 : 1;
}
