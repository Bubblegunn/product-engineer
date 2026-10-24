import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { twins, render, shapeOf, significant, bagOf, declaredIn } from "../bin/twins.mjs";

const CLI = join(dirname(fileURLToPath(import.meta.url)), "..", "bin", "check.mjs");
const run = (cwd, ...args) => execFileSync("git", ["-c", "user.name=Dev", "-c", "user.email=dev@example.com", "-c", "commit.gpgsign=false", "-c", "core.hooksPath=/dev/null", ...args], { cwd, encoding: "utf8" });

// A repository whose base commit holds the files; the change is then made in the working tree.
function repo(files) {
  const dir = mkdtempSync(join(tmpdir(), "twins-"));
  run(dir, "init", "-q", "-b", "main");
  for (const [path, text] of Object.entries(files)) {
    mkdirSync(dirname(join(dir, path)), { recursive: true });
    writeFileSync(join(dir, path), text);
  }
  run(dir, "add", "-A");
  run(dir, "commit", "-q", "-m", "base");
  return dir;
}
const edit = (dir, path, text) => writeFileSync(join(dir, path), text);

const base = {
  "src/invoice.js": "export function gross(invoice) {\n  return invoice.gross - invoice.refunds;\n}\n",
  "src/statement.js": "export function balance(statement) {\n  return statement.gross - statement.refunds;\n}\n",
};
const fixInvoice = "export function gross(invoice) {\n  return invoice.gross - invoice.refunds - invoice.fees;\n}\n";

test("a removed line with a near-copy elsewhere is reported with its twin", () => {
  const dir = repo(base);
  edit(dir, "src/invoice.js", fixInvoice);
  const report = twins({ cwd: dir });
  assert.equal(report.withTwins, 1);
  assert.equal(report.removed[0].path, "src/invoice.js");
  assert.equal(report.removed[0].line, 2);
  assert.deepEqual(report.removed[0].twins.map((t) => [t.path, t.line]), [["src/statement.js", 2]]);
  const text = render(report);
  assert.match(text, /^twins of the working tree against HEAD: 1 removed lines checked, 1 with twins$/m);
  assert.match(text, /^removed  src\/invoice\.js:2  return invoice\.gross - invoice\.refunds;$/m);
  assert.match(text, /^  twin  src\/statement\.js:2  return statement\.gross - statement\.refunds;$/m);
  assert.match(text, /Candidates only: same shape as a line this change removed\./);
});

test("a twin that the same change also rewrote is not reported", () => {
  const dir = repo(base);
  edit(dir, "src/invoice.js", fixInvoice);
  // Same shape as the removed line, and it is an added line of this change: it is not a twin.
  edit(dir, "src/statement.js", "export function balance(statement) {\n  return  statement.gross - statement.refunds;\n}\n");
  const report = twins({ cwd: dir });
  assert.equal(report.checked, 2);
  assert.equal(report.withTwins, 0);
  assert.doesNotMatch(render(report), /^  twin  /m);
});

test("comment, short, export and punctuation-only removed lines are ignored", () => {
  const dir = repo({
    "src/rules.js": "// bonus = gross - refunds + fee;\nexport const twice = (n) => n * 2;\na = b - c;\n}) && ({}) || ( [] );\n",
    "src/copy.js": "// bonus = gross - refunds + fee;\nexport const thrice = (n) => n * 3;\na = b - c;\n}) && ({}) || ( [] );\n",
  });
  edit(dir, "src/rules.js", "\n");
  const report = twins({ cwd: dir });
  assert.equal(report.checked, 0);
  assert.equal(report.withTwins, 0);
});

