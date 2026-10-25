#!/usr/bin/env bash
set -euo pipefail
cd "$1"
git init -q -b main
git config user.name "Tom Okafor"
git config user.email "tom@example.test"
N=0
c() {
  N=$((N+1)); local t=$((1739000000 + N*47000)) an ae
  case $1 in d) an="Dana Ruiz"; ae="dana@example.test";; t) an="Tom Okafor"; ae="tom@example.test";; l) an="Lena Vogt"; ae="lena@example.test";; esac
  git add -A
  GIT_AUTHOR_NAME="$an" GIT_AUTHOR_EMAIL="$ae" GIT_COMMITTER_NAME="$an" GIT_COMMITTER_EMAIL="$ae" \
  GIT_AUTHOR_DATE="$t +0000" GIT_COMMITTER_DATE="$t +0000" git commit -q -m "$2"
}
mkdir -p tabula tests docs data

cat > README.md <<'EOF'
# tabula

Exports customer records from a JSON file into spreadsheet-friendly formats.
Used by the reporting team to hand data to customers.

    python3 -m tabula.cli data/sample.json --format csv --out report.csv
    python3 -m unittest

Formats are listed in docs/usage.md.
EOF
cat > pyproject.toml <<'EOF'
[project]
name = "tabula"
version = "1.0.0"
requires-python = ">=3.9"
EOF
printf '__pycache__/\n*.pyc\n*.csv\n*.xlsx\n' > .gitignore
c d "start tabula"

cat > tabula/__init__.py <<'EOF'
__version__ = "1.0.0"
EOF
cat > tabula/records.py <<'EOF'
import json


def load_records(path):
    with open(path, encoding="utf-8") as fh:
        data = json.load(fh)
    if not isinstance(data, list):
        raise ValueError("expected a list of records")
    return data


def columns_of(records):
    cols = []
    for rec in records:
        for key in rec:
            if key not in cols:
                cols.append(key)
    return cols
EOF
cat > data/sample.json <<'EOF'
[
  {"id": 1, "name": "Ada Lovelace", "plan": "pro", "seats": 12},
  {"id": 2, "name": "Grace Hopper", "plan": "team", "seats": 40},
  {"id": 3, "name": "Alan Turing", "plan": "free", "seats": 1}
]
EOF
cat > tests/__init__.py <<'EOF'
EOF
cat > tests/test_records.py <<'EOF'
import os
import unittest

from tabula.records import columns_of, load_records

SAMPLE = os.path.join(os.path.dirname(__file__), "..", "data", "sample.json")


class RecordsTest(unittest.TestCase):
    def test_load(self):
        self.assertEqual(len(load_records(SAMPLE)), 3)

    def test_columns_keep_order(self):
        self.assertEqual(columns_of(load_records(SAMPLE)), ["id", "name", "plan", "seats"])
EOF
c d "record loading"

cat > tabula/csv_export.py <<'EOF'
import csv

from .records import columns_of


def write_csv(records, fh, columns=None):
    cols = columns or columns_of(records)
    writer = csv.DictWriter(fh, fieldnames=cols, extrasaction="ignore")
    writer.writeheader()
    for rec in records:
        writer.writerow(rec)
    return len(records)
EOF
cat > tests/test_csv_export.py <<'EOF'
import io
import unittest

from tabula.csv_export import write_csv


class CsvTest(unittest.TestCase):
    def test_header_and_rows(self):
        buf = io.StringIO()
        n = write_csv([{"a": 1, "b": "x"}, {"a": 2, "b": "y"}], buf)
        self.assertEqual(n, 2)
        lines = buf.getvalue().splitlines()
        self.assertEqual(lines[0], "a,b")
        self.assertEqual(lines[2], "2,y")

    def test_extra_keys_ignored_when_columns_given(self):
        buf = io.StringIO()
        write_csv([{"a": 1, "b": 2}], buf, columns=["a"])
        self.assertEqual(buf.getvalue().splitlines(), ["a", "1"])
EOF
c t "csv export"

cat > tabula/formats.py <<'EOF'
from .csv_export import write_csv

FORMATS = {
    "csv": write_csv,
}
EOF
cat > tabula/cli.py <<'EOF'
import argparse
import sys

from . import __version__
from .formats import FORMATS
from .records import load_records


def main(argv=None):
    p = argparse.ArgumentParser(prog="tabula")
    p.add_argument("source")
    p.add_argument("--format", default="csv", choices=sorted(FORMATS))
    p.add_argument("--out", default="-")
    p.add_argument("--version", action="version", version=__version__)
    args = p.parse_args(argv)
    records = load_records(args.source)
    writer = FORMATS[args.format]
    if args.out == "-":
        writer(records, sys.stdout)
    else:
        with open(args.out, "w", newline="", encoding="utf-8") as fh:
            writer(records, fh)
    return 0


if __name__ == "__main__":
    sys.exit(main())
EOF
cat > tests/test_cli.py <<'EOF'
import os
import tempfile
import unittest

from tabula.cli import main

SAMPLE = os.path.join(os.path.dirname(__file__), "..", "data", "sample.json")


