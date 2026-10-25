#!/usr/bin/env bash
set -euo pipefail
mkdir -p "$1"
cd "$1"
git init -q -b main
git config user.name "Priya Nair"
git config user.email "priya@relaydesk.example"
git config commit.gpgsign false
N=0
commit() {
  local n e
  case "$1" in
    d) n="Dana Whitfield"; e="dana@relaydesk.example";;
    m) n="Marcus Oyelaran"; e="marcus@relaydesk.example";;
    *) n="Priya Nair"; e="priya@relaydesk.example";;
  esac
  N=$((N+1))
  local when="@$((1790000000 + N*43200)) +0000"
  git add -A
  GIT_AUTHOR_NAME="$n" GIT_AUTHOR_EMAIL="$e" GIT_COMMITTER_NAME="$n" GIT_COMMITTER_EMAIL="$e" \
    GIT_AUTHOR_DATE="$when" GIT_COMMITTER_DATE="$when" git commit -q -m "$2"
}
mkdir -p relay tests config docs scripts

cat > README.md <<'X'
# relaydesk

Small outbound message relay: a bounded queue, a client with retry, and a CLI.

    python3 -m unittest        # run tests (offline)
    python3 -m relay.cli       # print effective config
X
printf '__pycache__/\n*.pyc\n.venv/\n' > .gitignore
cat > pyproject.toml <<'X'
[project]
name = "relaydesk"
version = "0.3.0"
requires-python = ">=3.9"
X
cat > CHANGELOG.md <<'X'
# Changelog

## 0.3.0
- Add CLI entry point
- Add metrics counters

## 0.2.0
- Add bounded queue

## 0.1.0
- Initial client
X
commit p "chore: project skeleton, readme, changelog"

touch relay/__init__.py tests/__init__.py
cat > relay/config.py <<'X'
import json
import os

DEFAULTS_PATH = os.path.join(os.path.dirname(__file__), "..", "config", "defaults.json")


def load(path=DEFAULTS_PATH):
    with open(path) as fh:
        return json.load(fh)
X
cat > config/defaults.json <<'X'
{
  "queue_size": 100,
  "retry_base": 0.5,
  "retry_cap": 30.0
}
X
cat > tests/test_config.py <<'X'
import unittest

from relay import config


class ConfigTest(unittest.TestCase):
    def test_queue_size(self):
        self.assertEqual(config.load()["queue_size"], 100)

    def test_retry_base(self):
        self.assertEqual(config.load()["retry_base"], 0.5)
X
commit p "feat(config): load defaults from config/defaults.json"

cat > relay/queue.py <<'X'
from collections import deque


class BoundedQueue:
    def __init__(self, size):
        self.size = size
        self._items = deque()

    def put(self, item):
        if len(self._items) >= self.size:
            raise OverflowError("queue full")
        self._items.append(item)

    def get(self):
        return self._items.popleft()

    def __len__(self):
        return len(self._items)
X
cat > tests/test_queue.py <<'X'
import unittest

from relay.queue import BoundedQueue


class QueueTest(unittest.TestCase):
    def test_fifo(self):
        q = BoundedQueue(2)
        q.put("a")
        q.put("b")
        self.assertEqual(q.get(), "a")

    def test_overflow(self):
        q = BoundedQueue(1)
        q.put("a")
        with self.assertRaises(OverflowError):
            q.put("b")
X
commit m "feat(queue): bounded FIFO queue"

cat > relay/transport.py <<'X'
class LoopbackTransport:
    """Offline transport used by tests and the smoke script."""

    def __init__(self, fail_first=0):
        self.fail_first = fail_first
        self.sent = []

    def send(self, payload):
        if self.fail_first > 0:
            self.fail_first -= 1
            raise ConnectionError("loopback down")
        self.sent.append(payload)
        return len(self.sent)
X
cat > relay/retry.py <<'X'
def backoff_delay(attempt, base=0.5, cap=30.0):
    return min(cap, base * (2 ** attempt))
X
cat > relay/client.py <<'X'
import time

from .retry import backoff_delay


class Client:
    def __init__(self, transport, base=0.5, sleep=time.sleep, max_attempts=3):
        self.transport = transport
        self.base = base
        self.sleep = sleep
        self.max_attempts = max_attempts

    def send(self, payload):
        for attempt in range(self.max_attempts):
            try:
                return self.transport.send(payload)
            except ConnectionError:
                if attempt == self.max_attempts - 1:
                    raise
                self.sleep(backoff_delay(attempt, base=self.base))
X
cat > tests/test_client.py <<'X'
import unittest

from relay.client import Client
from relay.transport import LoopbackTransport


