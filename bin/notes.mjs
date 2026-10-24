// product-engineer notes: reads release notes written for people who do not read code and
// reports the lines a reader would trip over: a conventional commit prefix or commit word, a code
// identifier or file name, a line about docs or a version bump, an effect nobody measured, and a version
// number anywhere but the first line. It warns when the first line names no range.
//
// Zero dependencies. Every rule is a pattern on one line. A pattern can flag a word that only
// looks like code (a brand with an inner capital that is not on the list) and can miss code it does not
// recognise; the exit code is for a person to read, not a verdict.
import { readFileSync } from "node:fs";
import { parseRange, range as ledgerRange, vocabularyOf, VOCAB_CAP, VOCAB_COMMIT_LIMIT } from "./range.mjs";

const USAGE = "usage: product-engineer notes <file> [--audience customers|developers] [--json]\n       product-engineer notes <file> --range <from>..<to>|<tag> [--audience customers|developers] [--json]";
// Traceability: a note line longer than this, outside "Not in this release", must share a content word with the range.
const TRACE_MIN_LENGTH = 30;
const TRACE_WORD = /\p{L}{5,}/gu;
// The quiet-period line a range with no visible change may carry instead of a list.
const QUIET = /^No change visible/;
const QUIET_HINT = 'no change is listed; for a quiet period write one honest line such as "No change visible to users since <ref>."';
const AUDIENCES = ["customers", "developers"];

// Words of a commit subject that can name what a note announces. Short words and the stoplist are not
// evidence that a line is about the commit.
const STOPWORDS = new Set(["should", "which", "their", "there", "about", "would", "these", "those", "being", "other"]);
const LIST_ITEM = /^\s*(?:[-*+]|\d+[.)])\s/;

/** The content words of a commit subject: the conventional prefix and a Revert wrapper removed, letters in any script, five or more. */
export function contentWords(subject) {
  let s = String(subject).trim();
  const inner = /^Revert "(.*)"$/.exec(s);
  if (inner) s = inner[1];
  s = s.replace(/^[a-z]+(?:\([^)]*\))?!?:\s*/i, "");
  return [...new Set(s.toLowerCase().match(/\p{L}{5,}/gu) ?? [])].filter((w) => !STOPWORDS.has(w));
}

