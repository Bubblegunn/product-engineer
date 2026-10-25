#!/usr/bin/env bash
set -euo pipefail
mkdir -p "$1"; cd "$1"
git init -q -b main
git config user.name "Selin Aydin"
git config user.email "selin.aydin@example.com"
c() {
  case "$1" in
    1) n="Selin Aydin"; e="selin.aydin@example.com";;
    2) n="Tomas Berg"; e="tomas.berg@example.com";;
    *) n="Nadia Okafor"; e="nadia.okafor@example.com";;
  esac
  git add -A
  GIT_AUTHOR_NAME="$n" GIT_AUTHOR_EMAIL="$e" GIT_AUTHOR_DATE="$2" GIT_COMMITTER_NAME="$n" GIT_COMMITTER_EMAIL="$e" GIT_COMMITTER_DATE="$2" git commit -q -m "$3"
}
mkdir -p csvtrim tests docs config scripts

cat > README.md <<'EOF'
# csvtrim

Small command line tool that trims leading and trailing whitespace from every
cell of a CSV file.

    python -m csvtrim input.csv -o clean.csv

See `docs/usage.md` for all options.
EOF
printf '__pycache__/\n*.pyc\n.venv/\n' > .gitignore
c 1 "2026-03-02T09:00:00+0000" "chore: initial README and gitignore"

cat > pyproject.toml <<'EOF'
[project]
name = "csvtrim"
version = "0.3.0"
description = "Trim whitespace from CSV cells"
requires-python = ">=3.8"

[project.scripts]
csvtrim = "csvtrim.cli:main"
EOF
cat > csvtrim/__init__.py <<'EOF'
__version__ = "0.3.0"
EOF
cat > csvtrim/trim.py <<'EOF'
"""Whitespace trimming for CSV cells."""


def trim_cell(value):
    return value.strip()


def trim_row(row):
    return [trim_cell(cell) for cell in row]


def trim_rows(rows):
    for row in rows:
        yield trim_row(row)
EOF
c 1 "2026-03-03T10:10:00+0000" "feat: add trim module and package metadata"

touch tests/__init__.py
cat > tests/test_trim.py <<'EOF'
import unittest

from csvtrim.trim import trim_cell, trim_row, trim_rows


class TrimTests(unittest.TestCase):
    def test_trim_cell(self):
        self.assertEqual(trim_cell("  a b  "), "a b")

    def test_trim_row(self):
        self.assertEqual(trim_row([" x", "y ", " z "]), ["x", "y", "z"])

    def test_trim_rows_is_lazy_and_ordered(self):
        out = list(trim_rows([[" 1"], ["2 "]]))
        self.assertEqual(out, [["1"], ["2"]])


if __name__ == "__main__":
    unittest.main()
EOF
c 1 "2026-03-03T11:00:00+0000" "test: cover trim helpers"

cat > csvtrim/reader.py <<'EOF'
"""CSV reading."""
import csv


def read_rows(path, delimiter=","):
    with open(path, newline="", encoding="utf-8") as fh:
        for row in csv.reader(fh, delimiter=delimiter):
            yield row
EOF
c 2 "2026-03-05T08:45:00+0000" "feat: add CSV reader"

cat > tests/test_reader.py <<'EOF'
import os
import tempfile
import unittest

from csvtrim.reader import read_rows


class ReaderTests(unittest.TestCase):
    def test_reads_rows(self):
        with tempfile.TemporaryDirectory() as d:
            p = os.path.join(d, "in.csv")
            with open(p, "w", encoding="utf-8") as fh:
                fh.write("a,b\n1,2\n")
            self.assertEqual(list(read_rows(p)), [["a", "b"], ["1", "2"]])

    def test_custom_delimiter(self):
        with tempfile.TemporaryDirectory() as d:
            p = os.path.join(d, "in.csv")
            with open(p, "w", encoding="utf-8") as fh:
                fh.write("a;b\n")
            self.assertEqual(list(read_rows(p, ";")), [["a", "b"]])


if __name__ == "__main__":
    unittest.main()
EOF
c 2 "2026-03-05T09:20:00+0000" "test: reader tests"

cat > csvtrim/writer.py <<'EOF'
"""CSV writing."""
import csv


