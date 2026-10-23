// Read a change from git and cross-check what the message claims against what the diff shows.
//
// The rest of this tool reads the message alone, so it can tell whether the author said the
// right shapes. It cannot tell whether what they said is true. That gap is where the 2026
// complaint about agent-written pull requests lives: the description reads clean, the diff is
// large, and the reviewer has no way to tell which sentences were checked.
//
// Every check here is mechanical and reports at warning level only, so no existing run turns
// red on an upgrade. Each finding names what was counted, because rule five applies to this
// tool as much as to the messages it reads.
//
// The secret-file and mixed-change checks are adapted from Smart Commits by Stefan Petrovici,
// MIT licence, Copyright (c) 2026 Stefan Petrovici (text in THIRD_PARTY_NOTICES.md). The ideas
// were taken; the code here is written for this tool.
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";

// 256 MB: a large generated or vendored change must not overflow the default 1 MB output buffer.
const PATCH_BUFFER = 256 * 1024 * 1024;

const git = (args, cwd, maxBuffer = PATCH_BUFFER) =>
  execFileSync("git", ["-c", "core.quotepath=false", ...args], {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    maxBuffer,
  });

/** A path that holds tests, by the conventions the common runners use. */
export const isTestPath = (p) => /(^|\/)(tests?|spec|__tests__)\//i.test(p) || /(^|\/)[^/]+[._-](test|spec)\.[a-z0-9]+$/i.test(p) || /(^|\/)test_[^/]+\.py$/i.test(p);

/** A path a reader would call documentation rather than code. */
export const isDocPath = (p) => /\.(md|mdx|markdown|rst|txt|adoc)$/i.test(p) || /(^|\/)docs?\//i.test(p) || /(^|\/)(LICENSE|NOTICE|AUTHORS)$/i.test(p);

/**
 * Read a change as a list of files with line counts.
 * range: a git range such as "main...HEAD"; omit for the staged change, which is what the
 * commit-msg hook is about to record. The result says which of the two it read (isRange).
 */
// Explicit prefixes and no external diff, so a user's diff.mnemonicPrefix or diff.noprefix
// setting cannot change the paths read from the patch.
const PREFIX_FLAGS = ["--src-prefix=a/", "--dst-prefix=b/", "--no-ext-diff"];

export function readDiff({ range, cwd = process.cwd(), patchBuffer = PATCH_BUFFER } = {}) {
  const rangeArgs = range ? [range] : ["--cached"];
  const raw = git(["diff", "--numstat", "-z", ...PREFIX_FLAGS, ...rangeArgs], cwd);
  // A deleted path is listed separately, so the secret-file check can skip a removal.
  const deleted = new Set(git(["diff", "--name-only", "--diff-filter=D", "-z", ...PREFIX_FLAGS, ...rangeArgs], cwd).split("\0").filter(Boolean));
  const fields = raw.split("\0").filter((f) => f !== "");
  const files = [];
  for (let i = 0; i < fields.length; i++) {
    const m = /^(\d+|-)\t(\d+|-)\t(.*)$/.exec(fields[i]);
    if (!m) continue;
    const [, add, del, name] = m;
    // A rename writes an empty name, then the old and new paths as two more fields.
    let path = name;
    if (name === "") {
      path = fields[i + 2] ?? "";
      i += 2;
    }
    if (!path) continue;
    files.push({ path, added: add === "-" ? 0 : Number(add), removed: del === "-" ? 0 : Number(del), binary: add === "-", deleted: deleted.has(path) });
  }
  // The added lines, read with no context, for the secret-content check. Only the path and the
  // line number are kept from a hit; the matched text is never stored. If even this read fails
  // (too large, or git refuses), the check is skipped and says so; the other checks still run.
  let secretHits = [];
  let secretSkipped = false;
  try {
    secretHits = secretHitsIn(git(["diff", ...rangeArgs, "-U0", "--no-color", ...PREFIX_FLAGS], cwd, patchBuffer));
  } catch {
    secretSkipped = true;
  }
  return { files, range: range ?? "--cached", isRange: Boolean(range), secretHits, secretSkipped };
}