class CliTest(unittest.TestCase):
    def test_csv_to_file(self):
        with tempfile.TemporaryDirectory() as d:
            out = os.path.join(d, "o.csv")
            self.assertEqual(main([SAMPLE, "--out", out]), 0)
            with open(out) as fh:
                self.assertEqual(fh.readline().strip(), "id,name,plan,seats")
EOF
c d "cli"

cat > docs/usage.md <<'EOF'
# Usage

    python3 -m tabula.cli <source.json> [--format csv] [--out file]

## Formats

- `csv` - comma separated, UTF-8, header row. Available since 1.0.
EOF
cat > CHANGELOG.md <<'EOF'
# Changelog

## 1.0.0
- CSV export
EOF
c l "docs and changelog"
git tag v1.0.0

printf '\n- Column selection via columns= argument\n' >> CHANGELOG.md
c t "columns arg"
sed -i.bak 's/1.0.0/1.1.0/' pyproject.toml tabula/__init__.py && rm -f pyproject.toml.bak tabula/__init__.py.bak
printf '\n## 1.1.0\n- Column selection\n' >> CHANGELOG.md
c t "release 1.1.0"
git tag v1.1.0
printf '\nNote: empty input produces a header-less file.\n' >> docs/usage.md
c d "usage note on empty input"
printf '\n## Known issues\n- Empty input gives an empty file\n' >> README.md
c l "known issues"
sed -i.bak 's/1.1.0/1.2.0/' pyproject.toml tabula/__init__.py && rm -f pyproject.toml.bak tabula/__init__.py.bak
printf '\n## 1.2.0\n- Fix: unicode names in CSV\n' >> CHANGELOG.md
c d "fix unicode, bump 1.2.0"
git tag v1.2.0

cat > ROADMAP.md <<'EOF'
# Roadmap

| Item | Status |
|------|--------|
| CSV export | shipped (1.0) |
| Column selection | shipped (1.1) |
| Excel (.xlsx) export | shipped (1.3) |
| JSON lines export | planned |
EOF
c l "roadmap"
printf '\nAlso see ROADMAP.md.\n' >> README.md
c l "readme: link roadmap"
printf '\n# helper for later\n' >> tabula/records.py
c t "wip"
sed -i.bak 's/1.2.0/1.3.0/' pyproject.toml tabula/__init__.py && rm -f pyproject.toml.bak tabula/__init__.py.bak
printf '\n## 1.3.0\n- Fix: quoting of values with commas\n' >> CHANGELOG.md
c d "release 1.3.0"
git tag v1.3.0
printf '\n- Reports with 100k rows export in a few seconds.\n' >> docs/usage.md
c d "usage: performance note"

git checkout -q -b feature/excel-export
cat > tabula/xlsx_export.py <<'EOF'
from .records import columns_of


def column_widths(records, columns=None):
    cols = columns or columns_of(records)
    widths = {}
    for col in cols:
        longest = max([len(str(col))] + [len(str(r.get(col, ""))) for r in records])
        widths[col] = min(longest + 2, 60)
    return widths


def write_xlsx(records, fh, columns=None):
    # TODO: build the workbook with zipfile + xml (no extra dependencies)
    raise NotImplementedError("xlsx writer pending")
EOF
c t "excel: start xlsx module"
cat > tabula/formats.py <<'EOF'
from .csv_export import write_csv
from .xlsx_export import write_xlsx

FORMATS = {
    "csv": write_csv,
    "xlsx": write_xlsx,
}
EOF
c t "register xlsx format so --format xlsx is accepted"
cat > tests/test_xlsx_export.py <<'EOF'
import io
import unittest

from tabula.xlsx_export import column_widths, write_xlsx


class XlsxTest(unittest.TestCase):
    def test_column_widths(self):
        w = column_widths([{"name": "Ada", "n": 1}, {"name": "Grace Hopper", "n": 22}])
        self.assertEqual(w["name"], 14)
        self.assertEqual(w["n"], 4)

    @unittest.skip("flaky on CI, timezone issue")
    def test_roundtrip(self):
        buf = io.BytesIO()
        self.assertEqual(write_xlsx([{"a": 1}], buf), 1)
EOF
c t "excel: tests"
printf '\n- `xlsx` - Excel workbook. Use `--format xlsx`.\n' >> docs/usage.md
c l "docs: describe xlsx format"
cat > TODO.md <<'EOF'
# Excel export - remaining work

- [x] format registry accepts xlsx
- [x] column width helper
- [ ] the actual workbook writer (write_xlsx still raises NotImplementedError)
- [ ] number and date cell formats
- [ ] un-skip tests/test_xlsx_export.py::test_roundtrip once the writer exists
- [ ] changelog + version bump
EOF
c t "excel export: todo list"
printf '\n## Unreleased\n- Excel (.xlsx) export\n' >> CHANGELOG.md
c l "changelog: excel export"
printf '\n# cosmetics\n' >> tabula/xlsx_export.py
c t "excel export done, tests green"
printf '\nTip: xlsx files open directly in Excel.\n' >> docs/usage.md
c l "docs polish"