def write_rows(rows, fh, delimiter=","):
    writer = csv.writer(fh, delimiter=delimiter, lineterminator="\n")
    count = 0
    for row in rows:
        writer.writerow(row)
        count += 1
    return count
EOF
cat > tests/test_writer.py <<'EOF'
import io
import unittest

from csvtrim.writer import write_rows


class WriterTests(unittest.TestCase):
    def test_write_rows_returns_count(self):
        buf = io.StringIO()
        self.assertEqual(write_rows([["a", "b"], ["1", "2"]], buf), 2)
        self.assertEqual(buf.getvalue(), "a,b\n1,2\n")

    def test_quotes_when_needed(self):
        buf = io.StringIO()
        write_rows([["a,b", "c"]], buf)
        self.assertEqual(buf.getvalue(), '"a,b",c\n')


if __name__ == "__main__":
    unittest.main()
EOF
c 1 "2026-03-09T14:00:00+0000" "feat: add CSV writer with tests"

cat > csvtrim/cli.py <<'EOF'
"""Command line entry point."""
import argparse
import sys

from . import __version__
from .reader import read_rows
from .trim import trim_rows
from .writer import write_rows


def build_parser():
    parser = argparse.ArgumentParser(
        prog="csvtrim",
        description="Trim whitespace from every cell of a CSV file.",
    )
    parser.add_argument("input")
    parser.add_argument("-o", "--output", default="-")
    parser.add_argument("--delimiter", default=",")
    parser.add_argument("--version", action="version", version="csvtrim " + __version__)
    return parser


def main(argv=None):
    args = build_parser().parse_args(argv)
    try:
        rows = trim_rows(read_rows(args.input, args.delimiter))
        if args.output == "-":
            count = write_rows(rows, sys.stdout, args.delimiter)
        else:
            with open(args.output, "w", newline="", encoding="utf-8") as fh:
                count = write_rows(rows, fh, args.delimiter)
    except FileNotFoundError:
        print("csvtrim: no such file: " + args.input, file=sys.stderr)
        return 2
    print("csvtrim: %d rows" % count, file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main())
EOF
cat > csvtrim/__main__.py <<'EOF'
import sys

from .cli import main

sys.exit(main())
EOF
c 1 "2026-03-10T09:30:00+0000" "feat: command line interface"

cat > tests/test_cli.py <<'EOF'
import os
import tempfile
import unittest

from csvtrim.cli import main


class CliTests(unittest.TestCase):
    def test_trims_file(self):
        with tempfile.TemporaryDirectory() as d:
            src = os.path.join(d, "in.csv")
            dst = os.path.join(d, "out.csv")
            with open(src, "w", encoding="utf-8") as fh:
                fh.write(" a , b \n 1,2 \n")
            self.assertEqual(main([src, "-o", dst]), 0)
            with open(dst, encoding="utf-8") as fh:
                self.assertEqual(fh.read(), "a,b\n1,2\n")

    def test_missing_file_returns_2(self):
        self.assertEqual(main(["/nonexistent/file.csv"]), 2)


if __name__ == "__main__":
    unittest.main()
EOF
c 1 "2026-03-10T10:15:00+0000" "test: end-to-end CLI tests"

cat > config/defaults.ini <<'EOF'
[csvtrim]
delimiter = ,
encoding = utf-8
EOF
cat > csvtrim/config.py <<'EOF'
"""Defaults loader (not wired into the CLI yet)."""
import configparser
import os

DEFAULT_PATH = os.path.join(os.path.dirname(__file__), "..", "config", "defaults.ini")


def load_defaults(path=DEFAULT_PATH):
    parser = configparser.ConfigParser()
    parser.read(path, encoding="utf-8")
    return dict(parser["csvtrim"]) if parser.has_section("csvtrim") else {}
EOF
c 3 "2026-03-12T13:00:00+0000" "feat: defaults.ini and loader"

cat > docs/usage.md <<'EOF'
# Usage

```
csvtrim INPUT [-o OUTPUT] [--delimiter CHAR] [--version]
```

- `INPUT` is the CSV file to read.
- `-o OUTPUT` writes to a file instead of standard output.
- `--delimiter` sets the field separator (default `,`).

