#!/usr/bin/env bash
set -euo pipefail
cd "$1"
git init -q -b main
git config user.name "Maya Lindqvist"; git config user.email "maya@example.com"
N=0
cm() { # who(1-3) message
  N=$((N+1))
  local d; d=$(printf "2025-03-%02dT10:%02d:00Z" $((1+N/2)) $((N%60)))
  case "$1" in
    1) export GIT_AUTHOR_NAME="Maya Lindqvist" GIT_AUTHOR_EMAIL="maya@example.com";;
    2) export GIT_AUTHOR_NAME="Tomasz Kowal" GIT_AUTHOR_EMAIL="tomasz@example.com";;
    3) export GIT_AUTHOR_NAME="Priya Nair" GIT_AUTHOR_EMAIL="priya@example.com";;
  esac
  export GIT_COMMITTER_NAME="$GIT_AUTHOR_NAME" GIT_COMMITTER_EMAIL="$GIT_AUTHOR_EMAIL"
  export GIT_AUTHOR_DATE="$d" GIT_COMMITTER_DATE="$d"
  git add -A; git commit -q -m "$2"
}
mkdir -p pingbox tests docs scripts .github/workflows
printf '__pycache__/\n*.pyc\n' > .gitignore
cat > README.md <<'X'
# pingbox

Tiny HTTP and TCP reachability checker.

    python -m pingbox http://localhost:8080/health --timeout 10

## Configuration

The request timeout is given in **seconds** (default 30). Set it with the
`--timeout` flag, the `PINGBOX_TIMEOUT` environment variable or `pingbox.json`.
See docs/configuration.md.

## Tests

    python -m unittest
X
cm 1 "chore: initial README"
touch pingbox/__init__.py tests/__init__.py
cat > pingbox/config.py <<'X'
import json
import os

DEFAULT_TIMEOUT = 30  # seconds


def load(path=None):
    cfg = {
        "timeout": DEFAULT_TIMEOUT,
        "retries": 3,
        "backoff_seconds": 2,
        "cache_ttl_seconds": 60,
    }
    if path and os.path.exists(path):
        with open(path) as f:
            cfg.update(json.load(f))
    env = os.environ.get("PINGBOX_TIMEOUT")
    if env:
        cfg["timeout"] = float(env)
    return cfg
X
cm 1 "feat: config loader with env override"
cat > pingbox/client.py <<'X'
import urllib.request

from . import config


def get(url, timeout=None, cfg=None):
    cfg = cfg or config.load()
    t = cfg["timeout"] if timeout is None else timeout
    req = urllib.request.Request(url, headers={"User-Agent": "pingbox/1.4"})
    with urllib.request.urlopen(req, timeout=t) as resp:
        return resp.status, resp.read()
X
cm 1 "feat: http client"
cat > pingbox/retry.py <<'X'
def delays(retries, backoff_seconds):
    """Exponential backoff delays, in seconds."""
    return [backoff_seconds * (2 ** i) for i in range(retries)]
X
cm 2 "feat: retry delay helper"
cat > pingbox/health.py <<'X'
import socket

from . import config


def probe(host, port, timeout=None, cfg=None):
    cfg = cfg or config.load()
    timeout_s = cfg["timeout"] if timeout is None else timeout
    try:
        with socket.create_connection((host, port), timeout=timeout_s):
            return True
    except OSError:
        return False
X
cm 2 "feat: tcp health probe"
cat > pingbox/worker.py <<'X'
import time


def run_until_deadline(task, cfg, clock=time.monotonic, sleep=time.sleep):
    """Call task() until it returns True or the timeout elapses."""
    deadline = clock() + cfg["timeout"]
    while clock() < deadline:
        if task():
            return True
        sleep(cfg["backoff_seconds"])
    return False
X
cm 3 "feat: worker loop with deadline"
cat > pingbox/cli.py <<'X'
import argparse
import sys

from . import client, config


def main(argv=None):
    p = argparse.ArgumentParser(prog="pingbox")
    p.add_argument("url")
    p.add_argument("--timeout", type=float, default=None,
                   help="request timeout in seconds (default from config)")
    p.add_argument("--config", default="pingbox.json")
    args = p.parse_args(argv)
    cfg = config.load(args.config)
    if args.timeout is not None:
        cfg["timeout"] = args.timeout
    try:
        status, _ = client.get(args.url, cfg=cfg)
    except Exception as exc:  # noqa: BLE001
        print("FAIL %s: %s" % (args.url, exc))
        return 2
    print("OK %s %s" % (args.url, status))
    return 0 if status < 400 else 1


