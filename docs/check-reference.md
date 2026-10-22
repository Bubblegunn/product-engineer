# Check reference

Details of `product-engineer check` that the README links to. The README keeps the short version.

## Placement: `--kind commit|pr`

A commit keeps the block at the end, the git convention, so `commit` (the default) does not
look at where the block starts. A pull request description opens with it, so the first
screen is the part written for the customer. With `--kind pr` the block heading must start
within the first 12 lines, the title counted as line 1. A later block is a warning with the
code `block-not-first`, naming the line it starts on; a block within the first 12 lines is an
`ok` finding with the code `block-first`. Neither changes the exit code, and a missing block is
still an error. The Action passes `--kind pr` for every description it checks. `--kind=pr` (with an equals sign) is also
accepted, `--kind` with no value exits 2 and says so, and `--pr <n>` implies `--kind pr` unless `--kind`
is given.

## Refactors: `refactor-benefit-claim`

When the title starts with `refactor`, the customer block may say that users see no change and what
was run. A block that contains a benefit word (faster, quicker, speed, more reliable, safer, cleaner,
better, improved, easier, fewer bugs) gets a warning with the code `refactor-benefit-claim`, naming the
word. The check reads the customer block only, and a block that says only "users see no change" passes.
A word that is part of a hyphenated name (`better-sqlite3`) does not count, and neither does a word negated
by "no", "not", "nothing", "neither", "nor" or "never" within the three words before it ("no change in speed",
"nothing is faster").
It is a warning, so it does not change the exit code.

## Cited paths