Exit codes: `0` success, `2` input file not found.
EOF
c 3 "2026-03-12T15:40:00+0000" "docs: usage guide"

cat > Makefile <<'EOF'
.PHONY: test bench
test:
	python3 -m unittest
bench:
	python3 scripts/bench.py
EOF
cat > scripts/bench.py <<'EOF'
"""Rough timing of trim_rows on synthetic data."""
import time

from csvtrim.trim import trim_rows


def main():
    rows = [[" value %d " % i, " x "] for i in range(200000)]
    start = time.perf_counter()
    n = sum(1 for _ in trim_rows(rows))
    elapsed = time.perf_counter() - start
    print("trimmed %d rows in %.3fs" % (n, elapsed))


if __name__ == "__main__":
    main()
EOF
c 2 "2026-03-16T09:00:00+0000" "chore: Makefile and bench script"

cat > CHANGELOG.md <<'EOF'
# Changelog

## 0.3.0
- Initial public release: trim, read, write, CLI.
EOF
c 1 "2026-03-17T16:00:00+0000" "docs: add changelog"

cat > docs/design.md <<'EOF'
# Design notes

The pipeline is a chain of generators: `read_rows` -> `trim_rows` -> `write_rows`.
Nothing is held in memory beyond one row, so very large files are fine.
Further stages (filtering, deduplication) should follow the same shape: take an
iterable of rows, yield rows.
EOF
c 3 "2026-03-19T11:20:00+0000" "docs: design notes on the generator pipeline"

sed -i.bak 's/encoding="utf-8"/encoding="utf-8-sig"/' csvtrim/reader.py && rm csvtrim/reader.py.bak
cat >> tests/test_reader.py <<'EOF'
EOF
python3 - <<'PY'
p="tests/test_reader.py"
s=open(p).read()
s=s.replace('''

if __name__ == "__main__":''','''
    def test_strips_utf8_bom(self):
        with tempfile.TemporaryDirectory() as d:
            p = os.path.join(d, "in.csv")
            with open(p, "wb") as fh:
                fh.write(b"\\xef\\xbb\\xbfa,b\\n")
            self.assertEqual(list(read_rows(p)), [["a", "b"]])


if __name__ == "__main__":''')
open(p,"w").write(s)
PY
c 2 "2026-03-23T08:50:00+0000" "fix: reader no longer keeps the UTF-8 BOM in the first cell"

cat > csvtrim/trim.py <<'EOF'
"""Whitespace trimming for CSV cells."""

_NBSP = " "


def trim_cell(value):
    return value.strip().strip(_NBSP).strip()


def trim_row(row):
    return [trim_cell(cell) for cell in row]


def trim_rows(rows):
    for row in rows:
        yield trim_row(row)
EOF
python3 - <<'PY'
p="tests/test_trim.py"
s=open(p).read()
s=s.replace('''    def test_trim_row(self):''','''    def test_trim_cell_strips_non_breaking_space(self):
        self.assertEqual(trim_cell("\\u00a0 a \\u00a0"), "a")

    def test_trim_row(self):''')
open(p,"w").write(s)
PY
c 3 "2026-03-25T10:05:00+0000" "fix: trim non-breaking spaces as well"

cat >> docs/usage.md <<'EOF'

## Notes

Cells containing a non-breaking space at either end are trimmed too, and a
leading UTF-8 byte order mark is removed from the first cell.
EOF
c 3 "2026-03-25T10:30:00+0000" "docs: mention NBSP and BOM handling"

cat > scripts/check.sh <<'EOF'
#!/usr/bin/env bash
# Run the same checks CI runs.
set -euo pipefail
python3 -m unittest
python3 -m csvtrim --version
EOF
chmod +x scripts/check.sh
c 2 "2026-03-30T09:10:00+0000" "chore: scripts/check.sh mirrors CI"

python3 - <<'PY'
p="tests/test_cli.py"
s=open(p).read()
s=s.replace('''

if __name__ == "__main__":''','''
    def test_custom_delimiter_round_trip(self):
        with tempfile.TemporaryDirectory() as d:
            src = os.path.join(d, "in.csv")
            dst = os.path.join(d, "out.csv")
            with open(src, "w", encoding="utf-8") as fh:
                fh.write(" a ; b \\n")
            self.assertEqual(main([src, "-o", dst, "--delimiter", ";"]), 0)
            with open(dst, encoding="utf-8") as fh:
                self.assertEqual(fh.read(), "a;b\\n")


if __name__ == "__main__":''')
open(p,"w").write(s)
PY
c 1 "2026-04-02T15:00:00+0000" "test: custom delimiter round trip"