if __name__ == "__main__":
    sys.exit(main())
X
cat > pingbox/__main__.py <<'X'
import sys

from .cli import main

sys.exit(main())
X
cm 1 "feat: command line interface"
echo '{"timeout": 30, "retries": 3, "backoff_seconds": 2, "cache_ttl_seconds": 60}' > pingbox.json
cm 1 "chore: sample pingbox.json"
cat > tests/test_config.py <<'X'
import os
import unittest
from unittest import mock

from pingbox import config


class ConfigTest(unittest.TestCase):
    def test_default_timeout(self):
        with mock.patch.dict(os.environ, {}, clear=True):
            self.assertEqual(config.load()["timeout"], 30)

    def test_env_override(self):
        with mock.patch.dict(os.environ, {"PINGBOX_TIMEOUT": "12"}):
            self.assertEqual(config.load()["timeout"], 12)

    def test_backoff_default(self):
        with mock.patch.dict(os.environ, {}, clear=True):
            self.assertEqual(config.load()["backoff_seconds"], 2)
X
cm 2 "test: config defaults and env override"
cat > tests/test_client.py <<'X'
import unittest
from unittest import mock

from pingbox import client


class ClientTest(unittest.TestCase):
    @mock.patch("pingbox.client.urllib.request.urlopen")
    def test_uses_config_timeout(self, urlopen):
        resp = mock.MagicMock()
        resp.status = 200
        resp.read.return_value = b"ok"
        urlopen.return_value.__enter__.return_value = resp
        status, body = client.get("http://x.test", cfg={"timeout": 30})
        self.assertEqual((status, body), (200, b"ok"))
        self.assertEqual(urlopen.call_args.kwargs["timeout"], 30)

    @mock.patch("pingbox.client.urllib.request.urlopen")
    def test_explicit_timeout_wins(self, urlopen):
        resp = mock.MagicMock()
        resp.status = 204
        resp.read.return_value = b""
        urlopen.return_value.__enter__.return_value = resp
        client.get("http://x.test", timeout=5, cfg={"timeout": 30})
        self.assertEqual(urlopen.call_args.kwargs["timeout"], 5)
X
cm 2 "test: http client timeout handling"
cat > tests/test_health.py <<'X'
import unittest
from unittest import mock

from pingbox import health


class HealthTest(unittest.TestCase):
    @mock.patch("pingbox.health.socket.create_connection")
    def test_probe_ok_uses_timeout(self, cc):
        self.assertTrue(health.probe("h", 80, cfg={"timeout": 5}))
        self.assertEqual(cc.call_args.kwargs["timeout"], 5)

    @mock.patch("pingbox.health.socket.create_connection", side_effect=OSError)
    def test_probe_failure(self, cc):
        self.assertFalse(health.probe("h", 80, cfg={"timeout": 5}))
X
cm 3 "test: tcp probe"
cat > tests/test_worker.py <<'X'
import unittest

from pingbox import worker


class FakeClock:
    def __init__(self):
        self.t = 100.0

    def __call__(self):
        return self.t

    def sleep(self, s):
        self.t += s


class WorkerTest(unittest.TestCase):
    def test_gives_up_at_deadline(self):
        clk = FakeClock()
        cfg = {"timeout": 30, "backoff_seconds": 2}
        ok = worker.run_until_deadline(lambda: False, cfg, clock=clk, sleep=clk.sleep)
        self.assertFalse(ok)
        self.assertEqual(clk.t, 130.0)

    def test_succeeds_early(self):
        clk = FakeClock()
        calls = []
        def task():
            calls.append(1)
            return len(calls) == 3
        cfg = {"timeout": 30, "backoff_seconds": 2}
        self.assertTrue(worker.run_until_deadline(task, cfg, clock=clk, sleep=clk.sleep))
        self.assertEqual(clk.t, 104.0)
X
cm 3 "test: worker deadline with fake clock"
cat > tests/test_retry.py <<'X'
import unittest

from pingbox import retry


