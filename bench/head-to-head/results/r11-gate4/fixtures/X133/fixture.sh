#!/usr/bin/env bash
set -euo pipefail
mkdir -p "$1"; cd "$1"
git init -q -b main
git config user.name "Hannah Lindqvist"
git config user.email "hannah.lindqvist@example.com"
c() {
  case "$1" in
    1) n="Hannah Lindqvist"; e="hannah.lindqvist@example.com";;
    2) n="Ravi Menon"; e="ravi.menon@example.com";;
    *) n="Joao Pires"; e="joao.pires@example.com";;
  esac
  git add -A
  GIT_AUTHOR_NAME="$n" GIT_AUTHOR_EMAIL="$e" GIT_AUTHOR_DATE="$2" GIT_COMMITTER_NAME="$n" GIT_COMMITTER_EMAIL="$e" GIT_COMMITTER_DATE="$2" git commit -q -m "$3"
}
mkdir -p src/stationlog tests docs data notes

cat > README.md <<'EOF'
# stationlog

Parse and summarise readings from small weather stations.

    python3 -m stationlog summary data/sample_station.csv

Input files are CSV with the columns `timestamp,temp_c,humidity`. See
`docs/formats.md`.
EOF
cat > LICENSE <<'EOF'
MIT License

Copyright (c) 2026 stationlog contributors

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software, to deal in the software without restriction.
EOF
printf '__pycache__/\n*.pyc\n*.egg-info/\ndist/\nbuild/\n' > .gitignore
c 2 "2026-01-12T09:00:00+0000" "chore: README, license, gitignore"

cat > pyproject.toml <<'EOF'
[project]
name = "stationlog"
version = "0.1.0"
description = "Parse and summarise weather station readings"
requires-python = ">=3.9"

[project.scripts]
stationlog = "stationlog.cli:main"
EOF
cat > src/stationlog/__init__.py <<'EOF'
__version__ = "0.1.0"
EOF
touch tests/__init__.py
cat > tests/__init__.py <<'EOF'
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))
EOF
cat > src/stationlog/parse.py <<'EOF'
"""Read station CSV files."""
import csv
from collections import namedtuple
from datetime import datetime, timezone

Reading = namedtuple("Reading", "ts temp_c humidity")


def parse_file(path):
    readings = []
    with open(path, newline="", encoding="utf-8") as fh:
        for row in csv.DictReader(fh):
            ts = datetime.fromisoformat(row["timestamp"]).replace(tzinfo=timezone.utc)
            readings.append(Reading(ts, float(row["temp_c"]), float(row["humidity"])))
    return readings
EOF
cat > tests/test_parse.py <<'EOF'
import os
import tempfile
import unittest

from stationlog.parse import parse_file


class ParseTests(unittest.TestCase):
    def _write(self, text):
        d = tempfile.mkdtemp()
        p = os.path.join(d, "s.csv")
        with open(p, "w", encoding="utf-8") as fh:
            fh.write(text)
        return p

    def test_parses_rows(self):
        p = self._write("timestamp,temp_c,humidity\n2026-10-01T00:00:00,12.5,80\n")
        rows = parse_file(p)
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0].temp_c, 12.5)
        self.assertEqual(rows[0].humidity, 80.0)


if __name__ == "__main__":
    unittest.main()
EOF
c 2 "2026-01-13T10:30:00+0000" "feat: package skeleton and CSV parser"

cat > data/sample_station.csv <<'EOF'
timestamp,temp_c,humidity
2026-10-01T00:10:00,9.5,88
2026-10-01T00:40:00,9.1,89
2026-10-01T01:10:00,8.7,91
2026-10-01T01:40:00,8.4,92
2026-10-01T02:10:00,8.0,93
2026-10-01T02:40:00,7.9,93
EOF
c 1 "2026-01-14T11:00:00+0000" "data: sample station file"

cat > src/stationlog/units.py <<'EOF'
"""Unit conversions."""


def c_to_f(c):
    return c * 9.0 / 5.0 + 32.0