test("a Python near-copy is found by the same shape", () => {
  const dir = repo({
    "src/tally.py": "def tally(sold, price_per_unit, tax):\n    total = sold * price_per_unit + tax\n    return total\n",
    "src/report.py": "def report(units, unit_price, fee):\n    total = units * unit_price + fee\n    return total\n",
  });
  edit(dir, "src/tally.py", "def tally(sold, price_per_unit, tax):\n    return total\n");
  const report = twins({ cwd: dir });
  assert.equal(report.withTwins, 1);
  assert.deepEqual(report.removed[0].twins.map((t) => [t.path, t.line]), [["src/report.py", 2]]);
});

test("no twins: the header says 0 with twins and lists none", () => {
  const dir = repo({
    "src/invoice.js": base["src/invoice.js"],
    "src/statement.js": "export function name(statement) {\n  return statement.name.toUpperCase();\n}\n",
  });
  edit(dir, "src/invoice.js", fixInvoice);
  const report = twins({ cwd: dir });
  assert.equal(report.checked, 1);
  assert.match(render(report), /: 1 removed lines checked, 0 with twins$/m);
  assert.doesNotMatch(render(report), /^  twin  /m);
});

test("a clean repository reads nothing and says so in one line", () => {
  const dir = repo(base);
  const report = twins({ cwd: dir });
  assert.equal(report.checked, 0);
  assert.equal(render(report), "twins: nothing to compare (no staged change, no working-tree change and no parent commit)");
});

test("a removed line in a test file is ignored even when a copy exists elsewhere", () => {
  const dir = repo({
    "src/statement.js": base["src/statement.js"],
    "test/invoice.test.js": "test(\"gross\", () => {\n  return ledger.gross - ledger.refunds;\n});\n",
  });
  edit(dir, "test/invoice.test.js", "test(\"gross\", () => {\n});\n");
  const report = twins({ cwd: dir });
  assert.equal(report.checked, 0);
  assert.equal(report.withTwins, 0);
});

test("the json report carries the removed lines, their twins and the counts", () => {
  const dir = repo(base);
  edit(dir, "src/invoice.js", fixInvoice);
  const ok = spawnSync("node", [CLI, "twins", "--json"], { cwd: dir, encoding: "utf8" });
  assert.equal(ok.status, 0);
  const report = JSON.parse(ok.stdout);
  assert.equal(report.label, "the working tree against HEAD");
  assert.equal(report.checked, 1);
  assert.equal(report.withTwins, 1);
  assert.equal(report.removed[0].path, "src/invoice.js");
  assert.equal(report.removed[0].twins[0].path, "src/statement.js");
});

test("a git failure prints git's first stderr line, exits 2, and shows no usage block", () => {
  const dir = repo(base);
  const bad = spawnSync("node", [CLI, "twins", "no-such-ref..HEAD"], { cwd: dir, encoding: "utf8" });
  assert.equal(bad.status, 2);
  assert.match(bad.stderr, /^fatal: /);
  assert.equal(bad.stderr.trimEnd().split("\n").length, 1);
  assert.doesNotMatch(bad.stderr, /usage:/);
});

test("with --json a git failure is printed as an error object", () => {
  const dir = repo(base);
  const bad = spawnSync("node", [CLI, "twins", "no-such-ref..HEAD", "--json"], { cwd: dir, encoding: "utf8" });
  assert.equal(bad.status, 2);
  assert.match(JSON.parse(bad.stdout).error, /^fatal: /);
});

test("wrong arguments print the usage block with exit 2", () => {
  const dir = repo(base);
  const bad = spawnSync("node", [CLI, "twins", "--nope"], { cwd: dir, encoding: "utf8" });
  assert.equal(bad.status, 2);
  assert.match(bad.stderr, /usage: product-engineer twins/);
});