// Section markers. "Not in this release" opens a section when it is a heading (ATX, bold, plain or setext),
// or the label of a one-line section ("Not in this release: text"); the text after the colon is inside.
const START = /^\s*(?:#{1,6}\s+)?(?:\*\*|__)?\s*not in this release\s*(?:\*\*|__)?\s*(?::|$)/i;
const ATX = /^\s*#{1,6}\s+\S/;
const BOLD_ONLY = /^\s*(?:\*\*|__)\s*[^*_\s][^*_]*?\s*(?:\*\*|__)\s*:?\s*$/;
const UNDERLINE = /^\s*(?:=+|-+)\s*$/;
const LABEL = /:\s*$/;

/** A setext heading: a text line (not a list item) over a line of = or - marks. */
const isSetextTitle = (lines, i) =>
  lines[i].trim() !== "" && !LIST_ITEM.test(lines[i]) && !UNDERLINE.test(lines[i]) && i + 1 < lines.length && UNDERLINE.test(lines[i + 1]);

/** A line that closes a Not in this release section: any heading style, or a label line after a blank line. */
const closesSection = (lines, i) =>
  ATX.test(lines[i]) ||
  BOLD_ONLY.test(lines[i]) ||
  (lines[i].trim() !== "" && !LIST_ITEM.test(lines[i]) && LABEL.test(lines[i]) && (i === 0 || lines[i - 1].trim() === "")) ||
  isSetextTitle(lines, i);

/** Line indexes (0-based) under a "Not in this release" section. The section ends at the next heading of any style. */
function notInReleaseLines(lines) {
  const inside = new Set();
  let on = false;
  lines.forEach((l, i) => {
    if (START.test(l)) on = true;
    else if (on && closesSection(lines, i)) on = false;
    if (on) inside.add(i);
  });
  return inside;
}

const COMMIT_PREFIX = /^(?:feat|fix|chore|docs|refactor|perf|test|style|build|ci|revert)(?:\([^)]*\))?!?:/i;
// A commit hash: seven to forty hex digits with at least one digit and one letter a-f. Rejected for every audience.
const COMMIT_HASH = /\b(?=[0-9a-f]*\d)(?=[0-9a-f]*[a-f])[0-9a-f]{7,40}\b/;
// The merge commit a tool writes by default: "Merge branch ...", "Merge pull request #N ...". Rejected for every audience.
const MERGE_BOILERPLATE = /^Merge (?:branch|branches|pull request|remote-tracking branch|remote branch|tag)\b/i;
// Developers: a line that says a name was renamed, removed or changed incompatibly must name it in backticks.
const CHANGE_WORDS = /\brenamed?\b|\bremoved\b|\bno longer\b|\bbreaking\b|\bdeprecated\b/i;
const NAMED = /`[^\s`]+`/;
const EXTENSIONS =
  "js|mjs|cjs|ts|tsx|jsx|json|md|py|rb|go|rs|java|kt|swift|c|h|cpp|cs|php|sh|yml|yaml|toml|lock|css|scss|html|sql|txt|env|ini|cfg|xml|csv";
// Framework names that end in .js are product names, not files in the change.
const JS_NAMES = /^(?:node|next|vue|nuxt|express|react|angular|ember|three|chart|d3)\.js$/i;
const FILE_NAME = new RegExp(`(?:^|[^\\w/.-])(\\.?[\\w-]+(?:\\.[\\w-]+)*\\.(?:${EXTENSIONS}))(?![\\w.])`, "gi");
const DOT_FILE = /(?:^|\s)(\.(?:env|gitignore|npmrc|nvmrc|editorconfig)[\w.-]*)\b/gi;
const PATH_DIRS = "src|lib|test|tests|bin|app|docs|scripts|config|packages|public|assets|spec";
const PATH = new RegExp(`(?:^|[\\s(\\["'])((?:\\.{1,2}/|/)?(?:${PATH_DIRS})/[\\w./-]+|(?:\\.{1,2}/|/)[\\w.-]+(?:/[\\w.-]+)+|[\\w.-]+/[\\w.-]+/[\\w./-]+|[\\w-]+/[\\w-]+\\.[a-z]{1,5})`, "gi");
const BACKTICK = /`[^`\n]+`/g;
// A command-line option or a command the reader types is the interface they use, not code to hide.
const OPTION = /(?<![\w-])(?:--[a-z][\w-]*|-[A-Za-z])(?:=(?=[^\s`])|(?![\w./-]))/g;
const OPT_TOKEN = /^(?:--[a-z][\w-]*|-[A-Za-z])(?:=[a-z0-9]+)?$/;
const CLI_TOOLS = new Set(["git", "npm", "npx", "node", "yarn", "pnpm", "docker", "make", "curl", "brew", "pip", "cargo", "go"]);
const isTyped = (token) => {
  const words = token.slice(1, -1).trim().split(/\s+/);
  if (!words.every((w) => OPT_TOKEN.test(w) || /^[a-z][a-z0-9-]*$/.test(w))) return false;
  return words.length === 1 ? OPT_TOKEN.test(words[0]) : words.some((w) => OPT_TOKEN.test(w)) || CLI_TOOLS.has(words[0]);
};
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
  for (const m of line.matchAll(BACKTICK)) if (!isTyped(m[0])) add(m[0]);
  const text = line.replace(BACKTICK, " ").replace(URL, " ").replace(OPTION, " ");
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

// Two matched subject words in one sentence are not enough. "Printing a week of calendars is possible; the
// view is shared by link" holds "calendars" and "shared" (the two content words of "feat: shared calendars
// view") but the words are eight tokens apart. An announcement keeps its words together, so the matched words
// must fall within a window of four tokens. Two count-based rules were considered and rejected: "two matched
// words among the first four content words" and "60% of the content words matched". Both still flag this
// sentence, because the subject has only two content words and both are among its first four.
const WINDOW = 4;
/** Whether a line holds `need` distinct subject words, each at the start of a word, within WINDOW words of each other. */
function announces(line, words, need) {
  const tokens = line.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];
  for (let k = 0; k < tokens.length; k++) {
    const seen = new Set();
    for (const t of tokens.slice(k, k + WINDOW)) for (const w of words) if (t.startsWith(w)) seen.add(w);
    if (seen.size >= need) return true;
  }
  return false;
}

/**
 * Checks release notes. Returns { ok, errors, warnings, findings: [{ level, code, line, text, message }] },
 * where line is 1-based and ok means no error. options.cancelled is a list of { subject, by } for commits
 * the range cancelled; a line outside "Not in this release" that names their content words is an error.
 * options.gone is a list of names the range removed or renamed; a customers note may write them.
 * options.audience is "customers" (the default: plain language, no code names) or "developers" (people who
 * integrate the product: the code-identifier, backtick and file-name rules are relaxed, and a renamed or
 * removed name must be written in backticks).
 */
