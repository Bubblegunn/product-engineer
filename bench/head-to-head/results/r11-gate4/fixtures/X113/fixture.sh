#!/usr/bin/env bash
set -euo pipefail
# Fixture X113: rollup (Python data CLI). The deprecated --legacy-csv flag is still used by deploy/crontab and scripts/nightly_export.sh.
mkdir -p "$1"
cd "$1"
git init -q -b main
git config user.name "Ines Carvalho"
git config user.email "ines@rollup.example"

AUTH=("Ines Carvalho|ines@rollup.example" "Kofi Mensah|kofi@rollup.example" "Hannah Brandt|hannah@rollup.example")
N=0
commit() {
  local a="${AUTH[$1]}"
  N=$((N + 1))
  local ts=$((1677000000 + N * 640000))
  git add -A
  GIT_AUTHOR_NAME="${a%%|*}" GIT_AUTHOR_EMAIL="${a##*|}" \
  GIT_COMMITTER_NAME="${a%%|*}" GIT_COMMITTER_EMAIL="${a##*|}" \
  GIT_AUTHOR_DATE="$ts +0000" GIT_COMMITTER_DATE="$ts +0000" git commit -q -m "$2"
}
w() { mkdir -p "$(dirname "$1")"; cat > "$1"; }

w .gitignore <<'EOF'
__pycache__/
*.pyc
out/
.venv/
EOF
w pyproject.toml <<'EOF'
[project]
name = "rollup"
version = "0.7.2"
description = "Roll up order exports by region or customer"
requires-python = ">=3.9"

[project.scripts]
rollup = "rollup.cli:run"
EOF
w README.md <<'EOF'
# rollup

Roll up an orders export (CSV) by region or customer and write the totals as
CSV or JSON. Used by finance for the weekly and nightly reports.

## Usage

```
python -m rollup.cli data/sample_orders.csv --group-by region --out out/by_region.csv
```

See `docs/usage.md` for every option.
EOF
commit 0 "Start rollup: README, pyproject"

w rollup/__init__.py <<'EOF'
__version__ = "0.7.2"
EOF
w rollup/reader.py <<'EOF'
"""Read an orders export into dictionaries with Decimal amounts."""
import csv
from decimal import Decimal


def read_orders(path):
    with open(path, newline="", encoding="utf-8-sig") as fh:
        for row in csv.DictReader(fh):
            row["amount"] = Decimal(row["amount"])
            yield row
EOF
w rollup/aggregate.py <<'EOF'
"""Group orders and total their amounts."""
from collections import defaultdict
from decimal import Decimal


def rollup(rows, group_by="region"):
    totals = defaultdict(lambda: {"orders": 0, "total": Decimal("0")})
    for row in rows:
        bucket = totals[row[group_by]]
        bucket["orders"] += 1
        bucket["total"] += row["amount"]
    return [
        {group_by: key, "orders": v["orders"], "total": v["total"]}
        for key, v in sorted(totals.items())
    ]
EOF
w data/sample_orders.csv <<'EOF'
order_id,customer,region,amount,currency,date
1001,Acme GmbH,EU,1200.50,EUR,2024-03-01
1002,Blue Harbor Ltd,UK,310.00,GBP,2024-03-01
1003,Kestrel Foods,EU,89.90,EUR,2024-03-02
1004,Nordlys AS,EU,450.25,EUR,2024-03-02
1005,Blue Harbor Ltd,UK,75.10,GBP,2024-03-03
1006,Pampa SA,LATAM,640.00,USD,2024-03-03
1007,Kestrel Foods,EU,120.00,EUR,2024-03-04
1008,Pampa SA,LATAM,95.40,USD,2024-03-04
EOF
commit 0 "Reader and aggregation, with a small sample export"

w rollup/writer.py <<'EOF'
"""Output writers."""
import csv
import json


def write_csv(rows, fh):
    fields = list(rows[0].keys()) if rows else []
    writer = csv.DictWriter(fh, fieldnames=fields)
    writer.writeheader()
    writer.writerows(rows)


def write_json(rows, fh):
    json.dump([{k: str(v) for k, v in r.items()} for r in rows], fh, indent=2)
    fh.write("\n")
EOF
w rollup/cli.py <<'EOF'
"""Command line entry point."""
import argparse
import sys

from .aggregate import rollup
from .reader import read_orders
from .writer import write_csv, write_json


def build_parser():
    p = argparse.ArgumentParser(prog="rollup")
    p.add_argument("input")
    p.add_argument("--group-by", choices=["region", "customer"], default="region")
    p.add_argument("--format", choices=["csv", "json"], default="csv")
    p.add_argument("--out")
    return p


