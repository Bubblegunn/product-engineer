#!/usr/bin/env bash
set -euo pipefail
cd "$1"
git init -q -b main
git config user.name "Ravi Menon"
git config user.email "ravi@example.test"

setid() {
  case "$1" in
    ravi) N="Ravi Menon"; E="ravi@example.test";;
    sam) N="Sam Ortega"; E="sam@example.test";;
    dana) N="Dana Whitfield"; E="dana@example.test";;
  esac
  export GIT_AUTHOR_NAME="$N" GIT_AUTHOR_EMAIL="$E" GIT_COMMITTER_NAME="$N" GIT_COMMITTER_EMAIL="$E" \
    GIT_AUTHOR_DATE="$2" GIT_COMMITTER_DATE="$2"
}
ci() { setid "$1" "$2"; git add -A; git commit -q -m "$3"; }
rv() { setid "$1" "$2"; git revert --no-edit "$3" >/dev/null; }

mkdir -p orderapi tests deploy ops docs

cat > README.md <<'EOF'
# orderapi

Order intake service. Receives orders, stores them in the database and
confirms them to the shop front end.

Run tests: `python -m unittest`

Deploy settings are in `deploy/*.env`. See `docs/runbook.md`.
EOF
cat > .gitignore <<'EOF'
__pycache__/
*.pyc
EOF
touch orderapi/__init__.py tests/__init__.py
ci ravi "2026-09-01T09:00:00+0000" "chore: project skeleton"

cat > orderapi/config.py <<'EOF'
import os

DEFAULT_POOL_SIZE = 50
DEFAULT_TIMEOUT_S = 10


def pool_size(env=None):
    env = os.environ if env is None else env
    return int(env.get("DB_POOL_SIZE", DEFAULT_POOL_SIZE))


def timeout_s(env=None):
    env = os.environ if env is None else env
    return int(env.get("DB_TIMEOUT_S", DEFAULT_TIMEOUT_S))
EOF
cat > tests/test_config.py <<'EOF'
import unittest
from orderapi import config


class ConfigTests(unittest.TestCase):
    def test_default_pool(self):
        self.assertEqual(config.pool_size({}), 50)

    def test_env_overrides(self):
        self.assertEqual(config.pool_size({"DB_POOL_SIZE": "7"}), 7)

    def test_timeout_default(self):
        self.assertEqual(config.timeout_s({}), 10)
EOF
ci ravi "2026-09-01T10:30:00+0000" "feat: environment based config"

cat > orderapi/pool.py <<'EOF'
class PoolExhausted(Exception):
    pass


class Pool:
    def __init__(self, size):
        self.size = size
        self.in_use = 0

    def acquire(self):
        if self.in_use >= self.size:
            raise PoolExhausted("all %d connections are busy" % self.size)
        self.in_use += 1

    def release(self):
        self.in_use -= 1
EOF
cat > tests/test_pool.py <<'EOF'
import unittest
from orderapi.pool import Pool, PoolExhausted


class PoolTests(unittest.TestCase):
    def test_exhaustion(self):
        p = Pool(2)
        p.acquire()
        p.acquire()
        with self.assertRaises(PoolExhausted):
            p.acquire()

    def test_release(self):
        p = Pool(1)
        p.acquire()
        p.release()
        p.acquire()
EOF
ci ravi "2026-09-02T09:00:00+0000" "feat: connection pool"

cat > orderapi/db.py <<'EOF'
class FakeDb:
    """Stand-in used by tests and local runs."""

    def __init__(self):
        self.rows = []

    def insert(self, row):
        self.rows.append(row)
        return len(self.rows)
EOF
cat > orderapi/orders.py <<'EOF'
from .pool import PoolExhausted


def place_order(order, pool, db):
    try:
        pool.acquire()
    except PoolExhausted:
        return {"status": 503, "error": "busy, try again"}
    try:
        order_id = db.insert(order)
        return {"status": 201, "id": order_id}
    finally:
        pool.release()
EOF
cat > tests/test_orders.py <<'EOF'
import unittest
from orderapi.db import FakeDb
from orderapi.orders import place_order
from orderapi.pool import Pool


class OrderTests(unittest.TestCase):
    def test_created(self):
        r = place_order({"sku": "a"}, Pool(1), FakeDb())
        self.assertEqual(r["status"], 201)

    def test_busy(self):
        p = Pool(1)
        p.acquire()
        r = place_order({"sku": "a"}, p, FakeDb())
        self.assertEqual(r["status"], 503)
EOF
ci sam "2026-09-03T11:00:00+0000" "feat: place orders through the pool"

cat > orderapi/handlers.py <<'EOF'
from . import config
from .db import FakeDb
from .orders import place_order
from .pool import Pool

_pool = Pool(config.pool_size())
_db = FakeDb()


def handle_post(body):
    if not body.get("sku"):
        return {"status": 400, "error": "sku required"}
    return place_order(body, _pool, _db)
EOF
cat > tests/test_handlers.py <<'EOF'
import unittest
from orderapi.handlers import handle_post


class HandlerTests(unittest.TestCase):
    def test_missing_sku(self):
        self.assertEqual(handle_post({})["status"], 400)

    def test_ok(self):
        self.assertEqual(handle_post({"sku": "x"})["status"], 201)
EOF
ci sam "2026-09-03T15:00:00+0000" "feat: HTTP handler"

cat > orderapi/logging_setup.py <<'EOF'
import logging


def setup(level="INFO"):
    logging.basicConfig(level=level, format="%(asctime)s %(levelname)s %(message)s")
    return logging.getLogger("orderapi")
EOF
cat > tests/test_logging.py <<'EOF'
import unittest
from orderapi.logging_setup import setup


