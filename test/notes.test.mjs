import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { contentWords, identifiersIn, notes } from "../bin/notes.mjs";

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

test("a setting or config file the reader must change stays, in backticks inside a sentence that explains it", () => {
  const head = "Changes since v2.3.0\n";
  const kept = [
    "The retry setting `maxRetries` replaces the old name, so set it to the number of attempts you want.",
    "Set `MAX_ROWS` to raise the export row limit from 5,000 to 10,000 rows if you need more of them.",
    "Turn the new export off in `bulk-export` by default, and switch it on per account when you are ready.",
    "Put the new limit in `export.maxItems` to change how many events one file may hold at most.",
    "Edit `config.json` to choose how many days of events the month view should show at one time.",
  ];
  for (const line of kept) assert.deepEqual(codes(`${head}${line}\n`), [], line);
});

test("a name with no explanation, a bare name, and an internal name are still errors", () => {
  const head = "Changes since v2.3.0\n";
  for (const line of [
    "Uses `maxRetries` now.", // backticks but nothing around it explains it
    "The retry setting maxRetries replaces the old name, so set it to the number of attempts you want.", // bare, not marked as a name to type
    "The export step moved into `EventStore`, which now keeps events for the whole month view in memory.", // a class name is internal
    "The export step moved into `src/export/month.js`, which now keeps events for the whole month view.", // a path is internal
    "If you take the `tax.js` change, halves go to the nearest even cent, so some totals differ by a cent.", // a source file is internal even though it looks like a dotted key
    "The export step now calls `exportMonth()` once for the whole month view and keeps events in memory.", // a call is internal
  ]) assert.ok(codes(`${head}${line}\n`).includes("error:code-identifier:2"), line);
});