/** A path whose name says it holds a credential. A `.env` example or sample is a template, not a secret. */
export const isSecretPath = (p) => {
  const base = p.split("/").pop();
  if (/^\.env(\..+)?$/.test(base)) {
    // Test, development and template env files hold placeholders by convention; .env, .env.local, .env.production and the like hold real values.
    return !(/^\.env\.(test|development|example|sample|template|dist)$/.test(base) || /^\.env\..+\.(example|sample|template|dist)$/.test(base));
  }
  if (/\.(p12|pfx)$/i.test(base)) return true;
  // A private key is named as one; a *.pub.key or public*.key is the public half.
  if (/\.key$/i.test(base)) return !(/\.pub\.key$/i.test(base) || /^public/i.test(base));
  // A certificate or CA file is public; a .pem is secret only when its name says it holds a private key.
  if (/\.pem$/i.test(base)) return /(priv|key|secret|id_)/i.test(base) && !/public/i.test(base);
  if (/^(id_rsa|id_ed25519)$/.test(base)) return true;
  return /^credentials(\.(json|ya?ml|xml|ini|txt|csv|toml|env|cfg|conf))?$/i.test(base);
};

// A long value assigned to a name a reader would call a secret. A value counts when it is quoted,
// or when it is unquoted, holds a digit and ends the token (a space, comma, semicolon, closing
// bracket or the end of the line). A call such as `createSessionTokenForUser(user)` and an
// identifier such as `request_headers_value` are code, not values, so neither is reported.
const SECRET_ASSIGNMENT = /(?:api[_-]?key|apikey|secret|token|password|passwd)["']?\s*[:=]\s*(?:["'][A-Za-z0-9_\-+/=]{16,}["']|(?=[A-Za-z0-9_\-+/=]*\d)[A-Za-z0-9_\-+/=]{16,}(?=[\s,;)\]}]|$))/i;
const PRIVATE_KEY_HEADER = /-----BEGIN [A-Z0-9 ]*PRIVATE KEY-----/;

// Provider token shapes. Each is specific enough that a match is a credential in practice, not a
// word that happens to look like one. The optional third field is a further test on the match.
// A match is skipped when it is the provider's own documentation value (AKIAIOSFODNN7EXAMPLE).
const digitAndLetter = (tail) => /\d/.test(tail) && /[A-Za-z]/.test(tail);
const tailOf = (s) => s.slice(s.indexOf("-") + 1);
const TOKEN_RULES = [
  [/\b(AKIA|ASIA)[0-9A-Z]{16}\b/g, "an AWS access key id"],
  [/\bgh[pousr]_[A-Za-z0-9]{36,}\b/g, "a GitHub token"],
  [/github_pat_[A-Za-z0-9_]{50,}/g, "a GitHub token"],
  [/\bxox[baprs]-[A-Za-z0-9-]{10,}/g, "a Slack token", (m) => /\d/.test(tailOf(m))],
  [/\bAIza[0-9A-Za-z_\-]{35}\b/g, "a Google API key"],
  [/\b[sr]k_live_[0-9A-Za-z]{16,}/g, "a Stripe live key"],
  [/\bsk-(ant-)?[A-Za-z0-9_\-]{32,}/g, "an Anthropic or OpenAI style API key", (m) => digitAndLetter(tailOf(m)) && !/your|example/i.test(m)],
];

// The documentation values a provider publishes. Compared case-insensitively, but only the whole
// value matches, so a credential that merely contains the word example is still reported.
const DOCUMENTED_SAMPLES = new Set(["AKIAIOSFODNN7EXAMPLE", "ASIAIOSFODNN7EXAMPLE"]);
const isDocumentedSample = (m) => m.includes("EXAMPLE") || (/example/i.test(m) && DOCUMENTED_SAMPLES.has(m.toUpperCase()));

// Lines longer than this are not read for the URL and npm rules. Those rules are the ones whose
// backtracking grows with line length; a minified bundle past this size is not reviewed line by line.
const LONG_LINE = 20000;

// An inline password in a URL. The scheme is bounded and starts at a word boundary, and the line must
// contain "://" first, so a long run of letters cannot be scanned from every start position.
// The regex only lets through a password of six or more characters that is not a template or
// placeholder; realUrlPassword() applies the rest.
const URL_PASSWORD =
  /\b[a-z][a-z0-9+.\-]{0,31}:\/\/[^\s/:@]+:(?!(?:password|pass|secret|changeme|x{3,}|example|%s|<[^>\s]*>|\$\{[^}\s]*\}|\{\{[^}\s]*\}\})@)([^\s/@]{6,})@[^\s/]+/gi;
