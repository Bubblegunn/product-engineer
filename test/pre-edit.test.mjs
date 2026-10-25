import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { bashEdits, describe, editLines, lineDiff } from "../bin/pre-edit.mjs";
import { previewEdit } from "../bin/twins.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const HOOK = join(ROOT, "bin", "pre-edit.mjs");
const GIT = ["-c", "user.name=Dev", "-c", "user.email=dev@example.com", "-c", "commit.gpgsign=false", "-c", "core.hooksPath=/dev/null"];
const git = (cwd, ...args) => execFileSync("git", [...GIT, ...args], { cwd, encoding: "utf8" });

function repo(files) {
  const dir = mkdtempSync(join(tmpdir(), "pre-edit-"));
  git(dir, "init", "-q", "-b", "main");
  for (const [path, content] of Object.entries(files)) {
    mkdirSync(dirname(join(dir, path)), { recursive: true });
    writeFileSync(join(dir, path), content);
  }
  git(dir, "add", "-A");
  git(dir, "commit", "-q", "-m", "init");
  return dir;
}
const withRepo = (files, fn) => {
  const dir = repo(files);
  try { return fn(dir); } finally { rmSync(dir, { recursive: true, force: true }); }
};

// A small project whose Node floor and a retry option live in several places.
const FILES = {
  "scripts/check-node.js": "const MIN_MAJOR = 18;\nconst major = Number(process.versions.node.split('.')[0]);\nif (major < MIN_MAJOR) process.exit(1);\n",
  "test/check-node.test.js": "assert.equal(require('../scripts/check-node').MIN_MAJOR, 18);\n",
  "README.md": "# tool\nRequires Node 18 or newer to run the tool.\n",
  "docs/setup.md": "Install Node 18 or newer, then run npm install.\n",
  ".nvmrc": "18\n",
  "src/retry.js": "function retry(opts) { return opts.retryLimit + 1; }\nmodule.exports = { retry };\n",
  "src/cli.js": "const n = retry({ retryLimit: 3 });\n",
  "docs/config.md": "The retryLimit option sets how many times a failed call is tried again.\n",
};

test("lineDiff keeps the lines of the first list that the second does not have, as a multiset of trimmed lines", () => {
  assert.deepEqual(lineDiff(["a", "b", "b"], ["b", "c"]), ["a", "b"]);
  assert.deepEqual(lineDiff(["  x  "], ["x"]), []);
});

test("editLines: an Edit that names a fragment gives the whole lines, as the file will differ after it", () => {
  const file = "# tool\nRequires Node 18 or newer to run the tool.\nend\n";
  const r = editLines("Edit", { file_path: "/x/README.md", old_string: "Node 18 or newer", new_string: "Node 20 or newer" }, () => file);
  assert.deepEqual(r, { removed: ["Requires Node 18 or newer to run the tool."], added: ["Requires Node 20 or newer to run the tool."] });
});

test("editLines: replace_all changes every line, MultiEdit applies its edits in order, Write compares with the file on disk", () => {
  const file = "a 18\nb 18\nc\n";
  const all = editLines("Edit", { file_path: "/x", old_string: "18", new_string: "20", replace_all: true }, () => file);
  assert.deepEqual(all.removed, ["a 18", "b 18"]);
  const multi = editLines("MultiEdit", { file_path: "/x", edits: [{ old_string: "a 18", new_string: "a 20" }, { old_string: "a 20", new_string: "a 22" }] }, () => file);
  assert.deepEqual(multi, { removed: ["a 18"], added: ["a 22"] });
  const write = editLines("Write", { file_path: "/x", content: "a 18\nb 20\nc\n" }, () => file);
  assert.deepEqual(write, { removed: ["b 18"], added: ["b 20"] });
  assert.equal(editLines("Write", { file_path: "/x", content: "new" }, () => { throw new Error("no file"); }), null, "a new file replaces nothing");
  assert.equal(editLines("Read", { file_path: "/x" }, () => file), null);
  // An old_string that is not in the file (the file changed since it was read) falls back to the lines of the fragments.
  assert.deepEqual(editLines("Edit", { file_path: "/x", old_string: "zz 18", new_string: "zz 20" }, () => file), { removed: ["zz 18"], added: ["zz 20"] });
});

const FILES_AT = { "/w/a.js": "const MIN_MAJOR = 18;\nx\n", "/w/README.md": "Requires Node 18 or newer\nTTL is 60 seconds\n", "/w/$FILE": "18\n" };
const readAt = (p) => { if (!(p in FILES_AT)) throw new Error("no file"); return FILES_AT[p]; };