test("a version the reader must check is not a change number; a version as a change is still an error", () => {
  const head = "Changes since v2.3.0\n";
  assert.deepEqual(codes(`${head}The server now needs Node 20.11.0 or newer, so upgrade it before you update.\n`), []);
  assert.deepEqual(codes(`${head}Supported browsers start at Chrome 120.0.1 for the month view and the export.\n`), []);
  assert.ok(codes(`${head}This is version 2.4.0 of the calendar and it is a good one.\n`).includes("error:version-number:2"));
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

test("a negated measurement does not excuse an effect word, and a price percentage is not an effect", () => {
  assert.ok(codes("Changes since v2.3.0\nPages load faster; this was not measured.\n").includes("error:unmeasured-effect:2"));
  assert.ok(codes("Changes since v2.3.0\nAn unmeasured but faster month view.\n").includes("error:unmeasured-effect:2"));
  assert.ok(codes("Changes since v2.3.0\nThe view loads 40% sooner; never measured.\n").includes("error:unmeasured-percent:2"));
  assert.deepEqual(codes("Changes since v2.3.0\nHosts can now give guests a 10% discount code.\n"), []);
  assert.deepEqual(codes("Changes since v2.3.0\nThe invoice shows the 7% tax on its own line.\n"), []);
});

test("brand names with an inner capital are not code", () => {
  for (const line of ["You can now sync events with iCloud and pay with PayPal.", "The iPhone app shows the week view.", "Bookings from the WordPress plugin show up too."]) {
    assert.deepEqual(identifiersIn(line), [], line);
  }
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

test("--help lists the notes command and its audience option", () => {
  const help = spawnSync("node", [cli, "--help"], { encoding: "utf8" }).stdout;
  assert.match(help, /product-engineer notes <file> \[--audience customers\|developers\] \[--json\]/);
  assert.match(help, /--audience developers/);
});

test("a command-line option or a command the reader types is not code to hide", () => {
  for (const line of [
    "New: word counts as JSON with the `--json` option.",
    "Words shorter than 3 characters are skipped unless you pass --min-length.",
    "Run `tally --json` to get the count as JSON.",
    "Run `git tag` after the check.",
    "Use `--max-line-length=80` or -v for more detail.",
  ]) {
    assert.deepEqual(identifiersIn(line), [], line);
  }
  assert.ok(identifiersIn("Uses `exportMonth` with `--json`.").includes("`exportMonth`"));
  assert.ok(identifiersIn("Reads `event_store` first.").includes("`event_store`"));
});

test("an option exemption does not hide a file name, an identifier or plain words in backticks", () => {
  assert.ok(identifiersIn("pass --config=src/a.js").includes("src/a.js"));
  assert.ok(identifiersIn("pass --json=exportMonth").includes("exportMonth"));
  assert.ok(identifiersIn("the -x/foo.js file").some((id) => id.includes("foo.js")));
  assert.ok(identifiersIn("run `some words here`").includes("`some words here`"));
  assert.ok(identifiersIn("run `foo-bar baz`").includes("`foo-bar baz`"));
});

// --range: a line that announces a commit the range cancelled is an error.
const HEAD_LINE = "Changes since v2.3.0 (commit 3a9f2c1 to 8d0b7e4)\n\n";
const SUBJECT = "feat(bulk cancel button): cancel many bookings at once";
const ANNOUNCE = "You can now cancel many bookings at once with the bulk cancel button.";

function gitRepo() {
  const dir = mkdtempSync(join(tmpdir(), "pe-notes-range-"));
  const git = (...args) => execFileSync("git", ["-c", "user.name=Dev", "-c", "user.email=dev@example.com", "-c", "commit.gpgsign=false", "-c", "core.hooksPath=/dev/null", ...args], { cwd: dir, encoding: "utf8" });
  const commit = (file, subject) => {
    writeFileSync(join(dir, file), `${subject}\n`);
    git("add", "-A");
    git("commit", "-q", "-m", subject);
    return git("rev-parse", "HEAD").trim();
  };
  git("init", "-q", "-b", "master");
  return { dir, git, commit };
}

/** A base, the feature, its revert; with `restored`, a revert of that revert (the feature is back). */
function withRange({ restored = false } = {}, fn) {
  const r = gitRepo();
  try {
    const base = r.commit("README.md", "start");
    r.commit("bulk.txt", SUBJECT);
    r.git("revert", "--no-edit", "HEAD");
    if (restored) r.git("revert", "--no-edit", "HEAD");
    return fn({ dir: r.dir, base });
  } finally {
    rmSync(r.dir, { recursive: true, force: true });
  }
}

function notesRun(fx, text, args) {
  const dir = mkdtempSync(join(tmpdir(), "pe-notes-file-"));
  const file = join(dir, "NOTES.md");
  writeFileSync(file, text);
  const r = spawnSync("node", [cli, "notes", file, ...args], { cwd: fx.dir, encoding: "utf8", env: { ...process.env, PRODUCT_ENGINEER_NO_STAR_HINT: "1" } });
  rmSync(dir, { recursive: true, force: true });
  return r;
}

test("a line announcing a cancelled commit is an error, and the CLI names it and the reverting commit", () => {
  withRange({}, (fx) => {
    const r = notesRun(fx, `${HEAD_LINE}${ANNOUNCE}\n`, ["--range", fx.base]);
    assert.equal(r.status, 1, r.stdout + r.stderr);
    assert.match(r.stdout, /error line 3: announces "feat\(bulk cancel button\): cancel many bookings at once", which this range cancelled \(reverted by [0-9a-f]{7}\); move it under "Not in this release" or remove it/);
  });
});

test("the same line under a Not in this release heading passes", () => {
  withRange({}, (fx) => {
    const text = `${HEAD_LINE}You can now export a month as a file.\n\nNot in this release:\n- ${ANNOUNCE}\n`;
    const r = notesRun(fx, text, ["--range", fx.base]);
    assert.equal(r.status, 0, r.stdout + r.stderr);
  });
});

test("the section ends at the next heading after a blank line, so a line below it is checked again", () => {
  withRange({}, (fx) => {
    const text = `${HEAD_LINE}Not in this release:\n- Shared calendars.\n\nWhat changed:\n${ANNOUNCE}\n`;
    const r = notesRun(fx, text, ["--range", fx.base]);
    assert.equal(r.status, 1, r.stdout + r.stderr);
    assert.match(r.stdout, /error line 7: announces/);
  });
});

test("a commit that a revert of a revert put back is not cancelled, so the line passes", () => {
  withRange({ restored: true }, (fx) => {
    const r = notesRun(fx, `${HEAD_LINE}${ANNOUNCE}\n`, ["--range", fx.base]);
    assert.equal(r.status, 0, r.stdout + r.stderr);
  });
});

test("unrelated notes pass against a range that cancels a commit", () => {
  withRange({}, (fx) => {
    const r = notesRun(fx, `${HEAD_LINE}The month view shows 20 events at a time.\n`, ["--range", fx.base]);
    assert.equal(r.status, 0, r.stdout + r.stderr);
  });
});

test("a line needs two content words of the subject, and a one-word subject needs only that word", () => {
  const subject = "feat(bulk cancel button): cancel many bookings at once";
  const one = (line, s = subject) => notes(`${HEAD_LINE}${line}\n`, { cancelled: [{ subject: s, by: "abc1234" }] }).findings.map((f) => f.code);
  assert.deepEqual(one("You can now cancel events."), [], "one of two words is not enough");
  assert.ok(one(ANNOUNCE).includes("cancelled-announced"));
  const single = "feat(ui): rebranding";
  assert.ok(one("The rebranding is coming.", single).includes("cancelled-announced"));
  assert.deepEqual(one("Nothing about the new look.", single), []);
  assert.deepEqual(one(ANNOUNCE, "feat: should which would"), [], "a subject with no content word is not checked");
});

test("contentWords drops the prefix, the Revert wrapper, short words and the stoplist", () => {
  assert.deepEqual(contentWords(SUBJECT), ["cancel", "bookings"]);
  assert.deepEqual(contentWords('Revert "feat(bulk): cancel many bookings"'), ["cancel", "bookings"]);
  assert.deepEqual(contentWords("fix: their about these"), []);
});

test("--range with a bad range is a usage error (exit 2)", () => {
  withRange({}, (fx) => {
    for (const args of [["--range"], ["--range", "--json"], ["--range", "a...b"], ["--range", ".."], ["--range", "no-such-tag"]]) {
      const r = notesRun(fx, `${HEAD_LINE}The month view is calm.\n`, args);
      assert.equal(r.status, 2, `${args.join(" ")}: ${r.stdout}${r.stderr}`);
    }
  });
});

// Heading styles that open and close a "Not in this release" section. A line inside the section may name
// a cancelled commit; the same line after the section closes must be flagged.
const cancelledLines = (text) =>
  notes(`${HEAD_LINE}${text}`, { cancelled: [{ subject: SUBJECT, by: "abc1234" }] }).findings.filter((f) => f.code === "cancelled-announced").map((f) => f.text);

test("every heading style opens a Not in this release section", () => {
  for (const start of ["# Not in this release", "**Not in this release**", "**Not in this release:**", "Not in this release", "Not in this release:", "Not in this release\n-----", "Not in this release\n====="]) {
    assert.deepEqual(cancelledLines(`${start}\n- ${ANNOUNCE}\n`), [], JSON.stringify(start));
  }
});

test("a one-line Not in this release section covers the whole line after the colon", () => {
  assert.deepEqual(cancelledLines(`Not in this release: ${ANNOUNCE}\n`), []);
  assert.deepEqual(cancelledLines(`Not in this release: the month view.\n${ANNOUNCE}\n`), [], "the one-line section runs on until a heading");
  assert.deepEqual(cancelledLines(`Not in this release: the month view.\n\n# What changed\n${ANNOUNCE}\n`), [ANNOUNCE], "a heading after the one-line section ends it");
});

test("a prose sentence that starts with the words but is not a heading does not open a section", () => {
  assert.deepEqual(cancelledLines(`Not in this release yet, the view is calm.\n${ANNOUNCE}\n`), [ANNOUNCE]);
});

test("every heading style closes a Not in this release section, and the line after it is checked", () => {
  for (const end of ["# What changed", "**Fixed**", "Fixed:", "Fixed\n-----", "Fixed\n====="]) {
    assert.deepEqual(cancelledLines(`Not in this release:\n- Shared calendars.\n\n${end}\n${ANNOUNCE}\n`), [ANNOUNCE], JSON.stringify(end));
  }
});

test("a bold line closes the section even directly after a list item, with no blank line", () => {
  assert.deepEqual(cancelledLines(`Not in this release:\n- Shared calendars.\n**Fixed**\n${ANNOUNCE}\n`), [ANNOUNCE]);
});

test("a list item that ends with a colon does not close the section", () => {
  assert.deepEqual(cancelledLines(`Not in this release:\n- Shared calendars:\n- ${ANNOUNCE}\n`), []);
});

const cancelledFor = (subject, text) =>
  notes(`${HEAD_LINE}${text}\n`, { cancelled: [{ subject, by: "abc1234" }] }).findings.filter((f) => f.code === "cancelled-announced").map((f) => f.text);

test("a subject word matches at the start of a word: cancel matches cancelled, and never the middle of another word", () => {
  assert.deepEqual(cancelledFor(SUBJECT, "Cancelled bookings stay in the list."), ["Cancelled bookings stay in the list."], "prefix at a word start");
  assert.deepEqual(cancelledFor("feat: shared calendars view", "Unshared calendars are coming."), [], "shared is inside unshared");
});

test("content words use letters in any script, so Turkish words of five letters or more count", () => {
  assert.deepEqual(contentWords("feat: şifre değişikliği"), ["şifre", "değişikliği"]);
  assert.deepEqual(cancelledFor("feat: şifre değişikliği", "Şifre değişikliği artık e-posta ile mümkün."), ["Şifre değişikliği artık e-posta ile mümkün."]);
});

test("two shared words in an unrelated sentence do not announce the commit; the announcement still does", () => {
  const subject = "feat: shared calendars view";
  assert.deepEqual(cancelledFor(subject, "Printing a week of calendars is possible; the view is shared by link."), [], "calendars and shared both occur, far apart");
  assert.deepEqual(cancelledFor(subject, "You can now see shared calendars view.").length, 1, "the two words sit together");
});

test("--range takes the = form too, and an unknown ref is reported as unknown revision with exit 2", () => {
  withRange({}, (fx) => {
    const eq = notesRun(fx, `${HEAD_LINE}${ANNOUNCE}\n`, [`--range=${fx.base}`]);
    assert.equal(eq.status, 1, eq.stdout + eq.stderr);
    assert.match(eq.stdout, /which this range cancelled/);
    assert.equal(notesRun(fx, `${HEAD_LINE}The month view is calm.\n`, ["--range="]).status, 2);
    const unknown = notesRun(fx, `${HEAD_LINE}The month view is calm.\n`, ["--range", "no-such-ref"]);
    assert.equal(unknown.status, 2);
    assert.match(unknown.stderr, /unknown revision: no-such-ref/);
  });
});

// Developers audience: people who integrate the product read exact names; the rules that stop code names are relaxed.
const DEV_HEAD = "Changes since v3.0.0\n";

test("the developers audience accepts backticked names; the customers audience still rejects them", () => {
  const line = "The option `retryLimit` is now `maxAttempts`; the default is `3` attempts.\n";
  assert.deepEqual(notes(`${DEV_HEAD}${line}`, { audience: "developers" }).findings, []);
  assert.ok(codes(`${DEV_HEAD}${line}`).includes("error:code-identifier:2"));
  assert.ok(notes(`${DEV_HEAD}${line}`, { audience: "customers" }).findings.some((f) => f.code === "code-identifier"));
});

test("the developers audience accepts camelCase, file names and calls, and the customers audience rejects them", () => {
  const line = "Pass retryLimit to connect() in src/client.js.\n";
  assert.deepEqual(notes(`${DEV_HEAD}${line}`, { audience: "developers" }).findings, []);
  assert.ok(codes(`${DEV_HEAD}${line}`).includes("error:code-identifier:2"));
});

test("a commit hash is rejected for both audiences, on any line but the first", () => {
  const text = `${DEV_HEAD}Fixed the export in 3a9f2c1.\n`;
  for (const audience of ["customers", "developers"]) {
    const f = notes(text, { audience }).findings.find((x) => x.code === "commit-hash");
    assert.ok(f, audience);
    assert.equal(f.level, "error");
    assert.equal(f.line, 2);
  }
  assert.ok(notes("Changes since commit 3a9f2c1 to 8d0b7e4\nYou can export now.\n", { audience: "developers" }).ok, "the range on the first line is not a hash finding");
});

test("the developers audience still rejects a conventional commit prefix and merge-commit boilerplate", () => {
  for (const line of ["feat(export): add a month export", "fix: retry count", "Merge branch 'main' into release", "Merge pull request #12 from acme/export"]) {
    const got = notes(`${DEV_HEAD}${line}\n`, { audience: "developers" }).findings.map((f) => f.code);
    assert.ok(got.includes("commit-prefix") || got.includes("merge-boilerplate"), line);
  }
});

test("a rename, removal or breaking change with no backticked name warns for developers, and the warning clears when a name is given", () => {
  const warned = (text, audience = "developers") => notes(text, { audience }).findings.filter((f) => f.code === "change-unnamed").map((f) => f.level);
  assert.deepEqual(warned(`${DEV_HEAD}The retry option was renamed to the new attempts option.\n`), ["warn"]);
  assert.deepEqual(warned(`${DEV_HEAD}The flag --legacy-output was removed.\n`), ["warn"]);
  assert.deepEqual(warned(`${DEV_HEAD}This drops the v2 export, which is no longer supported.\n`), ["warn"]);
  assert.deepEqual(warned(`${DEV_HEAD}Breaking: the connect call changed.\n`), ["warn"]);
  assert.deepEqual(warned(`${DEV_HEAD}The option was renamed from \`retryLimit\` to \`maxAttempts\`.\n`), [], "a backticked name clears it");
  assert.deepEqual(warned(`${DEV_HEAD}The option was renamed: it is now \`--max-attempts\`.\n`), [], "a backticked flag clears it");
  assert.deepEqual(warned(`${DEV_HEAD}The option was renamed from \`retry limit\` to ok.\n`), ["warn"], "a backtick span with a space is not a name");
  assert.deepEqual(warned(`${DEV_HEAD}The option was renamed to the new attempts option.\n`, "customers"), [], "the customers audience has no such warning");
});

test("the audience default is customers, and an unknown audience is refused", () => {
  assert.ok(notes(`${DEV_HEAD}The option \`retryLimit\` is now \`maxAttempts\`.\n`).findings.some((f) => f.code === "code-identifier"));
  assert.throws(() => notes(GOOD, { audience: "owners" }), /unknown audience: owners/);
});

test("the CLI takes --audience in both forms, refuses an unknown value with exit 2, and warns for developers", () => {
  const text = `${DEV_HEAD}The option \`retryLimit\` was renamed to \`maxAttempts\`.\n`;
  assert.equal(cliRun(text, ["--audience", "developers"]).status, 0);
  assert.equal(cliRun(text, ["--audience=developers"]).status, 0);
  assert.equal(cliRun(text).status, 0, "customers keep a backticked setting name inside a sentence that explains it");
  assert.equal(cliRun(`${DEV_HEAD}Uses \`retryLimit\` now.\n`).status, 1, "customers reject a name no sentence explains");
  assert.equal(cliRun(text, ["--audience", "owners"]).status, 2);
  assert.equal(cliRun(text, ["--audience"]).status, 2);
  const warn = cliRun("Changes since v3.0.0\nThe option retryLimit was renamed.\n", ["--audience", "developers"]);
  assert.equal(warn.status, 0);
  assert.match(warn.stdout, /^warn {2}line 2: names the change but not what to change/m);
});

// Traceability, empty sections and the empty body.
const VOCAB = new Set(["calendar", "export", "month"]);
const tracedFindings = (text, vocabulary = VOCAB) => notes(`Changes since v2.3.0\n${text}`, { vocabulary }).findings.filter((f) => f.code === "untraced");

test("a note line sharing no content word with the range is an untraced warning; one that shares a word passes", () => {
  const found = tracedFindings("You can now export a month as a file.\nThe weather panel arrives tomorrow morning.\n");
  assert.deepEqual(found.map((f) => `${f.level}:${f.line}`), ["warn:3"]);
  assert.equal(found[0].message, 'matches no commit, path or change in the range: "The weather panel arrives tomorrow morning."');
  assert.equal(notes("Changes since v2.3.0\nThe weather panel arrives tomorrow morning.\n", { vocabulary: null }).findings.some((f) => f.code === "untraced"), false, "no vocabulary, no traceability");
  assert.equal(notes("Changes since v2.3.0\nThe weather panel arrives tomorrow morning.\n", { vocabulary: VOCAB }).ok, true, "an untraced line is a warning, not an error");
});

test("the untraced check covers list items, skips lines of 30 characters or fewer, headings and the Not in this release section", () => {
  assert.equal(tracedFindings("- The weather panel arrives tomorrow morning.\n").length, 1, "a list item is checked");
  assert.equal(tracedFindings("Short line about weather.\n").length, 0, "25 characters: not checked");
  assert.equal(tracedFindings("# The weather panel and forecast for tomorrow morning\n").length, 0, "a heading is not checked");
  assert.equal(tracedFindings("Not in this release:\n- The weather panel arrives tomorrow morning.\n").length, 0, "inside the section");
  assert.equal(tracedFindings("No change visible to users since the weather panel.\n").length, 0, "the quiet-period line is not checked");
});

test("a note line that uses only words under five letters is untraced, and a dash rule is never checked", () => {
  assert.equal(tracedFindings("It is ok to go on and do it now.\n").length, 1);
  assert.equal(tracedFindings("---------------------------------------------\n").length, 0);
});

test("a heading with nothing under it before the next heading or the end of the file is an empty-section warning", () => {
  const codesOf = (text) => notes(text).findings.map((f) => `${f.level}:${f.code}:${f.line}`);
  assert.deepEqual(codesOf("Changes since v2.3.0\nYou can export a month now.\n\nFixed:\n"), ["warn:empty-section:4"], "label heading at the end of the file");
  assert.deepEqual(codesOf("Changes since v2.3.0\n# Fixed\n# Added\n- You can export a month now.\n"), ["warn:empty-section:2"], "a heading directly under a heading");
  assert.deepEqual(codesOf("Changes since v2.3.0\nFixed\n-----\n"), ["warn:empty-section:2"], "a setext heading at the end");
  assert.deepEqual(codesOf("Changes since v2.3.0\nFixed:\n- You can export a month now.\n"), [], "a heading with a line under it passes");
});

test("a notes file with no change listed warns with the quiet-period line; a line starting No change visible is accepted", () => {
  assert.deepEqual(notes("Changes since v2.3.0\n").findings.map((f) => `${f.level}:${f.code}:${f.line}`), ["warn:empty-body:1"]);
  assert.match(notes("Changes since v2.3.0\n\n  \n").findings[0].message, /for a quiet period write one honest line such as "No change visible to users since <ref>\."/);
  for (const quiet of ["No change visible to users since v2.3.0.\n", "- No change visible to users since v2.3.0, 14 March.\n"]) {
    const r = notes(`Changes since v2.3.0\n${quiet}`);
    assert.deepEqual(r.findings, [], quiet);
    assert.equal(r.ok, true);
  }
});

test("the CLI shows the empty-body warning, exits 0 on the quiet-period line, and prints the traceability skip note", () => {
  const empty = cliRun("Changes since v2.3.0\n");
  assert.equal(empty.status, 0);
  assert.match(empty.stdout, /^warn {2}line 1: no change is listed; for a quiet period write one honest line such as "No change visible to users since <ref>\."/m);
  const quiet = cliRun("Changes since v2.3.0\nNo change visible to users since v2.3.0.\n");
  assert.equal(quiet.status, 0, quiet.stdout);
  assert.match(quiet.stdout, /notes: ok \(0 warnings\)/);
});

test("--range warns on a note line that shares no word with the range, and the passing lines stay silent", () => {
  withRange({ restored: true }, (fx) => {
    const text = `${HEAD_LINE}The weather panel arrives tomorrow morning.\nYou can now cancel many bookings at once.\n`;
    const r = notesRun(fx, text, ["--range", fx.base]);
    assert.equal(r.status, 0, r.stdout + r.stderr);
    assert.match(r.stdout, /^warn {2}line 3: matches no commit, path or change in the range: "The weather panel arrives tomorrow morning\."/m);
    assert.ok(!/line 4: matches/.test(r.stdout), r.stdout);
  });
});

test("--range skips the traceability check above 2000 commits and says so, and exit codes are unchanged", () => {
  const dir = mkdtempSync(join(tmpdir(), "pe-notes-big-"));
  try {
    const n = 2002; // HEAD~2001 excludes one, so the range holds 2001 commits
    const lines = [];
    for (let i = 1; i <= n; i++) {
      const msg = `feat(step): change ${i}`;
      lines.push("commit refs/heads/master", `mark :${i}`, `committer Dev <dev@example.com> ${1761900000 + i} +0000`, `data ${Buffer.byteLength(msg)}`, msg);
      if (i > 1) lines.push(`from :${i - 1}`);
      lines.push(`M 100644 inline src/f${i % 17}.js`, `data ${Buffer.byteLength(`v${i}\n`)}`, `v${i}\n`, "");
    }
    execFileSync("git", ["init", "-q", "-b", "master"], { cwd: dir });
    execFileSync("git", ["fast-import", "--quiet"], { cwd: dir, input: lines.join("\n") + "\n" });
    const file = join(dir, "NOTES.md");
    writeFileSync(file, `Changes since HEAD~${n - 1}\nThe weather panel arrives tomorrow morning.\n`);
    const r = spawnSync("node", [cli, "notes", file, "--range", `HEAD~${n - 1}`], { cwd: dir, encoding: "utf8", env: { ...process.env, PRODUCT_ENGINEER_NO_STAR_HINT: "1" } });
    assert.equal(r.status, 0, r.stdout + r.stderr);
    assert.match(r.stdout, /^note: traceability skipped: the range has 2001 commits \(more than 2000\)$/m);
    assert.ok(!/matches no commit/.test(r.stdout), r.stdout);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("customers: a name the range removed may be written; any other code name is still an error", () => {
  const text = "Changes since v2.3.0\nThe `retryLimit` setting is gone.\nThe parseQueue helper was tidied.\n";
  const plain = notes(text, { audience: "customers" });
  assert.equal(plain.findings.filter((f) => f.code === "code-identifier").length, 2);
  const withGone = notes(text, { audience: "customers", gone: ["retryLimit"] });
  const flagged = withGone.findings.filter((f) => f.code === "code-identifier");
  assert.deepEqual(flagged.map((f) => f.line), [3]);
});
