import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { identifiersIn, notes } from "../bin/notes.mjs";

const cli = join(dirname(fileURLToPath(import.meta.url)), "..", "bin", "check.mjs");

// Release notes of a calendar app, written the way the release-notes skill asks.
const GOOD = `Changes since v2.3.0 (commit 3a9f2c1 to 8d0b7e4)

You can now export a month of events as a file, so sharing a schedule takes one step.
Cancelled events no longer send a day-before reminder; up-to-date events still do.
Exported calendar files can no longer run code when a colleague opens them.
The month view shows 20 events at a time.

Not in this release:
- Shared calendars: added and taken back inside this range, they are not ready.
`;

const codes = (text) => notes(text).findings.map((f) => `${f.level}:${f.code}:${f.line}`);

function cliRun(text, args = []) {
  const dir = mkdtempSync(join(tmpdir(), "pe-notes-"));
  const file = join(dir, "NOTES.md");
  writeFileSync(file, text);
  const r = spawnSync("node", [cli, "notes", file, ...args], { encoding: "utf8", env: { ...process.env, PRODUCT_ENGINEER_NO_STAR_HINT: "1" } });
  rmSync(dir, { recursive: true, force: true });
  return r;
}

test("notes written for the reader pass with no finding", () => {
  const r = notes(GOOD);
  assert.equal(r.ok, true);
  assert.deepEqual(r.findings, []);
});

test("a conventional commit prefix at a line start is an error, after a list marker or heading too", () => {
  for (const line of ["feat(export): add a month export", "- fix: reminders for cancelled events", "## perf(view): paginate", "* Docs: the month view", "1. revert: shared calendars"]) {
    assert.ok(codes(`Changes since v2.3.0\n${line}\n`).includes("error:commit-prefix:2"), line);
  }
  assert.deepEqual(codes("Changes since v2.3.0\nYou can fix a typo in an event title now.\n"), []);
});

test("the words refactor and chore are errors on any line", () => {
  assert.ok(codes("Changes since v2.3.0\nBehind the scenes: refactored the colour rules.\n").includes("error:commit-word:2"));
  assert.ok(codes("Changes since v2.3.0\nA chore for the team.\n").includes("error:commit-word:2"));
});

test("code identifiers and file names are errors, and each one is named", () => {
  const cases = {
    "Uses `exportMonth` now.": ["`exportMonth`"],
    "Fixed parseDate for all-day events.": ["parseDate"],
    "The EventStore keeps more.": ["EventStore"],
    "Reads event_store first.": ["event_store"],
    "Calls exportMonth() on save.": ["exportMonth()", "exportMonth"],
    "Changed src/export/month.js and lib/ical.": ["src/export/month.js", "lib/ical"],
    "See package.json and .env for the settings.": ["package.json", ".env"],
    "The step3 helper moved.": ["step3"],
    "The color-picker-widget is new.": ["color-picker-widget"],
    "The ical2-parser is new.": ["ical2-parser"],
  };
  for (const [line, want] of Object.entries(cases)) {
    for (const id of want) assert.ok(identifiersIn(line).includes(id), `${line} -> ${identifiersIn(line).join(", ")} lacks ${id}`);
    assert.ok(codes(`Changes since v2.3.0\n${line}\n`).includes("error:code-identifier:2"), line);
  }
});

test("prose that only looks like code passes: hyphenated words, and/or, plurals in parentheses, dates, links, Node.js", () => {
  for (const line of [
    "Day-to-day planning is easier to read, and the day-before reminder still goes out.",
    "Pick one and/or both calendars.",
    "The reminder(s) go to every guest of the event.",
    "Events from 14/10 to 20/10 show in the week view.",
    "Read more at https://example.com/calendar/help/export.",
    "Runs on Node.js 22.",
    "A 24-hour view and a one-click export.",
  ]) {
    assert.deepEqual(identifiersIn(line), [], line);
  }
});