class ClientTest(unittest.TestCase):
    def test_retries_then_succeeds(self):
        slept = []
        c = Client(LoopbackTransport(fail_first=2), sleep=slept.append)
        self.assertEqual(c.send({"x": 1}), 1)
        self.assertEqual(slept, [0.5, 1.0])

    def test_gives_up(self):
        c = Client(LoopbackTransport(fail_first=5), sleep=lambda s: None)
        with self.assertRaises(ConnectionError):
            c.send({})
X
commit m "feat(client): send with simple exponential backoff"

cat > tests/test_retry.py <<'X'
import unittest

from relay.retry import backoff_delay


class BackoffTest(unittest.TestCase):
    def test_doubles(self):
        self.assertEqual(backoff_delay(2), 2.0)

    def test_cap(self):
        self.assertEqual(backoff_delay(20, cap=30.0), 30.0)
X
commit d "test(retry): cover backoff_delay"

cat > relay/metrics.py <<'X'
from collections import Counter

_counts = Counter()


def incr(name, n=1):
    _counts[name] += n


def snapshot():
    return dict(_counts)


def reset():
    _counts.clear()
X
cat > tests/test_metrics.py <<'X'
import unittest

from relay import metrics


class MetricsTest(unittest.TestCase):
    def setUp(self):
        metrics.reset()

    def test_incr(self):
        metrics.incr("sent")
        metrics.incr("sent", 2)
        self.assertEqual(metrics.snapshot(), {"sent": 3})
X
commit p "feat(metrics): in-process counters"

cat > relay/cli.py <<'X'
import argparse
import json

from . import config


def main(argv=None):
    parser = argparse.ArgumentParser(prog="relay")
    parser.add_argument("--path", default=config.DEFAULTS_PATH)
    args = parser.parse_args(argv)
    print(json.dumps(config.load(args.path), indent=2, sort_keys=True))


if __name__ == "__main__":
    main()
X
commit p "feat(cli): print effective config"

cat > config/logging.json <<'X'
{"version": 1, "root": {"level": "INFO"}}
X
cat > docs/architecture.md <<'X'
# Architecture

Queue -> Client -> Transport. Retry policy lives in `relay/retry.py`.
X
commit p "docs: architecture overview and logging config"

cat > docs/runbook.md <<'X'
# Runbook

## Queue is full
Drain with the CLI, then check the consumer.

## Transport down
The client retries with backoff; see docs/architecture.md.
X
commit m "docs: runbook for queue-full and transport-down"

cat > scripts/smoke.sh <<'X'
#!/usr/bin/env bash
set -euo pipefail
python3 -c "from relay.client import Client; from relay.transport import LoopbackTransport; print(Client(LoopbackTransport()).send({'ping': 1}))"
X
commit d "chore: smoke script"

i=0
for msg in "note on queue sizing" "note on shutdown order" "note on payload limits" "note on metrics naming" "note on retry budget" "note on clock use" "note on test layout" "note on config precedence" "note on logging levels" "note on release steps" "note on error types" "note on loopback transport"; do
  i=$((i+1))
  echo "- $msg" >> docs/architecture.md
  if [ $((i % 2)) -eq 0 ]; then a=m; elif [ $((i % 3)) -eq 0 ]; then a=d; else a=p; fi
  commit "$a" "docs(architecture): $msg"
done

printf '\n## Unreleased\n- Add queue depth metric\n' > /tmp/.cl_$$ 
python3 - <<'X'
p = "CHANGELOG.md"
s = open(p).read().replace("# Changelog\n", "# Changelog\n\n## Unreleased\n- Add queue depth metric\n", 1)
open(p, "w").write(s)
X
rm -f /tmp/.cl_$$
sed -i.bak 's/^    def __len__/    def depth(self):\n        return len(self._items)\n\n    def __len__/' relay/queue.py && rm relay/queue.py.bak
commit m "feat(queue): expose depth()"

# --- Dana's branch ---
git checkout -q -b feature/retry-backoff
cat > relay/retry.py <<'X'
import random


def backoff_delay(attempt, base=0.5, cap=30.0, jitter=0.0, rng=random.random):
    delay = min(cap, base * (2 ** attempt))
    if jitter:
        delay *= 1 + jitter * (2 * rng() - 1)
    return min(cap, delay)
X
cat >> tests/test_retry.py <<'X'

    def test_jitter_upper_bound(self):
        self.assertAlmostEqual(backoff_delay(1, jitter=0.2, rng=lambda: 1.0), 1.2)

    def test_jitter_never_exceeds_cap(self):
        self.assertEqual(backoff_delay(10, cap=30.0, jitter=0.5, rng=lambda: 1.0), 30.0)