test("bashEdits: sed -i substitutions are applied to the file text, in every common spelling", () => {
  const one = (cmd) => bashEdits(cmd, "/w", readAt).map((e) => [e.file, e.after]);
  assert.deepEqual(one('sed -i "s/MIN_MAJOR = 18/MIN_MAJOR = 20/" a.js'), [["/w/a.js", "const MIN_MAJOR = 20;\nx\n"]]);
  assert.deepEqual(one("sed -i '' 's/Node 18/Node 20/g' README.md"), [["/w/README.md", "Requires Node 20 or newer\nTTL is 60 seconds\n"]]);
  assert.deepEqual(one("sed -i.bak -e 's/18/20/' -e 's/60/90/' README.md && git add -A"), [["/w/README.md", "Requires Node 20 or newer\nTTL is 90 seconds\n"]]);
  assert.deepEqual(one("sed -E -i 's/(Node) 18/\\1 22/' README.md"), [["/w/README.md", "Requires Node 22 or newer\nTTL is 60 seconds\n"]]);
  assert.deepEqual(one("sed -i 's/\\(Node\\) 18/\\1 24/' README.md"), [["/w/README.md", "Requires Node 24 or newer\nTTL is 60 seconds\n"]], "a basic regex group is written with escaped parentheses");
  assert.deepEqual(one("sed -i 's/(Node)/N/' README.md"), [], "and a bare parenthesis is a literal one");
  assert.deepEqual(one("sed -i 's|Node 18|Node 20|' README.md"), [["/w/README.md", "Requires Node 20 or newer\nTTL is 60 seconds\n"]]);
});

test("bashEdits: a heredoc into cat > file replaces the whole file; an append, a read-only sed and an unreadable script change nothing", () => {
  const a = bashEdits("cat > a.js <<'EOF'\nconst MIN_MAJOR = 20;\nx\nEOF\nnpm test", "/w", readAt);
  assert.deepEqual(a.map((e) => [e.file, e.before, e.after]), [["/w/a.js", "const MIN_MAJOR = 18;\nx\n", "const MIN_MAJOR = 20;\nx\n"]]);
  assert.deepEqual(bashEdits("cat >> a.js <<'EOF'\nmore\nEOF", "/w", readAt), []);
  assert.deepEqual(bashEdits("sed -n 1,5p a.js", "/w", readAt), []);
  assert.deepEqual(bashEdits("sed 's/18/20/' README.md", "/w", readAt), [], "without -i sed prints and writes nothing");
  assert.deepEqual(bashEdits("grep -i 's/18/20/' README.md", "/w", readAt), [], "-i on another command is not in-place");
  assert.deepEqual(bashEdits("sed -i '/foo/d' a.js", "/w", readAt), [], "only s commands are read");
  assert.deepEqual(bashEdits("sed -i 's/18/20/' $FILE", "/w", readAt), [], "a path with a variable is not guessed");
  assert.deepEqual(bashEdits("sed -i 's/zzz/y/' a.js", "/w", readAt), [], "a substitution that matches nothing is no edit");
  assert.deepEqual(bashEdits("sed -i 's/18/20/' missing.js", "/w", readAt), [], "a missing file is skipped");
  assert.deepEqual(bashEdits("echo 'sed -i s/18/20/ a.js'", "/w", readAt), [], "text inside quotes is not a command");
});

test("bashEdits: a later command sees the file as an earlier one wrote it", () => {
  const e = bashEdits("cat > a.js <<'EOF'\nconst MIN_MAJOR = 19;\nEOF\nsed -i 's/19/20/' a.js", "/w", readAt);
  assert.equal(e.length, 1);
  assert.equal(e[0].before, "const MIN_MAJOR = 18;\nx\n");
  assert.equal(e[0].after, "const MIN_MAJOR = 20;\n");
});

test("previewEdit: an old value written beside the same words in another file is named before the edit", () => withRepo(FILES, (dir) => {
  const p = previewEdit({ path: "README.md", removed: ["Requires Node 18 or newer to run the tool."], added: ["Requires Node 20 or newer to run the tool."], cwd: dir });
  assert.ok(p.stale.some((v) => v.path === "docs/setup.md" && v.from === "18" && v.to === "20"));
  assert.ok(!p.stale.some((v) => v.path === "README.md"), "the line being edited is not a candidate");
}));

test("previewEdit: a one-word line still finds the same constant elsewhere, and a bare number is listed apart", () => withRepo(FILES, (dir) => {
  const p = previewEdit({ path: "scripts/check-node.js", removed: ["const MIN_MAJOR = 18;"], added: ["const MIN_MAJOR = 20;"], cwd: dir });
  assert.ok(p.stale.some((v) => v.path === "test/check-node.test.js"), JSON.stringify(p.stale));
  const files = p.numbers.map((n) => n.path);
  assert.ok(files.includes(".nvmrc") && files.includes("README.md") && files.includes("docs/setup.md"), files.join(","));
  assert.ok(!files.includes("scripts/check-node.js"));
  assert.ok(!files.includes("test/check-node.test.js"), "a place already named as stale is not listed again");
}));

