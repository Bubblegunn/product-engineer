#!/usr/bin/env bash
set -euo pipefail
mkdir -p "$1"; cd "$1"
git init -q -b main
git config user.name "Ines Marques"; git config user.email "ines@example.test"
A=("Ines Marques|ines@example.test" "Kofi Mensah|kofi@example.test" "Hannah Lindqvist|hannah@example.test")
n=0
nextdate(){ n=$((n+1)); D=$(printf '2026-%02d-%02dT11:00:00+0000' $((1+n/14)) $((1+(n%14)*2))); }
ci(){ local msg="$1" a="${2:-$((n%3))}" nm em; nextdate
  IFS='|' read -r nm em <<<"${A[$a]}"
  git add -A
  GIT_AUTHOR_NAME="$nm" GIT_AUTHOR_EMAIL="$em" GIT_COMMITTER_NAME="$nm" GIT_COMMITTER_EMAIL="$em" GIT_AUTHOR_DATE="$D" GIT_COMMITTER_DATE="$D" git commit -q -m "$msg"; }

mkdir -p pantry tests docs data
printf '__pycache__/\n*.pyc\n' > .gitignore
cat > pyproject.toml <<'X'
[project]
name = "pantry"
version = "0.3.0"
description = "Track what is in the kitchen cupboard"
requires-python = ">=3.9"
X
echo "# pantry" > README.md
ci "chore: skeleton" 0

touch pantry/__init__.py tests/__init__.py
cat > pantry/store.py <<'X'
import json
import os


class Store:
    def __init__(self, path):
        self.path = path

    def _load(self):
        if not os.path.exists(self.path):
            return []
        with open(self.path) as fh:
            return json.load(fh)

    def _save(self, items):
        with open(self.path, "w") as fh:
            json.dump(items, fh, indent=2)

    def all(self):
        return self._load()

    def add(self, name, quantity):
        items = self._load()
        for it in items:
            if it["name"] == name:
                it["quantity"] += quantity
                break
        else:
            items.append({"name": name, "quantity": quantity})
        self._save(items)

    def remove(self, name):
        self._save([i for i in self._load() if i["name"] != name])
X
cat > tests/test_store.py <<'X'
import os
import tempfile
import unittest
from pantry.store import Store


class StoreTest(unittest.TestCase):
    def setUp(self):
        self.dir = tempfile.TemporaryDirectory()
        self.store = Store(os.path.join(self.dir.name, "p.json"))

    def tearDown(self):
        self.dir.cleanup()

    def test_add_accumulates(self):
        self.store.add("flour", 1)
        self.store.add("flour", 2)
        self.assertEqual(self.store.all(), [{"name": "flour", "quantity": 3}])

    def test_remove(self):
        self.store.add("flour", 1)
        self.store.remove("flour")
        self.assertEqual(self.store.all(), [])
X
ci "feat(store): json-backed pantry store" 1

cat > pantry/cli.py <<'X'
import argparse
import sys

from .store import Store


def cmd_list(store, args, out):
    for it in store.all():
        out.write("%s x%s\n" % (it["name"], it["quantity"]))


def cmd_add(store, args, out):
    store.add(args.name, args.quantity)
    out.write("added %s\n" % args.name)




COMMANDS = {"list": cmd_list, "add": cmd_add}


def main(argv=None, out=sys.stdout):
    p = argparse.ArgumentParser(prog="pantry")
    p.add_argument("--file", default="pantry.json")
    sub = p.add_subparsers(dest="command", required=True)
    sub.add_parser("list")
    a = sub.add_parser("add")
    a.add_argument("name")
    a.add_argument("quantity", type=int, nargs="?", default=1)
    args = p.parse_args(argv)
    COMMANDS[args.command](Store(args.file), args, out)
    return 0
X
cat > tests/test_cli.py <<'X'
import io
import os
import tempfile
import unittest
from pantry.cli import main


class CliTest(unittest.TestCase):
    def test_add_and_list(self):
        with tempfile.TemporaryDirectory() as d:
            f = os.path.join(d, "p.json")
            main(["--file", f, "add", "rice", "2"], out=io.StringIO())
            buf = io.StringIO()
            main(["--file", f, "list"], out=buf)
            self.assertEqual(buf.getvalue(), "rice x2\n")
X
ci "feat(cli): add and list commands" 2

cat > README.md <<'X'
# pantry

Track what is in the kitchen cupboard.

    python -c "from pantry.cli import main; main()" add rice 2

Tests: `python -m unittest`.
X
cat > CHANGELOG.md <<'X'
# Changelog

## Unreleased

- _nothing yet_

## 0.3.0
- `remove` in the store.

## 0.2.0
- CLI add/list.

## 0.1.0
- Json store.
X
cat > docs/usage.md <<'X'
# Usage

`pantry add NAME [QTY]` and `pantry list`. The data file defaults to
`pantry.json` in the current directory; pass `--file` to change it.
X
ci "docs: readme, changelog, usage" 0

for i in $(seq 1 9); do
  printf 'name,quantity\nitem%d,%d\n' $i $i > data/sample_$i.csv
  ci "chore: add sample data $i" $((i%3))
