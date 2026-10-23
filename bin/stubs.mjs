// product-engineer stubs: flags stub markers, empty or placeholder bodies, and decorative or
// skipped tests in the lines a change adds. Only added lines are read, so a TODO that was
// already in the base is not reported again.
//
// Copyright (c) 2026 Atos Daniel de Assis Lins. Licensed under the MIT licence; the text is in
// THIRD_PARTY_NOTICES.md. Adapted from dod-guard by the same author, commit
// be038f7201198a8a25790236048f6ed40b9983c1. The pattern families (stub markers, not-implemented
// markers, empty bodies, tautological assertions, skipped tests) follow its detect-todos.sh,
// detect-stubs.sh, detect-empty-functions.py and detect-test-tautology.py. The rules here are
// written in JavaScript for this tool. See THIRD_PARTY_NOTICES.md for the licence text.
//
// Zero dependencies. Every rule is a pattern on one line, or on a line and the one after it, or
// on the body of a test whose opening line was added. A pattern can miss code it does not
// recognise and can flag a comment or string that looks like code; the exit code is for a
// person to read, not a verdict.
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { isDocPath, isTestPath } from "./diff.mjs";

const git = (args, cwd) =>
  execFileSync("git", ["-c", "core.quotepath=false", ...args], {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    maxBuffer: 512 * 1024 * 1024,
  });

/**
 * The added lines of a unified diff written with zero context, as [{ file, line, text }].
 * `line` is the number in the new file. Lines that were removed do not advance it.
 */
