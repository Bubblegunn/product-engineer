import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { mkdtempSync, writeFileSync, rmSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { analyse, exitCode, render, commentBody, kindFrom } from "../bin/check.mjs";
import { shippedHeadings } from "../bin/headings.mjs";

const cli = join(dirname(fileURLToPath(import.meta.url)), "..", "bin", "check.mjs");
const levels = (r) => r.findings.map((f) => f.level);
const has = (r, level, re) => r.findings.some((f) => f.level === level && re.test(f.message));

const full = `feat: export bookings

For the customer:
What changed: Accountants can download all bookings for a month as a spreadsheet.
Why it matters: They asked for this every month and typed it by hand.
Automation effect: The monthly copy-paste into the spreadsheet is gone.

Not shipped:
- Scheduled email of the export: nobody has asked; worth it when two customers do.
`;

test("the block gets a readability line as information only", () => {
  assert.ok(has(analyse(full), "info", /Flesch \d+/));
  assert.ok(has(analyse(full, { lang: "tr" }), "info", /Ateşman/));
  assert.equal(exitCode(analyse(full)), 0);
});

test("a full block passes with no errors", () => {
  const r = analyse(full);
  assert.equal(exitCode(r), 0);
  assert.ok(has(r, "ok", /block with "What changed:"/));
  assert.ok(has(r, "ok", /Why it matters/));
  assert.ok(has(r, "ok", /Automation effect:" present/));
  assert.ok(has(r, "ok", /Not shipped:" lists 1 item with reasons/));
  assert.ok(!levels(r).includes("error"));
});

test("a missing block is an error, or a warning with --warn", () => {
  const r = analyse("feat: thing without the block\n");
  assert.equal(exitCode(r), 1);
  assert.ok(has(r, "error", /no "For the customer:" block/));
  const w = analyse("feat: thing without the block\n", { warn: true });
  assert.equal(exitCode(w), 0);
  assert.ok(has(w, "warn", /no "For the customer:" block/));
});

test("a heading without What changed is an error; a missing Why it matters is a warning", () => {
  const r = analyse("feat: x\n\nFor the customer:\nWhy it matters: because\n");
  assert.ok(has(r, "error", /no "What changed:" line/));
  const w = analyse("feat: x\n\nFor the customer:\nWhat changed: People can export.\n");
  assert.equal(exitCode(w), 0);
  assert.ok(has(w, "warn", /Why it matters:" missing/));
});

test("an empty Automation effect line is an error; an omitted one is fine", () => {
  const r = analyse("feat: x\n\nFor the customer:\nWhat changed: A.\nWhy it matters: B.\nAutomation effect:\n");
  assert.ok(has(r, "error", /Automation effect:" is present but empty/));
  const ok = analyse("feat: x\n\nFor the customer:\nWhat changed: A.\nWhy it matters: B.\n");
  assert.ok(has(ok, "ok", /omitted/));
});

test("Not shipped items need a thing and a reason", () => {
  const r = analyse("feat: x\n\nFor the customer:\nWhat changed: A.\nWhy it matters: B.\n\nNot shipped:\n- just a thing\n");
  assert.ok(has(r, "warn", /items should read/));
  const e = analyse("feat: x\n\nFor the customer:\nWhat changed: A.\nWhy it matters: B.\n\nNot shipped:\n");
  assert.ok(has(e, "warn", /has no items/));
});

test("numbers without a method or scope in the sentence are warned; numbers with one are not", () => {
  const bare = analyse("feat: x\n\nWe made it 40 percent faster.\n\nFor the customer:\nWhat changed: A.\nWhy it matters: B.\n");
  assert.ok(has(bare, "warn", /number and no method/));
  const counted = analyse("feat: x\n\nThe list opens in 0.8s instead of 3s, measured with the browser profiler.\n\nFor the customer:\nWhat changed: A.\nWhy it matters: B.\n");
  assert.ok(!has(counted, "warn", /number and no method/));
});

test("jargon in the block is warned unless explained on the line", () => {
  const j = analyse("feat: x\n\nFor the customer:\nWhat changed: The webhook is now idempotent.\nWhy it matters: B.\n");
  assert.ok(has(j, "warn", /jargon.*idempotent/));
  const e = analyse("feat: x\n\nFor the customer:\nWhat changed: The webhook is idempotent (doing it twice has the same result as once).\nWhy it matters: B.\n");
  assert.ok(!has(e, "warn", /jargon/));
});

test("merge, fixup, revert and [no-customer] are skipped", () => {
  for (const msg of ["Merge branch 'x'", "fixup! feat", "Revert \"feat\"", "chore: deps [no-customer]"]) {
    const r = analyse(msg + "\n");
    assert.equal(r.skipped, true, msg);
    assert.equal(exitCode(r), 0);
  }
});

test("the CLI exits 1 on a missing block, 0 with --warn, 2 on usage, and reads stdin", () => {
  const bad = spawnSync("node", [cli, "check", "-"], { input: "feat: nothing\n", encoding: "utf8" });
  assert.equal(bad.status, 1);
  assert.match(bad.stdout, /1 error/);
  const warn = spawnSync("node", [cli, "check", "-", "--warn"], { input: "feat: nothing\n", encoding: "utf8" });
  assert.equal(warn.status, 0);
  const good = spawnSync("node", [cli, "check", "-"], { input: full, encoding: "utf8" });
  assert.equal(good.status, 0, good.stdout + good.stderr);
  assert.match(good.stdout, /no errors/);
  const usage = spawnSync("node", [cli, "check", "/definitely/not/a/file.txt"], { encoding: "utf8" });
  assert.equal(usage.status, 2);
  const help = execFileSync("node", [cli, "--help"], { encoding: "utf8" });
  assert.match(help, /usage: product-engineer check/);
  assert.match(render(analyse(full)), /no errors/);
});

const testsAsEvidence = `fix: badge count

For the customer:
What changed: The bell no longer counts things the system handled by itself.
Why it matters: All 42 tests pass, so the count is right now.
`;

test("passing tests in the block are not an observation", () => {
  const r = analyse(testsAsEvidence);
  assert.ok(has(r, "warn", /offers passing tests as the evidence/));
});

test("a real observation next to the test count clears it", () => {
  const withObservation = testsAsEvidence.replace(
    "All 42 tests pass, so the count is right now.",
    "I watched the badge on a staging device: it stayed at two while the system wrote three of its own events. All 42 tests pass as well.",
  );
  const r = analyse(withObservation);
  assert.ok(!has(r, "warn", /offers passing tests as the evidence/));
});

test("describing added tests is not offering them as evidence", () => {
  const describes = full.replace(
    "What changed: Accountants can download all bookings for a month as a spreadsheet.",
    "What changed: Accountants can download all bookings for a month as a spreadsheet, covered by 7 new tests.",
  );
  assert.ok(!has(analyse(describes), "warn", /offers passing tests as the evidence/));
});

// --- the block may be written in the team's language ---

const trBlock = `feat(rapor): aylık rezervasyonları CSV olarak dışa aktar

Müşteri için:
Ne değişti: Muhasebeciler bir aylık rezervasyonu tablo olarak indirebiliyor.
Neden önemli: Bunu her ay elle yazıyorlardı.
`;

test("a shipped language is accepted with no configuration", () => {
  const r = analyse(trBlock);
  assert.equal(exitCode(r), 0, JSON.stringify(r.findings));
  assert.ok(has(r, "ok", /"Müşteri için:" block with "Ne değişti:"/));
  assert.ok(has(r, "ok", /"Neden önemli:" present/));
});

test("a fullwidth colon is the same heading", () => {
  const zh = "feat: x\n\n给客户：\n改动内容： 会计可以下载一个月的预订记录。\n";
  const r = analyse(zh);
  assert.equal(exitCode(r), 0, JSON.stringify(r.findings));
});

test("English is unchanged and is still what a missing block is named after", () => {
  const r = analyse("feat: nothing here\n");
  assert.ok(has(r, "error", /^no "For the customer:" block$/));
});

test("a team configures a heading the table does not ship", () => {
  const dir = mkdtempSync(join(tmpdir(), "pe-headings-"));
  writeFileSync(join(dir, ".product-engineer.json"), JSON.stringify({ headings: { block: "Für den Kunden:", what: "Was sich geändert hat:", why: "Warum es wichtig ist:" } }));
  const de = "feat: x\n\nFür den Kunden:\nWas sich geändert hat: Buchungen lassen sich laden.\nWarum es wichtig ist: Das war Handarbeit.\n";
  assert.equal(exitCode(analyse(de, { cwd: dir })), 0);
  // the shipped rows stay accepted beside it
  assert.equal(exitCode(analyse(full, { cwd: dir })), 0);
  // and a missing block is named after the team's own heading
  assert.ok(has(analyse("feat: nothing\n", { cwd: dir }), "error", /^no "Für den Kunden:" block$/));
  rmSync(dir, { recursive: true, force: true });
});

test("the paste template follows the configured heading", () => {
  const de = { language: "custom", block: "Für den Kunden:", what: "Was sich geändert hat:", why: "Warum es wichtig ist:", automation: "Automatisierungseffekt:", notShipped: "Nicht geliefert:" };
  const body = commentBody(analyse("feat: nothing\n", { headings: de }), "0.0.0", { headings: de });
  assert.match(body, /Für den Kunden:\nWas sich geändert hat: </);
  assert.doesNotMatch(body, /For the customer/);
});

test("the hook, the table and the check agree on every shipped heading", () => {
  const hook = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "..", "scripts", "commit-msg"), "utf8");
  for (const row of shippedHeadings()) {
    assert.ok(hook.includes(row.block.replace(/:$/, "")), `hook is missing ${row.block}`);
    assert.ok(hook.includes(row.what.replace(/:$/, "")), `hook is missing ${row.what}`);
    const message = `feat: x\n\n${row.block}\n${row.what} something a person notices.\n`;
    assert.equal(exitCode(analyse(message)), 0, `check rejects ${row.language}`);
  }
});

test("a block in a script the formulas cannot read gets a refusal, not a score", () => {
  const ja = "feat: x\n\nお客さまへ:\n変わったこと: 経理担当者が一か月分の予約を取得できます。\n";
  const r = analyse(ja);
  assert.equal(exitCode(r), 0, JSON.stringify(r.findings));
  assert.ok(has(r, "info", /not scored, because Japanese/));
  assert.ok(!has(r, "info", /Flesch 0/));
});

test("a sentence ends at an ideographic full stop too", () => {
  const ja = "feat: x\n\nお客さまへ:\n変わったこと: 経理担当者が3か月分の予約を取得できます。これは毎月の手作業でした。\n";
  const warn = analyse(ja).findings.find((f) => /sentence with a number/.test(f.message));
  assert.ok(warn, "the heuristic still fires");
  assert.ok(!warn.message.includes("これは毎月"), "the excerpt stops at the full stop instead of swallowing the block");
});

test("template command prints the block in English, --lang, and configured language", () => {
  const en = execFileSync("node", [cli, "template"], { encoding: "utf8" });
  assert.match(en, /^For the customer:\nWhat changed: </);
  assert.match(en, /Why it matters: </);

  const tr = execFileSync("node", [cli, "template", "--lang", "tr"], { encoding: "utf8" });
  assert.match(tr, /^Müşteri için:\nNe değişti: </);

  const ja = execFileSync("node", [cli, "template", "--lang", "ja"], { encoding: "utf8" });
  assert.match(ja, /^お客さまへ:\n変わったこと: </);

  const zh = execFileSync("node", [cli, "template", "--lang", "zh"], { encoding: "utf8" });
  assert.match(zh, /^给客户:\n改动内容: </);

  const dir = mkdtempSync(join(tmpdir(), "product-engineer-tmpl-"));
  try {
    writeFileSync(
      join(dir, ".product-engineer.json"),
      JSON.stringify({ headings: { block: "Pour le client:", what: "Ce qui a changé:", why: "Pourquoi c'est important:", automation: "Effet d'automatisation:" } }),
    );
    const fr = execFileSync("node", [cli, "template"], { cwd: dir, encoding: "utf8" });
    assert.match(fr, /^Pour le client:\nCe qui a changé: </);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("an unfilled template fails check, and passes once filled in", () => {
  const en = execFileSync("node", [cli, "template"], { encoding: "utf8" });
  const messageUnfilled = `feat: add something\n\n${en}\n`;
  const resUnfilled = analyse(messageUnfilled);
  assert.equal(exitCode(resUnfilled), 1, "unfilled template must fail check");

  const messageFilled = `feat: add something\n\nFor the customer:\nWhat changed: Users can export their monthly data to CSV.\nWhy it matters: They requested this to automate reporting.\n`;
  const resFilled = analyse(messageFilled);
  assert.equal(exitCode(resFilled), 0, "filled template must pass check");
});


// --- --kind pr: in a pull request description the block comes first, so the first screen is the customer's ---

const techBody = Array.from({ length: 14 }, (_, i) => `Technical detail line ${i + 1} about the change.`).join("\n");
const prBlockAtEnd = `feat: export bookings\n\n${techBody}\n\nFor the customer:\nWhat changed: Accountants can download bookings.\nWhy it matters: They stopped copying them by hand.\n`;
const prBlockFirst = `feat: export bookings\n\nFor the customer:\nWhat changed: Accountants can download bookings.\nWhy it matters: They stopped copying them by hand.\n\n${techBody}\n`;

test("commit kind is the default and does not look at where the block starts", () => {
  const r = analyse(prBlockAtEnd);
  assert.ok(!has(r, "warn", /starts on line/), JSON.stringify(r.findings));
  assert.ok(!r.findings.some((f) => f.code === "block-not-first"));
  assert.ok(!r.findings.some((f) => f.code === "block-first"));
  assert.equal(exitCode(analyse(prBlockAtEnd, { kind: "commit" })), 0);
});

test("pr kind: a block that starts within the first 12 lines is an ok finding", () => {
  const r = analyse(prBlockFirst, { kind: "pr" });
  assert.equal(exitCode(r), 0);
  assert.ok(has(r, "ok", /block within the first 12 lines|block starts on line 3/), JSON.stringify(r.findings));
  assert.ok(!r.findings.some((f) => f.code === "block-not-first"));
});

test("pr kind: a block at the end warns block-not-first with its line number, and still exits 0", () => {
  const r = analyse(prBlockAtEnd, { kind: "pr" });
  const w = r.findings.find((f) => f.code === "block-not-first");
  assert.ok(w, JSON.stringify(r.findings));
  assert.equal(w.level, "warn");
  assert.match(w.message, /the For the customer block starts on line 18; in a pull request description put it first/);
  assert.equal(exitCode(r), 0);
  assert.ok(!r.findings.some((f) => f.level === "error"));
});

test("pr kind: a block starting on line 12 is still first, and line 13 is not", () => {
  const onTwelve = `feat: x\n${Array.from({ length: 10 }, (_, i) => `t${i}`).join("\n")}\nFor the customer:\nWhat changed: A.\nWhy it matters: B.\n`;
  assert.equal(onTwelve.split("\n").findIndex((l) => l === "For the customer:") + 1, 12);
  assert.ok(analyse(onTwelve, { kind: "pr" }).findings.some((f) => f.code === "block-first"));
  const onThirteen = `feat: x\n${Array.from({ length: 11 }, (_, i) => `t${i}`).join("\n")}\nFor the customer:\nWhat changed: A.\nWhy it matters: B.\n`;
  assert.equal(onThirteen.split("\n").findIndex((l) => l === "For the customer:") + 1, 13);
  assert.ok(analyse(onThirteen, { kind: "pr" }).findings.some((f) => f.code === "block-not-first"));
});

test("pr kind: a missing block is still an error, not a placement warning", () => {
  const r = analyse(`feat: x\n\n${techBody}\n`, { kind: "pr" });
  assert.equal(exitCode(r), 1);
  assert.ok(has(r, "error", /no "For the customer:" block/));
  assert.ok(!r.findings.some((f) => f.code === "block-not-first"));
});

test("the CLI takes --kind pr, rejects any other value with exit 2, and warns without failing", () => {
  const pr = spawnSync("node", [cli, "check", "-", "--kind", "pr"], { input: prBlockAtEnd, encoding: "utf8" });
  assert.equal(pr.status, 0, pr.stdout + pr.stderr);
  assert.match(pr.stdout, /starts on line 18/);
  const commit = spawnSync("node", [cli, "check", "-"], { input: prBlockAtEnd, encoding: "utf8" });
  assert.equal(commit.status, 0);
  assert.doesNotMatch(commit.stdout, /starts on line/);
  const bad = spawnSync("node", [cli, "check", "-", "--kind", "issue"], { input: prBlockAtEnd, encoding: "utf8" });
  assert.equal(bad.status, 2);
  assert.match(bad.stderr, /--kind must be commit or pr, got: issue/);
  const flagFirst = spawnSync("node", [cli, "check", "--kind", "pr", "-"], { input: prBlockFirst, encoding: "utf8" });
  assert.equal(flagFirst.status, 0, flagFirst.stdout + flagFirst.stderr);
  assert.match(flagFirst.stdout, /block within the first 12 lines|block starts on line 3/);
});

test("the help text documents --kind", () => {
  const help = execFileSync("node", [cli, "--help"], { encoding: "utf8" });
  assert.match(help, /--kind commit\|pr/);
  assert.match(help, /block-not-first|first 12 lines/);
});

// Fix round, final review. --kind takes its value after a space or with an equals sign, names the
// missing value, and --pr implies pr unless --kind is given.
test("kindFrom reads --kind with a space or an equals sign, says when the value is missing, and --pr implies pr", () => {
  assert.equal(kindFrom(["--kind", "pr"]), "pr");
  assert.equal(kindFrom(["--kind=pr"]), "pr");
  assert.equal(kindFrom(["-"]), "commit");
  assert.equal(kindFrom(["--pr", "12"]), "pr");
  assert.equal(kindFrom(["--pr", "12", "--kind", "commit"]), "commit");
  assert.throws(() => kindFrom(["--kind"]), /--kind needs a value \(commit or pr\)/);
  assert.throws(() => kindFrom(["--kind", "--warn"]), /--kind needs a value \(commit or pr\)/);
  assert.throws(() => kindFrom(["--kind=issue"]), /--kind must be commit or pr, got: issue/);
});

test("the CLI reports a missing --kind value with exit 2, and accepts --kind=pr", () => {
  const missing = spawnSync("node", [cli, "check", "-", "--kind"], { input: prBlockAtEnd, encoding: "utf8" });
  assert.equal(missing.status, 2);
  assert.match(missing.stderr, /--kind needs a value \(commit or pr\)/);
  const eq = spawnSync("node", [cli, "check", "-", "--kind=pr"], { input: prBlockAtEnd, encoding: "utf8" });
  assert.equal(eq.status, 0, eq.stdout + eq.stderr);
  assert.match(eq.stdout, /starts on line 18/);
});

test("the help text states the hint rules as the code applies them: doctor prints it unless -q is given", () => {
  const help = execFileSync("node", [cli, "--help"], { encoding: "utf8" });
  assert.match(help, /doctor \(which otherwise prints it\)/);
  assert.match(help, /stubs \(which accepts -q for this only\)/);
  assert.match(help, /--pr <n> implies --kind pr unless --kind is given/);
  assert.match(help, /product-engineer stubs \[--staged \| --range <a\.\.b>\] \[--json\] \[--warn\] \[-q\]/);
  assert.doesNotMatch(help, /doctor ignores it and prints no hint/);
});

// A refactor shows users no change, so its customer block may only say so. A benefit word there is
// a claim nobody measured.
const refactor = (what) => `refactor: move the price table into its own module

For the customer:
What changed: ${what}
Why it matters: Nothing you see changes; the team can find the prices more easily when they edit them.
`;

test("a refactor whose customer block claims a benefit warns refactor-benefit-claim and names the word", () => {
  const r = analyse(refactor("Nothing you see changes, but the pricing code is faster to read and cleaner."));
  const f = r.findings.filter((x) => x.code === "refactor-benefit-claim");
  assert.equal(f.length, 2, JSON.stringify(f));
  assert.ok(f.every((x) => x.level === "warn"));
  assert.ok(f.some((x) => /"faster"/.test(x.message)), JSON.stringify(f));
  assert.ok(f.some((x) => /"cleaner"/.test(x.message)), JSON.stringify(f));
});

test("a refactor whose customer block says only that users see no change does not warn refactor-benefit-claim", () => {
  const r = analyse(refactor("Users see no change."));
  assert.ok(!r.findings.some((x) => x.code === "refactor-benefit-claim"), JSON.stringify(r.findings));
});

test("a benefit word outside the customer block, or in a feature commit, is not a refactor claim", () => {
  const body = "feat: add a faster export\n\nFor the customer:\nWhat changed: The export is faster now.\nWhy it matters: Reception saves time.\n";
  assert.ok(!analyse(body).findings.some((x) => x.code === "refactor-benefit-claim"));
  const technical = refactor("Users see no change.") + "\nThe new lookup is faster, so the table is read once.\n";
  assert.ok(!analyse(technical).findings.some((x) => x.code === "refactor-benefit-claim"));
});

test("a benefit word that is part of a hyphenated name, or that a negation governs, is not a refactor claim", () => {
  const hyphen = analyse(refactor("Users see no change. The storage uses better-sqlite3 now."));
  assert.ok(!hyphen.findings.some((x) => x.code === "refactor-benefit-claim"), "a hyphenated name is not a claim: " + JSON.stringify(hyphen.findings));
  const negated = analyse(refactor("Users see no change in speed."));
  assert.ok(!negated.findings.some((x) => x.code === "refactor-benefit-claim"), "no change in speed is a negation");
  const nothing = analyse(refactor("Nothing is faster or slower for guests."));
  assert.ok(!nothing.findings.some((x) => x.code === "refactor-benefit-claim"), "nothing is faster is a negation");
  const plain = analyse(refactor("The screens are faster to load."));
  assert.ok(plain.findings.some((x) => x.code === "refactor-benefit-claim"), "an unnegated benefit still warns");
});

test("the --diff usage text names the fix-without-test check", () => {
  const help = execFileSync("node", [cli, "--help"], { encoding: "utf8" });
  assert.match(help, /a fix title with no test file touched/);
});

test("the negation window stops at punctuation and at but, just and only: a real claim after a negation still warns", () => {
  for (const what of ["no change, just faster.", "It is not slower, but faster.", "It is not slower but faster.", "No change. Faster.", "now faster and not slower", "the page is not slow, only faster."]) {
    const r = analyse(refactor(what));
    assert.ok(r.findings.some((x) => x.code === "refactor-benefit-claim"), what + " must warn");
  }
  const none = analyse(refactor("nothing is faster or slower"));
  assert.ok(!none.findings.some((x) => x.code === "refactor-benefit-claim"), "nothing is faster or slower must not warn");
});