class RetryTest(unittest.TestCase):
    def test_delays(self):
        self.assertEqual(retry.delays(3, 2), [2, 4, 8])
X
cm 2 "test: retry delays"
cat > tests/test_cli.py <<'X'
import unittest
from unittest import mock

from pingbox import cli


class CliTest(unittest.TestCase):
    @mock.patch("pingbox.cli.client.get", return_value=(200, b""))
    def test_flag_overrides_config(self, get):
        rc = cli.main(["http://x.test", "--timeout", "10", "--config", "/nonexistent"])
        self.assertEqual(rc, 0)
        self.assertEqual(get.call_args.kwargs["cfg"]["timeout"], 10)

    @mock.patch("pingbox.cli.client.get", return_value=(503, b""))
    def test_error_status(self, get):
        self.assertEqual(cli.main(["http://x.test", "--config", "/nonexistent"]), 1)
X
cm 1 "test: cli flag override"
cat > Dockerfile <<'X'
FROM python:3.12-slim
WORKDIR /app
COPY pingbox ./pingbox
COPY pingbox.json .
ENV PINGBOX_TIMEOUT=30
ENTRYPOINT ["python", "-m", "pingbox"]
X
cm 3 "build: Dockerfile"
cat > docker-compose.yml <<'X'
services:
  pingbox:
    build: .
    command: ["http://api:8080/health"]
    environment:
      PINGBOX_TIMEOUT: "30"
  api:
    image: example/api:latest
X
cm 3 "build: compose file for local stack"
cat > .github/workflows/ci.yml <<'X'
name: ci
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    env:
      PINGBOX_TIMEOUT: 5
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.12"
      - run: python -m unittest
X
cm 3 "ci: run unit tests"
cat > scripts/smoke.sh <<'X'
#!/usr/bin/env bash
# Post-deploy smoke check.
set -euo pipefail
URL="${1:-http://localhost:8080/health}"
python -m pingbox "$URL" --timeout 10
X
chmod +x scripts/smoke.sh
cm 1 "chore: smoke script"
cat > docs/configuration.md <<'X'
# Configuration

| Key | Env | Default | Meaning |
| --- | --- | --- | --- |
| timeout | PINGBOX_TIMEOUT | 30 | Request timeout in seconds |
| retries | - | 3 | Attempts before giving up |
| backoff_seconds | - | 2 | Base backoff between attempts, seconds |
| cache_ttl_seconds | - | 60 | How long results are cached, seconds |

Precedence: `--timeout` flag, then environment, then `pingbox.json`, then defaults.
X
cm 1 "docs: configuration reference"
cat > docs/runbook.md <<'X'
# Runbook

## Checks time out on slow links

Raise the timeout to 60 seconds (`PINGBOX_TIMEOUT=60`) for the affected host and
re-run `scripts/smoke.sh`. Do not go above 120 seconds; the load balancer drops idle
connections after two minutes.

## Backoff too aggressive

Change `backoff_seconds` in pingbox.json. This is independent of the request timeout.
X
cm 3 "docs: runbook"
cat > CHANGELOG.md <<'X'
# Changelog

## 1.4.0
- Add worker deadline loop.
- Add TCP health probe.

## 1.3.0
- Add `--config` flag.
X
cm 1 "docs: changelog"
printf '\n## Cache\n\nResults are cached for `cache_ttl_seconds`.\n' >> docs/configuration.md
cm 2 "docs: mention cache ttl"
printf '\n## Exit codes\n\n0 ok, 1 http error status, 2 connection failure.\n' >> README.md
cm 2 "docs: exit codes"
printf '[tool.ruff]\nline-length = 100\n' > pyproject.toml
cm 1 "chore: ruff config"
printf '\n- Fix: deadline loop exits when clock jumps.\n' >> CHANGELOG.md
cm 3 "docs: changelog note"
printf '# pingbox 1.4 notes\n\nInternal: keep sample pingbox.json in sync with docs.\n' > docs/notes.md
cm 1 "docs: internal notes"
printf 'ok\n' > scripts/.keep
cm 2 "chore: keep scripts dir"
printf '\n## Docker\n\n    docker compose up\n' >> README.md
cm 3 "docs: docker usage"
printf '\nSee also docs/runbook.md for troubleshooting.\n' >> README.md
cm 1 "docs: link runbook"
