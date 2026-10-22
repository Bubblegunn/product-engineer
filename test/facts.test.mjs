import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { facts, runFacts, sentenceStats, numbersIn } from "../bin/facts.mjs";
import { maybeShowStarHint } from "../bin/star-hint.mjs";

const cli = join(dirname(fileURLToPath(import.meta.url)), "..", "bin", "check.mjs");

// A rental contract written for these tests. Its numbers and wording are not the benchmark's.
const SOURCE = `1. Tenant shall not sublet the flat without the Landlord's prior written consent.
2. Either party may terminate this Agreement by giving 45 days' written notice.
3. The Tenant must pay the rent of 800 euros by the fifth day of each month.
4. A late payment within 9 days of the due date is non-refundable.
Information marked confidential must not be shared with third parties.
`;

const REWRITE = `The tenant must not sublet the flat without the landlord's written permission.
Either side can end the agreement by giving 45 days' written notice.
The tenant must pay 800 euros of rent by the fifth day of each month.
A late payment within 9 days of the due date is not refundable.
Keep information marked confidential private; do not share it with third parties.
`;

test("a plain-language rewrite that keeps the numbers and obligations passes with exit 0", () => {
  const r = facts(SOURCE, REWRITE);
  assert.deepEqual(r.numbers.dropped, [], JSON.stringify(r.numbers));
  assert.deepEqual(r.numbers.added, [], JSON.stringify(r.numbers));
  assert.deepEqual(r.obligations.missing, [], JSON.stringify(r.obligations));
  assert.deepEqual(r.legalese, []);
  assert.equal(r.ok, true, JSON.stringify(r.violations));
});

test("a number dropped by the rewrite fails the check and is named", () => {
  const r = facts(SOURCE, REWRITE.replace("45 days'", "a few days'"));
  assert.deepEqual(r.numbers.dropped, ["45"]);
  assert.equal(r.ok, false);
});

test("a number the rewrite adds fails the check and is named", () => {
  const r = facts(SOURCE, REWRITE + "The landlord keeps 60 euros as a deposit.\n");
  assert.deepEqual(r.numbers.added, ["60"]);
  assert.equal(r.ok, false);
});

test("list markers, parenthesised clause numbers, named clause numbers and decimals are read as the rules say", () => {
  const text = "1. First item\n(2) second item at a line start\nClause 3 says nothing counted\nSection 4 too\nThe fee is 500.00 euros.\nThe fee is in part 60 days late.\n";
  assert.deepEqual(numbersIn(text), ["500", "60"]);
  const lowercase = "clause 2 is prose here\n";
  assert.deepEqual(numbersIn(lowercase), [], "references are case-insensitive since round 2");
  assert.deepEqual(numbersIn("12,000 bookings a year"), ["12000"]);
});

test("an obligation with no plain equivalent in the rewrite is listed as a warning and does not fail the check", () => {
  const r = facts(SOURCE, REWRITE.replace("The tenant must pay 800", "The tenant pays 800"));
  assert.ok(r.obligations.missing.some((o) => o.source === "must" && o.expected.includes("have to")), JSON.stringify(r.obligations));
  assert.equal(r.ok, true);
});

test("legalese left in the rewrite is listed as a warning and does not fail the check", () => {
  const r = facts(SOURCE, REWRITE + "The parties hereby agree to the above, notwithstanding any other term.\n");
  assert.deepEqual(r.legalese.sort(), ["hereby", "notwithstanding"]);
  assert.equal(r.ok, true);
});

test("sentences: a split is after a full stop, question mark or exclamation mark followed by a space or the end", () => {
  const s = sentenceStats("One two three. Four five six seven? Eight nine!\n\n- A list item with four words\n# A heading");
  assert.equal(s.count, 5);
  assert.equal(s.words, 17);
  assert.equal(s.longest, 6);
  assert.equal(s.average, 3.4);
});

test("a rewrite whose longest sentence exceeds 35 words fails, and the limit can be set", () => {
  const long = Array.from({ length: 36 }, () => "word").join(" ") + ".";
  const r = facts(SOURCE, REWRITE + long + "\n");
  assert.equal(r.sentences.longest, 36);
  assert.equal(r.ok, false);
  assert.equal(facts(SOURCE, REWRITE + long + "\n", { maxSentence: 40 }).ok, true);
});