X
commit d "feat(retry): optional jitter in backoff_delay"

cat > config/defaults.json <<'X'
{
  "queue_size": 100,
  "retry_base": 0.5,
  "retry_cap": 30.0,
  "retry": {
    "max_attempts": 5,
    "jitter": 0.2
  }
}
X
cat >> tests/test_config.py <<'X'

    def test_retry_block(self):
        self.assertEqual(config.load()["retry"]["max_attempts"], 5)
X
commit d "feat(config): retry.max_attempts and retry.jitter defaults"

python3 - <<'X'
p = "relay/retry.py"
s = open(p).read().replace("import random\n", "import random\nimport time\n\nfrom . import config\n", 1)
s += '''

def retry_call(fn, max_attempts=None, sleep=time.sleep, delay=backoff_delay):
    """Call fn(), retrying on Exception with backoff.

    TODO(dana): finish. Expected behaviour:
      - at most max_attempts calls in total (default: retry.max_attempts from config)
      - between attempts call sleep(delay(attempt)), attempt counting from 0
      - return fn()'s result as soon as one call succeeds
      - after the final failed attempt re-raise the last exception
    """
    raise NotImplementedError
'''
open(p, "w").write(s)
p = "CHANGELOG.md"
s = open(p).read().replace("- Add queue depth metric\n", "- Add queue depth metric\n- Add jittered backoff and retry_call (WIP)\n", 1)
open(p, "w").write(s)
X
cat >> tests/test_retry.py <<'X'


class RetryCallTest(unittest.TestCase):
    def test_returns_first_success(self):
        from relay.retry import retry_call
        slept = []
        self.assertEqual(retry_call(lambda: 7, sleep=slept.append), 7)
        self.assertEqual(slept, [])

    def test_retries_then_succeeds(self):
        from relay.retry import retry_call
        calls = []

        def flaky():
            calls.append(1)
            if len(calls) < 3:
                raise ValueError("boom")
            return "ok"

        slept = []
        self.assertEqual(retry_call(flaky, max_attempts=5, sleep=slept.append, delay=lambda a: a + 1), "ok")
        self.assertEqual(slept, [1, 2])

    def test_raises_last_after_max_attempts(self):
        from relay.retry import retry_call
        calls = []

        def always():
            calls.append(1)
            raise ValueError("fail %d" % len(calls))

        slept = []
        with self.assertRaises(ValueError) as ctx:
            retry_call(always, max_attempts=3, sleep=slept.append, delay=lambda a: a)
        self.assertEqual(str(ctx.exception), "fail 3")
        self.assertEqual(len(calls), 3)
        self.assertEqual(len(slept), 2)

    def test_default_max_attempts_from_config(self):
        from relay.retry import retry_call
        calls = []

        def always():
            calls.append(1)
            raise RuntimeError("x")

        with self.assertRaises(RuntimeError):
            retry_call(always, sleep=lambda s: None)
        self.assertEqual(len(calls), 5)
X
commit d "WIP(retry): retry_call skeleton and tests, not implemented yet"

# --- main moves on ---
git checkout -q main
python3 - <<'X'
import re
p = "config/defaults.json"
s = open(p).read().replace('"retry_cap": 30.0\n', '"retry_cap": 30.0,\n  "timeout_s": 10\n', 1)
open(p, "w").write(s)
p = "relay/client.py"
s = open(p).read().replace("max_attempts=3):", "max_attempts=3, timeout_s=10):", 1).replace("        self.max_attempts = max_attempts\n", "        self.max_attempts = max_attempts\n        self.timeout_s = timeout_s\n", 1)
open(p, "w").write(s)
p = "CHANGELOG.md"
s = open(p).read().replace("- Add queue depth metric\n", "- Add queue depth metric\n- Add request timeout (timeout_s, default 10)\n", 1)
open(p, "w").write(s)
X
cat >> tests/test_config.py <<'X'

    def test_timeout(self):
        self.assertEqual(config.load()["timeout_s"], 10)
X
commit m "feat(config): request timeout_s, default 10"

echo "- note on timeouts" >> docs/architecture.md
commit p "docs(architecture): note on timeouts"

# --- the owner's messy working tree ---
echo "[![tests](https://example.invalid/badge.svg)](https://example.invalid)" >> README.md
git stash push -q -m "wip: readme badge"
printf '\n## Rotating the loopback token\nTODO: ask Marcus before changing the staging token procedure.\n' >> docs/runbook.md
printf 'RELAY_TOKEN=changeme-local\nRELAY_HOST=localhost\n' > .env.local
