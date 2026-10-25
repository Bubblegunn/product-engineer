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
const MAX_LOOSE = 3;
const MAX_MENTIONS = 5;
const MIN_NAME = 4;
const MAX_NAMES = 200;
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
const OPERAND = /\$(?!\.)/g;
const NOT_NAMES = new Set(["switch", "catch", "constructor"]);
const DECLARATIONS = [
  /\bfunction\s*\*?\s*([A-Za-z_$][\w$]*)/g,
  /\bdef\s+([A-Za-z_]\w*)/g,
  /\bclass\s+([A-Za-z_$][\w$]*)/g,
  /\bconst\s+([A-Za-z_$][\w$]*)\s*=/g,
  /^\s*(?:(?:export|default|async|static|public|private|protected|override|get|set)\s+)*([A-Za-z_$][\w$]*)\s*\([^()]*\)\s*(?::[^{]*)?\{\s*$/,
];

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

/**
 * The loose-match bag of a shape: the sorted call names (last segment), the sorted operators and the operand count, with
 * parentheses and whitespace removed. Null unless the shape calls a function and applies two operators or one division or
 * modulo, so `a + b` and `a * b` never match and neither does a line without a call.
 */
export function bagOf(shape) {
  const calls = callNames(shape).map((n) => n.split(".").pop()).sort();
  if (calls.length === 0) return null;
  const flat = shape.replace(/[()\s]/g, "");
  const ops = [...flat.matchAll(OPERATOR_G)].map((m) => m[0]).sort();
  if (ops.length < 2 && !ops.some((o) => o === "/" || o === "%")) return null;
  const operands = [...flat.matchAll(OPERAND)].length;
  return `${calls.join(",")}|${ops.join(" ")}|${operands}`;
}

/** Names a change declares (function, def, class, const X =, method header), from one line of code or one hunk header. */
export function declaredIn(text) {
  const out = [];
  const t = text.trim();
  for (const re of DECLARATIONS) {
    const g = new RegExp(re.source, re.flags.includes("g") ? re.flags : `${re.flags}g`);
    for (const m of t.matchAll(g)) {
      const name = m[1];
      if (name && name.length >= MIN_NAME && !KEYWORDS.has(name) && !NOT_NAMES.has(name)) out.push(name);
    }
  }
  return out;
}

/** Per line of a file: true for comment text and docstring text. Every line of a doc file is prose, so all are true. */
function commentFlags(lines, ext, doc) {
  const flags = new Array(lines.length).fill(doc);
  if (doc) return flags;
  let close = null;
  for (let i = 0; i < lines.length; i++) {
    const t = lines[i].trim();
    if (close) {
      flags[i] = true;
      if (t.includes(close)) close = null;
      continue;
    }
    if (COMMENT.test(t)) {
      flags[i] = true;
      if (t.startsWith("/*") && !t.includes("*/", 2)) close = "*/";
      continue;
    }
    const quote = ext === "py" ? /^("""|''')/.exec(t) : null;
    if (quote) {
      flags[i] = true;
      if (!t.slice(3).includes(quote[1])) close = quote[1];
    }
  }
  return flags;
}

/** A name as a whole word: not part of a longer identifier on either side. */
const wholeWord = (name) => new RegExp(`(?<![\\p{L}\\p{N}_$])${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![\\p{L}\\p{N}_$])`, "u");

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
  // The text added lines hold, and the hunk-header context (git's name for the enclosing function), per changed path.
  const addedText = [];
  const contexts = [];
  const paths = new Set();
  let oldPath = null;
  let newPath = null;
  let header = false;
  let oldN = 0;
  let newN = 0;
  for (const line of patch.split("\n")) {
    if (line.startsWith("diff --git ")) { header = true; oldPath = null; newPath = null; continue; }
    if (header) {
      if (line.startsWith("--- ")) { oldPath = sidePath(line.slice(4), "a/"); if (oldPath) paths.add(oldPath); continue; }
      if (line.startsWith("+++ ")) { newPath = sidePath(line.slice(4), "b/"); if (newPath) paths.add(newPath); continue; }
      const hunk = /^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/.exec(line);
      if (hunk) {
        header = false;
        oldN = Number(hunk[1]);
        newN = Number(hunk[2]);
        const context = line.slice(hunk[0].length).trim();
        if (context) contexts.push({ path: newPath ?? oldPath, text: context });
      }
      continue;
    }
    // Inside a hunk a line that starts with "--" is removed content, not a file header.
    if (line.startsWith("-")) { if (oldPath) removed.push({ path: oldPath, line: oldN, text: line.slice(1) }); oldN++; }
    else if (line.startsWith("+")) {
      if (newPath) { if (!added.has(newPath)) added.set(newPath, new Set()); added.get(newPath).add(newN); addedText.push({ path: newPath, text: line.slice(1) }); }
      newN++;
    } else if (line.startsWith(" ")) { oldN++; newN++; }
  }
  return { removed, added, addedText, contexts, paths };
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
function searchedFiles(top, source, keep = codePath) {
  if (source.kind === "tree") {
    const listed = [
      ...git(["ls-files", "-z"], top).split("\0"),
      ...git(["ls-files", "--others", "--exclude-standard", "-z"], top).split("\0"),
    ];
    return listed.filter((p) => p && keep(p)).map((path) => ({ path, buf: readWorking(top, path) })).filter((f) => f.buf);
  }
  const indexed = source.kind === "index";
  const listing = indexed ? git(["ls-files", "-s", "-z"], top) : git(["ls-tree", "-r", "-z", source.rev], top);
  const entries = [];
  for (const rec of listing.split("\0")) {
    const m = indexed ? /^(\d+) ([0-9a-f]+) 0\t([\s\S]*)$/.exec(rec) : /^(\d+) blob ([0-9a-f]+)\t([\s\S]*)$/.exec(rec);
    if (!m || !keep(m[3])) continue;
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

/** Code files and doc files: the files whose lines can be twins or mentions. */
const scannable = (p) => !SKIP_SEARCH(p) && (CODE_EXT.has(extOf(p)) || isDocPath(p));

/**
 * One pass over the searched files. A code line whose shape is one of the exact groups is an exact twin, and a line
 * whose bag is one of the loose bags is a loose twin of every removed line with that bag. A comment line (or doc line)
 * that names a changed name, in a file the change does not touch, is a mention. A line the change added is neither.
 */
function scanFiles(top, source, { groups, bags, added, names, changed }) {
  const needles = needlesFor(groups.keys());
  const mentions = [];
  const counts = new Map();
  for (const { path, buf } of searchedFiles(top, source, scannable)) {
    const ext = extOf(path);
    const addedHere = added.get(path);
    const code = codePath(path);
    const mentionable = names.size > 0 && !changed.has(path);
    if (!code && !mentionable) continue;
    const lines = buf.toString("utf8").split("\n");
    const flags = mentionable ? commentFlags(lines, ext, isDocPath(path)) : null;
    for (let i = 0; i < lines.length; i++) {
      if (addedHere?.has(i + 1)) continue;
      const t = lines[i].trim();
      if (t.length === 0 || t.length > MAX_LINE) continue;
      if (flags?.[i]) {
        for (const name of names) {
          if ((counts.get(name) ?? 0) >= MAX_MENTIONS || !t.includes(name) || !wholeWord(name).test(t)) continue;
          counts.set(name, (counts.get(name) ?? 0) + 1);
          mentions.push({ name, path, line: i + 1, text: t, doc: isDocPath(path) });
        }
      }
      if (!code || !needles.some((x) => t.includes(x))) continue;
      const shape = shapeOf(t, ext);
      const exact = groups.get(shape);
      if (exact) exact.twins.push({ path, line: i + 1, text: t, shape });
      const bag = bagOf(shape);
      if (bag && bags.has(bag)) bags.get(bag).twins.push({ path, line: i + 1, text: t, shape });
    }
  }
  return mentions;
}

/** The names the change declares, from its removed and added lines and its hunk headers; doc files declare nothing. */
function changedNames(texts) {
  const out = new Set();
  for (const { path, text } of texts) {
    if (isDocPath(path)) continue;
    for (const name of declaredIn(text)) out.add(name);
  }
  return new Set([...out].sort().slice(0, MAX_NAMES));
}

const VALUE = /(?<![\p{L}\p{N}_$.])v?\d[\d_]*(?:\.\d+)*(?:[a-z]{1,3}\b)?(?![\p{L}\p{N}_$])/gu;
const WORDS = /[\p{L}][\p{L}\p{N}_]{3,}/gu;
const VALUE_EXT = new Set([...CODE_EXT, "json", "yml", "yaml", "toml", "ini", "cfg", "conf", "txt", "html", "env", "properties"]);
const MAX_STALE = 8;
const MIN_SHARED = 2;
const valueFile = (p) => (VALUE_EXT.has(extOf(p)) || isDocPath(p)) && !SKIP_SEARCH(p) && !/(^|\/)(changelog|history|releases?|news)[^/]*$/i.test(p);

const valuesOf = (text) => [...text.matchAll(VALUE)].map((m) => m[0]);
const wordsOf = (text) => new Set([...text.replace(VALUE, " ").matchAll(WORDS)].map((m) => m[0].toLowerCase()));
const trivialValue = (v) => !v.includes(".") && v.replace(/\D/g, "").length < 2;

/**
 * Pairs (old value, new value) from removed lines and the added line next to them that says the same thing with a
 * different number: the same words, the same count of numbers, and at least one number that differs.
 */
export function valueChanges(removed, addedText) {
  const byPath = new Map();
  for (const a of addedText) {
    if (!byPath.has(a.path)) byPath.set(a.path, []);
    byPath.get(a.path).push(a.text);
  }
  const pairs = new Map();
  for (const r of removed) {
    if (isLockPath(r.path) || r.text.length > MAX_LINE) continue;
    const oldValues = valuesOf(r.text);
    if (oldValues.length === 0) continue;
    const words = wordsOf(r.text);
    let best = null;
    for (const text of byPath.get(r.path) ?? []) {
      const newValues = valuesOf(text);
      if (newValues.length !== oldValues.length) continue;
      const shared = [...wordsOf(text)].filter((w) => words.has(w)).length;
      if (shared < MIN_SHARED && !(words.size > 0 && shared === words.size)) continue;
      if (!best || shared > best.shared) best = { shared, newValues };
    }
    if (!best) continue;
    oldValues.forEach((v, i) => {
      const next = best.newValues[i];
      if (v === next || trivialValue(v)) return;
      const key = `${v}\0${next}`;
      if (!pairs.has(key)) pairs.set(key, { from: v, to: next, source: { path: r.path, line: r.line, text: r.text.trim() }, words: new Set(words) });
      else for (const w of words) pairs.get(key).words.add(w);
    });
  }
  return [...pairs.values()];
}

/** Lines in other files that still hold an old value next to the words of the line that changed it. */
function staleValues(top, source, pairs, added, { fileFilter = valueFile, singleWordLines = false } = {}) {
  const out = [];
  if (pairs.length === 0) return out;
  const re = pairs.map((p) => [p, new RegExp(`(?<![\\p{L}\\p{N}_$.])${p.from.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![\\p{L}\\p{N}_$]|\\.\\d)`, "u")]);
  for (const { path, buf } of searchedFiles(top, source, fileFilter)) {
    const addedHere = added.get(path);
    const lines = buf.toString("utf8").split("\n");
    for (let i = 0; i < lines.length; i++) {
      if (addedHere?.has(i + 1)) continue;
      const t = lines[i].trim();
      if (t.length === 0 || t.length > MAX_LINE) continue;
      for (const [p, rx] of re) {
        if (!rx.test(t) || t.includes(p.to)) continue;
        const words = wordsOf(t);
        const shared = [...p.words].filter((w) => words.has(w)).length;
        if (shared < MIN_SHARED && !(singleWordLines && [...p.words].some((w) => words.has(w) && (w.includes("_") || w.length >= 8)))) continue;
        if (path === p.source.path && i + 1 === p.source.line) continue;
        if (out.filter((x) => x.from === p.from).length < MAX_STALE) out.push({ from: p.from, to: p.to, path, line: i + 1, text: t, changed: `${p.source.path}:${p.source.line}` });
      }
    }
  }
  return out;
}

const PREVIEW_MAX_FILES = 3000;
const PREVIEW_NAMES = 6;
const PREVIEW_USES = 4;
const PREVIEW_NUMBER_FILES = 6;
const NAME_TOKEN = /(?<![\p{L}\p{N}_$])[\p{L}_$][\p{L}\p{N}_$]{3,}(?![\p{L}\p{N}_$])/gu;
const COMMON = new Set([...KEYWORDS, "this", "self", "true", "false", "null", "undefined", "string", "number", "boolean", "object", "return", "export", "import", "default", "const", "function", "async", "await", "throw", "catch", "else", "then", "from", "with", "that", "have", "will", "data", "name", "type", "value", "values", "item", "items", "list", "result", "error", "test", "tests", "case", "while", "break", "continue", "static", "class", "extends", "super", "yield", "void", "length", "push", "args", "options", "config"]);

const tokensIn = (text) => new Set([...text.matchAll(NAME_TOKEN)].map((m) => m[0]).filter((t) => !COMMON.has(t.toLowerCase())));

/**
 * What an edit that has not happened yet will leave behind. `removed` and `added` are the lines of one edit in one file
 * (the text being replaced, the text replacing it). Looks at the working tree as it is now and returns the same kinds of
 * candidate as `twins`: lines of the same shape as a removed line (twins), old values still written elsewhere (stale),
 * and other lines that use a name the edit takes away (uses). Every candidate is a line to read, not a verdict.
 */
export function previewEdit({ path, removed, added, cwd = process.cwd(), maxFiles = PREVIEW_MAX_FILES }) {
  const top = git(["rev-parse", "--show-toplevel"], cwd).trim();
  const tracked = git(["ls-files", "-z"], top).split("\0").filter(Boolean);
  if (tracked.length > maxFiles) return { skipped: `${tracked.length} tracked files (limit ${maxFiles})`, twins: [], stale: [], numbers: [], uses: [] };
  const source = { kind: "tree" };
  const removedLines = removed.map((text, i) => ({ path, line: -1 - i, text })).filter((r) => r.text.trim() !== "");
  const addedLines = added.map((text) => ({ path, text })).filter((a) => a.text.trim() !== "");
  const removedSet = new Set(removedLines.map((r) => r.text.trim()));
  const here = (hit) => hit.path === path && removedSet.has(hit.text.trim());
  // Twins: lines elsewhere with the shape of a removed code line.
  const groups = new Map();
  const bags = new Map();
  const targets = [];
  for (const r of removedLines) {
    if (r.text.length > MAX_LINE || ignoredRemoval(path, r.text)) continue;
    const text = r.text.trim();
    const shape = shapeOf(text, extOf(path));
    if (!significant(shape)) continue;
    const bag = bagOf(shape);
    targets.push({ text, shape, bag });
    if (!groups.has(shape)) groups.set(shape, { twins: [] });
    if (bag && !bags.has(bag)) bags.set(bag, { twins: [] });
  }
  if (groups.size > 0) scanFiles(top, source, { groups, bags, added: new Map(), names: new Set(), changed: new Set([path]) });
  const strip = ({ path: p, line, text }) => ({ path: p, line, text });
  const twinList = targets
    .map((t) => ({ text: t.text, twins: groups.get(t.shape).twins.filter((x) => !here(x)).map(strip), loose: (t.bag ? bags.get(t.bag).twins.filter((x) => x.shape !== t.shape && !here(x)).slice(0, MAX_LOOSE) : []).map(strip) }))
    .filter((t) => t.twins.length > 0 || t.loose.length > 0);
  // Old values still written elsewhere.
  const pairs = valueChanges(removedLines.filter((r) => !isTestPath(path)), addedLines);
  const versionFile = (p) => valueFile(p) || /(^|\/)(\.nvmrc|\.node-version|\.python-version|\.ruby-version|\.tool-versions|Dockerfile[^/]*)$/.test(p);
  const stale = staleValues(top, source, pairs, new Map(), { fileFilter: versionFile, singleWordLines: true }).filter((v) => !here(v));
  // The same number with no shared words: weaker, so listed apart and only for numbers that carry a version or a limit.
  const numbers = [];
  const strong = new Set(stale.map((v) => `${v.path}:${v.line}`));
  for (const p of pairs) {
    const rx = new RegExp(`(?<![\\p{L}\\p{N}_$.])${p.from.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![\\p{L}\\p{N}_$]|\\.\\d)`, "u");
    let n = 0;
    for (const { path: fp, buf } of searchedFiles(top, source, versionFile)) {
      if (n >= PREVIEW_NUMBER_FILES) break;
      const lines = buf.toString("utf8").split("\n");
      const i = lines.findIndex((l, k) => l.trim().length > 0 && l.length <= MAX_LINE && rx.test(l) && !l.includes(p.to) && !strong.has(`${fp}:${k + 1}`) && !(fp === path && removedSet.has(l.trim())));
      if (i < 0) continue;
      n++;
      numbers.push({ from: p.from, to: p.to, path: fp, line: i + 1, text: lines[i].trim() });
    }
  }
  // Other uses of a name the edit takes away: a name that differs between a removed line and an added line of the same shape
  // (a rename), or a name the removed lines declare that the added lines do not.
  const uses = [];
  if (!isDocPath(path) && !isLockPath(path)) {
    const gone = [];
    const addGone = (t) => { if (!gone.includes(t)) gone.push(t); };
    const addedByShape = new Map();
    for (const a of addedLines) {
      const shape = shapeOf(a.text.trim(), extOf(path));
      if (!addedByShape.has(shape)) addedByShape.set(shape, []);
      addedByShape.get(shape).push(a.text);
    }
    for (const r of removedLines) {
      if (COMMENT.test(r.text.trim())) continue;
      const mates = addedByShape.get(shapeOf(r.text.trim(), extOf(path))) ?? [];
      for (const mate of mates) {
        const mateTokens = tokensIn(mate);
        for (const t of tokensIn(r.text)) if (!mateTokens.has(t)) addGone(t);
      }
    }
    const addedDeclared = new Set(addedLines.flatMap((a) => declaredIn(a.text)));
    for (const r of removedLines) for (const d of declaredIn(r.text)) if (!addedDeclared.has(d)) addGone(d);
    const names = gone.slice(0, PREVIEW_NAMES);
    if (names.length) {
      const counts = new Map();
      for (const f of searchedFiles(top, source, scannable)) {
        const lines = f.buf.toString("utf8").split("\n");
        for (let i = 0; i < lines.length; i++) {
          const t = lines[i].trim();
          if (t.length === 0 || t.length > MAX_LINE) continue;
          if (f.path === path && removedSet.has(t)) continue;
          for (const name of names) {
            if ((counts.get(name) ?? 0) >= PREVIEW_USES || !t.includes(name) || !wholeWord(name).test(t)) continue;
            counts.set(name, (counts.get(name) ?? 0) + 1);
            uses.push({ name, path: f.path, line: i + 1, text: t });
          }
        }
      }
    }
  }
  return { twins: twinList, stale, numbers, uses };
}

export function twins({ range, cwd = process.cwd() } = {}) {
  const { rangeArgs, label, source } = chooseChange(range, cwd);
  if (!rangeArgs) return { label, checked: 0, withTwins: 0, removed: [], mentions: [], stale: [] };
  const patch = git(["diff", "-U0", "--no-color", "--no-ext-diff", "--src-prefix=a/", "--dst-prefix=b/", ...rangeArgs], cwd);
  const { removed, added, addedText, contexts, paths } = parsePatch(patch);
  const targets = [];
  const groups = new Map();
  const bags = new Map();
  for (const r of removed) {
    if (r.text.length > MAX_LINE || ignoredRemoval(r.path, r.text)) continue;
    const text = r.text.trim();
    const shape = shapeOf(text, extOf(r.path));
    if (!significant(shape)) continue;
    const bag = bagOf(shape);
    targets.push({ path: r.path, line: r.line, text, shape, bag });
    if (!groups.has(shape)) groups.set(shape, { twins: [] });
    if (bag && !bags.has(bag)) bags.set(bag, { twins: [] });
  }
  const names = changedNames([...removed, ...addedText, ...contexts]);
  let mentions = [];
  const top = git(["rev-parse", "--show-toplevel"], cwd).trim();
  if (groups.size > 0 || names.size > 0) {
    mentions = scanFiles(top, source, { groups, bags, added, names, changed: paths });
  }
  const stale = staleValues(top, source, valueChanges(removed.filter((r) => !isTestPath(r.path)), addedText), added);
  const strip = ({ path, line, text }) => ({ path, line, text });
  const withTwins = targets
    .map((t) => {
      const exact = groups.get(t.shape).twins;
      const loose = t.bag ? bags.get(t.bag).twins.filter((x) => x.shape !== t.shape).slice(0, MAX_LOOSE) : [];
      return { path: t.path, line: t.line, text: t.text, shape: t.shape, twins: exact.map(strip), loose: loose.map(strip) };
    })
    .filter((t) => t.twins.length > 0 || t.loose.length > 0)
    .sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : a.line - b.line));
  return { label, checked: targets.length, withTwins: withTwins.length, removed: withTwins, mentions, stale };
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
    for (const t of r.loose) out.push(`  twin  ${t.path}:${t.line}  ${clip(t.text)}  (looser match)`);
  }
  const hidden = report.removed.length - shown.length;
  if (hidden > 0) out.push(`... ${hidden} more removed line${hidden === 1 ? "" : "s"} with twins not shown`);
  if (report.withTwins > 0) out.push("Candidates only: same shape as a line this change removed. Read each one and fix it if it is the same defect, or say why it is not.");
  if (report.mentions?.length) {
    out.push("comments that mention the changed name:");
    for (const m of report.mentions) out.push(`mention  ${m.path}:${m.line}${m.doc ? " (doc)" : ""}  ${clip(m.text)}`);
  }
  if (report.stale?.length) {
    out.push("old values still written elsewhere (this change replaced them):");
    for (const v of report.stale) out.push(`stale  ${v.path}:${v.line}  ${v.from} -> ${v.to}  ${clip(v.text)}  (changed at ${v.changed})`);
    out.push("Candidates only: the same words and the old value, in a place the change did not touch. Update each one that states the same thing, or say why it stays.");
  }
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