const realUrlPassword = (pw) => !/^[<*$%{]/.test(pw) && !/^[*x]+$/i.test(pw) && !/password|pass|secret|token|your/i.test(pw);
const urlPasswordIn = (text) => [...text.matchAll(URL_PASSWORD)].some((m) => realUrlPassword(m[1]));

// An npmrc auth token. A value that starts with an environment reference or a template marker is not a secret.
const NPM_AUTH_TOKEN = /_authToken=(?![$"'<%{])\S{10,}/;

// A merge conflict marker, at column 0 and exactly seven characters long.
const CONFLICT_START = /^<{7}(?:\s|$)/;
const CONFLICT_END = /^>{7}(?:\s|$)/;
const CONFLICT_SPLIT = /^={7}\r?$/;

/** The first secret-shaped kind a single added line matches, or undefined. */
function secretKind(text) {
  if (PRIVATE_KEY_HEADER.test(text)) return "a private key header";
  if (SECRET_ASSIGNMENT.test(text)) return "a long value assigned to a secret-like name";
  for (const [re, kind, real] of TOKEN_RULES) {
    if ([...text.matchAll(re)].some((m) => !isDocumentedSample(m[0]) && (!real || real(m[0])))) return kind;
  }
  const long = text.length > LONG_LINE;
  if (!long && text.includes("://") && urlPasswordIn(text)) return "a URL with an inline password";
  if (!long && text.includes("_authToken=") && NPM_AUTH_TOKEN.test(text)) return "an npm auth token";
  return undefined;
}

/**
 * Walk a zero-context patch and call visit(path, line, text) for each added line, with the path
 * the line belongs to (null when the file has no new side) and its number in the new file. The
 * line counter follows the hunk headers, so a content line that begins with "+++" or "diff" is
 * still an added line and not a header.
 */
function walkAdded(patch, visit) {
  let path = null;
  let inHeader = false;
  let line = 0;
  for (const raw of patch.split("\n")) {
    if (raw.startsWith("diff --git ")) {
      path = null;
      inHeader = true;
      continue;
    }
    if (inHeader && raw.startsWith("+++ ")) {
      const named = raw.slice(4).replace(/\t$/, "");
      path = named === "/dev/null" ? null : named.replace(/^b\//, "");
      continue;
    }
    const hunk = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/.exec(raw);
    if (hunk) {
      inHeader = false;
      line = Number(hunk[1]);
      continue;
    }
    if (inHeader) continue;
    if (raw.startsWith("+")) {
      visit(path, line, raw.slice(1));
      line++;
    } else if (raw.startsWith(" ")) {
      line++;
    }
  }
}

/**
 * Walk a zero-context patch and return { path, line, kind } for each added line that looks like
 * a secret.
 */
export function secretHitsIn(patch) {
  const hits = [];
  walkAdded(patch, (path, line, text) => {
    const kind = path ? secretKind(text) : undefined;
    if (kind) hits.push({ path, line, kind });
  });
  return hits;
}

/**
 * Return { path, line, kind } for each added line that is a merge conflict marker. A `=======`
 * line is a marker only when the same file also has an added `<<<<<<<` or `>>>>>>>` line: alone
 * it is the underline of a markdown or rst heading.
 */
export function conflictMarkerHitsIn(patch) {
  const added = [];
  walkAdded(patch, (path, line, text) => {
    if (path) added.push({ path, line, text });
  });
  const hasEdge = new Set(added.filter((a) => CONFLICT_START.test(a.text) || CONFLICT_END.test(a.text)).map((a) => a.path));
  return added
    .filter((a) => CONFLICT_START.test(a.text) || CONFLICT_END.test(a.text) || (CONFLICT_SPLIT.test(a.text) && hasEdge.has(a.path)))
    .map((a) => ({ path: a.path, line: a.line, kind: "a merge conflict marker" }));
}

// Lockfiles are generated from the manifest; a change that touches one is not a second unit of work.
export const isLockPath = (p) => /(^|\/)(package-lock\.json|npm-shrinkwrap\.json|pnpm-lock\.yaml|yarn\.lock|bun\.lockb?|Cargo\.lock|go\.sum|Gemfile\.lock|poetry\.lock|composer\.lock|Pipfile\.lock)$/.test(p);

// A root-level manifest or dotfile (package.json, tsconfig.json, .nvmrc) configures the project,
// and a top-level dot-directory (.github, .husky, .vscode) holds its tooling. Neither is a unit of
// work, so both are left out of the grouping and the 80 percent denominator rather than forming a group.
const isRootManifest = (p) =>
  (!p.includes("/") && (p.startsWith(".") || /\.(json|toml|ya?ml|lock|cfg|ini|xml|gradle|mod)$/i.test(p) || /^(Makefile|Dockerfile|Gemfile|Rakefile|Procfile|Justfile)$/.test(p))) ||
  (p.includes("/") && p.split("/")[0].startsWith("."));

const stemOf = (p) => p.split("/").pop().replace(/\.[^.]+$/, "");
// The source a test names: reminders.test.js names reminders; test_thing.py names thing.
const subjectOfTest = (p) => stemOf(p).replace(/[._-](test|spec)$/i, "").replace(/^test_/i, "");

// Monorepo containers: a package under packages/ is a unit of its own, so the group is its first
// two path segments (packages/a) rather than the container (packages).
const MONOREPO_CONTAINERS = new Set(["packages", "apps", "services", "libs", "modules"]);
const groupOf = (p) => {
  const seg = p.split("/");
  if (seg.length === 1) return "(root)";
  if (MONOREPO_CONTAINERS.has(seg[0]) && seg.length >= 3) return `${seg[0]}/${seg[1]}`;
  return seg[0];
};

/**
 * Sort the counted files into groups. A source file groups by its top-level directory (for a
 * monorepo container, its first two segments). A test joins the group of the source file its name
 * points at; a test that names no source joins the largest source group. A test forms a group of
 * its own only when the change has no source file at all. Docs, lockfiles and root-level manifests
 * are not counted. Returns groups with their changed lines (added plus removed) and the total.
 */
export function groupFiles(files) {
  const counted = files.filter((f) => !isDocPath(f.path) && !isLockPath(f.path) && !isRootManifest(f.path));
  const source = counted.filter((f) => !isTestPath(f.path));
  const tests = counted.filter((f) => isTestPath(f.path));
  const groups = new Map();
  const add = (key, f) => {
    if (!groups.has(key)) groups.set(key, { key, files: [], lines: 0 });
    const g = groups.get(key);
    g.files.push(f.path);
    g.lines += f.added + f.removed;
  };
  const sourceGroup = new Map();
  for (const f of source) {
    if (!sourceGroup.has(stemOf(f.path))) sourceGroup.set(stemOf(f.path), groupOf(f.path));
    add(groupOf(f.path), f);
  }
  if (source.length) {
    const largest = [...groups.values()].sort((a, b) => b.lines - a.lines)[0].key;
    for (const t of tests) add(sourceGroup.get(subjectOfTest(t.path)) ?? largest, t);
  } else {
    for (const t of tests) add(groupOf(t.path), t);
  }
  const total = [...groups.values()].reduce((n, g) => n + g.lines, 0);
  return { groups: [...groups.values()], total };
}

const WORDS = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12 };

// A claim that tests were written, rather than that tests were run. "tests pass" is rule 3's
// business and is checked elsewhere; this is about a file that should exist in the diff.
const TEST_CLAIM = /\b(add(ed|s|ing)?|wrote|writes?|writing|introduc(e|ed|es)|includ(e|ed|es)|new|cover(ed|s)? (it|this|that) with)\b[^.\n]{0,40}\b(regression |unit |integration |failing )?tests?\b|\btests?\b[^.\n]{0,20}\b(added|written|cover this)\b/i;

// Only the "only" family: a refactor may legitimately touch source while claiming no
// behaviour change, so that phrasing is deliberately not checked.
// The lookbehind keeps a hyphenated identifier from reading as a claim: the corpus type
// name `extra-docs-only` contains "docs-only" and named it in a commit message here, which
// the baseline caught as a false alarm. A token inside a longer compound is a name.
const DOCS_ONLY_CLAIM = /(?<![-\w])(documentation|docs?|readme|comment)[- ]only\b|\bonly (the )?(documentation|docs?|readme|comments?)\b|\bno (code|source) changes?\b/i;

// A title that says the change is a fix: conventional fix or fix(scope), or fix, fixes or fixed at the start.
const FIX_TITLE = /^(fix(\([^)]*\))?!?:|(fix|fixes|fixed)\b)/i;

const CHANGE_VERB = /\b(chang(e|ed|es)|touch(ed|es)?|modif(y|ied|ies)|updat(e|ed|es)|edit(ed|s)?|add(ed|s)?|remov(e|ed|es)|delet(e|ed|es)|rewrit(e|ten|es))\b/i;

const COUNT_RE = /\b(\d+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\s+files?\b/i;

// A planning artefact contains a description of tests; it does not add them. "The design now
// has a plan with the tests written out" is about a document, and reading it as a claim that
// this change adds tests was a false alarm on a real commit.
const DESCRIBED_NOT_ADDED = /\b(plan|design|spec|specification|roadmap|checklist|proposal)\b/i;

/** Paths named in the text: backticked, or bare with a directory separator and an extension. */
export function namedPaths(text) {
  const found = new Set();
  for (const m of text.matchAll(/`([^`\n]+)`/g)) {
    const t = m[1].trim();
    if (/^[\w.@-]+(\/[\w.@ -]+)+\.[a-z0-9]+$/i.test(t)) found.add(t);
  }
  for (const m of text.matchAll(/(?<![`\w/.])((?:[\w.@-]+\/)+[\w.@-]+\.[a-z0-9]+)(?![\w`])/gi)) found.add(m[1]);
  return [...found];
}

const sentencesWith = (text, re) =>
  text
    .split(/(?<=[.!?])\s+|(?<=[。！？।])\s*|\n+/)
    .filter((s) => re.test(s) && !/^\s*(Co-Authored-By|Claude-Session|Signed-off-by)/.test(s));

/**
 * Cross-check a message against a diff. Returns findings in the shape analyse() uses.
 * Nothing here reports an error: a new check must not turn an existing run red.
 */
export function crossCheck(text, diff, { cwd = process.cwd() } = {}) {
  const findings = [];
  const add = (level, message, code) => findings.push({ level, message, code });
  const files = diff.files;
  // A phrase inside backticks or quotation marks is being named, not asserted. Without this,
  // a message describing the checks ("reports \"documentation only\" over a source change")
  // is read as making the claim it describes. Found by running this on its own commit.
  const body = text.replace(/^\s*(Co-Authored-By|Claude-Session|Signed-off-by):.*$/gim, "");
  // Claims are read from a masked copy; paths are read from the body, because a path is
  // normally written in backticks and naming one is not the same as quoting a phrase.
  const claims = body
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`[^`\n]*`/g, " ")
    .replace(/"[^"\n]{0,120}"|\u201c[^\u201d\n]{0,120}\u201d/g, " ");

  if (!files.length) {
    add("info", `the change at ${diff.range} touches no files, so nothing was cross-checked`, "diff-empty");
    return findings;
  }

  const tests = files.filter((f) => isTestPath(f.path));
  const docs = files.filter((f) => isDocPath(f.path));
  const source = files.filter((f) => !isTestPath(f.path) && !isDocPath(f.path));
  add("info", `cross-checked against ${files.length} file${files.length === 1 ? "" : "s"} at ${diff.range}: ${source.length} source, ${tests.length} test, ${docs.length} documentation`, "diff-checked");

  // 1. A claim that tests were written, with no test file gaining a line.
  const testClaims = sentencesWith(claims, TEST_CLAIM).filter((s) => !DESCRIBED_NOT_ADDED.test(s));
  if (testClaims.length) {
    const written = tests.filter((f) => f.added > 0);
    if (!written.length) {
      add("warn", `the message says tests were added; no test file gains a line in this change (${files.length} file${files.length === 1 ? "" : "s"} counted, ${tests.length} of them under a test path)`, "diff-tests-missing");
    } else {
      add("ok", `tests claimed and ${written.length} test ${written.length === 1 ? "file gains" : "files gain"} lines`, "diff-tests-found");
    }
  }

  // 2. A claim that only documentation changed, with source or tests in the diff.
  if (DOCS_ONLY_CLAIM.test(claims)) {
    const other = [...source, ...tests];
    if (other.length) {
      const named = other.slice(0, 3).map((f) => f.path).join(", ");
      add("warn", `the message says the change is documentation only; ${other.length} file${other.length === 1 ? " is" : "s are"} not documentation: ${named}${other.length > 3 ? ", and more" : ""}`, "diff-docs-only-mismatch");
    } else {
      add("ok", "documentation only, and the change touches documentation only", "diff-docs-only-ok");
    }
  }

  // 3. A stated file count that the diff contradicts.
  //
  // The count has to be the object of the change verb, not merely in the same sentence as
  // one. Measured against 56 real commits, the looser reading produced three false alarms
  // out of four: "run left five files modified" describes what a previous run left behind,
  // and "Cursor users can drop one file into their project" borrowed its verb from the
  // "What changed:" heading while counting something a reader might do. Requiring the verb
  // in the short window before the count reads all three as what they are. The cost is that
  // the passive "five files were changed" is no longer checked, which is a miss rather than
  // a false alarm, and that is the direction this tool errs in.
  for (const s of sentencesWith(claims, COUNT_RE)) {
    const m = COUNT_RE.exec(s);
    const claimed = /^\d+$/.test(m[1]) ? Number(m[1]) : WORDS[m[1].toLowerCase()];
    if (claimed === undefined) continue;
    if (!CHANGE_VERB.test(s.slice(Math.max(0, m.index - 28), m.index))) continue;
    if (claimed !== files.length) add("warn", `the message says ${m[1]} file${claimed === 1 ? "" : "s"}; the change has ${files.length}: "${s.trim().slice(0, 70)}"`, "diff-file-count-mismatch");
    else add("ok", `the stated file count matches the change: ${files.length}`, "diff-file-count-ok");
  }

  // 4. A path named in the message that is neither in the change nor in the repository.
  // A path that exists but is untouched is ordinary context, so only a broken reference is
  // reported: that is the shape a renamed or invented file leaves behind.
  const inDiff = new Set(files.map((f) => f.path));
  const broken = namedPaths(body).filter((p) => !inDiff.has(p) && !existsSync(join(cwd, p)));
  if (broken.length) {
    add("warn", `the message names ${broken.length === 1 ? "a path" : "paths"} that ${broken.length === 1 ? "is" : "are"} not in this change and not in the repository: ${broken.slice(0, 3).join(", ")}`, "diff-path-missing");
  }

  // 5. A staged path that looks like a credential. Named by path only; a file that holds one is
  // removed from the commit, and a `.env.example` is a template and passes.
  for (const f of files.filter((x) => isSecretPath(x.path) && !x.deleted)) {
    add("warn", `${diff.isRange ? "changed" : "staged"} file looks like a secret: ${f.path}; remove it from the commit`, "diff-secret-file");
  }

  // 6. An added line that holds a secret-shaped value. Reported by path and line only: the value
  // is never copied into a finding, so a report or a CI log cannot leak it.
  if (diff.secretSkipped) {
    add("info", "secret-content skipped: change too large for the added-line read; the other checks still ran", "diff-secret-skipped");
  }
  for (const h of diff.secretHits ?? []) {
    add("warn", `an added line looks like a secret (${h.kind}): ${h.path}:${h.line}; the value is not printed`, "diff-secret-content");
  }

  // A fix ships with a test. A title that says fix over source changes, with no test file changed, is
  // the shape of a fix that was not tested. A docs-only fix has no source file and is not reported.
  const title = (text.split("\n")[0] ?? "").trim();
  // A lock file, a workflow or a config file is not code: a bump of one of them is not a fix to code.
  const code = source.filter((f) => !isLockPath(f.path) && !isRootManifest(f.path));
  if (FIX_TITLE.test(title) && !tests.length && code.length) {
    const n = code.length;
    const named = code.slice(0, 3).map((f) => f.path).join(", ");
    add("warn", `the title says this is a fix, and no test file changes; ${n} source file${n === 1 ? " does" : "s do"}: ${named}${n > 3 ? ", and more" : ""}`, "fix-without-test");
  }

  // 7. Changes that mix unrelated work. The largest group must hold at least 80 percent of the
  // changed lines for the change to count as one unit; below that, and with two or more groups,
  // the message is advice to split, not an error. A range is a pull request, which is one unit
  // that reviewers read together, so the advice to split commits does not apply to it.
  const { groups, total } = groupFiles(files);
  if (!diff.isRange && groups.length >= 2 && total > 0) {
    const largest = Math.max(...groups.map((g) => g.lines));
    if (largest / total < 0.8) {
      const named = groups.map((g) => `${g.key}: ${g.files.slice(0, 3).join(", ")}${g.files.length > 3 ? ", and more" : ""}`).join("; ");
      add("warn", `this change mixes ${groups.length} unrelated groups (${named}); consider separate commits`, "diff-mixed-change");
    }
  }

  return findings;
}