test("previewEdit: a number found in many files is listed for six of them", () => withRepo({
  "src/a.js": "const MIN_MAJOR = 18;\n",
  ...Object.fromEntries(Array.from({ length: 9 }, (_, i) => [`docs/d${i}.md`, `Needs version 18 here ${i}\n`])),
}, (dir) => {
  const p = previewEdit({ path: "src/a.js", removed: ["const MIN_MAJOR = 18;"], added: ["const MIN_MAJOR = 20;"], cwd: dir });
  assert.equal(p.numbers.length, 6);
}));

test("previewEdit: a renamed option lists its other uses; a name the edit keeps is not listed", () => withRepo(FILES, (dir) => {
  const p = previewEdit({ path: "src/retry.js", removed: ["function retry(opts) { return opts.retryLimit + 1; }"], added: ["function retry(opts) { return opts.maxRetries + 1; }"], cwd: dir });
  const where = p.uses.filter((u) => u.name === "retryLimit").map((u) => u.path).sort();
  assert.deepEqual(where, ["docs/config.md", "src/cli.js"]);
  assert.ok(!p.uses.some((u) => u.name === "retry" || u.name === "opts"), "a name both lines carry stays");
}));

test("previewEdit: a removed code line has twins elsewhere that the edit does not touch", () => withRepo({
  "src/a.js": "function total(items) {\n  return items.reduce((sum, i) => sum + i.price * i.qty, 0) / 100;\n}\n",
  "src/b.js": "function cartTotal(rows) {\n  return rows.reduce((acc, r) => acc + r.price * r.qty, 0) / 100;\n}\n",
}, (dir) => {
  const p = previewEdit({ path: "src/a.js", removed: ["  return items.reduce((sum, i) => sum + i.price * i.qty, 0) / 100;"], added: ["  return Math.round(items.reduce((sum, i) => sum + i.price * i.qty, 0) / 100);"], cwd: dir });
  assert.ok(p.twins.some((t) => t.twins.some((x) => x.path === "src/b.js")), JSON.stringify(p.twins));
  assert.ok(!p.twins.some((t) => t.twins.some((x) => x.path === "src/a.js")));
}));

test("previewEdit: a large repository is skipped with the reason, and a repository with nothing left behind gives nothing", () => withRepo(FILES, (dir) => {
  const skipped = previewEdit({ path: "README.md", removed: ["Requires Node 18 or newer to run the tool."], added: ["Requires Node 20 or newer to run the tool."], cwd: dir, maxFiles: 3 });
  assert.match(skipped.skipped, /tracked files \(limit 3\)/);
  const none = previewEdit({ path: "README.md", removed: ["# tool"], added: ["# tools"], cwd: dir });
  assert.deepEqual([none.stale, none.numbers, none.uses], [[], [], []]);
}));

test("describe: names each candidate once, shows eight at most, and says nothing for what it has reported", () => {
  const stale = (i) => ({ from: "18", to: "20", path: `f${i}.md`, line: 1, text: "Node 18 here" });
  const preview = { twins: [], numbers: [], uses: [], stale: Array.from({ length: 11 }, (_, i) => stale(i)) };
  const d = describe("README.md", preview);
  assert.equal(d.keys.length, 8);
  assert.match(d.text, /11 other places/);
  assert.match(d.text, /3 more not shown/);
  assert.equal(describe("README.md", preview, new Set(Array.from({ length: 11 }, (_, i) => `stale|f${i}.md:1|18`))), null);
  assert.equal(describe("README.md", { twins: [], stale: [], numbers: [], uses: [] }), null);
});

function hook(dir, input, env = {}) {
  return spawnSync(process.execPath, [HOOK], { input: JSON.stringify({ cwd: dir, session_id: `pe-test-${process.pid}`, ...input }), encoding: "utf8", env: { ...process.env, ...env } });
}
const stateOf = (sid) => join(tmpdir(), `product-engineer-preedit-${sid}.json`);

test("hook: before an edit that replaces a value it prints PreToolUse additionalContext, never a deny, and reports a place once", () => withRepo(FILES, (dir) => {
  const sid = `pe-test-hook-${process.pid}-${Date.now()}`;
  const input = { session_id: sid, tool_name: "Edit", tool_input: { file_path: join(dir, "README.md"), old_string: "Node 18 or newer", new_string: "Node 20 or newer" } };
  try {
    const r = hook(dir, input);
    assert.equal(r.status, 0);
    const json = JSON.parse(r.stdout.trim());
    assert.deepEqual(Object.keys(json), ["hookSpecificOutput"]);
    assert.equal(json.hookSpecificOutput.hookEventName, "PreToolUse");
    assert.equal(json.hookSpecificOutput.permissionDecision, undefined);
    assert.match(json.hookSpecificOutput.additionalContext, /docs\/setup\.md:1/);
    assert.equal(hook(dir, input).stdout, "", "the same places are not reported twice");
  } finally {
    rmSync(stateOf(sid), { force: true });
  }
}));

