#!/usr/bin/env bash
set -euo pipefail
mkdir -p "$1"; cd "$1"
git init -q -b main
git config user.name "Priya Nair"; git config user.email "priya@example.test"
A=("Priya Nair|priya@example.test" "Tomas Berg|tomas@example.test" "Lena Ortiz|lena@example.test")
n=0
ci(){ local msg="$1" a="${2:-$((n%3))}"; n=$((n+1)); local d nm em
  d=$(printf '2026-%02d-%02dT10:00:00+0000' $((1+n/14)) $((1+(n%14)*2)))
  IFS='|' read -r nm em <<<"${A[$a]}"
  git add -A
  GIT_AUTHOR_NAME="$nm" GIT_AUTHOR_EMAIL="$em" GIT_COMMITTER_NAME="$nm" GIT_COMMITTER_EMAIL="$em" GIT_AUTHOR_DATE="$d" GIT_COMMITTER_DATE="$d" git commit -q -m "$msg"; }

mkdir -p tidepool tests/data config docs scripts
printf '__pycache__/\n*.pyc\n.tidepool-cache/\n' > .gitignore
cat > pyproject.toml <<'X'
[project]
name = "tidepool"
version = "0.4.0"
description = "Small log reader with a content-addressed cache"
requires-python = ">=3.9"
X
echo "# tidepool" > README.md
ci "chore: project skeleton" 0

touch tidepool/__init__.py tests/__init__.py
cat > tidepool/reader.py <<'X'
"""Parse 'LEVEL message' log lines."""
LEVELS = ("DEBUG", "INFO", "WARN", "ERROR")


def parse_line(line):
    line = line.rstrip("\n")
    if not line.strip():
        return None
    head, _, rest = line.partition(" ")
    if head not in LEVELS:
        return {"level": "INFO", "message": line}
    return {"level": head, "message": rest}


def read_text(text):
    out = []
    for line in text.splitlines():
        rec = parse_line(line)
        if rec:
            out.append(rec)
    return out
X
cat > tests/test_reader.py <<'X'
import unittest
from tidepool.reader import parse_line, read_text


class ReaderTest(unittest.TestCase):
    def test_level(self):
        self.assertEqual(parse_line("ERROR boom"), {"level": "ERROR", "message": "boom"})

    def test_default_level(self):
        self.assertEqual(parse_line("hello")["level"], "INFO")

    def test_blank_skipped(self):
        self.assertEqual(len(read_text("INFO a\n\nWARN b\n")), 2)
X
ci "feat(reader): parse level-prefixed log lines" 1

cat > tidepool/formatter.py <<'X'
import json


def render(records, fmt="text"):
    if fmt == "json":
        return json.dumps(records, sort_keys=True)
    return "\n".join("[%s] %s" % (r["level"], r["message"]) for r in records)
X
cat > tests/test_formatter.py <<'X'
import unittest
from tidepool.formatter import render


class FormatterTest(unittest.TestCase):
    def test_text(self):
        self.assertEqual(render([{"level": "INFO", "message": "x"}]), "[INFO] x")

    def test_json(self):
        self.assertIn('"level": "INFO"', render([{"level": "INFO", "message": "x"}], "json"))
X
ci "feat(formatter): text and json output" 2

cat > config/default.json <<'X'
{
  "format": "text",
  "cache_dir": ".tidepool-cache",
  "use_cache": true,
  "legacy_cache": false
}
X
cat > tidepool/config.py <<'X'
import json
import os

DEFAULTS = {
    "format": "text",
    "cache_dir": ".tidepool-cache",
    "use_cache": True,
    "legacy_cache": False,
}


def load_config(path=None, env=None):
    env = os.environ if env is None else env
    cfg = dict(DEFAULTS)
    if path and os.path.exists(path):
        with open(path) as fh:
            cfg.update(json.load(fh))
    if env.get("TIDEPOOL_CACHE_DIR"):
        cfg["cache_dir"] = env["TIDEPOOL_CACHE_DIR"]
    if env.get("TIDEPOOL_LEGACY_CACHE") == "1":
        cfg["legacy_cache"] = True
    return cfg
