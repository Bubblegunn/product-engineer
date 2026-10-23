// product-engineer twins: lines elsewhere in the repository that have the same shape as a line the
// change removed. A defect fixed in one place often repeats as a near-copy in another place with
// different names. The shape blanks string contents, numbers and identifiers, so the copy is found
// even when its names differ. Read from git and the files it lists alone; no model, no network.
// Every candidate is a line to read, not a verdict.
import { execFileSync } from "node:child_process";
import { readFileSync, statSync } from "node:fs";
import { extname, join } from "node:path";
import { isTestPath, isDocPath, isLockPath } from "./diff.mjs";

const USAGE = `usage: product-engineer twins [range] [--json]
Lists lines in the code files that have the same shape as a line the change removed: the same code
with other names, numbers or strings. Removed lines in tests, docs, lockfiles, comments, imports and
punctuation-only lines are not searched for. With no range it reads the staged change, else the
working tree against HEAD, else the last commit. The new side is searched as git sees it: the index
for the staged change, the commit at the end of a range (never the working tree), and the working
tree plus untracked files otherwise. Each candidate is a line to read, not a verdict.`;

const MAX_REMOVED = 10;
const MAX_TWINS = 5;
const MAX_FILE = 1024 * 1024;
const MAX_LINE = 2000;
const PATCH_BUFFER = 256 * 1024 * 1024;
const NOTHING = "nothing to compare (no staged change, no working-tree change and no parent commit)";
const CODE_EXT = new Set("js mjs cjs jsx ts tsx py rb go rs java kt swift c h cc cpp hpp cs php sh lua".split(" "));
const SKIP_SEARCH = (p) => isLockPath(p) || /\.min\./.test(p) || /(^|\/)(node_modules|vendor|vendors|third_party|dist|build|deps|out|target|coverage)\//.test(p);
const HASH_EXT = new Set(["py", "rb", "sh", "yml"]);
const DASH_EXT = new Set(["sql", "lua"]);