test("hook: a sed -i or a heredoc in a Bash command gets the same context before it runs, and a plain command gets none", () => withRepo(FILES, (dir) => {
  const sids = [];
  const ask = (command) => {
    const sid = `pe-test-bash-${process.pid}-${sids.length}-${Date.now()}`;
    sids.push(sid);
    return hook(dir, { session_id: sid, tool_name: "Bash", tool_input: { command } }).stdout;
  };
  try {
    const sed = JSON.parse(ask("sed -i 's/Node 18 or newer/Node 20 or newer/' README.md"));
    assert.equal(sed.hookSpecificOutput.hookEventName, "PreToolUse");
    assert.match(sed.hookSpecificOutput.additionalContext, /docs\/setup\.md:1/);
    const doc = "# tool\nRequires Node 20 or newer to run the tool.\n";
    const here = JSON.parse(ask(`cat > README.md <<'EOF'\n${doc}EOF\nnpm test`));
    assert.match(here.hookSpecificOutput.additionalContext, /docs\/setup\.md:1/);
    assert.equal(ask("git status && npm test"), "");
    assert.equal(ask("sed -n 1,5p README.md"), "");
  } finally {
    for (const sid of sids) rmSync(stateOf(sid), { force: true });
  }
}));

test("hook: silent for a new file, a lock file, a tool it does not watch, outside a repository, and when switched off", () => withRepo({ ...FILES, "package-lock.json": "Install Node 18 or newer, then run npm install.\n" }, (dir) => {
  const edit = { tool_name: "Edit", tool_input: { file_path: join(dir, "README.md"), old_string: "Node 18 or newer", new_string: "Node 20 or newer" } };
  const sids = [];
  const quiet = (input, env, d = dir) => {
    const sid = `pe-test-q-${process.pid}-${sids.length}-${Date.now()}`;
    sids.push(sid);
    return hook(d, { session_id: sid, ...input }, env).stdout;
  };
  try {
    assert.equal(quiet({ tool_name: "Write", tool_input: { file_path: join(dir, "new.md"), content: "Node 18 here\n" } }), "");
    assert.equal(quiet({ tool_name: "Edit", tool_input: { file_path: join(dir, "package-lock.json"), old_string: "18", new_string: "20" } }), "");
    assert.equal(quiet({ tool_name: "Read", tool_input: { file_path: join(dir, "README.md") } }), "");
    assert.equal(quiet(edit, { PRODUCT_ENGINEER_NO_GATE: "1" }), "");
    const outside = mkdtempSync(join(tmpdir(), "pre-edit-out-"));
    try {
      writeFileSync(join(outside, "a.md"), "Node 18 here\n");
      assert.equal(quiet({ tool_name: "Edit", tool_input: { file_path: join(outside, "a.md"), old_string: "18", new_string: "20" } }, {}, outside), "");
    } finally { rmSync(outside, { recursive: true, force: true }); }
    assert.notEqual(quiet(edit), "", "the same edit does speak when nothing switches it off");
  } finally {
    for (const sid of sids) rmSync(stateOf(sid), { force: true });
  }
}));

test("hook: stops adding context after six reports in one session", () => withRepo(FILES, (dir) => {
  const sid = `pe-test-cap-${process.pid}-${Date.now()}`;
  try {
    writeFileSync(stateOf(sid), JSON.stringify({ reports: 6, seen: [] }));
    const r = hook(dir, { session_id: sid, tool_name: "Edit", tool_input: { file_path: join(dir, "README.md"), old_string: "Node 18 or newer", new_string: "Node 20 or newer" } });
    assert.equal(r.stdout, "");
  } finally { rmSync(stateOf(sid), { force: true }); }
}));

test("hooks.json registers the hook for Edit, MultiEdit and Write, and the package ships it", () => {
  const hooks = JSON.parse(readFileSync(join(ROOT, "hooks", "hooks.json"), "utf8")).hooks.PreToolUse;
  const entry = hooks.find((h) => h.hooks.some((x) => x.command.includes("pre-edit.mjs")));
  assert.equal(entry.matcher, "Edit|MultiEdit|Write|Bash");
  assert.ok(readFileSync(join(ROOT, "scripts", "pack-allowlist.txt"), "utf8").split("\n").includes("bin/pre-edit.mjs"));
  assert.ok(existsSync(HOOK));
});