test("a line about docs, a README, a changelog or a version bump is an error", () => {
  for (const line of ["The README explains the export.", "Updated the docs.", "Bumped the version.", "New changelog entries.", "The documentation is complete."]) {
    assert.ok(codes(`Changes since v2.3.0\n${line}\n`).includes("error:docs-or-version:2"), line);
  }
});

test("an effect word or a percentage is an error unless the line says it was measured", () => {
  assert.ok(codes("Changes since v2.3.0\nThe month view opens faster.\n").includes("error:unmeasured-effect:2"));
  assert.ok(codes("Changes since v2.3.0\nSearch is instant.\n").includes("error:unmeasured-effect:2"));
  assert.ok(codes("Changes since v2.3.0\nThe month view loads 40% sooner.\n").includes("error:unmeasured-percent:2"));
  assert.deepEqual(codes("Changes since v2.3.0\nThe month view opens faster: measured at 0.4 s instead of 1.1 s on the largest calendar.\n"), []);
});

test("a version number is allowed on the first non-empty line only", () => {
  assert.deepEqual(codes("\n\nCalendar 2.4.0: changes since v2.3.0\nYou can now print a week.\n"), []);
  assert.ok(codes("Changes since v2.3.0\nCalendar 2.4.0, 14 March\n").includes("error:version-number:2"));
  assert.ok(codes("Changes since v2.3.0\nNow at v2.4.\n").includes("error:version-number:2"));
});

test("a first line with no range is a warning, and a range by hash, since or last N commits is accepted", () => {
  assert.deepEqual(codes("What is new\nYou can now print a week.\n"), ["warn:no-range:1"]);
  assert.equal(notes("What is new\nYou can now print a week.\n").ok, true, "a warning alone keeps ok");
  for (const first of ["The last 6 commits", "Commits 3a9f2c1 to 8d0b7e4", "Everything since the March release"]) {
    assert.deepEqual(codes(`${first}\nYou can now print a week.\n`), [], first);
  }
  assert.deepEqual(codes(" \n"), ["error:empty:0"]);
});

test("the CLI exits 0 on good notes and 1 with each error named, and --json prints the findings", () => {
  const ok = cliRun(GOOD);
  assert.equal(ok.status, 0, ok.stdout + ok.stderr);
  assert.match(ok.stdout, /notes: ok/);
  const bad = cliRun("Changes since v2.3.0\n- feat(export): `exportMonth()` in src/export.js\n- The view is faster.\n");
  assert.equal(bad.status, 1);
  assert.match(bad.stdout, /error line 2: a conventional commit prefix/);
  assert.match(bad.stdout, /error line 2: code a reader cannot follow: `exportMonth\(\)`/);
  assert.match(bad.stdout, /error line 3: an effect nobody measured/);
  assert.match(bad.stdout, /fix them and run it again/);
  const json = cliRun("Changes since v2.3.0\nThe view is faster.\n", ["--json"]);
  assert.equal(json.status, 1);
  const parsed = JSON.parse(json.stdout);
  assert.equal(parsed.ok, false);
  assert.deepEqual(parsed.findings.map((f) => f.code), ["unmeasured-effect"]);
});

test("the CLI exits 2 on a usage error or a file it cannot read", () => {
  assert.equal(spawnSync("node", [cli, "notes"], { encoding: "utf8" }).status, 2);
  assert.equal(spawnSync("node", [cli, "notes", "a.md", "b.md"], { encoding: "utf8" }).status, 2);
  assert.equal(spawnSync("node", [cli, "notes", "a.md", "--bogus"], { encoding: "utf8" }).status, 2);
  const missing = spawnSync("node", [cli, "notes", join(tmpdir(), "pe-notes-missing.md")], { encoding: "utf8" });
  assert.equal(missing.status, 2);
  assert.match(missing.stderr, /notes: cannot read/);
});

test("--help lists the notes command", () => {
  assert.match(spawnSync("node", [cli, "--help"], { encoding: "utf8" }).stdout, /product-engineer notes <file> \[--json\]/);
});