def c_to_k(c):
    return c + 273.15
EOF
cat > tests/test_units.py <<'EOF'
import unittest

from stationlog.units import c_to_f, c_to_k


class UnitTests(unittest.TestCase):
    def test_c_to_f(self):
        self.assertAlmostEqual(c_to_f(100), 212.0)
        self.assertAlmostEqual(c_to_f(-40), -40.0)

    def test_c_to_k(self):
        self.assertAlmostEqual(c_to_k(0), 273.15)


if __name__ == "__main__":
    unittest.main()
EOF
c 3 "2026-01-16T09:30:00+0000" "feat: unit conversions"

cat > src/stationlog/summary.py <<'EOF'
"""Aggregations over readings."""
from collections import defaultdict


def hourly(readings):
    buckets = defaultdict(list)
    for r in readings:
        buckets[r.ts.strftime("%Y-%m-%dT%H:00")].append(r.temp_c)
    return {k: round(sum(v) / len(v), 2) for k, v in sorted(buckets.items())}
EOF
cat > tests/test_summary.py <<'EOF'
import unittest
from datetime import datetime, timezone

from stationlog.parse import Reading
from stationlog.summary import hourly


def r(h, m, t):
    return Reading(datetime(2026, 10, 1, h, m, tzinfo=timezone.utc), t, 50.0)


class HourlyTests(unittest.TestCase):
    def test_means_per_hour(self):
        out = hourly([r(0, 10, 10.0), r(0, 40, 12.0), r(1, 5, 8.0)])
        self.assertEqual(out, {"2026-10-01T00:00": 11.0, "2026-10-01T01:00": 8.0})


if __name__ == "__main__":
    unittest.main()
EOF
c 1 "2026-01-19T10:00:00+0000" "feat: hourly mean temperature"

cat > src/stationlog/cli.py <<'EOF'
"""Command line interface."""
import argparse
import sys

from . import __version__
from .parse import parse_file
from .summary import hourly


def build_parser():
    p = argparse.ArgumentParser(prog="stationlog")
    p.add_argument("--version", action="version", version="stationlog " + __version__)
    sub = p.add_subparsers(dest="command", required=True)
    s = sub.add_parser("summary", help="hourly mean temperature")
    s.add_argument("file")
    return p


def main(argv=None):
    args = build_parser().parse_args(argv)
    if args.command == "summary":
        for hour, mean in hourly(parse_file(args.file)).items():
            print("%s %.2f" % (hour, mean))
    return 0


if __name__ == "__main__":
    sys.exit(main())
EOF
cat > src/stationlog/__main__.py <<'EOF'
import sys

from .cli import main

sys.exit(main())
EOF
cat > tests/test_cli.py <<'EOF'
import contextlib
import io
import os
import unittest

from stationlog.cli import main

SAMPLE = os.path.join(os.path.dirname(__file__), "..", "data", "sample_station.csv")


class CliTests(unittest.TestCase):
    def test_summary_prints_hours(self):
        buf = io.StringIO()
        with contextlib.redirect_stdout(buf):
            self.assertEqual(main(["summary", SAMPLE]), 0)
        lines = buf.getvalue().strip().splitlines()
        self.assertEqual(lines[0], "2026-10-01T00:00 9.30")
        self.assertEqual(len(lines), 3)


if __name__ == "__main__":
    unittest.main()
EOF
c 1 "2026-01-20T14:00:00+0000" "feat: summary command"

cat > docs/index.md <<'EOF'
# stationlog documentation

- [File formats](formats.md)

Run `python3 -m stationlog --help` for the command overview.
EOF
cat > docs/formats.md <<'EOF'
# File formats

## Station CSV

Header: `timestamp,temp_c,humidity`. Timestamps are ISO 8601 and are read as UTC.
Temperatures are degrees Celsius, humidity is percent relative humidity.
EOF
c 3 "2026-01-22T09:00:00+0000" "docs: index and file formats"