const KEYWORDS = new Set("if else for while return const let var def function new typeof await async null true false None True False and or not in is lambda class".split(" "));
const OPERATOR = /\+|-|\*|\/|%|&&|\|\||\?\?|===|!==|==|!=|<=|>=|<|>/;
const OPERATOR_G = new RegExp(OPERATOR.source, "g");
const COMMENT = /^(\/\/|#|\/\*|\*|<!--|-- )/;
const IMPORT = /^(import|export|package|from\s+\S+\s+import)\b|^(const|let|var)\b.*\brequire\s*\(/;
const PUNCTUATION_ONLY = /^[\p{P}\p{S}\s]+$/u;
const LOOP_HEADER = /^(for|foreach|while)\b/;
const CONTROL = /^(if|else|elif|elsif|unless|while|switch|case|until)\b/;
const TOKEN = /[\p{L}\p{N}_$]+|\S/gu;
const WORD = /[\p{L}\p{N}_$]/u;
const OPERAND_END = /[\p{L}\p{N}_$)\]"]/u;
const REGEX_AFTER = "(,=:[!&|?{};+-*%<>~^";
const REGEX_KEYWORDS = new Set(["return", "typeof", "case", "in", "of", "await", "yield", "throw", "else", "do"]);
const IDENTIFIER = /([\p{L}_$][\p{L}\p{N}_$]*)((?:\.[\p{L}_$][\p{L}\p{N}_$]*)*)/gu;
const NUMBER = /(?<![\p{L}\p{N}_$])(-?)\d[\d_]*(?:\.\d+)?(?:[eE][+-]?\d+)?/gu;
const CALL_NAME = /([\p{L}_$][\p{L}\p{N}_$.]*)\(/gu;

const extOf = (path) => extname(path).slice(1).toLowerCase();

/** A git failure carries git's own first stderr line as its message. */
function gitFailure(err) {
  const first = String(err.stderr ?? "").split("\n").find((l) => l.trim()) ?? String(err.message).split("\n")[0];
  const out = new Error(first.trim());
  out.git = true;
  return out;
}

const gitBuffer = (args, cwd, input = "") => {
  try {
    return execFileSync("git", ["-c", "core.quotepath=false", ...args], { cwd, input, stdio: ["pipe", "pipe", "pipe"], maxBuffer: PATCH_BUFFER });
  } catch (err) { throw gitFailure(err); }
};
const git = (args, cwd) => gitBuffer(args, cwd).toString("utf8");

/**
 * Removes a trailing comment and blanks string contents in one linear pass. An unterminated string
 * ends the line as an empty string. A regex literal, a template with an interpolation or a block
 * comment ends the line as a single `$`, which is the conservative reading.
 */
function stripLine(text, style) {
  const out = [];
  const n = text.length;
  let i = 0;
  let last = "";
  let word = "";
  while (i < n) {
    const c = text[i];
    if (c === '"' || c === "'") {
      let j = i + 1;
      while (j < n && text[j] !== c) j += text[j] === "\\" ? 2 : 1;
      out.push('""');
      last = '"';
      word = "";
      i = j + 1;
      continue;
    }
    if (c === "`") {
      let j = i + 1;
      while (j < n && text[j] !== "`") {
        if (text[j] === "\\") { j += 2; continue; }
        if (text[j] === "$" && text[j + 1] === "{") { out.push("$"); return out.join(""); }
        j++;
      }
      out.push('""');
      last = '"';
      word = "";
      i = j + 1;
      continue;
    }
    if (style === "hash" && c === "#") break;
    if (style === "dash" && c === "-" && text[i + 1] === "-") break;
    if (style === "slash" && c === "/") {
      if (text[i + 1] === "/" || text[i + 1] === "*") break;
      if (last === "" || REGEX_AFTER.includes(last) || REGEX_KEYWORDS.has(word)) { out.push("$"); return out.join(""); }
    }
    out.push(c);
    if (c !== " " && c !== "\t") {
      last = c;
      word = WORD.test(c) ? (word + c).slice(-12) : "";
    }
    i++;
  }
  return out.join("");
}

const nextNonSpace = (text, at) => {
  let k = at;
  while (k < text.length && /\s/.test(text[k])) k++;
  return text[k];
};

/** The shape of a line: strings, numbers and identifiers blanked, call names and keywords kept, whitespace removed around punctuation. */
export function shapeOf(text, ext = "") {
  const style = HASH_EXT.has(ext) ? "hash" : DASH_EXT.has(ext) ? "dash" : "slash";
  let s = stripLine(text, style);
  s = s.replace(IDENTIFIER, (m, head, tail, offset, whole) => {
    const call = nextNonSpace(whole, offset + m.length) === "(";
    if (tail === "") return call || KEYWORDS.has(head) ? head : "$";
    return call ? `$.${tail.split(".").pop()}` : "$";
  });
  s = s.replace(NUMBER, (m, sign, offset, whole) => {
    if (!sign) return "$";
    let k = offset - 1;
    while (k >= 0 && /\s/.test(whole[k])) k--;
    return k >= 0 && OPERAND_END.test(whole[k]) ? "-$" : "$";
  });
  s = s.replace(/\s+/g, " ").trim();
  s = s.replace(/ ?([^\p{L}\p{N}_$ ]) ?/gu, "$1");
  return s.replace(/[;,]$/, "").trim();
}

const callNames = (shape) => [...shape.matchAll(CALL_NAME)].map((m) => m[1]).filter((n) => !KEYWORDS.has(n));

/** A shape is worth searching for when it has at least four tokens, calls a function or applies an operator, and is not a loop header or a bare control-flow line. */
export function significant(shape) {
  if ([...shape.matchAll(TOKEN)].length < 4) return false;
  if (LOOP_HEADER.test(shape)) return false;
  const calls = callNames(shape);
  if (calls.length === 0 && CONTROL.test(shape)) return false;
  return calls.length > 0 || OPERATOR.test(shape);
}

/** Substrings a searched line must contain before it is shaped: every call name and operator of the removed shapes. */
function needlesFor(shapes) {
  const set = new Set();
  for (const shape of shapes) {
    for (const name of callNames(shape)) {
      const last = name.split(".").pop();
      if (last) set.add(last);
    }
    for (const m of shape.matchAll(OPERATOR_G)) set.add(m[0]);
  }
  return [...set];
}

/** A removed line that is not code worth searching for: a test, a doc, a lockfile, a comment, an import, short, or punctuation only. */
function ignoredRemoval(path, text) {
  const t = text.trim();
  return isTestPath(path) || isDocPath(path) || isLockPath(path) || t.length < 12 || COMMENT.test(t) || IMPORT.test(t) || PUNCTUATION_ONLY.test(t);
}

const sidePath = (raw, prefix) => {
  const p = raw.replace(/\t$/, "").replace(/^"|"$/g, "");
  if (p === "/dev/null") return null;
  return p.startsWith(prefix) ? p.slice(prefix.length) : p;
};

/** Removed lines (with their old line numbers) and added line numbers per path, from a zero-context patch. */
export function parsePatch(patch) {
  const removed = [];
  const added = new Map();
  let oldPath = null;
  let newPath = null;
  let header = false;
  let oldN = 0;
  let newN = 0;
  for (const line of patch.split("\n")) {
    if (line.startsWith("diff --git ")) { header = true; oldPath = null; newPath = null; continue; }
    if (header) {
      if (line.startsWith("--- ")) { oldPath = sidePath(line.slice(4), "a/"); continue; }
      if (line.startsWith("+++ ")) { newPath = sidePath(line.slice(4), "b/"); continue; }
      const hunk = /^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/.exec(line);
      if (hunk) { header = false; oldN = Number(hunk[1]); newN = Number(hunk[2]); }
      continue;
    }
    // Inside a hunk a line that starts with "--" is removed content, not a file header.
    if (line.startsWith("-")) { if (oldPath) removed.push({ path: oldPath, line: oldN, text: line.slice(1) }); oldN++; }
    else if (line.startsWith("+")) {
      if (newPath) { if (!added.has(newPath)) added.set(newPath, new Set()); added.get(newPath).add(newN); }
      newN++;
    } else if (line.startsWith(" ")) { oldN++; newN++; }
  }
  return { removed, added };
}

/** The change a report reads, and where the new side of it lives: the range, else staged, else the working tree, else the last commit. */
function chooseChange(range, cwd) {
  if (range) {
    const sep = /\.\.\.?/.exec(range);
    const source = sep ? { kind: "rev", rev: range.slice(sep.index + sep[0].length) || "HEAD" } : { kind: "tree" };
    return { rangeArgs: [range], label: range, source };
  }
  if (git(["diff", "--cached", "--name-only"], cwd).trim()) return { rangeArgs: ["--cached"], label: "the staged change", source: { kind: "index" } };
  if (git(["diff", "HEAD", "--name-only"], cwd).trim()) return { rangeArgs: ["HEAD"], label: "the working tree against HEAD", source: { kind: "tree" } };
  try { git(["rev-parse", "--verify", "-q", "HEAD~1"], cwd); } catch {
    return { rangeArgs: null, label: NOTHING, source: null };
  }
  return { rangeArgs: ["HEAD~1..HEAD"], label: "the last commit", source: { kind: "rev", rev: "HEAD" } };
}

const codePath = (p) => CODE_EXT.has(extOf(p)) && !SKIP_SEARCH(p);

/** A working-tree file, or null when it is missing, oversized or binary. */
function readWorking(top, path) {
  try {
    const full = join(top, path);
    if (statSync(full).size > MAX_FILE) return null;
    const buf = readFileSync(full);
    return buf.includes(0) ? null : buf;
  } catch { return null; }
}

/** The searched files as the chosen source sees them: the index, a commit, or the working tree with untracked files. */
function searchedFiles(top, source) {
  if (source.kind === "tree") {
    const listed = [
      ...git(["ls-files", "-z"], top).split("\0"),
      ...git(["ls-files", "--others", "--exclude-standard", "-z"], top).split("\0"),
    ];
    return listed.filter((p) => p && codePath(p)).map((path) => ({ path, buf: readWorking(top, path) })).filter((f) => f.buf);
  }
  const indexed = source.kind === "index";
  const listing = indexed ? git(["ls-files", "-s", "-z"], top) : git(["ls-tree", "-r", "-z", source.rev], top);
  const entries = [];
  for (const rec of listing.split("\0")) {
    const m = indexed ? /^(\d+) ([0-9a-f]+) 0\t([\s\S]*)$/.exec(rec) : /^(\d+) blob ([0-9a-f]+)\t([\s\S]*)$/.exec(rec);
    if (!m || !codePath(m[3])) continue;
    entries.push({ path: m[3], sha: m[2] });
  }
  if (entries.length === 0) return [];
  const blobs = gitBuffer(["cat-file", "--batch"], top, entries.map((e) => e.sha).join("\n") + "\n");
  const files = [];
  let pos = 0;
  for (const e of entries) {
    const nl = blobs.indexOf(10, pos);
    const size = Number(blobs.toString("utf8", pos, nl).split(" ")[2]);
    const body = blobs.subarray(nl + 1, nl + 1 + size);
    pos = nl + 1 + size + 1;
    if (size <= MAX_FILE && !body.includes(0)) files.push({ path: e.path, buf: body });
  }
  return files;
}

/** Every line of every searched file whose shape is one of the groups; a line the change added is not a twin. */
function scanFiles(top, source, groups, added) {
  const needles = needlesFor(groups.keys());
  for (const { path, buf } of searchedFiles(top, source)) {
    const ext = extOf(path);
    const addedHere = added.get(path);
    const lines = buf.toString("utf8").split("\n");
    for (let i = 0; i < lines.length; i++) {
      if (addedHere?.has(i + 1)) continue;
      const t = lines[i].trim();
      if (t.length === 0 || t.length > MAX_LINE) continue;
      if (!needles.some((x) => t.includes(x))) continue;
      const group = groups.get(shapeOf(t, ext));
      if (group) group.twins.push({ path, line: i + 1, text: t });
    }
  }
}

export function twins({ range, cwd = process.cwd() } = {}) {
  const { rangeArgs, label, source } = chooseChange(range, cwd);
  if (!rangeArgs) return { label, checked: 0, withTwins: 0, removed: [] };
  const patch = git(["diff", "-U0", "--no-color", "--no-ext-diff", "--src-prefix=a/", "--dst-prefix=b/", ...rangeArgs], cwd);
  const { removed, added } = parsePatch(patch);
  const targets = [];
  const groups = new Map();
  for (const r of removed) {
    if (r.text.length > MAX_LINE || ignoredRemoval(r.path, r.text)) continue;
    const text = r.text.trim();
    const shape = shapeOf(text, extOf(r.path));
    if (!significant(shape)) continue;
    targets.push({ path: r.path, line: r.line, text, shape });
    if (!groups.has(shape)) groups.set(shape, { twins: [] });
  }
  if (groups.size > 0) scanFiles(git(["rev-parse", "--show-toplevel"], cwd).trim(), source, groups, added);
  const withTwins = targets
    .filter((t) => groups.get(t.shape).twins.length > 0)
    .map((t) => ({ path: t.path, line: t.line, text: t.text, shape: t.shape, twins: groups.get(t.shape).twins }))
    .sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : a.line - b.line));
  return { label, checked: targets.length, withTwins: withTwins.length, removed: withTwins };
}