export function notes(text, { cancelled = [], audience = "customers", vocabulary = null, gone = [] } = {}) {
  if (!AUDIENCES.includes(audience)) throw new Error(`unknown audience: ${audience}`);
  const developers = audience === "developers";
  const goneSet = new Set(gone);
  const findings = [];
  const lines = text.split(/\r?\n/);
  const first = lines.findIndex((l) => l.trim() !== "");
  const report = (level, code, i, message) => findings.push({ level, code, line: i + 1, text: lines[i].trim(), message });
  if (first === -1) {
    findings.push({ level: "error", code: "empty", line: 0, text: "", message: "the notes are empty" });
  } else if (!RANGE.test(lines[first])) {
    report("warn", "no-range", first, "the first line names no range: give the tag, the commit hashes, \"since ...\" or \"the last N commits\"");
  }
  // A heading that has nothing under it before the next heading or the end of the file.
  if (first !== -1) {
    lines.forEach((raw, i) => {
      if (i === first || raw.trim() === "" || !closesSection(lines, i)) return;
      let j = isSetextTitle(lines, i) ? i + 2 : i + 1;
      while (j < lines.length && lines[j].trim() === "") j++;
      if (j >= lines.length || closesSection(lines, j)) report("warn", "empty-section", i, `the heading "${bare(raw)}" has nothing under it: write what it covers, or remove it`);
    });
    if (lines.slice(first + 1).every((l) => l.trim() === "")) report("warn", "empty-body", first, QUIET_HINT);
  }
  const inside = notInReleaseLines(lines);
  lines.forEach((raw, i) => {
    if (raw.trim() === "") return;
    const line = bare(raw);
    // A quiet-period line is the honest statement for a range with no visible change: it is not checked.
    if (QUIET.test(line)) return;
    if (COMMIT_PREFIX.test(line)) report("error", "commit-prefix", i, "a conventional commit prefix: write what the reader can do now instead");
    if (!COMMIT_PREFIX.test(line) && COMMIT_WORD.test(line)) report("error", "commit-word", i, `a word from commit titles (${line.match(COMMIT_WORD)[0]}): say what the reader can do now, or leave the line out`);
    // A hash on the first line is the range ("commit 3a9f2c1 to 8d0b7e4"); anywhere else it is rejected.
    const hash = i !== first ? COMMIT_HASH.exec(raw) : null;
    if (hash) report("error", "commit-hash", i, `a commit hash (${hash[0]}): a reader cannot use it; say what changed, or name the range on the first line only`);
    if (MERGE_BOILERPLATE.test(line)) report("error", "merge-boilerplate", i, "merge-commit boilerplate: write what the reader can do now, or leave the line out");
    if (!developers) {
      // A name the range removed or renamed is something the reader must act on, so a note may write it.
      const ids = identifiersIn(raw).filter((id) => !goneSet.has(id.replace(/^`|`$/g, "")));
      if (ids.length) report("error", "code-identifier", i, `code a reader cannot follow: ${ids.join(", ")}; say what it does for them in plain words`);
    } else if (CHANGE_WORDS.test(raw) && !NAMED.test(raw)) {
      report("warn", "change-unnamed", i, "names the change but not what to change: write the exact old and new name in backticks, and the default with its unit");
    }
    if (DOCS_LINE.test(line)) report("error", "docs-or-version", i, "a line about docs, a changelog, a README or a version bump: these change nothing for the reader, leave the line out");
    const measured = MEASURED.test(line) && !NEGATED_MEASURED.test(line);
    if (!measured && EFFECT.test(line)) report("error", "unmeasured-effect", i, "an effect nobody measured: describe the cause (\"shows 20 at a time\") or give the measurement");
    if (!measured && PERCENT.test(line) && !PRICE_TERM.test(line)) report("error", "unmeasured-percent", i, "a percentage with no measurement: give how it was measured or leave it out");
    if (i !== first && VERSION.test(line)) report("error", "version-number", i, "a version number after the first line: the version is not a change, name it only in the range line");
  });
  // Traceability: a note line that shares no content word with the range is a warning. Headings, underlines, short
  // lines and the "Not in this release" section are not checked. Skipped when no vocabulary is given.
  if (vocabulary) {
    lines.forEach((raw, i) => {
      if (i === first || raw.trim() === "" || inside.has(i)) return;
      const line = bare(raw);
      if (line.length <= TRACE_MIN_LENGTH || !/\p{L}/u.test(line) || QUIET.test(line) || closesSection(lines, i)) return;
      const words = (line.toLowerCase().match(TRACE_WORD) ?? []).filter((w) => !STOPWORDS.has(w));
      if (words.some((w) => vocabulary.has(w))) return;
      report("warn", "untraced", i, `matches no commit, path or change in the range: "${line.slice(0, 60)}"`);
    });
  }
  // Lines that announce a commit the range cancelled, outside "Not in this release". Two content words
  // must appear on the line (one, when the subject has only one).
  for (const c of cancelled) {
    const words = contentWords(c.subject);
    if (words.length === 0) continue;
    const need = Math.min(2, words.length);
    lines.forEach((raw, i) => {
      if (raw.trim() === "" || inside.has(i)) return;
      if (!announces(raw, words, need)) return;
      report("error", "cancelled-announced", i, `announces "${c.subject}", which this range cancelled (reverted by ${c.by}); move it under "Not in this release" or remove it`);
    });
  }
  const errors = findings.filter((f) => f.level === "error").length;
  return { ok: errors === 0, errors, warnings: findings.length - errors, findings };
}