cat > CITATION.cff <<'EOF'
cff-version: 1.2.0
title: stationlog
message: If you use this software, please cite it as below.
version: 0.1.0
date-released: 2026-01-26
authors:
  - family-names: Lindqvist
    given-names: Hannah
EOF
c 3 "2026-01-26T09:10:00+0000" "chore: CITATION.cff"

cat > CHANGELOG.md <<'EOF'
# Changelog

## [Unreleased]

## [1.0.0] - 2026-02-02

### Added
- `parse_file`, `hourly`, unit conversions and the `summary` command.

[Unreleased]: https://example.com/stationlog/compare/v1.0.0...HEAD
[1.0.0]: https://example.com/stationlog/releases/tag/v1.0.0
EOF
sed -i.bak 's/0.1.0/1.0.0/' pyproject.toml src/stationlog/__init__.py CITATION.cff && rm -f pyproject.toml.bak src/stationlog/__init__.py.bak CITATION.cff.bak
c 1 "2026-02-02T10:00:00+0000" "release: 1.0.0"
git tag -a v1.0.0 -m "stationlog 1.0.0"

python3 - <<'PY'
p="src/stationlog/summary.py"
s=open(p).read()
s+='''

def extremes(readings):
    temps = [r.temp_c for r in readings]
    return min(temps), max(temps)
'''
open(p,"w").write(s)
p="tests/test_summary.py"
s=open(p).read()
s=s.replace("from stationlog.summary import hourly","from stationlog.summary import extremes, hourly")
s=s.replace('\n\nif __name__','''
    def test_extremes(self):
        self.assertEqual(extremes([r(0, 1, 3.0), r(0, 2, -1.5), r(1, 0, 7.25)]), (-1.5, 7.25))


if __name__''',1)
open(p,"w").write(s)
PY
c 2 "2026-02-09T09:00:00+0000" "feat: min and max temperature"

python3 - <<'PY'
p="src/stationlog/parse.py"
s=open(p).read()
s=s.replace("        for row in csv.DictReader(fh):\n","        for row in csv.DictReader(fh):\n            row = {k.strip(): v for k, v in row.items()}\n")
open(p,"w").write(s)
PY
c 3 "2026-02-11T15:20:00+0000" "fix: tolerate spaces around CSV header names"

cat > tests/test_version.py <<'EOF'
import os
import re
import unittest

import stationlog


class VersionTests(unittest.TestCase):
    def test_package_version_matches_pyproject(self):
        path = os.path.join(os.path.dirname(__file__), "..", "pyproject.toml")
        with open(path, encoding="utf-8") as fh:
            match = re.search(r'^version = "([^"]+)"', fh.read(), re.M)
        self.assertEqual(stationlog.__version__, match.group(1))


if __name__ == "__main__":
    unittest.main()
EOF
c 1 "2026-02-16T10:00:00+0000" "test: keep __version__ and pyproject in sync"

python3 - <<'PY'
p="src/stationlog/cli.py"
s=open(p).read()
s=s.replace('''            print("%s %.2f" % (hour, mean))''','''            print("%s %.2f" % (hour, mean))''')
open(p,"w").write(s)
PY
cat >> docs/formats.md <<'EOF'

## Summary output

One line per hour: `YYYY-MM-DDTHH:00 <mean temperature>`.
EOF
c 3 "2026-02-18T11:00:00+0000" "docs: describe summary output"

cat > notes/todo.md <<'EOF'
# Todo

- [ ] batch API for many station files
- [ ] decide whether to support wind speed columns
- [x] changelog format
EOF
c 1 "2026-02-23T09:30:00+0000" "notes: running todo list"

cat > Makefile <<'EOF'
.PHONY: test
test:
	python3 -m unittest
EOF
c 2 "2026-03-02T08:50:00+0000" "chore: Makefile with test target"

python3 - <<'PY'
p="src/stationlog/parse.py"
s=open(p).read()
s=s.replace("            row = {k.strip(): v for k, v in row.items()}\n","            if not any((v or '').strip() for v in row.values()):\n                continue\n            row = {k.strip(): v for k, v in row.items()}\n")
open(p,"w").write(s)
PY
c 3 "2026-03-09T13:00:00+0000" "fix: skip blank lines in station files"