def main(argv=None):
    args = build_parser().parse_args(argv)
    rows = rollup(read_orders(args.input), args.group_by)
    out = open(args.out, "w", encoding="utf-8", newline="") if args.out else sys.stdout
    try:
        if args.format == "json":
            write_json(rows, out)
        else:
            write_csv(rows, out)
    finally:
        if args.out:
            out.close()
    return 0


def run():
    sys.exit(main())


if __name__ == "__main__":
    run()
EOF
w tests/__init__.py <<'EOF'
EOF
w tests/test_aggregate.py <<'EOF'
import unittest
from decimal import Decimal

from rollup.aggregate import rollup


class AggregateTest(unittest.TestCase):
    ROWS = [
        {"region": "EU", "customer": "A", "amount": Decimal("10.50")},
        {"region": "EU", "customer": "B", "amount": Decimal("4.50")},
        {"region": "UK", "customer": "A", "amount": Decimal("1.00")},
    ]

    def test_group_by_region(self):
        result = rollup(self.ROWS, "region")
        self.assertEqual(result[0], {"region": "EU", "orders": 2, "total": Decimal("15.00")})
        self.assertEqual(result[1]["region"], "UK")

    def test_group_by_customer(self):
        result = rollup(self.ROWS, "customer")
        self.assertEqual([r["customer"] for r in result], ["A", "B"])
        self.assertEqual(result[0]["orders"], 2)


if __name__ == "__main__":
    unittest.main()
EOF
commit 0 "CLI with CSV and JSON output, aggregate tests"

w Makefile <<'EOF'
.PHONY: test
test:
	python3 -m unittest discover -s tests -t .
EOF
commit 1 "Makefile test target"

w tests/test_reader.py <<'EOF'
import os
import unittest

from rollup.reader import read_orders

SAMPLE = os.path.join(os.path.dirname(__file__), "..", "data", "sample_orders.csv")


class ReaderTest(unittest.TestCase):
    def test_reads_all_rows_with_decimal_amounts(self):
        rows = list(read_orders(SAMPLE))
        self.assertEqual(len(rows), 8)
        self.assertEqual(str(rows[0]["amount"]), "1200.50")

    def test_bom_is_tolerated(self):
        import tempfile
        with tempfile.NamedTemporaryFile("w", suffix=".csv", delete=False, encoding="utf-8-sig") as fh:
            fh.write("order_id,customer,region,amount,currency,date\n1,A,EU,1.00,EUR,2024-01-01\n")
        try:
            rows = list(read_orders(fh.name))
            self.assertEqual(rows[0]["order_id"], "1")
        finally:
            os.unlink(fh.name)


if __name__ == "__main__":
    unittest.main()
EOF
commit 2 "Reader tests, including a BOM-prefixed file"

w CHANGELOG.md <<'EOF'
# Changelog

## 0.4.0
- JSON output via `--format json`.
- `--group-by customer`.
EOF
commit 0 "Changelog"

# 0.5.0: finance asked for an Excel-friendly file
python3 - <<'EOF'
p = "rollup/cli.py"
s = open(p).read()
s = s.replace('    p.add_argument("--out")\n', '    p.add_argument("--out")\n    p.add_argument("--legacy-csv", action="store_true",\n                   help="semicolon-separated CSV for the finance importer")\n')
s = s.replace('    rows = rollup(', '    if args.legacy_csv:\n        args.format = "csv"\n    rows = rollup(')
s = s.replace("            write_csv(rows, out)", "            write_csv(rows, out, legacy=args.legacy_csv)")
open(p, "w").write(s)
p = "rollup/writer.py"
s = open(p).read()
s = s.replace('''def write_csv(rows, fh):
    fields = list(rows[0].keys()) if rows else []
    writer = csv.DictWriter(fh, fieldnames=fields)''', '''def write_csv(rows, fh, legacy=False):
    fields = list(rows[0].keys()) if rows else []
    if legacy:
        fh.write("\\ufeff")
    writer = csv.DictWriter(
        fh, fieldnames=fields,
        delimiter=";" if legacy else ",",
        lineterminator="\\r\\n" if legacy else "\\n",
    )''')
open(p, "w").write(s)
EOF
commit 1 "Add --legacy-csv for the finance Excel importer (semicolons, BOM, CRLF)"

w scripts/nightly_export.sh <<'EOF'
#!/usr/bin/env bash
# Nightly finance export. The importer on the finance side reads Excel-style CSV.
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p out
python3 -m rollup.cli /srv/data/orders_latest.csv \
  --group-by region \
  --legacy-csv \
  --out out/finance_nightly.csv
echo "wrote out/finance_nightly.csv"
EOF
chmod +x scripts/nightly_export.sh
commit 2 "Nightly export script for finance"