const clip = (s) => s.slice(0, 100);

export function render(report) {
  if (report.label === NOTHING) return `twins: ${NOTHING}`;
  const out = [`twins of ${report.label}: ${report.checked} removed lines checked, ${report.withTwins} with twins`];
  const shown = report.removed.slice(0, MAX_REMOVED);
  for (const r of shown) {
    out.push(`removed  ${r.path}:${r.line}  ${clip(r.text)}`);
    for (const t of r.twins.slice(0, MAX_TWINS)) out.push(`  twin  ${t.path}:${t.line}  ${clip(t.text)}`);
    const more = r.twins.length - MAX_TWINS;
    if (more > 0) out.push(`  ... ${more} more twin${more === 1 ? "" : "s"}`);
  }
  const hidden = report.removed.length - shown.length;
  if (hidden > 0) out.push(`... ${hidden} more removed line${hidden === 1 ? "" : "s"} with twins not shown`);
  if (report.withTwins > 0) out.push("Candidates only: same shape as a line this change removed. Read each one and fix it if it is the same defect, or say why it is not.");
  return out.join("\n");
}

export function runTwins(argv) {
  const json = argv.includes("--json");
  const rest = argv.filter((a) => a !== "--json");
  const fail = (message, withUsage) => {
    if (json) console.log(JSON.stringify({ error: message }, null, 2));
    else console.error(withUsage ? `${message}\n${USAGE}` : message);
    return 2;
  };
  if (rest.some((a) => a.startsWith("-")) || rest.length > 1) return fail("usage: product-engineer twins [range] [--json]", true);
  let report;
  try { report = twins({ range: rest[0] }); } catch (err) {
    const message = err instanceof Error ? err.message.split("\n")[0] : String(err);
    return fail(err?.git ? message : `twins: cannot read the change: ${message}`, false);
  }
  console.log(json ? JSON.stringify(report, null, 2) : render(report));
  return 0;
}