test("at most ten removed lines and five twins each are shown, the rest counted", () => {
  const removedSource = Array.from({ length: 12 }, (_, i) => `  return item${i}.gross - item${i}.refunds;`).join("\n") + "\n";
  const copies = Array.from({ length: 6 }, (_, i) => `  return other${i}.gross - other${i}.refunds;`).join("\n") + "\n";
  const dir = repo({ "src/many.js": removedSource, "src/copies.js": copies });
  edit(dir, "src/many.js", "\n");
  const report = twins({ cwd: dir });
  assert.equal(report.checked, 12);
  assert.equal(report.withTwins, 12);
  const text = render(report);
  assert.equal(text.match(/^removed  /gm).length, 10);
  assert.equal(text.match(/^  twin  /gm).length, 50);
  assert.match(text, /^  \.\.\. 1 more twin$/m);
});

test("removed lines are listed sorted by path", () => {
  const dir = repo({
    "src/b.js": "export function b(x) {\n  return x.gross - x.refunds;\n}\n",
    "src/a.js": "export function a(x) {\n  return x.total - x.paid;\n}\n",
    "src/copy.js": "  return q.gross - q.refunds;\n  return s.total - s.paid;\n",
  });
  edit(dir, "src/b.js", "export function b(x) {\n}\n");
  edit(dir, "src/a.js", "export function a(x) {\n}\n");
  const report = twins({ cwd: dir });
  assert.deepEqual(report.removed.map((r) => r.path), ["src/a.js", "src/b.js"]);
});

test("shape strips strings and numbers, keeps call names and keywords, and drops a trailing separator", () => {
  assert.equal(shapeOf("const total = invoice.gross * 2;"), "const $=$*$");
  assert.equal(shapeOf('msg = "Invite for " + name;'), '$=""+$');
  assert.equal(shapeOf("return Math.floor(total / 2);"), "return $.floor($/$)");
  assert.equal(shapeOf("if (a.b === c) return d;"), "if($===$)return $");
  assert.equal(shapeOf("total = v2 - x1;"), "$=$-$");
});

test("numbers and identifiers share one placeholder, so a magic number matches a variable", () => {
  assert.equal(shapeOf("const n = Math.floor(rows.length / 25);"), shapeOf("const n = Math.floor(count / size);"));
  assert.equal(shapeOf("x + 1"), shapeOf("x + y"));
  assert.equal(shapeOf("x + 1"), "$+$");
});

test("whitespace around operators is not part of the shape, and a negative literal is one literal", () => {
  assert.equal(shapeOf("a+1"), shapeOf("a + 1"));
  assert.equal(shapeOf("x = -1"), shapeOf("x = 7"));
  assert.equal(shapeOf("f(-1)"), "f($)");
  assert.equal(shapeOf("x -1"), shapeOf("x - 1"));
  assert.notEqual(shapeOf("x - 1"), shapeOf("x + 1"));
});

test("only the last segment of a dotted callee is kept", () => {
  assert.equal(shapeOf("this.items.push(x)"), "$.push($)");
  assert.equal(shapeOf("this.items.push(x)"), shapeOf("list.push(y)"));
  assert.equal(shapeOf("foo(x)"), "foo($)");
});

test("a trailing line comment is stripped in each comment style, but not inside a string", () => {
  assert.equal(shapeOf("return a.gross - a.refunds; // note"), shapeOf("return b.gross - b.refunds;"));
  assert.equal(shapeOf("total = sold * price # note", "py"), shapeOf("total = units * price", "py"));
  assert.equal(shapeOf("x = a - b -- note", "sql"), shapeOf("x = c - d", "sql"));
  assert.equal(shapeOf('msg = "a // b";'), shapeOf('msg = "c // d";'));
  assert.notEqual(shapeOf('msg = "a // b";'), shapeOf("msg = a"));
});