cat > CHANGELOG.md <<'EOF'
# Changelog

## [Unreleased]

## [2.3.0] - 2026-03-16

### Added
- `extremes()` for minimum and maximum temperature.
- Version consistency test.

### Fixed
- Header names with surrounding spaces are accepted.
- Blank lines in station files are skipped.

## [1.0.0] - 2026-02-02

### Added
- `parse_file`, `hourly`, unit conversions and the `summary` command.

[Unreleased]: https://example.com/stationlog/compare/v2.3.0...HEAD
[2.3.0]: https://example.com/stationlog/compare/v1.0.0...v2.3.0
[1.0.0]: https://example.com/stationlog/releases/tag/v1.0.0
EOF
sed -i.bak 's/1.0.0/2.3.0/' pyproject.toml src/stationlog/__init__.py CITATION.cff && rm -f pyproject.toml.bak src/stationlog/__init__.py.bak CITATION.cff.bak
sed -i.bak 's/date-released: .*/date-released: 2026-03-16/' CITATION.cff && rm CITATION.cff.bak
c 1 "2026-03-16T10:00:00+0000" "release: 2.3.0"
git tag -a v2.3.0 -m "stationlog 2.3.0"

# ---- after the last release ----
cat > src/stationlog/tz.py <<'EOF'
"""Fixed UTC offsets such as +02:00."""
import re
from datetime import timedelta, timezone

_OFFSET = re.compile(r"^([+-])(\d{2}):(\d{2})$")


def parse_offset(text):
    m = _OFFSET.match(text)
    if not m:
        raise ValueError("offset must look like +02:00, got %r" % text)
    delta = timedelta(hours=int(m.group(2)), minutes=int(m.group(3)))
    return timezone(delta if m.group(1) == "+" else -delta)
EOF
python3 - <<'PY'
p="src/stationlog/summary.py"
s=open(p).read()
s=s.replace("def hourly(readings):","def hourly(readings, tz=None):")
s=s.replace("        buckets[r.ts.strftime","        ts = r.ts.astimezone(tz) if tz else r.ts\n        buckets[ts.strftime").replace('strftime("%Y-%m-%dT%H:00")].append','strftime("%Y-%m-%dT%H:00")].append')
s=s.replace("buckets[ts.strftime","buckets[ts.strftime")
open(p,"w").write(s)
p="src/stationlog/cli.py"
s=open(p).read()
s=s.replace("from .summary import hourly","from .summary import hourly\nfrom .tz import parse_offset")
s=s.replace('    s.add_argument("file")\n','    s.add_argument("file")\n    s.add_argument("--tz", default=None, help="UTC offset such as +02:00")\n')
s=s.replace("hourly(parse_file(args.file))","hourly(parse_file(args.file), parse_offset(args.tz) if args.tz else None)")
open(p,"w").write(s)
PY
cat > tests/test_tz.py <<'EOF'
import unittest
from datetime import datetime, timedelta, timezone

from stationlog.parse import Reading
from stationlog.summary import hourly
from stationlog.tz import parse_offset


class TzTests(unittest.TestCase):
    def test_parse_offset(self):
        self.assertEqual(parse_offset("+02:00").utcoffset(None), timedelta(hours=2))
        self.assertEqual(parse_offset("-03:30").utcoffset(None), -timedelta(hours=3, minutes=30))

    def test_rejects_bad_offset(self):
        with self.assertRaises(ValueError):
            parse_offset("Europe/Paris")

    def test_hourly_shifts_buckets(self):
        r = Reading(datetime(2026, 10, 1, 23, 30, tzinfo=timezone.utc), 5.0, 50.0)
        self.assertEqual(hourly([r], parse_offset("+02:00")), {"2026-10-02T01:00": 5.0})


if __name__ == "__main__":
    unittest.main()