test("an average above 20 words fails, and --avg-sentence changes the limit", () => {
  const padded = REWRITE.replace(/\./g, " who needs the full wording in every clause so that no reader has to guess what is meant.");
  const r = facts(SOURCE, padded);
  assert.ok(r.sentences.average > 20, String(r.sentences.average));
  assert.equal(r.ok, false);
  assert.equal(facts(SOURCE, padded, { avgSentence: 60, maxSentence: 80 }).ok, true);
});

test("the command prints a report, exits 1 on a dropped number and 2 on a missing file, and --json is one object", () => {
  const dir = mkdtempSync(join(tmpdir(), "pe-facts-"));
  try {
    const src = join(dir, "source.txt");
    const bad = join(dir, "rewrite.txt");
    writeFileSync(src, SOURCE);
    writeFileSync(bad, REWRITE.replace("45 days'", "a few days'"));
    const fail = spawnSync("node", [cli, "facts", src, bad], { encoding: "utf8" });
    assert.equal(fail.status, 1, fail.stdout + fail.stderr);
    assert.match(fail.stdout, /numbers dropped: 45/);

    const json = spawnSync("node", [cli, "facts", src, bad, "--json"], { encoding: "utf8" });
    assert.equal(json.status, 1);
    const parsed = JSON.parse(json.stdout);
    assert.deepEqual(parsed.numbers.dropped, ["45"]);
    assert.equal(parsed.ok, false);

    const missing = spawnSync("node", [cli, "facts", src, join(dir, "absent.txt")], { encoding: "utf8" });
    assert.equal(missing.status, 2);
    assert.match(missing.stderr, /absent\.txt/);

    const pass = spawnSync("node", [cli, "facts", src, src], { encoding: "utf8" });
    assert.equal(pass.status, 0, pass.stdout + pass.stderr);
    assert.doesNotMatch(pass.stdout, /^warn/m, "a rewrite with nothing to warn about prints no warn line");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("runFacts returns 2 on a usage error and the help names the command", () => {
  assert.equal(runFacts([]), 2);
  const help = execFileSync("node", [cli, "--help"], { encoding: "utf8" });
  assert.match(help, /product-engineer facts <source> <rewrite>/);
});

// Numbering in a source is not a fact: a rewrite that states the same facts without the numbers is faithful.
test("a numbered contract, rewritten without its numbering, passes; section numbers are not facts", () => {
  const numbered = "## 2. Fees\n1.1 Definitions. Rent is 800 EUR a month.\n1.2 Notice. Either party may end the Agreement by giving 45 days' written notice.\nSee Clause 3.1 and Article 5(2).\n**1.** Pay 30 days early.\n";
  const plain = "Rent is 800 EUR a month. Either side can end the agreement by giving 45 days' written notice. Pay the rent 30 days early.\n";
  const r = facts(numbered, plain);
  assert.deepEqual(r.numbers.source, ["800", "45", "30"], JSON.stringify(r.numbers));
  assert.deepEqual(r.numbers.dropped, [], JSON.stringify(r.numbers));
  assert.equal(r.ok, true, JSON.stringify(r.violations));
});

for (const [shape, line] of [
  ["a markdown heading with a section number", "## 2. Fees"],
  ["a decimal sub-clause at a line start", "1.1 Definitions."],
  ["a three-level decimal at a line start", "3.2.1 Payment."],
  ["a bold marker", "**1.** Payment."],
  ["a clause reference with a decimal", "Clause 3.1 says the rent is due."],
  ["an article reference with a parenthesised sub-clause", "Article 5(2) says the rent is due."],
  ["a parenthesised clause number at a line start", "(4) The rent is due."],
]) {
  test(`numbering of the shape ${shape} is not counted as a fact`, () => {
    const source = `${line}\nThe rent is 800 EUR a month.\n`;
    const rewrite = "The rent is 800 EUR a month.\n";
    const r = facts(source, rewrite);
    assert.deepEqual(r.numbers.dropped, [], `${shape}: ${JSON.stringify(r.numbers)}`);
    assert.deepEqual(r.numbers.added, [], `${shape}: ${JSON.stringify(r.numbers)}`);
    assert.equal(r.ok, true, shape);
  });
}

test("control: a real amount dropped from a numbered contract still fails with exit 1", () => {
  const numbered = "## 2. Fees\n1.1 Definitions. Rent is 800 EUR a month.\n1.2 Notice. Give 45 days' written notice.\n";
  const dropped = "Rent is 800 EUR a month. Give written notice.\n";
  const r = facts(numbered, dropped);
  assert.deepEqual(r.numbers.dropped, ["45"]);
  assert.equal(r.ok, false);
});

test("a month-name date and an ISO date are one value, so a rewrite that writes the date out in words passes", () => {
  assert.deepEqual(numbersIn("14 October 2026"), ["2026-10-14"]);
  assert.deepEqual(numbersIn("October 14, 2026"), ["2026-10-14"]);
  assert.deepEqual(numbersIn("Oct 14th 2026"), ["2026-10-14"]);
  assert.deepEqual(numbersIn("2026-10-14"), ["2026-10-14"]);
  const r = facts("The licence starts on 2026-10-14 for 800 EUR.\n", "The licence starts on 14 October 2026 for 800 EUR.\n");
  assert.deepEqual(r.numbers.dropped, [], JSON.stringify(r.numbers));
  assert.deepEqual(r.numbers.added, [], JSON.stringify(r.numbers));
  assert.equal(r.ok, true);
});

test("a date that changes in the rewrite is reported as dropped and added, as one value each", () => {
  const r = facts("The licence starts on 2026-10-14.\n", "The licence starts on 14 October 2025.\n");
  assert.deepEqual(r.numbers.dropped, ["2026-10-14"]);
  assert.deepEqual(r.numbers.added, ["2025-10-14"]);
  assert.equal(r.ok, false);
});

test("the star hint is suppressed for facts by --json and by -q, as for the other subcommands", () => {
  const dir = mkdtempSync(join(tmpdir(), "pe-facts-hint-"));
  try {
    const tty = { isTTY: true };
    const show = (argv) => {
      let out = "";
      const shown = maybeShowStarHint({ exitCode: 0, stdout: tty, stderr: tty, env: {}, argv, configDir: join(dir, String(argv.length) + argv.join("")), write: (t) => (out += t) });
      return { shown, out };
    };
    assert.equal(show(["facts", "a.txt", "b.txt", "--json"]).shown, false, "--json");
    assert.equal(show(["facts", "a.txt", "b.txt", "-q"]).shown, false, "-q");
    assert.equal(show(["facts", "a.txt", "b.txt", "--quiet"]).shown, false, "--quiet");
    assert.equal(show(["facts", "a.txt", "b.txt"]).shown, true, "a plain run shows the hint once");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a bare amount at a line start is an amount, not a marker: dropping it fails", () => {
  const r = facts("45 days' notice applies to the lease.\n", "Notice applies to the lease.\n");
  assert.deepEqual(r.numbers.dropped, ["45"]);
  assert.equal(r.ok, false);
});

// Round 2 (review a7662de-488a906): heading numbers, bullets, tables, inline markers, references, dates,
// European amounts, URLs and line-start decimals.
const same = (src, out) => {
  const r = facts(src, out);
  assert.deepEqual(r.numbers.dropped, [], JSON.stringify(r.numbers));
  assert.deepEqual(r.numbers.added, [], JSON.stringify(r.numbers));
  assert.equal(r.ok, true, JSON.stringify(r.violations));
};

test("a heading number without a full stop is numbering: ## 3 Fees and # 2 Term", () => {
  same("## 3 Fees\nRent is 800 EUR a month.\n", "Rent is 800 EUR a month.\n");
  same("# 2 Term\nThe lease lasts 12 months.\n", "The lease lasts 12 months.\n");
  same("## 3 fees and rent\nRent is 800 EUR a month.\n", "Rent is 800 EUR a month.\n");
});

test("an unpunctuated short numbered line is numbering; a bare integer inside a sentence is an amount", () => {
  same("1 Definitions\nRent is 800 EUR a month.\n", "Rent is 800 EUR a month.\n");
  same("2 Fees\nRent is 800 EUR a month.\n", "Rent is 800 EUR a month.\n");
  const dropped = facts("45 days' notice applies to the lease.\n", "Notice applies to the lease.\n");
  assert.deepEqual(dropped.numbers.dropped, ["45"]);
  assert.equal(dropped.ok, false);
});

test("a hard-wrapped line that begins 800. Deposit keeps 800 as an amount, both when kept and when dropped", () => {
  const source = "The lease runs for a year and the\n800. Deposit is due at signing.\n";
  const kept = facts(source, "The lease runs for a year and the deposit of 800 is due at signing.\n");
  assert.deepEqual(kept.numbers.dropped, [], JSON.stringify(kept.numbers));
  assert.equal(kept.ok, true);
  const dropped = facts(source, "The lease runs for a year and the deposit is due at signing.\n");
  assert.deepEqual(dropped.numbers.dropped, ["800"]);
  assert.equal(dropped.ok, false);
});

test("a bullet before a section number is stripped first, so 1.1 is numbering", () => {
  assert.deepEqual(numbersIn("- 1.1 Definitions. Rent is 800.\n"), ["800"]);
  assert.deepEqual(numbersIn("* 2. Fees are 30 days.\n"), ["30"]);
  same("- 1.1 Definitions. Rent is 800 EUR a month.\n", "Rent is 800 EUR a month.\n");
});

test("the first cell of a markdown table row is numbering; the amounts in the other cells are facts", () => {
  assert.deepEqual(numbersIn("| 1 | Rent | 800 |\n"), ["800"]);
  same("| 1 | Rent | 800 |\n", "| Rent | 800 |\n");
});

test("inline markers (1) and (2) in the middle of a line are numbering", () => {
  assert.deepEqual(numbersIn("(1) Rent is 800 EUR (2) Deposit is 30 days.\n"), ["800", "30"]);
});

test("references are case-insensitive and cover the schedule, annex, appendix, paragraph, art. and section symbol forms", () => {
  for (const line of [
    "clause 4 applies here.",
    "schedule 2 lists the fees.",
    "Sections 3 and 4 apply.",
    "Sections 3, 4 and 5 apply.",
    "Art. 5 applies.",
    "§ 4 applies.",
    "Annex 1 applies.",
    "Appendix 2 applies.",
    "Paragraph 2.3 applies.",
    "Para. 7 applies.",
  ]) {
    assert.deepEqual(numbersIn(line + "\n"), [], line);
  }
  assert.deepEqual(numbersIn("the fee is in part 60 days late.\n"), ["60"]);
});

test("day-first dates with a dot, a slash or a comma after the month are one value each, equal to ISO", () => {
  for (const form of ["14th of October 2026", "14 October, 2026", "14.10.2026", "14/10/2026", "14 October 2026"]) {
    assert.deepEqual(numbersIn(form + "\n"), ["2026-10-14"], form);
  }
  assert.deepEqual(numbersIn("03/04/2026\n"), ["2026-04-03"], "both parts up to 12 are read day-first, as documented");
  assert.deepEqual(numbersIn("10/14/2026\n"), ["10", "14", "2026"], "a month above 12 is not a date and is not guessed");
  const r = facts("The licence starts on 2026-10-14.\n", "The licence starts on 14/10/2026.\n");
  assert.equal(r.ok, true, JSON.stringify(r.numbers));
});

test("European amounts: 800,00 is 800 and 1,5 is 1.5; thousands commas are still thousands", () => {
  assert.deepEqual(numbersIn("Rent 800,00 EUR\n"), ["800"]);
  assert.deepEqual(numbersIn("Rent 800 EUR\n"), ["800"]);
  assert.deepEqual(numbersIn("Rate 1,5 percent\n"), ["1.5"]);
  assert.deepEqual(numbersIn("12,000 bookings\n"), ["12000"]);
  same("Rent 800 EUR a month.\n", "Rent 800,00 EUR a month.\n");
});

test("digits inside a link are not facts: a rewrite that drops the link keeps its exit code", () => {
  assert.deepEqual(numbersIn("See https://example.com/v2/terms-2026 for details.\n"), []);
  assert.deepEqual(numbersIn("See http://example.com/a/2 for details.\n"), []);
});

test("a line-start decimal followed by a space is an amount when the line has more than five words; dropping it fails", () => {
  const r = facts("1.5 months rent is held.\n", "A deposit is held.\n");
  assert.deepEqual(r.numbers.dropped, ["1.5"], JSON.stringify(r.numbers));
  assert.equal(r.ok, false);
  same("1.1 Definitions. Rent is 800 EUR a month.\n", "Rent is 800 EUR a month.\n");
});

test("unsupported sentences: a rewrite that only splits and rewords source sentences reports none", () => {
  assert.deepEqual(facts(SOURCE, REWRITE).unsupported, []);
  const before = "The Tenant shall not sublet the flat without the Landlord's prior written consent, and either party may terminate this Agreement by giving 45 days' written notice.";
  const after = "The tenant must not sublet the flat without the landlord's prior written consent. Either side can end the agreement by giving 45 days' written notice.";
  assert.deepEqual(facts(before, after).unsupported, []);
});

test("unsupported sentences: a defined term, an intro line and an explanatory sentence the source lacks are each reported", () => {
  const added = `In this text, "you" is the Tenant and "we" is the Landlord.
${REWRITE}The "Rent" is the money paid every month.
This duty continues even after the lease has ended.
`;
  const r = facts(SOURCE, added);
  const found = r.unsupported.map((u) => u.sentence);
  assert.ok(found.some((s) => s.startsWith("In this text")), JSON.stringify(found));
  assert.ok(found.some((s) => s.startsWith('The "Rent" is')), JSON.stringify(found));
  assert.ok(found.some((s) => s.startsWith("This duty continues")), JSON.stringify(found));
  assert.equal(found.length, 3, JSON.stringify(found));
  assert.equal(r.ok, true, "a report is a warning, not a failure");
});

test("unsupported sentences: the command prints each one", () => {
  const dir = mkdtempSync(join(tmpdir(), "pe-facts-"));
  try {
    writeFileSync(join(dir, "s.txt"), SOURCE);
    writeFileSync(join(dir, "r.txt"), `${REWRITE}This duty continues even after the lease has ended.\n`);
    const out = spawnSync(process.execPath, [join(dirname(cli), "check.mjs"), "facts", join(dir, "s.txt"), join(dir, "r.txt")], { encoding: "utf8" }).stdout;
    assert.match(out, /no counterpart in the source[\s\S]*This duty continues/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("facts unsupported: number and tense changes of source words are not reported", () => {
  const dir = mkdtempSync(join(tmpdir(), "facts-stem-"));
  const src = join(dir, "s.txt");
  const rew = join(dir, "r.txt");
  writeFileSync(src, "The fee and the charge apply. The agent will agree and make notes.\n");
  writeFileSync(rew, "The fees and charges apply. The agent agreed and is making notes.\n");
  const r = spawnSync(process.execPath, [join(process.cwd(), "bin/check.mjs"), "facts", src, rew, "--json"], { encoding: "utf8" });
  assert.deepEqual(JSON.parse(r.stdout).unsupported ?? [], []);
});

test("a rewrite sentence that echoes what the sentences before it already said is reported", async () => {
  const { unsupportedSentences } = await import("../bin/facts.mjs");
  const source = "The tenant must give the landlord 45 days written notice before leaving the flat. The deposit is returned after the final inspection.";
  const rewrite = "You must give the landlord written notice 45 days before you leave the flat. The deposit comes back after the final inspection. So give the landlord written notice, 45 days before you leave.";
  const found = unsupportedSentences(source, rewrite).map((u) => u.reason);
  assert.ok(found.some((r) => /restates earlier sentences/.test(r)));
  assert.deepEqual(unsupportedSentences(source, "You must give the landlord written notice 45 days before you leave the flat. The deposit comes back after the final inspection."), []);
});

test("a source that repeats itself does not make its rewrite report echoes", async () => {
  const { unsupportedSentences } = await import("../bin/facts.mjs");
  const source = "Visitors must sign the register at the front desk. Every visitor must sign the register at the front desk before entering.";
  assert.deepEqual(unsupportedSentences(source, source), []);
});