export function parseAdded(patch) {
  const added = [];
  let file = null;
  let next = 0;
  let inHunk = false;
  for (const raw of patch.split("\n")) {
    if (raw.startsWith("diff --git ")) {
      file = null;
      inHunk = false;
      continue;
    }
    const hunk = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/.exec(raw);
    if (hunk) {
      inHunk = true;
      next = Number(hunk[1]);
      continue;
    }
    if (!inHunk) {
      // Headers only: a content line that begins "+++ " belongs to a hunk and is never a header.
      if (raw.startsWith("+++ ")) {
        const p = raw.slice(4).replace(/\t$/, "");
        file = p === "/dev/null" ? null : p.replace(/^b\//, "");
      }
      continue;
    }
    if (raw.startsWith("+")) {
      if (file) added.push({ file, line: next, text: raw.slice(1) });
      next++;
    }
  }
  return added;
}

const language = (file) => {
  if (/\.py$/i.test(file)) return "py";
  if (/\.[mc]?[jt]sx?$/i.test(file)) return "js";
  if (/\.go$/i.test(file)) return "go";
  if (/\.rs$/i.test(file)) return "rs";
  return null;
};

// Stub markers are only found inside a comment: a TODO in a string or a prose line is not one.
const COMMENT_MARKER = /(?:\/\/|#|\/\*|<!--|^\s*\*|^\s*--).*\b(?:TODO|FIXME|XXX)(?=[:\s(]|$)/;
const NOT_IMPLEMENTED = [
  /throw new Error\(\s*["'`]not implemented/i,
  /\braise NotImplementedError\b/,
  /(?:\/\/|#|\/\*)[^\n]*\bnot implemented\b/i,
];
const PLACEHOLDER_RETURN = /\breturn\s+(?:null|undefined|0|""|''|\[\]|\{\}|None)\s*;?\s*(?:\/\/|#)\s*(?:stub|placeholder|temporary|tbd)\b/i;
const EMPTY_JS_ONE_LINE = [
  /\bfunction\b[^{}]*\{\s*\}/,
  /\b(?:const|let|var)\s+[\w$]+\s*=\s*(?:async\s+)?\([^()]*\)\s*=>\s*\{\s*\}/,
];
const PY_DEF_ONE_LINE = /^\s*(?:async\s+)?def\s+\w+\s*\([^)]*\)\s*(?:->[^:]+)?:\s*(?:pass|\.\.\.)\s*(?:#.*)?$/;
const PY_DEF_OPEN = /^\s*(?:async\s+)?def\s+\w+\s*\(.*\)\s*(?:->[^:]+)?:\s*(?:#.*)?$/;
const JS_OPEN_EMPTY = /(?:\bfunction\b[^{]*|=>\s*)\{\s*(?:\/\/.*)?$/;
const ASSERT_LITERAL_JS = /\bassert(?:\.ok)?\(\s*(?:true|1)\s*[,)]/;
const ASSERT_LITERAL_PY = /^\s*assert\s+(?:True|1|"[^"]*"|'[^']*')\s*(?:#.*)?$/;
const SAME_EXPECT = /\bexpect\(\s*([^()]+?)\s*\)\.(?:toBe|toEqual|toStrictEqual)\(\s*\1\s*\)/;
const SAME_NODE_ASSERT = /\bassert\.(?:strictEqual|equal|deepStrictEqual|deepEqual)\(\s*([^,()]+?)\s*,\s*\1\s*\)/;
const SAME_PY_ASSERT = /\bassert\w*\(\s*([^,()]+?)\s*,\s*\1\s*\)/;
const SKIPPED = /(?:\b(?:test|it|describe|t|suite)\.skip\s*\(|\bx(?:it|describe|test)\s*\(|@pytest\.mark\.skip\b|@unittest\.skip\b|\bpytest\.skip\s*\()/;
const JS_TEST_OPEN = /^\s*(?:test|it)\s*\(/;
const PY_TEST_OPEN = /^\s*(?:async\s+)?def\s+test\w*\s*\(/;
const JS_ASSERTION = /\bexpect\b|\bassert\w*[.(]|\.should\b|\bt\.(?:is|true|false|deepEqual|not\w*|throws|like)\(|\b(?:check|verify|expect|assert)\w*\s*\(/;
const PY_ASSERTION = /\bassert\w*|\braises\(|\bexpect\b/;

// Markers of other test frameworks and languages. Each is read on a copy of the line whose
// strings and comments are blanked, so a marker named in a string or a comment is not a finding.
const FOCUSED = /\b(?:test|it|describe|suite|context)(?:\.\w+)*\.only\s*\(|\b(?:fit|fdescribe)\s*\(/;
const XFAIL = /@pytest\.mark\.xfail\b|\bpytest\.xfail\s*\(|@unittest\.expectedFailure\b|\b(?:test|it)\.fails?\s*\(/;
const GO_SKIP = /\bt\.Skip(?:f|Now)?\s*\(/;
const RUST_IGNORE = /#\[ignore(?:\s*=[^\]]*)?\]/;
const JUNIT_DISABLED = /@Disabled\b/;
const RUST_TODO = /\b(?:todo|unimplemented)!\s*[(\[{]/;
const ZERO_ASSERTIONS = /\bexpect\.assertions\(\s*0\s*\)/;

/** `text` with the inside of strings and comments replaced by spaces; same length, so indexes match. */
function maskLine(text, lang) {
  const quotes = lang === "rs" ? '"' : lang === "py" ? "'\"" : "'\"`";
  const slashes = lang !== "py";
  const out = text.split("");
  let i = 0;
  while (i < text.length) {
    const c = text[i];
    if (quotes.includes(c)) {
      let j = i + 1;
      while (j < text.length && text[j] !== c) j += text[j] === "\\" ? 2 : 1;
      for (let k = i + 1; k < Math.min(j, text.length); k++) out[k] = " ";
      i = j + 1;
      continue;
    }
    if ((slashes && c === "/" && text[i + 1] === "/") || (!slashes && c === "#")) {
      for (let k = i; k < text.length; k++) out[k] = " ";
      break;
    }
    i++;
  }
  return out.join("");
}

const indentOf = (s) => s.match(/^\s*/)[0].length;

/**
 * A copy of `src` with the contents of comments, strings, template literals and regular
 * expression literals replaced by spaces, so brackets inside them are not counted. Quotes and
 * newlines are kept, so positions still match. A heuristic: a slash starts a regular expression
 * when the previous significant character cannot end an operand; `${...}` inside a template is
 * blanked with the rest of the template.
 */
function maskCode(src) {
  const out = src.split("");
  const blank = (from, to) => {
    for (let k = from; k < to; k++) if (out[k] !== "\n") out[k] = " ";
  };
  let prev = "";
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    const n = src[i + 1];
    if (c === "/" && n === "/") {
      const e = src.indexOf("\n", i);
      const end = e < 0 ? src.length : e;
      blank(i, end);
      i = end;
      continue;
    }
    if (c === "/" && n === "*") {
      const e = src.indexOf("*/", i + 2);
      const end = e < 0 ? src.length : e + 2;
      blank(i, end);
      i = end;
      continue;
    }
    if (c === '"' || c === "'" || c === "`") {
      let j = i + 1;
      while (j < src.length && src[j] !== c) {
        if (src[j] === "\\") j++;
        else if (c !== "`" && src[j] === "\n") break;
        j++;
      }
      blank(i + 1, Math.min(j, src.length));
      i = j + 1;
      prev = c;
      continue;
    }
    const before = src.slice(Math.max(0, i - 8), i).trimEnd();
    if (c === "/" && (prev === "" || "(,=:[!&|?{};+-*%<>~^".includes(prev) || /\b(?:return|typeof)$/.test(before))) {
      let j = i + 1;
      let inClass = false;
      while (j < src.length && src[j] !== "\n") {
        if (src[j] === "\\") {
          j += 2;
          continue;
        }
        if (src[j] === "[") inClass = true;
        else if (src[j] === "]") inClass = false;
        else if (src[j] === "/" && !inClass) break;
        j++;
      }
      blank(i + 1, Math.min(j, src.length));
      i = j + 1;
      prev = "/";
      continue;
    }
    if (!/\s/.test(c)) prev = c;
    i++;
  }
  return out.join("");
}

/** Index of the bracket that closes the one at `open` (a "(" or "{"), or -1. */
function matchClose(m, open) {
  const o = m[open];
  const c = o === "(" ? ")" : "}";
  let depth = 0;
  for (let i = open; i < m.length; i++) {
    if (m[i] === o) depth++;
    else if (m[i] === c && --depth === 0) return i;
  }
  return -1;
}

/**
 * Body of a JS test that opens on lines[start]. The body is the block after the first arrow
 * (or `function`) that sits directly in the test call's argument list, so a fixture parameter
 * such as `async ({ page }) =>` or an options object before the callback is not taken for it.
 * An arrow with an expression body gives that expression. Returns null when no body can be
 * found on the lines given (for example `test("x", namedFn)`); the caller then reports nothing.
 */
function jsBody(lines, start) {
  const text = lines.slice(start).join("\n");
  const m = maskCode(text);
  const open = m.indexOf("(");
  if (open < 0) return null;
  const close = matchClose(m, open);
  const end = close < 0 ? m.length : close;
  let depth = 0;
  let arrowAt = -1;
  let fnAt = -1;
  for (let i = open; i < end; i++) {
    const ch = m[i];
    if (ch === "(" || ch === "[" || ch === "{") depth++;
    else if (ch === ")" || ch === "]" || ch === "}") depth--;
    else if (depth === 1 && ch === "=" && m[i + 1] === ">") {
      arrowAt = i;
      break;
    } else if (depth === 1 && m.startsWith("function", i) && !/\w/.test(m[i - 1] ?? "") && !/\w/.test(m[i + 8] ?? "")) {
      fnAt = i;
      break;
    }
  }
  let bodyOpen;
  if (arrowAt >= 0) {
    let j = arrowAt + 2;
    while (j < end && /\s/.test(m[j])) j++;
    if (m[j] !== "{") return text.slice(arrowAt + 2, end).trim() || null;
    bodyOpen = j;
  } else if (fnAt >= 0) {
    const p = m.indexOf("(", fnAt);
    if (p < 0 || p > end) return null;
    const pc = matchClose(m, p);
    if (pc < 0) return null;
    bodyOpen = m.indexOf("{", pc);
    if (bodyOpen < 0 || bodyOpen > end) return null;
  } else {
    return null;
  }
  const bc = matchClose(m, bodyOpen);
  return text.slice(bodyOpen, bc < 0 ? text.length : bc + 1);
}

/** Body of a Python test: the lines indented under its def. */
function pyBody(lines, start) {
  const base = indentOf(lines[start]);
  const out = [];
  for (let i = start + 1; i < lines.length; i++) {
    if (lines[i].trim() === "") continue;
    if (indentOf(lines[i]) <= base) break;
    out.push(lines[i]);
  }
  return out.join("\n");
}

/**
 * Findings for the added lines of one change. `read(file)` returns the file's full lines as they
 * will be after the change (or null), so a test body can be read past the lines that were added.
 */
export function scanAdded(added, { read = () => null } = {}) {
  const byFile = new Map();
  for (const entry of added) {
    if (isDocPath(entry.file)) continue;
    if (!byFile.has(entry.file)) byFile.set(entry.file, []);
    byFile.get(entry.file).push(entry);
  }
  const findings = [];
  for (const [file, entries] of byFile) {
    entries.sort((a, b) => a.line - b.line);
    const textAt = new Map(entries.map((e) => [e.line, e.text]));
    const lang = language(file);
    const test = isTestPath(file);
    let content;
    const contentLines = () => {
      if (content === undefined) content = read(file);
      return content;
    };
    const add = (entry, code, reason) => findings.push({ file, line: entry.line, code, reason });

    for (const entry of entries) {
      const { text } = entry;
      if (COMMENT_MARKER.test(text)) {
        add(entry, "stub-marker", "TODO, FIXME or XXX comment in added code; finish it or move it to an issue before saying done");
        continue;
      }
      if (NOT_IMPLEMENTED.some((re) => re.test(text))) {
        add(entry, "not-implemented", "placeholder that throws or raises 'not implemented' in added code");
        continue;
      }
      if (PLACEHOLDER_RETURN.test(text)) {
        add(entry, "placeholder-return", "returns a placeholder value and calls it a stub");
        continue;
      }
      if (lang === "js" && EMPTY_JS_ONE_LINE.some((re) => re.test(text))) {
        add(entry, "empty-body", "function body is empty; calling it does nothing");
        continue;
      }
      if (lang === "py" && PY_DEF_ONE_LINE.test(text)) {
        add(entry, "empty-body", "function body is empty; calling it does nothing");
        continue;
      }
      // A body split over two added lines: the opening line, then the closing brace or pass.
      const after = textAt.get(entry.line + 1);
      if (lang === "js" && JS_OPEN_EMPTY.test(text) && after !== undefined && after.trim() === "}") {
        add(entry, "empty-body", "function body is empty; calling it does nothing");
        continue;
      }
      if (lang === "py" && PY_DEF_OPEN.test(text) && after !== undefined && ["pass", "..."].includes(after.trim()) && indentOf(after) > indentOf(text)) {
        add(entry, "empty-body", "function body is empty; calling it does nothing");
        continue;
      }
      if (lang) {
        const code = maskLine(text, lang);
        const panic = lang === "go" ? /\bpanic\(\s*"/.exec(code) : null;
        if ((panic && /^panic\(\s*"not implemented/i.test(text.slice(panic.index))) || (lang === "rs" && RUST_TODO.test(code))) {
          add(entry, "not-implemented", "placeholder that panics as 'not implemented' or todo in added code");
          continue;
        }
        if ((lang === "go" && GO_SKIP.test(code)) || (lang === "rs" && RUST_IGNORE.test(code))) {
          add(entry, "skipped-test", "newly skipped test; it no longer runs");
          continue;
        }
        if (test && FOCUSED.test(code)) {
          add(entry, "focused-test", "focused test (only); the rest of the suite stops running");
          continue;
        }
        if (test && XFAIL.test(code)) {
          add(entry, "skipped-test", "test marked as an expected failure; a failure no longer fails the run");
          continue;
        }
        if (test && ZERO_ASSERTIONS.test(code)) {
          add(entry, "decorative-assert", "expects zero assertions, so the test passes whatever the code does");
          continue;
        }
      }
      if (test && JUNIT_DISABLED.test(maskLine(text, "js"))) {
        add(entry, "skipped-test", "newly disabled test; it no longer runs");
        continue;
      }
      if (!test) continue;

      if (ASSERT_LITERAL_JS.test(text) || (lang === "py" && ASSERT_LITERAL_PY.test(text))) {
        add(entry, "decorative-assert", "asserts a literal truthy value, so it passes whatever the code does");
        continue;
      }
      if (SAME_EXPECT.test(text) || SAME_NODE_ASSERT.test(text) || (lang === "py" && SAME_PY_ASSERT.test(text))) {
        add(entry, "same-expression", "compares an expression with itself, so it passes whatever the code does");
        continue;
      }
      if (SKIPPED.test(text)) {
        add(entry, "skipped-test", "newly skipped test; it no longer runs");
        continue;
      }
      if (lang === "js" && JS_TEST_OPEN.test(text)) {
        const lines = contentLines();
        const body = lines ? jsBody(lines, entry.line - 1) : null;
        if (body !== null && !JS_ASSERTION.test(body)) {
          add(entry, "no-assertion", "test body has no assertion, so it passes whatever the code does");
        }
      } else if (lang === "py" && PY_TEST_OPEN.test(text)) {
        const lines = contentLines();
        if (lines && !PY_ASSERTION.test(pyBody(lines, entry.line - 1))) {
          add(entry, "no-assertion", "test body has no assertion, so it passes whatever the code does");
        }
      }
    }
  }
  return { findings, files: byFile.size, lines: [...byFile.values()].reduce((n, es) => n + es.length, 0) };
}

/** The new-side text of a file, from the index (rev ""), a commit (a range's right side), or the disk. */
function fileReader(rev, cwd) {
  return (file) => {
    try {
      if (rev === null) return readFileSync(join(cwd, file), "utf8").split("\n");
      return git(["show", `${rev}:${file}`], cwd).split("\n");
    } catch {
      return null;
    }
  };
}

/** git's empty tree, the base of a repository that has no commit yet. */
const EMPTY_TREE = "4b825dc642cb6eb9a060e54bf8d69288fbee4904";

/**
 * The added lines of files git does not track and does not ignore, as parseAdded would return
 * them: every line of the file is an added line. A binary file (one with a NUL byte) is skipped.
 */
function untrackedAdded(cwd) {
  const added = [];
  const names = git(["ls-files", "--others", "--exclude-standard", "-z"], cwd).split("\0").filter(Boolean);
  for (const file of names) {
    let text;
    try {
      text = readFileSync(join(cwd, file), "utf8");
    } catch {
      continue;
    }
    if (text.includes("\0")) continue;
    text.split("\n").forEach((line, i) => added.push({ file, line: i + 1, text: line }));
  }
  return added;
}

/**
 * Scan a change. Three scopes:
 *   range "A..B": what B adds over A (a committed change);
 *   staged true: the index against HEAD only;
 *   otherwise: the working tree against HEAD (staged and unstaged edits) plus new files that git
 *   does not ignore, so an agent that has not staged anything still gets a real answer.
 * Returns { label, findings, files, lines }.
 */
export function scanChange({ range, staged = false, cwd = process.cwd() } = {}) {
  // The prefixes are fixed here: a diff.mnemonicPrefix setting writes i/ and c/, and the header
  // parser below expects b/.
  const prefixes = ["--src-prefix=a/", "--dst-prefix=b/"];
  const flags = ["--unified=0", "--no-color", "--no-ext-diff", ...prefixes];
  if (range) {
    const added = parseAdded(git(["diff", ...flags, range], cwd));
    // A range is read at its right side.
    const rev = range.split(/\.{2,3}/)[1] || "HEAD";
    const result = scanAdded(added, { read: fileReader(rev, cwd) });
    return { label: `range ${range}`, ...result };
  }
  if (staged) {
    const added = parseAdded(git(["diff", "--cached", ...flags], cwd));
    const result = scanAdded(added, { read: fileReader("", cwd) });
    return { label: "the staged change", ...result };
  }
  const hasHead = (() => {
    try {
      git(["rev-parse", "--verify", "--quiet", "HEAD"], cwd);
      return true;
    } catch {
      return false;
    }
  })();
  const added = [...parseAdded(git(["diff", ...flags, hasHead ? "HEAD" : EMPTY_TREE], cwd)), ...untrackedAdded(cwd)];
  const result = scanAdded(added, { read: fileReader(null, cwd) });
  return { label: "the working tree (staged and unstaged changes, and new files)", ...result };
}

const USAGE = "usage: product-engineer stubs [--staged | --range <a..b>] [--json] [--warn] [-q]";

/** The `stubs` subcommand. Returns the exit code: 0 clean (or --warn), 1 findings, 2 usage. */
export function runStubs(argv, { cwd = process.cwd() } = {}) {
  let range;
  let staged = false;
  let json = false;
  let warn = false;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--staged") staged = true;
    else if (a === "--range") {
      range = argv[++i];
      if (!range) return usageError("--range needs a range such as HEAD~1..HEAD");
    } else if (a === "--json") json = true;
    else if (a === "--warn") warn = true;
    // Accepted so the flag works across subcommands. It hides the star hint, as on check, and
    // changes nothing in the findings or the exit code.
    else if (a === "-q" || a === "--quiet") continue;
    else return usageError(`unknown option ${a}`);
  }
  if (staged && range !== undefined) return usageError("--staged and --range cannot be combined");
  if (range !== undefined && !/\.\./.test(range)) return usageError("--range needs a two-dot range such as HEAD~1..HEAD");

  let result;
  try {
    result = scanChange({ range, staged, cwd });
  } catch (err) {
    console.error(`stubs: could not read the change: ${err instanceof Error ? err.message.split("\n")[0] : String(err)}`);
    return 2;
  }
  const { findings } = result;
  if (json) {
    console.log(JSON.stringify({ count: findings.length, findings }, null, 2));
  } else {
    const scanned = `${result.files} file${result.files === 1 ? "" : "s"}, ${result.lines} added line${result.lines === 1 ? "" : "s"} scanned`;
    if (!findings.length) {
      console.log(`stubs: clean, no findings in ${result.label} (${scanned})`);
    } else {
      console.log(`stubs: ${findings.length} finding${findings.length === 1 ? "" : "s"} in ${result.label} (${scanned})`);
      for (const f of findings) console.log(`  ${f.file}:${f.line}  ${f.code}  ${f.reason}`);
    }
  }
  return findings.length > 0 && !warn ? 1 : 0;
}

function usageError(message) {
  console.error(`stubs: ${message}`);
  console.error(USAGE);
  return 2;
}