test("a regex literal or a nested template falls back to a conservative shape", () => {
  assert.doesNotMatch(shapeOf("x = s.replace(/a+/g, '')"), /\//);
  assert.equal(shapeOf("const s = `a ${`b`} c`;"), shapeOf("const t = `x ${`y`} z`;"));
});

test("identifiers use Unicode letters", () => {
  assert.equal(shapeOf("café + 1"), shapeOf("naïve + 2"));
});

test("a 300000-character unterminated string is shaped in linear time", () => {
  const line = 'x = "' + '\\"'.repeat(150000);
  const started = Date.now();
  shapeOf(line);
  const elapsed = Date.now() - started;
  assert.ok(elapsed < 500, `took ${elapsed} ms`);
});

test("a line over 2000 characters is neither a removed line nor a twin", () => {
  const long = "  return a.gross - a.refunds" + " ".repeat(2000) + ";\n";
  const dir = repo({ ...base, "src/long.js": long });
  edit(dir, "src/invoice.js", fixInvoice);
  edit(dir, "src/long.js", "\n");
  const report = twins({ cwd: dir });
  assert.equal(report.checked, 1);
  assert.deepEqual(report.removed[0].twins.map((t) => t.path), ["src/statement.js"]);
  const copyOnly = repo({ ...base, "src/long.js": long });
  edit(copyOnly, "src/invoice.js", fixInvoice);
  assert.equal(twins({ cwd: copyOnly }).removed[0].twins.length, 1);
});

test("a 300000-character unterminated string line in the repository is read in under 500 ms", () => {
  const huge = '  return a = "' + '\\"'.repeat(150000) + "\n";
  const dir = repo({ "src/huge.js": huge, "src/other.js": "  return b = 1;\n" });
  edit(dir, "src/huge.js", "\n");
  const started = Date.now();
  const report = twins({ cwd: dir });
  const elapsed = Date.now() - started;
  assert.equal(report.checked, 0);
  assert.ok(elapsed < 500, `took ${elapsed} ms`);
});

test("a removed loop header or bare if is not a candidate, even with other loops in the repository", () => {
  const dir = repo({
    "src/loops.js": "for (let i = 0; i < rows.length; i++) {\n  total += rows[i];\n}\nfor (let j = 0; j < items.length; j++) {\n  sum += items[j];\n}\nif (x.gross < y.max) {\n  z();\n}\nif (w.gross < v.max) {\n  z();\n}\n",
  });
  edit(dir, "src/loops.js", "  total += rows[i];\n}\nfor (let j = 0; j < items.length; j++) {\n  sum += items[j];\n}\n  z();\n}\nif (w.gross < v.max) {\n  z();\n}\n");
  const report = twins({ cwd: dir });
  assert.equal(report.checked, 0);
  assert.equal(report.withTwins, 0);
});

test("yaml, yml and json files are not searched for twins", () => {
  const copy = "  return statement.gross - statement.refunds;\n";
  const dir = repo({ ...base, "config/rules.yaml": copy, "config/rules.yml": copy, "config/rules.json": copy });
  edit(dir, "src/invoice.js", fixInvoice);
  const report = twins({ cwd: dir });
  assert.equal(report.withTwins, 1);
  assert.deepEqual(report.removed[0].twins.map((t) => t.path), ["src/statement.js"]);
});

test("a staged change is searched against the index, not the working tree", () => {
  const dir = repo(base);
  edit(dir, "src/invoice.js", fixInvoice);
  run(dir, "add", "src/invoice.js");
  edit(dir, "src/statement.js", "export function balance(statement) {\n  return statement.name;\n}\n");
  const report = twins({ cwd: dir });
  assert.equal(report.label, "the staged change");
  assert.deepEqual(report.removed[0].twins.map((t) => [t.path, t.line]), [["src/statement.js", 2]]);
});

test("the working-tree check also reads untracked code files", () => {
  const dir = repo(base);
  edit(dir, "src/invoice.js", fixInvoice);
  edit(dir, "src/fresh.js", "export function fresh(s) {\n  return s.gross - s.refunds;\n}\n");
  const report = twins({ cwd: dir });
  assert.deepEqual(report.removed[0].twins.map((t) => t.path).sort(), ["src/fresh.js", "src/statement.js"]);
});

test("a range is searched at its end commit, not the working tree", () => {
  const dir = repo(base);
  edit(dir, "src/invoice.js", fixInvoice);
  run(dir, "add", "-A");
  run(dir, "commit", "-q", "-m", "fix");
  edit(dir, "src/statement.js", "export function balance(statement) {\n  return statement.name;\n}\n");
  const report = twins({ range: "HEAD~1..HEAD", cwd: dir });
  assert.deepEqual(report.removed[0].twins.map((t) => [t.path, t.line]), [["src/statement.js", 2]]);
});

test("a line is significant only with a call or an operator, and not with bare assignment", () => {
  assert.equal(significant("$ = $"), false);
  assert.equal(significant("$ = $ ? $ : $"), false);
  assert.equal(significant("$ = $ + $"), true);
  assert.equal(significant("return load($)"), true);
  assert.equal(significant("if ($) $"), false);
});

test("a shape with fewer than four tokens is not significant, even with an operator", () => {
  assert.equal(significant("$-$"), false);
  assert.equal(significant("f($)"), true);
});

test("a large repository is read in well under the time limit", () => {
  const files = {};
  for (let i = 0; i < 3000; i++) {
    const lines = [];
    for (let j = 0; j < 20; j++) lines.push(`  const value${i}_${j} = input${i}_${j} + offset${j} * ${j};`);
    files[`src/mod-${i}.js`] = lines.join("\n") + "\n";
  }
  files["src/target.js"] = "export function t(x) {\n  return x.gross - x.refunds;\n}\n";
  const dir = repo(files);
  edit(dir, "src/target.js", "export function t(x) {\n}\n");
  const started = Date.now();
  const report = twins({ cwd: dir });
  const elapsed = Date.now() - started;
  assert.equal(report.checked, 1);
  assert.ok(elapsed < 8000, `took ${elapsed} ms`);
});

test("vendored, minified, lock, binary and oversized files are not searched", () => {
  const copy = "  return statement.gross - statement.refunds;\n";
  const dir = repo({
    ...base,
    "node_modules/dep/index.js": copy,
    "vendor/lib.js": copy,
    "dist/app.min.js": copy,
    "package-lock.json": copy,
    "src/data.bin": `\0\n${copy}`,
    "src/huge.js": copy + "x".repeat(1024 * 1024 + 10) + "\n",
  });
  edit(dir, "src/invoice.js", fixInvoice);
  const report = twins({ cwd: dir });
  assert.equal(report.checked, 1);
  assert.equal(report.withTwins, 1);
  assert.deepEqual(report.removed[0].twins.map((t) => t.path), ["src/statement.js"]);
});

const LOOSE_BASE = {
  "src/rates.js": "export function charge(line) {\n  return Math.floor(line.cents * (line.rate / 100));\n}\n",
  "src/fees.js": "export function fee(order) {\n  return Math.floor(order.cents * order.pct / 100);\n}\n",
};
const dropFeeReturn = (dir) => edit(dir, "src/fees.js", "export function fee(order) {\n  return 0;\n}\n");

test("a copy that differs only in parentheses or operand order is a loose twin, tagged in the output", () => {
  const dir = repo(LOOSE_BASE);
  dropFeeReturn(dir);
  const report = twins({ cwd: dir });
  assert.equal(report.withTwins, 1);
  assert.deepEqual(report.removed[0].twins, []);
  assert.deepEqual(report.removed[0].loose.map((t) => [t.path, t.line]), [["src/rates.js", 2]]);
  const text = render(report);
  assert.match(text, /^  twin  src\/rates\.js:2  return Math\.floor\(line\.cents \* \(line\.rate \/ 100\)\);  \(looser match\)$/m);
  const json = spawnSync("node", [CLI, "twins", "--json"], { cwd: dir, encoding: "utf8" });
  assert.deepEqual(JSON.parse(json.stdout).removed[0].loose.map((t) => t.path), ["src/rates.js"]);
});

test("an exact twin is not repeated as a loose one, and exact twins print before loose ones", () => {
  const dir = repo({
    ...LOOSE_BASE,
    "src/copy.js": "  return Math.floor(order.cents * order.pct / 100);\n",
  });
  dropFeeReturn(dir);
  const report = twins({ cwd: dir });
  assert.deepEqual(report.removed[0].twins.map((t) => t.path), ["src/copy.js"]);
  assert.deepEqual(report.removed[0].loose.map((t) => t.path), ["src/rates.js"]);
  const lines = render(report).split("\n");
  assert.ok(lines.findIndex((l) => l.includes("src/copy.js")) < lines.findIndex((l) => l.includes("(looser match)")));
});

test("a loose match is capped at three per removed line", () => {
  const copies = Array.from({ length: 5 }, (_, i) => `  return Math.floor(q${i}.c * (q${i}.r / 100));`).join("\n") + "\n";
  const dir = repo({ "src/fees.js": LOOSE_BASE["src/fees.js"], "src/many.js": copies });
  dropFeeReturn(dir);
  const report = twins({ cwd: dir });
  assert.equal(report.removed[0].loose.length, 3);
  assert.equal(render(report).match(/\(looser match\)$/gm).length, 3);
});

test("the same call with a different operator, and a line with no call, are not loose twins", () => {
  const dir = repo({
    "src/pick.js": "export function pick(p) {\n  return Math.max(p.a + p.b, p.c);\n}\n",
    "src/other.js": "export function other(p) {\n  return Math.max(p.a * p.b, p.c);\n}\n",
    "src/mul.js": "export function mul(x) {\n  return x.a * x.b / x.c;\n}\n",
    "src/par.js": "export function par(x) {\n  return x.a * (x.b / x.c);\n}\n",
  });
  edit(dir, "src/pick.js", "export function pick(p) {\n}\n");
  edit(dir, "src/mul.js", "export function mul(x) {\n}\n");
  const report = twins({ cwd: dir });
  assert.equal(report.checked, 2);
  assert.equal(report.withTwins, 0);
  assert.doesNotMatch(render(report), /looser match/);
});

test("bagOf needs a call and two operators or a division or modulo; parentheses and operand order do not change it", () => {
  assert.equal(bagOf("return $.floor($*$/$)"), bagOf("return $.floor($*($/$))"));
  assert.equal(bagOf("return $*$/$"), null);
  assert.equal(bagOf("return f($+$)"), null);
  assert.notEqual(bagOf("return f($+$+$)"), bagOf("return f($*$+$)"));
  assert.notEqual(bagOf("return f($+$+$)"), bagOf("return f($+$)"));
});

test("declaredIn reads function, def, class, const and method names, and skips keywords and short names", () => {
  assert.deepEqual(declaredIn("export function grossTotal(invoice) {"), ["grossTotal"]);
  assert.deepEqual(declaredIn("def tally_rows(rows):"), ["tally_rows"]);
  assert.deepEqual(declaredIn("class LedgerView {"), ["LedgerView"]);
  assert.deepEqual(declaredIn("const rateTable = build();"), ["rateTable"]);
  assert.deepEqual(declaredIn("  computeTax(items) {"), ["computeTax"]);
  assert.deepEqual(declaredIn("if (ready) {"), []);
  assert.deepEqual(declaredIn("const fee = 2;"), []);
});

const MENTION_BASE = {
  "src/invoice.js": "// grossTotal is the figure before refunds\nexport function grossTotal(invoice) {\n  return invoice.gross - invoice.refunds;\n}\n",
};
const editMention = (dir) => edit(dir, "src/invoice.js", "// grossTotal is the figure before refunds\nexport function grossTotal(invoice) {\n  return invoice.gross - invoice.refunds - invoice.fees;\n}\n");

test("a comment or doc line in another file that names the changed function is a mention; the doc one is marked", () => {
  const dir = repo({
    ...MENTION_BASE,
    "src/report.js": "// grossTotal is shown on the statement\nexport const shown = 1;\n",
    "docs/guide.md": "The grossTotal figure is rounded.\n",
  });
  editMention(dir);
  const report = twins({ cwd: dir });
  assert.deepEqual(report.mentions.map((m) => [m.path, m.line, m.doc]), [["docs/guide.md", 1, true], ["src/report.js", 1, false]]);
  assert.match(render(report), /^comments that mention the changed name:$/m);
  assert.match(render(report), /^mention  docs\/guide\.md:1 \(doc\)  The grossTotal figure is rounded\.$/m);
});

test("a name inside a longer word, a code line that is not a comment, and the changed file itself are not mentions", () => {
  const dir = repo({
    ...MENTION_BASE,
    "src/calc.js": "const grossTotalCents = 1;\n// grossTotalCents differs\n",
    "src/code.js": "export const y = grossTotal(1);\n",
  });
  editMention(dir);
  assert.deepEqual(twins({ cwd: dir }).mentions, []);
});

test("a name is mentioned at most five times", () => {
  const files = {};
  for (let i = 0; i < 7; i++) files[`src/n${i}.js`] = `// grossTotal copy ${i}\nexport const v${i} = ${i};\n`;
  const dir = repo({ ...MENTION_BASE, ...files });
  editMention(dir);
  assert.equal(twins({ cwd: dir }).mentions.length, 5);
});

test("a removed line in a doc is not searched for", () => {
  const dir = repo({ ...base, "docs/notes.md": "  return invoice.gross - invoice.refunds;\n" });
  edit(dir, "docs/notes.md", "\n");
  const report = twins({ cwd: dir });
  assert.equal(report.checked, 0);
  assert.equal(report.withTwins, 0);
});

// Stale values: a number the change replaced, still written next to the same words in another file.
const limits = {
  "src/limits.js": "export const MAX_UPLOAD_MB = 25;\n// Uploads larger than 25 MB are rejected.\n",
  "docs/upload.md": "Uploads larger than 25 MB are rejected by the server.\n",
  "docs/other.md": "The cache keeps 25 entries per user.\n",
  "CHANGELOG.md": "- Uploads larger than 25 MB are rejected.\n",
};

test("an old value still written beside the same words in another file is reported", () => {
  const dir = repo(limits);
  edit(dir, "src/limits.js", "export const MAX_UPLOAD_MB = 50;\n// Uploads larger than 50 MB are rejected.\n");
  const report = twins({ cwd: dir });
  const where = report.stale.map((s) => `${s.path}:${s.line}`);
  assert.deepEqual(where, ["docs/upload.md:1"]);
  assert.equal(report.stale[0].from, "25");
  assert.equal(report.stale[0].to, "50");
  assert.match(render(report), /^stale  docs\/upload\.md:1  25 -> 50  /m);
});

test("a line with the old value but other words, a changelog line and a line that already has the new value are not reported", () => {
  const dir = repo({ ...limits, "docs/both.md": "Uploads larger than 25 MB (now 50 MB) are rejected.\n" });
  edit(dir, "src/limits.js", "export const MAX_UPLOAD_MB = 50;\n// Uploads larger than 50 MB are rejected.\n");
  const paths = twins({ cwd: dir }).stale.map((s) => s.path);
  assert.ok(!paths.includes("docs/other.md"));
  assert.ok(!paths.includes("CHANGELOG.md"));
  assert.ok(!paths.includes("docs/both.md"));
});

test("a number that did not change, or a change that adds no number, reports nothing", () => {
  const dir = repo(limits);
  edit(dir, "src/limits.js", "export const MAX_UPLOAD_MB = 25;\n// Uploads above 25 MB are refused.\n");
  assert.deepEqual(twins({ cwd: dir }).stale, []);
});
