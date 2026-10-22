// product-engineer scope: one line per changed file, so a description can say what each part of
// the diff shows and call a file "formatting only" only when git says it is.
//
// Facts come from git alone, no model: `git diff --numstat` against `git diff -b --numstat` tells a
// whitespace-only file from a file that still changes once whitespace is ignored. The idea of a
// scope map built from the whole range comes from the compound-engineering plugin by Every (MIT);
// the code is written for this tool. Blank lines are ignored as well. `-b` treats any run of whitespace as equal but not none as equal to some, so joining or splitting tokens still counts as a change. Whitespace is meaningful in some formats (Python, YAML,
// Makefiles), so "whitespace-only" is a fact about the diff and the author still judges the file.
import { execFileSync } from "node:child_process";
import { readDiff, isTestPath, isDocPath } from "./diff.mjs";

const USAGE = `usage: product-engineer scope [range] [--json]
Lists each changed file with lines added and removed, its class (test, doc, config, source),
and whether the change is whitespace-only. Files that still change with whitespace ignored
and have at most six such lines are shown with those lines. With no range it reads the staged
change, else the working tree against HEAD, else the last commit. Untracked and unstaged files outside the chosen change are listed as notes, not read.`;

const git = (args, cwd) => execFileSync("git", ["-c", "core.quotepath=false", ...args], { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], maxBuffer: 256 * 1024 * 1024 });
const isConfigPath = (p) => /(^|\/)(package(-lock)?\.json|[^/]*\.(ya?ml|toml|ini|cfg|conf|lock)|\.[a-z]+rc(\.[a-z]+)?|Dockerfile|Makefile|\.github\/.*)$/i.test(p);
export const classOf = (p) => (isTestPath(p) ? "test" : isDocPath(p) ? "doc" : isConfigPath(p) ? "config" : "source");

/** Changed lines per path with whitespace ignored, from `git diff -b --numstat`. */
function ignoringWhitespace(rangeArgs, cwd) {
  const out = git(["diff", "-b", "--ignore-blank-lines", "--numstat", "-z", "--no-ext-diff", ...rangeArgs], cwd).split("\0").filter(Boolean);
  const map = new Map();
  for (let i = 0; i < out.length; i++) {
    const m = /^(\d+|-)\t(\d+|-)\t(.*)$/.exec(out[i]);
    if (!m) continue;
    let path = m[3];
    if (path === "") { path = out[i + 2] ?? ""; i += 2; }
    map.set(path, m[1] === "-" ? 1 : Number(m[1]) + Number(m[2]));
  }
  return map;
}

/** The lines of a small change with whitespace ignored. */
function smallChange(rangeArgs, path, cwd) {
  const patch = git(["diff", "-b", "--ignore-blank-lines", "-U0", "--no-color", "--no-ext-diff", ...rangeArgs, "--", path], cwd);
  return patch.split("\n").filter((l) => /^[+-]/.test(l) && !/^(\+\+\+|---) /.test(l));
}

export function scope({ range, cwd = process.cwd() } = {}) {
  let rangeArgs;
  let label;
  if (range) { rangeArgs = [range]; label = range; }
  else if (git(["diff", "--cached", "--name-only"], cwd).trim()) { rangeArgs = ["--cached"]; label = "the staged change"; }
  else if (git(["diff", "HEAD", "--name-only"], cwd).trim()) { rangeArgs = ["HEAD"]; label = "the working tree against HEAD"; }
  else {
    // A repository with one commit has no parent to compare with.
    try { git(["rev-parse", "--verify", "-q", "HEAD~1"], cwd); } catch { return { label: "nothing: no staged change, no working-tree change and no parent commit", files: [], notes: [] }; }
    rangeArgs = ["HEAD~1..HEAD"]; label = "the last commit";
  }
  const diff = readDiff({ range: rangeArgs[0] === "--cached" ? undefined : rangeArgs[0], cwd });
  const ignoring = ignoringWhitespace(rangeArgs, cwd);
  const files = diff.files.map((f) => {
    const changed = ignoring.get(f.path) ?? 0;
    const whitespaceOnly = !f.binary && (f.added + f.removed) > 0 && changed === 0;
    const lines = !f.binary && changed > 0 && changed <= 6 && f.renamed !== true ? smallChange(rangeArgs, f.path, cwd) : [];
    return { path: f.path, added: f.added, removed: f.removed, class: classOf(f.path), whitespaceOnly, changedIgnoringWhitespace: changed, lines, deleted: f.deleted, binary: f.binary };
  });
  // Changes this report does not cover, so "everything else" cannot silently include them.
  const notes = [];
  if (rangeArgs[0] === "--cached") {
    const unstaged = git(["diff", "--name-only"], cwd).split("\n").filter(Boolean);
    if (unstaged.length) notes.push(`${unstaged.length} file${unstaged.length === 1 ? "" : "s"} also changed but not staged: ${unstaged.slice(0, 5).join(", ")}`);
  }
  if (!range) {
    const untracked = git(["ls-files", "-o", "--exclude-standard"], cwd).split("\n").filter(Boolean);
    if (untracked.length) notes.push(`${untracked.length} untracked file${untracked.length === 1 ? "" : "s"} not read: ${untracked.slice(0, 5).join(", ")}`);
  }
  return { label, files, notes };
}

export function render(report) {
  const out = [`scope of ${report.label}: ${report.files.length} file${report.files.length === 1 ? "" : "s"}`];
  for (const f of report.files) {
    const verdict = f.binary ? "binary" : f.added + f.removed === 0 ? "no content change (mode or rename only)" : f.whitespaceOnly ? "whitespace-only" : `${f.changedIgnoringWhitespace} line${f.changedIgnoringWhitespace === 1 ? "" : "s"} change with whitespace ignored`;
    out.push(`${f.class.padEnd(6)} +${f.added} -${f.removed}  ${f.path}: ${verdict}`);
    for (const l of f.lines) out.push(`         ${l}`);
  }
  const ws = report.files.filter((f) => f.whitespaceOnly).length;
  const tests = report.files.filter((f) => f.class === "test").length;
  for (const n of report.notes ?? []) out.push(`note  ${n}`);
  out.push(`${ws} whitespace-only, ${report.files.length - ws} not; ${tests} test file${tests === 1 ? "" : "s"} touched`);
  return out.join("\n");
}

export function runScope(argv) {
  const json = argv.includes("--json");
  const rest = argv.filter((a) => a !== "--json");
  if (rest.some((a) => a.startsWith("-")) || rest.length > 1) { console.error(USAGE); return 2; }
  let report;
  try { report = scope({ range: rest[0] }); } catch (err) {
    console.error(`scope: cannot read the change: ${err instanceof Error ? err.message.split("\n")[0] : String(err)}`);
    return 2;
  }
  console.log(json ? JSON.stringify(report, null, 2) : render(report));
  return 0;
}