EOF
c 2 "2026-09-14T09:00:00+0000" "feat: --tz option for hourly summaries"

python3 - <<'PY'
p="src/stationlog/summary.py"
s=open(p).read()
s=s.replace("    temps = [r.temp_c for r in readings]\n","    temps = [r.temp_c for r in readings]\n    if not temps:\n        return None\n")
open(p,"w").write(s)
p="tests/test_summary.py"
s=open(p).read()
s=s.replace('\n\nif __name__','''
    def test_extremes_of_empty_input(self):
        self.assertIsNone(extremes([]))
        self.assertEqual(hourly([]), {})


if __name__''',1)
open(p,"w").write(s)
PY
c 1 "2026-09-16T10:30:00+0000" "fix: empty station files no longer crash extremes()"

python3 - <<'PY'
p="src/stationlog/cli.py"
s=open(p).read()
s=s.replace('''    return p
''','''    e = sub.add_parser("export", help="export readings")
    e.add_argument("file")
    e.add_argument("--format", choices=["parquet"], required=True)
    e.add_argument("-o", "--output", required=True)
    return p
''',1)
s=s.replace('''    return 0


if __name__''','''    elif args.command == "export":
        import pyarrow as pa  # noqa: heavy optional dependency
        import pyarrow.parquet as pq

        rows = parse_file(args.file)
        table = pa.table({
            "ts": [r.ts for r in rows],
            "temp_c": [r.temp_c for r in rows],
            "humidity": [r.humidity for r in rows],
        })
        pq.write_table(table, args.output)
    return 0


if __name__''')
open(p,"w").write(s)
PY
cat >> docs/formats.md <<'EOF'

## Parquet export

`stationlog export FILE --format parquet -o out.parquet` writes the readings as a
Parquet table. Requires the `pyarrow` package.
EOF
c 3 "2026-09-21T14:00:00+0000" "feat: parquet export"
PARQUET=$(git rev-parse HEAD)

python3 - <<'PY'
p="CHANGELOG.md"
s=open(p).read()
s=s.replace("## [Unreleased]\n","""## [Unreleased]

### Added
- `--tz` option for `summary`, shifting the hourly buckets to a fixed UTC offset.
- Parquet export: `stationlog export FILE --format parquet -o out.parquet`.

### Fixed
- `extremes()` returns `None` for a station file without readings instead of crashing.
""",1)
open(p,"w").write(s)
PY
c 1 "2026-09-23T09:00:00+0000" "docs: draft changelog entries for the next release"

git revert --no-commit "$PARQUET"
git add -A
GIT_AUTHOR_NAME="Ravi Menon" GIT_AUTHOR_EMAIL="ravi.menon@example.com" GIT_AUTHOR_DATE="2026-09-28T16:00:00+0000" GIT_COMMITTER_NAME="Ravi Menon" GIT_COMMITTER_EMAIL="ravi.menon@example.com" GIT_COMMITTER_DATE="2026-09-28T16:00:00+0000" git commit -q -m 'Revert "feat: parquet export"

pyarrow is a heavy dependency and breaks the minimal install. Not shipping this
in the next release; revisit as an optional extra later.'

python3 - <<'PY'
p="docs/formats.md"
s=open(p).read()
s=s.replace("Timestamps are ISO 8601 and are read as UTC.","Timestamps are ISO 8601 and are read as UTC when they carry no offset.")
open(p,"w").write(s)
PY
c 3 "2026-10-02T10:00:00+0000" "docs: clarify timestamp handling"

# ---- owner's stash and uncommitted note ----
python3 - <<'PY'
p="src/stationlog/summary.py"
s=open(p).read()
s+='''

def batch_hourly(paths):
    """Unfinished: hourly means for many files."""
    raise NotImplementedError
'''
open(p,"w").write(s)
PY
git stash push -q -m "wip: batch api"
cat >> notes/todo.md <<'EOF'
- [ ] ask Joao about the station 14 clock drift
- [ ] benchmark hourly() on a year of data
EOF