X
cat > tests/test_config.py <<'X'
import unittest
from tidepool.config import load_config


class ConfigTest(unittest.TestCase):
    def test_defaults(self):
        self.assertEqual(load_config(env={})["format"], "text")

    def test_env_cache_dir(self):
        self.assertEqual(load_config(env={"TIDEPOOL_CACHE_DIR": "/x"})["cache_dir"], "/x")

    def test_env_legacy_cache(self):
        self.assertTrue(load_config(env={"TIDEPOOL_LEGACY_CACHE": "1"})["legacy_cache"])
X
ci "feat(config): json defaults with env overrides" 0

cat > tidepool/cache.py <<'X'
"""Cache of rendered output.

Keys are the sha256 of the file content. In legacy mode the key is the
absolute path instead, which is what versions before 0.3 did.
"""
import hashlib
import os


class Cache:
    def __init__(self, directory, legacy=False):
        self.directory = directory
        self.legacy = legacy

    def key(self, path, content):
        if self.legacy:
            return os.path.abspath(path).replace(os.sep, "_")
        return hashlib.sha256(content).hexdigest()

    def _file(self, key):
        return os.path.join(self.directory, key)

    def get(self, key):
        try:
            with open(self._file(key)) as fh:
                return fh.read()
        except FileNotFoundError:
            return None

    def put(self, key, value):
        os.makedirs(self.directory, exist_ok=True)
        with open(self._file(key), "w") as fh:
            fh.write(value)
X
cat > tests/test_cache.py <<'X'
import tempfile
import unittest
from tidepool.cache import Cache


class CacheTest(unittest.TestCase):
    def test_content_key_is_stable(self):
        c = Cache("unused")
        self.assertEqual(c.key("a.log", b"abc"), c.key("b.log", b"abc"))

    def test_roundtrip(self):
        with tempfile.TemporaryDirectory() as d:
            c = Cache(d)
            k = c.key("a.log", b"abc")
            self.assertIsNone(c.get(k))
            c.put(k, "hello")
            self.assertEqual(c.get(k), "hello")

    def test_legacy_key_uses_path(self):
        c = Cache("unused", legacy=True)
        self.assertNotEqual(c.key("a.log", b"abc"), c.key("b.log", b"abc"))
X
ci "feat(cache): content-addressed output cache" 1

cat > tidepool/cli.py <<'X'
import argparse
import sys

from .cache import Cache
from .config import load_config
from .formatter import render
from .reader import read_text


def build_parser():
    p = argparse.ArgumentParser(prog="tidepool")
    p.add_argument("path")
    p.add_argument("--format", choices=["text", "json"])
    p.add_argument("--cache-dir")
    p.add_argument("--no-cache", action="store_true")
    p.add_argument("--legacy-cache", action="store_true",
                   help="key the cache by path instead of content")
    return p


def run(argv, out=sys.stdout):
    args = build_parser().parse_args(argv)
    cfg = load_config("config/default.json")
    fmt = args.format or cfg["format"]
    with open(args.path, "rb") as fh:
        raw = fh.read()
    use_cache = cfg["use_cache"] and not args.no_cache
    cache = Cache(args.cache_dir or cfg["cache_dir"],
                  legacy=args.legacy_cache or cfg["legacy_cache"])
    key = cache.key(args.path, raw) + "." + fmt
    if use_cache:
        hit = cache.get(key)
        if hit is not None:
            out.write(hit + "\n")
            return 0
    text = render(read_text(raw.decode("utf-8")), fmt)
    if use_cache:
        cache.put(key, text)
    out.write(text + "\n")
    return 0
X
cat > tidepool/__main__.py <<'X'
import sys
from .cli import run

sys.exit(run(sys.argv[1:]))
X
cat > tests/test_cli.py <<'X'
import io
import os
import tempfile
import unittest
from tidepool.cli import run