/** Removes `name value` or `name=value` from argv: { value (undefined when absent), rest }. */
function takeOption(argv, name) {
  const i = argv.findIndex((a) => a === name || a.startsWith(`${name}=`));
  if (i === -1) return { value: undefined, rest: argv };
  const inline = argv[i].startsWith(`${name}=`);
  const value = inline ? argv[i].slice(name.length + 1) : argv[i + 1];
  return { value, rest: argv.filter((_, k) => k !== i && (inline || k !== i + 1)) };
}

export function runNotes(argv) {
  // --range <ref> or --range=<ref>
  const range = takeOption(argv, "--range");
  const rangeArg = range.value;
  if ((rangeArg === undefined && range.rest.length !== argv.length) || (rangeArg !== undefined && (rangeArg.startsWith("-") || !parseRange(rangeArg)))) {
    console.error(USAGE);
    return 2;
  }
  // --audience customers|developers (default customers)
  const aud = takeOption(range.rest, "--audience");
  const audience = aud.value ?? "customers";
  if (!AUDIENCES.includes(audience) || (aud.value === undefined && aud.rest.length !== range.rest.length)) {
    console.error(USAGE);
    return 2;
  }
  const rest = aud.rest;
  const files = rest.filter((a) => !a.startsWith("-"));
  const unknown = rest.filter((a) => a.startsWith("-") && a !== "--json");
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
  let cancelled = [];
  let vocabulary = null;
  let gone = [];
  const info = [];
  if (rangeArg !== undefined) {
    let ledger;
    let vocab;
    try {
      ledger = ledgerRange({ ...parseRange(rangeArg), cwd: process.cwd() });
      vocab = vocabularyOf({ ...parseRange(rangeArg), cwd: process.cwd() });
    } catch (err) {
      console.error(`notes: cannot read the range ${rangeArg}: ${err instanceof Error ? err.message.split("\n")[0] : String(err)}`);
      return 2;
    }
    gone = (ledger.gonenames ?? []).map((g) => g.name);
    cancelled = ledger.commits.filter((c) => c.net?.state === "cancelled").map((c) => ({ subject: c.subject, by: c.net.by }));
    if (vocab.words === null) info.push(`traceability skipped: the range has ${vocab.commits} commits (more than ${VOCAB_COMMIT_LIMIT})`);
    else {
      vocabulary = vocab.words;
      if (vocab.capped) info.push(`traceability read the first ${VOCAB_CAP} words of the range; a line may be reported that a later part of the range matches`);
    }
  }
  const r = notes(text, { cancelled, audience, vocabulary, gone });
  if (argv.includes("--json")) {
    console.log(JSON.stringify({ ...r, info }, null, 2));
    return r.ok ? 0 : 1;
  }
  for (const f of r.findings) {
    const where = f.line ? `line ${f.line}: ` : "";
    console.log(`${f.level === "error" ? "error" : "warn "} ${where}${f.message}`);
    if (f.text) console.log(`        ${f.text}`);
  }
  for (const note of info) console.log(`note: ${note}`);
  console.log(r.ok ? `notes: ok (${r.warnings} warning${r.warnings === 1 ? "" : "s"})` : `notes: ${r.errors} error${r.errors === 1 ? "" : "s"}, ${r.warnings} warning${r.warnings === 1 ? "" : "s"}; fix them and run it again`);
  return r.ok ? 0 : 1;
}