cat > CHANGELOG.md <<'EOF'
# Changelog

## 0.3.1
- Reader drops the UTF-8 BOM.
- Trimming now covers non-breaking spaces.

## 0.3.0
- Initial public release: trim, read, write, CLI.
EOF
sed -i.bak 's/0.3.0/0.3.1/' pyproject.toml csvtrim/__init__.py && rm pyproject.toml.bak csvtrim/__init__.py.bak
c 1 "2026-04-06T12:00:00+0000" "chore: release 0.3.1"

cat >> README.md <<'EOF'

## Development

    make test       # run the unit tests
    make bench      # rough timing of the trim stage
EOF
c 3 "2026-04-07T09:00:00+0000" "docs: README development section"

# ---- messy working tree: Selin's dedupe work + unrelated things ----
cat > csvtrim/dedupe.py <<'EOF'
"""Drop duplicate rows while keeping the first occurrence."""


def dedupe_rows(rows, key=None):
    seen = set()
    for row in rows:
        ident = tuple(row) if key is None else (row[key],)
        if ident in seen:
            continue
        seen.add(ident)
        yield row
EOF
cat > tests/test_dedupe.py <<'EOF'
import unittest

from csvtrim.dedupe import dedupe_rows


class DedupeTests(unittest.TestCase):
    def test_removes_exact_duplicates(self):
        rows = [["a", "1"], ["a", "1"], ["b", "2"]]
        self.assertEqual(list(dedupe_rows(rows)), [["a", "1"], ["b", "2"]])

    def test_keeps_first_occurrence_order(self):
        rows = [["z"], ["a"], ["z"], ["m"]]
        self.assertEqual(list(dedupe_rows(rows)), [["z"], ["a"], ["m"]])

    def test_key_column_only(self):
        rows = [["a", "1"], ["a", "2"], ["b", "3"]]
        self.assertEqual(list(dedupe_rows(rows, key=0)), [["a", "1"], ["b", "3"]])

    def test_key_column_ignores_case(self):
        rows = [["Ana@Example.com", "1"], ["ana@example.com", "2"]]
        self.assertEqual(len(list(dedupe_rows(rows, key=0))), 1)


if __name__ == "__main__":
    unittest.main()
EOF
python3 - <<'PY'
p="csvtrim/cli.py"
s=open(p).read()
s=s.replace("from .reader import read_rows\n","from .dedupe import dedupe_rows\nfrom .reader import read_rows\n")
s=s.replace('''    parser.add_argument("--version"''','''    parser.add_argument("--dedupe", action="store_true", help="drop duplicate rows")
    parser.add_argument("--key", type=int, default=None, help="column index used by --dedupe")
    parser.add_argument("--version"''')
s=s.replace('''        rows = trim_rows(read_rows(args.input, args.delimiter))
''','''        rows = trim_rows(read_rows(args.input, args.delimiter))
        if args.dedupe:
            rows = dedupe_rows(rows, args.key)
''')
open(p,"w").write(s)
PY
cat >> docs/usage.md <<'EOF'

## Removing duplicates

`--dedupe` drops repeated rows and keeps the first one. Add `--key N` to compare
only column `N` (zero based), for example `--dedupe --key 0` to keep one row per
e-mail address.
EOF
# unrelated edits that are not part of the dedupe work
sed -i.bak 's/^delimiter = ,/delimiter = ;/' config/defaults.ini && rm config/defaults.ini.bak
python3 - <<'PY'
p="scripts/bench.py"
s=open(p).read()
s=s.replace('def main():\n','def main():\n    print("DEBUG reading /Users/selin/Downloads/big.csv")\n')
open(p,"w").write(s)
PY
printf 'CSVTRIM_REGISTRY_TOKEN=changeme-local\nCSVTRIM_REGISTRY_USER=example-only\n' > .env.local
printf 'name,email\nAna,ana@example.com\nAna,ana@example.com\n' > sample_out.csv