w deploy/crontab <<'EOF'
# m h dom mon dow command
15 2 * * * /srv/rollup/scripts/nightly_export.sh >> /var/log/rollup/nightly.log 2>&1
0 6 * * 1 cd /srv/rollup && python3 -m rollup.cli /srv/data/weekly.csv --group-by region --legacy-csv --out /srv/export/weekly_finance.csv >> /var/log/rollup/weekly.log 2>&1
EOF
w deploy/Dockerfile <<'EOF'
FROM python:3.12-slim
WORKDIR /srv/rollup
COPY rollup ./rollup
COPY scripts ./scripts
COPY deploy/crontab /etc/cron.d/rollup
CMD ["cron", "-f"]
EOF
commit 2 "Deploy: crontab for nightly and weekly finance exports"

w docs/usage.md <<'EOF'
# Usage

```
python -m rollup.cli INPUT [--group-by region|customer] [--format csv|json]
                           [--legacy-csv] [--out PATH]
```

| Option        | Meaning |
|---------------|---------|
| `--group-by`  | Column to group on. Default `region`. |
| `--format`    | `csv` (default) or `json`. |
| `--legacy-csv`| Semicolon-separated CSV for the finance importer. Implies `--format csv`. |
| `--out`       | Output file. Defaults to stdout. |

Amounts are summed as exact decimals, never floats.
EOF
commit 1 "docs: usage reference"

cat >> CHANGELOG.md <<'EOF'

## 0.5.0
- `--legacy-csv` for the finance Excel importer.
EOF
commit 0 "Changelog for 0.5.0"

cat >> README.md <<'EOF'

## Scheduled exports

Finance gets two files: `scripts/nightly_export.sh` (nightly, by region) and a
weekly run from `deploy/crontab`. Both use `--legacy-csv` because the finance importer expects it.
EOF
commit 2 "README: describe the scheduled exports"

# 0.6.0: explicit options, legacy deprecated
python3 - <<'EOF'
p = "rollup/cli.py"
s = open(p).read()
s = s.replace('''    p.add_argument("--legacy-csv", action="store_true",
                   help="semicolon-separated CSV for the finance importer")
''', '''    p.add_argument("--delimiter", default=",", help="CSV field delimiter")
    p.add_argument("--bom", action="store_true", help="write a UTF-8 byte order mark")
    p.add_argument("--newline", choices=["lf", "crlf"], default="lf")
    p.add_argument("--legacy-csv", action="store_true",
                   help="DEPRECATED: use --delimiter ';' instead")
''')
s = s.replace('''    if args.legacy_csv:
        args.format = "csv"
''', '''    if args.legacy_csv:
        print("warning: --legacy-csv is deprecated and will be removed in 0.8.0; "
              "use --delimiter ';' instead", file=sys.stderr)
        args.format = "csv"
        args.delimiter = ";"
        args.bom = True
        args.newline = "crlf"
''')
s = s.replace("            write_csv(rows, out, legacy=args.legacy_csv)",
              "            write_csv(rows, out, delimiter=args.delimiter, bom=args.bom,\n                      newline=\"\\r\\n\" if args.newline == \"crlf\" else \"\\n\")")
open(p, "w").write(s)
p = "rollup/writer.py"
s = open(p).read()
s = s.replace('''def write_csv(rows, fh, legacy=False):
    fields = list(rows[0].keys()) if rows else []
    if legacy:
        fh.write("\\ufeff")
    writer = csv.DictWriter(
        fh, fieldnames=fields,
        delimiter=";" if legacy else ",",
        lineterminator="\\r\\n" if legacy else "\\n",
    )''', '''def write_csv(rows, fh, delimiter=",", bom=False, newline="\\n"):
    fields = list(rows[0].keys()) if rows else []
    if bom:
        fh.write("\\ufeff")
    writer = csv.DictWriter(fh, fieldnames=fields, delimiter=delimiter, lineterminator=newline)''')
open(p, "w").write(s)
EOF
commit 1 "Add --delimiter, --bom and --newline; deprecate --legacy-csv"

w tests/test_writer.py <<'EOF'
import io
import unittest

from rollup.writer import write_csv, write_json

ROWS = [{"region": "EU", "orders": 2, "total": "15.00"}]


class WriterTest(unittest.TestCase):
    def test_default_csv(self):
        buf = io.StringIO()
        write_csv(ROWS, buf)
        self.assertEqual(buf.getvalue(), "region,orders,total\nEU,2,15.00\n")

    def test_delimiter_and_newline(self):
        buf = io.StringIO()
        write_csv(ROWS, buf, delimiter=";", newline="\r\n")
        self.assertEqual(buf.getvalue(), "region;orders;total\r\nEU;2;15.00\r\n")

    def test_bom_goes_first(self):
        buf = io.StringIO()
        write_csv(ROWS, buf, bom=True)
        self.assertTrue(buf.getvalue().startswith("\ufeff"))

    def test_json(self):
        buf = io.StringIO()
        write_json(ROWS, buf)
        self.assertIn('"region": "EU"', buf.getvalue())