class CliTest(unittest.TestCase):
    def test_text_output(self):
        with tempfile.TemporaryDirectory() as d:
            p = os.path.join(d, "a.log")
            with open(p, "w") as fh:
                fh.write("WARN low disk\n")
            buf = io.StringIO()
            run([p, "--cache-dir", os.path.join(d, "c")], out=buf)
            self.assertEqual(buf.getvalue(), "[WARN] low disk\n")

    def test_second_run_hits_cache(self):
        with tempfile.TemporaryDirectory() as d:
            p = os.path.join(d, "a.log")
            with open(p, "w") as fh:
                fh.write("INFO x\n")
            cdir = os.path.join(d, "c")
            run([p, "--cache-dir", cdir], out=io.StringIO())
            self.assertEqual(len(os.listdir(cdir)), 1)
X
ci "feat(cli): wire reader, formatter and cache together" 2

cat > docs/cli.md <<'X'
# Command line

```
python -m tidepool PATH [--format text|json] [--cache-dir DIR] [--no-cache] [--legacy-cache]
```

- `--format` output format, default from config.
- `--cache-dir` where cached output lives.
- `--no-cache` skip the cache for this run.
- `--legacy-cache` key the cache by absolute path instead of content hash
  (pre-0.3 behaviour).
X
cat > docs/configuration.md <<'X'
# Configuration

`config/default.json` holds the defaults.

| key | default | meaning |
| --- | --- | --- |
| `format` | `text` | output format |
| `cache_dir` | `.tidepool-cache` | cache location, override with `TIDEPOOL_CACHE_DIR` |
| `use_cache` | `true` | disable caching entirely |
| `legacy_cache` | `false` | key the cache by path, override with `TIDEPOOL_LEGACY_CACHE=1` |
X
cat > docs/architecture.md <<'X'
# Architecture

reader -> formatter -> cache. The CLI is the only place that touches the
filesystem outside the cache directory.
X
cat > README.md <<'X'
# tidepool

Small log reader with a content-addressed cache.

    python -m tidepool app.log --format json

Run the tests with `python -m unittest`. See `docs/` for options.
X
ci "docs: cli, configuration and architecture notes" 1

cat > Makefile <<'X'
test:
	python -m unittest

ci:
	sh scripts/ci.sh
X
cat > scripts/ci.sh <<'X'
#!/bin/sh
set -e
export TIDEPOOL_CACHE_DIR=/tmp/tidepool-ci-cache
export TIDEPOOL_LEGACY_CACHE=1
python -m unittest
X
cat > scripts/nightly.sh <<'X'
#!/bin/sh
# Re-render the archived logs every night.
set -e
for f in archive/*.log; do
  python -m tidepool "$f" --format json --legacy-cache --cache-dir /var/cache/tidepool
done
X
ci "chore: ci and nightly scripts" 0

cat > CHANGELOG.md <<'X'
# Changelog

## Unreleased

## 0.4.0
- JSON output format.

## 0.3.0
- Cache keys are now content hashes. `--legacy-cache` keeps the old path keys.

## 0.2.0
- Output cache.

## 0.1.0
- First release.
X
ci "docs: changelog" 2

# filler history
for i in $(seq 1 14); do
  if [ $((i%2)) -eq 0 ]; then
    printf 'INFO sample %d started\nWARN sample %d slow\nERROR sample %d failed\n' $i $i $i > tests/data/sample_$i.log
    ci "test: add sample log $i" $((i%3))
  else
    printf -- '- 2026-%02d: decision %d recorded, keep reader dependency-free.\n' $((i%9+1)) $i >> docs/decisions.md
    ci "docs: record decision $i" $((i%3))
  fi
done
echo 'version = "0.4.0"' > /dev/null
python3 -m unittest -q 2>&1 | tail -1 >/dev/null || true

# loose ends
sed -i.bak 's/Small log reader with a content-addressed cache\./Small log reader with a content-addressed cache (work in progress)./' README.md && rm README.md.bak
mkdir -p scratch
printf 'try --follow mode later\n' > scratch/notes.txt