A message that says the fix is
in `src/gate.ts:120` is claiming something a reader will act on, and the line number is the part that
rots while the sentence stays still. Every `path/to/file.ext` and every GitHub Actions run URL in the
message is resolved: a missing file, a directory, or a line past the end of a real file is a warning,
`--references error` makes it an error and `--references off` turns it off. A message that cites
nothing is reported as citing nothing, at info level, and passes in every mode. That is deliberate:
a check that demanded a link would be satisfied by a link typed from memory, and the first person to
learn it was wrong would be the reader who followed it. Suggested by
[@raju_dandigam](https://dev.to/raju_dandigam), who asked for machine-checkable evidence without the
block turning into boilerplate. Nothing here makes a network request, so a run URL is checked for
shape only and says so.

## Readability

The block also gets a readability line, Flesch (1948) for English or Ateşman (1997) with
`--lang tr`, plus LIX (Björnsson, 1968), as information only. All three count syllables or
word lengths in the Latin alphabet, so for a block written in any other script the tool names
the script, says it is not scoring and why, and prints no number. Japanese, Chinese, Korean,
Arabic, Hebrew and Thai each get their own reason; Cyrillic, Greek and Devanagari are refused
because no calibration for them is implemented here, not because the language resists one; and
a script the tool cannot name is still refused. Before that, a block in Hindi, Tamil, Greek or
Amharic came back Flesch 0, graded hard, which is a number nobody counted.

## Commit safety: `check --diff`

With `--diff` the check also reads the change and reports four things about it, plus one
information line when a read is skipped. The four are warnings, so none of them changes the exit
code.

- `diff-secret-file`: a staged or ranged path whose name looks like a credential. It covers
  `.env` and `.env.*` (except `.env.example`, `.env.sample` and `.env.template`), `*.pem`, `*.key`,
  `*.p12`, `*.pfx`, `id_rsa`, `id_ed25519` and `credentials.*`. The finding names the path only. A
  file the change deletes is not flagged, because removing it is the right action. The name is matched
  on the basename, so `credentials.ts` or a translation `*.key` file also matches; the message says
  "looks like" for that reason.
- `diff-secret-content`: an added line that assigns a value of 16 or more characters from
  `[A-Za-z0-9_\-+/=]` to a name such as `api_key`, `secret`, `token` or `password`, or that holds a
  `-----BEGIN ... PRIVATE KEY-----` header. The finding gives the path and the line number. The
  value is never copied into a finding, so the report and any CI log do not leak it.
  Known limits: an unquoted value made only of letters (no digit) is not reported, so
  `token = mintsessionvalue;` passes; a quoted value of 16 or more characters is reported whatever
  it holds, so a long quoted identifier assigned to a secret-like name (an i18n key assigned to
  `token:`, for example) can be a false positive. The check reads one added line at a time.
  If the added-line read fails (the patch exceeds 256 MB, or git refuses it), this check is skipped
  and an information line with the code `diff-secret-skipped` says so; the other checks still run.
- `diff-mixed-change`: the change falls into two or more unrelated groups and the largest group
  holds less than 80 percent of the changed lines (added plus removed). A group is the top-level
  directory of a source file. For the containers `packages`, `apps`, `services`, `libs` and
  `modules` the group is the first two segments (`packages/a`), so two packages in one change
  warn. A test joins the group of the source file its name points at (`reminders.test.js` with
  `reminders.js`). A test that names no source joins the largest source group, and a test forms a
  group of its own only when the change has no source file at all. Documentation, lockfiles, and
  root-level manifests and dotfiles (`package.json`, `tsconfig.json`, `.nvmrc`), and any top-level dot-directory (`.github`, `.husky`, `.vscode`), are not counted.
  The finding names each group and up to three of its files, and says "consider separate commits".
  A feature with its tests (`src/checkout/index.ts` and `test/checkout.test.ts`) is one group and
  does not warn.
- `fix-without-test`: the title says this is a fix (`fix:`, `fix(scope):`, or fix, fixes or fixed at
  the start of the title), the change touches a source file (not a test and not documentation), and no
  test file changes. The source files are the changed files that are not lock files, workflows or configuration
  (the exclusions of the mixed-change check), so a bump of a lock file alone does not warn. A root-level data file, such as `flags.json`, counts as configuration in this
  rule, so a fix that changes only that file does not warn. The finding names the source files and says how many there are. A docs-only fix
  has no source file and does not warn. A fix that adds its test in the same change does not warn.

## The star hint

After a successful run in a terminal, the CLI prints one line on stderr that asks for a star on
GitHub. It is shown once per machine: the marker is `product-engineer/star-hint-shown` under
`$XDG_CONFIG_HOME` (or `~/.config`). It never appears when `CI` is set, when stdout or stderr is not
a terminal, under an agent, under a git hook, with `--json` or `--format json`, or for the `template`
subcommand. A failure to write the marker suppresses the hint rather than repeating it.

`--quiet` (`-q`) turns the hint off for one run and, on `check`, keeps only the errors and warnings of
a text or github report. `doctor` prints the hint unless `-q` is given. `stubs` accepts `-q` and only
hides the hint, so the flag works the same across subcommands. `template` never prints the hint. The
exit code never changes.

To turn the hint off for good:

`export PRODUCT_ENGINEER_NO_STAR_HINT=1`

## Release notes: `product-engineer notes`

`notes <file>` reads release notes written for people who do not read code, one line at a time.
It exits 1 when it finds an error, 0 when it finds none, and 2 on a usage error or a file it cannot read.

The errors:

- `commit-prefix`: a line (after a list marker or heading mark) that starts with a conventional commit
  prefix: `feat`, `fix`, `chore`, `docs`, `refactor`, `perf`, `test`, `style`, `build`, `ci` or `revert`,
  an optional `(scope)`, then a colon.
- `commit-word`: the words `refactor` (and `refactored`, `refactoring`) or `chore` anywhere on a line.
- `code-identifier`: a backticked span, a camelCase word or a PascalCase word with an inner capital,
  a snake_case word, a lowercase word with digits glued to its end (`step3`), a kebab-case word that holds a digit next to letters or has three or more parts and
  no short joining word (so "day-to-day" is prose), a call such as `name()`, a path with a slash (a
  leading `./` or `/`, a first folder such as `src/`, or two slashes), or a file name with a common
  extension. Links are skipped, and framework names such as Node.js are not file names.
- `docs-or-version`: a line about docs, documentation, a README, a changelog or a version bump.
- `unmeasured-effect`: `faster`, `quicker`, `speed`, `snappier` or `instant` on a line that does not say
  `measured`.
- `unmeasured-percent`: a percentage on a line that does not say `measured`.
- `version-number`: a version number (`v2.3` or `2.3.0`) on any line but the first non-empty one.

The warning:

- `no-range`: the first non-empty line names no range: no tag or version, no commit hash, no "since"
  and no "the last N commits".

`--json` prints one object, `{ ok, errors, warnings, findings: [{ level, code, line, text, message }] }`,
and nothing else. The check is a heuristic: a brand written in camelCase (iPhone) is flagged, and code
it does not recognise is missed.

## Stubs: `product-engineer stubs`

`stubs` reads only the lines a change adds. By default that is the working tree against `HEAD` (staged
and unstaged edits) plus new files that git does not ignore. `--staged` reads the index only, and
`--range A..B` reads a committed range. The text output names the scope and the number of files and
added lines it read, and says `clean` when it finds nothing.
A line the change leaves alone is never read, so an old TODO is not reported again. Each finding
names its file, line, code and a one-line reason.

The finding codes:

- `stub-marker`: TODO, FIXME or XXX in a comment (`//`, `#`, `/*`, a line starting with `*`, `<!--`,
  or a line starting with `--`).
- `not-implemented`: a throw or raise of "not implemented", or a comment that says so.
- `placeholder-return`: a return of a placeholder value with a `stub` comment, such as `return null; // stub`.
- `empty-body`: a function with an empty body, a Python function whose body is only `pass` or `...`,
  or an empty arrow bound to a name.
- `no-assertion`: a test whose body has no assertion.
- `same-expression`: an assertion that compares an expression with itself, such as `expect(x).toBe(x)`.
- `decorative-assert`: an assertion of a literal truthy value, such as `assert(true)` or `assert True`.
- `skipped-test`: a test skipped in this change (`test.skip`, `it.skip`, `xit`, `@pytest.mark.skip`).

The exit code is 1 when there are findings and 0 when there are none. `--warn` reports the findings
and exits 0; use it to see the list without a failing run. `--json` prints one object,
`{ count, findings: [{ file, line, code, reason }] }`, and nothing else.

The check is a heuristic. The limits:

- The body of a JavaScript test is the block after its arrow or `function`, found by counting brackets.
  Strings, template literals, regular expressions and comments are skipped by a simple scanner. A
  regular expression is recognised from the character before the slash, so an unusual construction can
  be misread. A `${...}` inside a template is skipped with the template.
- Assertions are recognised by name: `expect`, `assert*`, `.should`, `t.is`, `t.true`, `t.deepEqual` and
  similar, and any call whose name starts with `check`, `verify`, `expect` or `assert`. A helper with
  another name counts as no assertion and is flagged.
- Deliberate no-op functions, such as `() => {}` event handlers, mocks and noop callbacks, are flagged
  as `empty-body`. Run with `--warn` if that is noise for the project.
- A test whose body is not on the lines the change adds, such as `test("x", namedFn)`, is not checked.
- Test bodies are checked only for JavaScript, TypeScript and Python. Comment markers are checked in every
  file that is not documentation.
- Documentation files (`.md`, `.rst`, `docs/`) are skipped.
- A comment that mentions TODO in prose is flagged the same as one that marks unfinished work.
- The diff prefixes are fixed to `a/` and `b/`, so a `diff.mnemonicPrefix` or `diff.noprefix` setting does
  not change the result.

The detectors are adapted from dod-guard (MIT); see `THIRD_PARTY_NOTICES.md`.

## Facts: `product-engineer facts <source> <rewrite>`

Checks a plain-language rewrite against the text it came from. It reads both files.

- Numbers written as digits. A number the rewrite drops, or adds, exits 1 and is named. Numbers are compared
  as values, so `500.00` is 500, `12,000` is 12000, and `800,00` (a decimal comma) is 800.00, equal to 800.
- Numbering and dates. Markdown heading, bold, italic and code marks, bullets and blockquote marks are removed,
  and URLs are dropped, so digits in a link are not facts. A heading number (`## 3 Fees`) is numbering. A marker
  with a full stop, bracket or colon (`2.`, `**1.**`, `3)`) is numbering up to 99, so `800. Deposit` at the start
  of a hard-wrapped sentence stays an amount. A decimal section number (`1.1 Definitions.`, `3.2.1 Payment.`) is
  numbering when its title is one or two words, so `1.5 months rent is held.` is an amount. A bare integer is
  numbering only on a short line with no sentence end and a capitalised word after it (`1 Definitions`); `45 days'
  notice` is an amount. The first cell of a markdown table row is numbering, and an inline `(1)` is numbering.
  A named reference (clause, section, article, schedule, annex, appendix, paragraph, `art.`, `§`, in any letter
  case) and the numbers it cites (`Sections 3 and 4`, `Article 5(2)`) are not facts. A number followed by a unit
  (`part 60 days`) is an amount.
- Dates. A date in any of these forms is one value, and the forms compare equal: `2026-10-14`, `14 October 2026`,
  `14th of October, 2026`, `October 14, 2026`, `14.10.2026` and `14/10/2026`. Numeric dates are read day first:
  `03/04/2026` is 3 April 2026. A numeric date whose month is above 12 is not a date and is not guessed, so
  `10/14/2026` is read as three numbers.
- Obligations. The source phrases `must`, `shall`, `shall not`, `must not`, `may not`, `within N days`,
  `prior written consent`, `non-refundable`, `confidential` and `terminate` are looked for in the rewrite in
  their plain form (`must`, `have to` or `need to`; `not refundable`; `end the agreement`, and so on). A
  missing equivalent is a warning, because wording varies.
- Legal phrases left in the rewrite: `hereinafter`, `hereunder`, `herein`, `thereof`, `notwithstanding`,
  `forthwith`, `aforementioned`, `whereas`, `hereby` and `pursuant to`. A warning.
- Sentence length in the rewrite. A sentence ends after `.`, `?` or `!` and a space, or at the end of a
  unit. A list item and a heading are units of their own. The average and the longest sentence are counted
  in words. The average must be at most `--avg-sentence` (default 20) and the longest at most
  `--max-sentence` (default 35). Exceeding either exits 1.

Exit codes: 0 when the numbers match and both limits hold (warnings do not change it), 1 when a check
fails, 2 on a usage error or an unreadable file. `--json` prints one object with `numbers`, `obligations`,
`legalese`, `sentences`, `violations` and `ok`.

Limits: the obligation and legal lists are English only. A number written in words ("forty-five") is not
compared. A sentence split happens at any full stop followed by a space, so an abbreviation such as "e.g." ends a
sentence. A decimal at the start of a line whose title is three or more words is read as an amount, so a section
number written with a long title ("1.1 Rent is payable monthly.") is counted as a fact. The line-start rules are
heuristics, and a rewrite that drops a number is reported with exit 1 for a person to check.