if __name__ == "__main__":
    unittest.main()
EOF
w tests/test_cli.py <<'EOF'
import contextlib
import io
import os
import tempfile
import unittest

from rollup import cli

SAMPLE = os.path.join(os.path.dirname(__file__), "..", "data", "sample_orders.csv")


def run_cli(*args):
    with tempfile.TemporaryDirectory() as tmp:
        out = os.path.join(tmp, "out.csv")
        err = io.StringIO()
        with contextlib.redirect_stderr(err):
            code = cli.main([SAMPLE, *args, "--out", out])
        with open(out, "rb") as fh:
            return code, fh.read(), err.getvalue()


class CliTest(unittest.TestCase):
    def test_default_output_is_plain_csv(self):
        code, data, _ = run_cli()
        self.assertEqual(code, 0)
        self.assertTrue(data.startswith(b"region,orders,total\n"))

    def test_explicit_excel_options(self):
        _, data, _ = run_cli("--delimiter", ";", "--bom", "--newline", "crlf")
        self.assertTrue(data.startswith(b"\xef\xbb\xbfregion;orders;total\r\n"))

    def test_legacy_flag_matches_explicit_options(self):
        _, legacy, err = run_cli("--legacy-csv")
        _, explicit, _ = run_cli("--delimiter", ";", "--bom", "--newline", "crlf")
        self.assertEqual(legacy, explicit)
        self.assertIn("deprecated", err)

    def test_json_format(self):
        _, data, _ = run_cli("--format", "json")
        self.assertIn(b'"region": "EU"', data)


if __name__ == "__main__":
    unittest.main()
EOF
commit 1 "Tests for the new writer options and the legacy flag"

w docs/migration.md <<'EOF'
# Migration notes

## 0.6.0: `--legacy-csv` is deprecated

`--legacy-csv` still works and prints a warning. It will be removed in 0.8.0.
Switch to `--delimiter ';'`.

## 0.4.0: `--group-by`

The old `--by` option was renamed to `--group-by`.
EOF
commit 2 "docs: migration notes for 0.6.0"

python3 - <<'EOF'
p = "docs/usage.md"
s = open(p).read()
s = s.replace("[--legacy-csv] [--out PATH]", "[--delimiter C] [--bom] [--newline lf|crlf]\n                           [--legacy-csv] [--out PATH]")
s = s.replace("| `--legacy-csv`| Semicolon-separated CSV for the finance importer. Implies `--format csv`. |",
 "| `--delimiter` | CSV field delimiter. Default `,`. |\n| `--bom`       | Write a UTF-8 byte order mark first. |\n| `--newline`   | `lf` (default) or `crlf`. |\n| `--legacy-csv`| Deprecated, removed in 0.8.0. Use `--delimiter ';'`. |")
open(p, "w").write(s)
EOF
commit 1 "docs: document the new CSV options"

cat >> CHANGELOG.md <<'EOF'

## 0.6.0
- `--delimiter`, `--bom` and `--newline` options for CSV output.
- Deprecated `--legacy-csv`; scheduled for removal in 0.8.0.
EOF
commit 0 "Changelog for 0.6.0"

w docs/exports.md <<'EOF'
# Export recipes

## Plain CSV for analysts

```
python -m rollup.cli data/sample_orders.csv --group-by customer --out out/by_customer.csv
```

## JSON for the dashboard

```
python -m rollup.cli data/sample_orders.csv --format json --out out/by_region.json
```

## Finance

The finance importer is scheduled from `deploy/crontab`; see the README.
EOF
commit 2 "docs: export recipes"

python3 - <<'EOF'
p = "rollup/aggregate.py"
s = open(p).read()
s = s.replace('def rollup(rows, group_by="region"):', 'def rollup(rows, group_by="region"):\n    """Return one dict per group, sorted by group value."""')
open(p, "w").write(s)
EOF
commit 0 "aggregate: docstring"

cat >> CHANGELOG.md <<'EOF'

## 0.7.2
- Fix: amounts with trailing zeros keep their precision in the CSV output.
EOF
commit 1 "Changelog for 0.7.2"

sed -i.bak 's/^## 0.5.0$/## 0.5.0/' CHANGELOG.md && rm -f CHANGELOG.md.bak
python3 - <<'EOF'
p = "README.md"
s = open(p).read()
s = s.replace("See `docs/usage.md` for every option.", "See `docs/usage.md` for every option and `docs/exports.md` for recipes.")
open(p, "w").write(s)
EOF
commit 2 "README: link the export recipes"