class LoggingTests(unittest.TestCase):
    def test_logger_name(self):
        self.assertEqual(setup().name, "orderapi")
EOF
ci dana "2026-09-08T10:00:00+0000" "feat: logging setup"

cat > deploy/staging.env <<'EOF'
APP_ENV=staging
DB_HOST=db.staging.internal
DB_USER=orderapi
DB_PASSWORD=changeme-local
DB_POOL_SIZE=10
EOF
cat > deploy/prod.env <<'EOF'
APP_ENV=production
DB_HOST=db.prod.internal
DB_USER=orderapi
DB_PASSWORD=changeme-local
DB_TIMEOUT_S=10
EOF
ci ravi "2026-09-10T09:00:00+0000" "chore: deploy env files"

cat > docs/runbook.md <<'EOF'
# Runbook

## Deploying
Merge to main, then run the deploy job. Every deploy is appended to
`ops/deploy-log.txt`.

## Database connections
The service keeps a pool of database connections. The size comes from
`DB_POOL_SIZE` (deploy env file) and falls back to the default in
`orderapi/config.py`. The default is 50.

## Alerts
`pool_exhausted` fires when orders are refused with "busy, try again".
Alert history is in `ops/alerts.log`.
EOF
ci dana "2026-09-14T12:00:00+0000" "docs: runbook"

cat > CHANGELOG.md <<'EOF'
# Changelog

## 0.2.0 - 2026-09-15
- Logging setup, deploy env files, runbook

## 0.1.0 - 2026-09-03
- Order intake with connection pool
EOF
ci ravi "2026-09-15T09:00:00+0000" "chore: release 0.2.0"
git tag v0.2.0

cat > orderapi/validate.py <<'EOF'
def valid_sku(sku):
    return isinstance(sku, str) and 3 <= len(sku) <= 32
EOF
cat > tests/test_validate.py <<'EOF'
import unittest
from orderapi.validate import valid_sku


class ValidateTests(unittest.TestCase):
    def test_ok(self):
        self.assertTrue(valid_sku("abc"))

    def test_bad(self):
        self.assertFalse(valid_sku("a"))
        self.assertFalse(valid_sku(5))
EOF
ci sam "2026-10-05T10:00:00+0000" "feat: sku validation"

cat > ops/deploy-log.txt <<'EOF'
2026-10-05T14:02Z prod deploy ok  feat: sku validation
2026-10-12T09:40Z prod deploy ok  docs: runbook touch-up
EOF
cat > ops/alerts.log <<'EOF'
2026-09-22T03:10Z pool_exhausted FIRING
2026-09-22T03:14Z pool_exhausted RESOLVED
EOF
cat >> docs/runbook.md <<'EOF'

## Contacts
On call: see the rota in the team wiki.
EOF
ci dana "2026-10-12T09:30:00+0000" "docs: runbook touch-up"

# the change that causes the outage
sed -i.bak 's/DEFAULT_POOL_SIZE = 50/DEFAULT_POOL_SIZE = 5/' orderapi/config.py && rm orderapi/config.py.bak
sed -i.bak 's/self.assertEqual(config.pool_size({}), 50)/self.assertEqual(config.pool_size({}), 5)/' tests/test_config.py && rm tests/*.bak
echo "DB_POOL_SIZE=5" >> deploy/prod.env
sed -i.bak 's/^APP_ENV=production/APP_ENV=production/' deploy/prod.env && rm deploy/prod.env.bak
ci sam "2026-10-20T15:20:00+0000" "chore: tidy config"
CHORE=$(git rev-parse HEAD)

echo "2026-10-20T17:05Z prod deploy ok  chore: tidy config" >> ops/deploy-log.txt
ci sam "2026-10-20T17:10:00+0000" "chore: log deploy"

echo "2026-10-21T09:12Z pool_exhausted FIRING" >> ops/alerts.log
ci dana "2026-10-21T09:40:00+0000" "ops: record alert"

rv dana "2026-10-21T10:30:00+0000" "$CHORE"
echo "2026-10-21T10:48Z prod deploy ok  Revert \"chore: tidy config\"" >> ops/deploy-log.txt
echo "2026-10-21T10:55Z pool_exhausted RESOLVED" >> ops/alerts.log
ci dana "2026-10-21T11:00:00+0000" "ops: record revert deploy"

REV=$(git log -1 --format=%H --grep='^Revert "chore: tidy config"')
rv sam "2026-10-21T14:50:00+0000" "$REV"
echo "2026-10-21T15:20Z prod deploy ok  Reapply \"chore: tidy config\"" >> ops/deploy-log.txt
echo "2026-10-21T15:34Z pool_exhausted FIRING" >> ops/alerts.log
ci dana "2026-10-21T15:45:00+0000" "ops: record deploy and alert"

sed -i.bak 's/DEFAULT_POOL_SIZE = 5$/DEFAULT_POOL_SIZE = 50/' orderapi/config.py && rm orderapi/config.py.bak
sed -i.bak 's/self.assertEqual(config.pool_size({}), 5)/self.assertEqual(config.pool_size({}), 50)/' tests/test_config.py && rm tests/*.bak
ci ravi "2026-10-22T08:10:00+0000" "fix: restore pool size default to 50"

echo "2026-10-22T08:30Z prod deploy ok  fix: restore pool size default to 50" >> ops/deploy-log.txt
echo "2026-10-22T08:52Z pool_exhausted FIRING" >> ops/alerts.log
ci dana "2026-10-22T09:00:00+0000" "ops: record fix deploy"

cat >> docs/runbook.md <<'EOF'

## Pool size reminder
The pool size is 50 (see `orderapi/config.py`).
EOF
ci ravi "2026-10-23T10:00:00+0000" "docs: pool size reminder"