done

# branch: feature/export-csv, first part
git checkout -q -b feature/export-csv
cat > pantry/export.py <<'X'
import csv
import io


def to_csv(items):
    buf = io.StringIO()
    w = csv.writer(buf, lineterminator="\n")
    w.writerow(["name", "quantity"])
    for it in items:
        w.writerow([it["name"], it["quantity"]])
    return buf.getvalue()
X
cat > tests/test_export.py <<'X'
import unittest
from pantry.export import to_csv


class ExportTest(unittest.TestCase):
    def test_header_and_rows(self):
        out = to_csv([{"name": "flour", "quantity": 2}])
        self.assertEqual(out, "name,quantity\nflour,2\n")
X
ci "feat(export): csv exporter for pantry items" 1

# first part merged to main
git checkout -q main
nextdate
GIT_AUTHOR_NAME="Ines Marques" GIT_AUTHOR_EMAIL="ines@example.test" GIT_COMMITTER_NAME="Ines Marques" GIT_COMMITTER_EMAIL="ines@example.test" GIT_AUTHOR_DATE="$D" GIT_COMMITTER_DATE="$D" git merge -q --no-ff feature/export-csv -m "Merge branch 'feature/export-csv' (exporter core)"

# branch continues
git checkout -q feature/export-csv
cat >> pantry/cli.py <<'X'


def cmd_export(store, args, out):
    from .export import to_csv
    out.write(to_csv(store.all()))


COMMANDS["export"] = cmd_export
X
python3 - <<'PY'
import re
p='pantry/cli.py'
s=open(p).read()
s=s.replace('    sub.add_parser("list")\n','    sub.add_parser("list")\n    sub.add_parser("export")\n')
open(p,'w').write(s)
PY
cat >> tests/test_cli.py <<'X'

    def test_export_command(self):
        with tempfile.TemporaryDirectory() as d:
            f = os.path.join(d, "p.json")
            main(["--file", f, "add", "rice", "2"], out=io.StringIO())
            buf = io.StringIO()
            main(["--file", f, "export"], out=buf)
            self.assertTrue(buf.getvalue().startswith("name,quantity\nrice,2"))
X
ci "feat(cli): pantry export subcommand" 1
cat > docs/export.md <<'X'
# Exporting

`pantry export` prints the pantry as CSV on standard output.
X
python3 - <<'PY'
p='CHANGELOG.md'
s=open(p).read()
s=s.replace('- _nothing yet_','- CSV export: `pantry export`.')
open(p,'w').write(s)
PY
ci "docs: document pantry export, changelog entry" 1

# main moves on: units + rename
git checkout -q main
python3 - <<'PY'
import re
p='pantry/store.py'
s=open(p).read()
s=s.replace('    def all(self):','    def items(self):')
s=s.replace('def add(self, name, quantity):','def add(self, name, quantity, unit="pcs"):')
s=s.replace('items.append({"name": name, "quantity": quantity})','items.append({"name": name, "quantity": quantity, "unit": unit})')
open(p,'w').write(s)
p='pantry/cli.py'
s=open(p).read()
s=s.replace('store.all()','store.items()')
open(p,'w').write(s)
p='pantry/export.py'
s=open(p).read()
s=s.replace('["name", "quantity"]','["name", "quantity", "unit"]').replace('it["quantity"]]','it["quantity"], it.get("unit", "pcs")]')
open(p,'w').write(s)
p='tests/test_store.py'
s=open(p).read()
s=s.replace('self.store.all()','self.store.items()').replace('{"name": "flour", "quantity": 3}','{"name": "flour", "quantity": 3, "unit": "pcs"}')
open(p,'w').write(s)
p='tests/test_export.py'
s=open(p).read()
s=s.replace('"quantity": 2}','"quantity": 2, "unit": "kg"}').replace('name,quantity\\nflour,2\\n','name,quantity,unit\\nflour,2,kg\\n')
open(p,'w').write(s)
PY
ci "feat(store): items carry a unit; rename Store.all to Store.items" 2
python3 - <<'PY'
p='CHANGELOG.md'
s=open(p).read()
s=s.replace('- _nothing yet_','- Items now have a unit (default `pcs`). `Store.all()` is now `Store.items()`.')
open(p,'w').write(s)
PY
ci "docs: changelog for item units" 2
for i in 1 2 3 4; do
  printf -- '- tip %d: label jars with the purchase date.\n' $i >> docs/usage.md
  ci "docs: usage tip $i" $((i%3))
done

# unrelated unmerged branch and a stash
git checkout -q -b wip/barcode-scan
mkdir -p pantry && printf 'def lookup(code):\n    raise NotImplementedError\n' > pantry/barcode.py
ci "wip: barcode lookup stub" 2
printf '\n# TODO: map EAN codes to names\n' >> pantry/barcode.py
ci "wip: barcode todo" 2
git checkout -q feature/export-csv
printf '\nOpen question: should export include a unit column? (draft)\n' >> docs/export.md
git stash push -q -m "wip: export doc draft" 
git status --short
