#!/usr/bin/env bash
set -euo pipefail
# Fixture X111: filedrop (Python upload service). Baseline upload limit is 10 MB.
mkdir -p "$1"
cd "$1"
git init -q -b main
git config user.name "Priya Raman"
git config user.email "priya@filedrop.example"

AUTH=("Priya Raman|priya@filedrop.example" "Tomasz Wrobel|tomasz@filedrop.example" "Aisha Okafor|aisha@filedrop.example")
N=0
commit() {
  local a="${AUTH[$1]}"
  N=$((N + 1))
  local ts=$((1696000000 + N * 187000))
  git add -A
  GIT_AUTHOR_NAME="${a%%|*}" GIT_AUTHOR_EMAIL="${a##*|}" \
  GIT_COMMITTER_NAME="${a%%|*}" GIT_COMMITTER_EMAIL="${a##*|}" \
  GIT_AUTHOR_DATE="$ts +0000" GIT_COMMITTER_DATE="$ts +0000" git commit -q -m "$2"
}
w() { mkdir -p "$(dirname "$1")"; cat > "$1"; }

# Templates: files that mention the upload limit are rendered from a template
# so the history can show the limit moving from 5 to 10 MB.
TPL="$(mktemp -d)"
trap 'rm -rf "$TPL"' EXIT
t() { mkdir -p "$(dirname "$TPL/$1")"; cat > "$TPL/$1"; }
LIM=5; NGX=6m
render() {
  local f
  for f in "$@"; do
    mkdir -p "$(dirname "$f")"
    sed -e "s/@LIM@/$LIM/g" -e "s/@NGX@/$NGX/g" -e "s/@PEAK@/$((LIM * 8))/g" "$TPL/$f" > "$f"
  done
}

t README.md <<'EOF'
# filedrop

A tiny internal file-drop service. Teams upload exports and reports over HTTP,
get a short id back, and share the id. Files expire automatically.

## Features

- Upload files up to @LIM@ MB
- In-memory or on-disk storage backends
- Listing endpoint with paging
- Python client with a pre-flight size check

## Quick start

```
python3 -m filedrop.server
```

Configuration is read from the environment, see `.env.example`.

## Tests

```
make test
```

## More

- API reference: `docs/api.md`
- Capacity planning: `docs/capacity.md`
- Operations: `docs/operations.md`
EOF

t filedrop/config.py <<'EOF'
"""Runtime configuration for filedrop, read from the environment."""
import os
from dataclasses import dataclass

DEFAULT_TTL_DAYS = 10          # how long an upload is kept before cleanup
MAX_FILES_PER_LISTING = 10     # page size for GET /files


@dataclass(frozen=True)
class Config:
    max_upload_mb: int = @LIM@
    ttl_days: int = DEFAULT_TTL_DAYS
    workers: int = 8

    @property
    def max_upload_bytes(self) -> int:
        return self.max_upload_mb * 1024 * 1024

    @classmethod
    def from_env(cls, env=None):
        env = os.environ if env is None else env
        return cls(
            max_upload_mb=int(env.get("FILEDROP_MAX_UPLOAD_MB", cls.max_upload_mb)),
            ttl_days=int(env.get("FILEDROP_TTL_DAYS", DEFAULT_TTL_DAYS)),
            workers=int(env.get("FILEDROP_WORKERS", cls.workers)),
        )
EOF

t filedrop/client.py <<'EOF'
"""Small client used by the nightly report jobs."""
import urllib.request

from .errors import FileTooLarge

MAX_CLIENT_BYTES = @LIM@ * 1024 * 1024  # keep in sync with the server limit
RETRY_ATTEMPTS = 10


def check_size(size: int) -> None:
    """Fail fast instead of streaming a file the server will refuse."""
    if size > MAX_CLIENT_BYTES:
        raise FileTooLarge(f"{size} bytes is over the client limit of {MAX_CLIENT_BYTES}")


def upload(base_url: str, name: str, data: bytes) -> str:
    check_size(len(data))
    req = urllib.request.Request(
        f"{base_url}/files/{name}", data=data, method="PUT",
        headers={"Content-Length": str(len(data))},
    )
    last = None
    for _ in range(RETRY_ATTEMPTS):
        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                return resp.read().decode()
        except OSError as exc:  # network flake, try again
            last = exc
    raise last
EOF

t .env.example <<'EOF'
# Copy to .env for local runs
FILEDROP_MAX_UPLOAD_MB=@LIM@
FILEDROP_TTL_DAYS=10
FILEDROP_WORKERS=8
EOF

t docker-compose.yml <<'EOF'
services:
  filedrop:
    build: .
    mem_limit: 256m
    environment:
      FILEDROP_MAX_UPLOAD_MB: "@LIM@"
      FILEDROP_TTL_DAYS: "10"
      FILEDROP_WORKERS: "8"
    expose:
      - "8000"
  proxy:
    image: nginx:1.25-alpine
    volumes:
      - ./deploy/nginx.conf:/etc/nginx/conf.d/default.conf:ro
    ports:
      - "8080:8080"
    depends_on:
      - filedrop
EOF

t deploy/nginx.conf <<'EOF'
server {
    listen 8080;
    server_name filedrop.internal;

    # @LIM@ MB application limit plus multipart overhead
    client_max_body_size @NGX@;

    location / {
        proxy_pass http://filedrop:8000;
        proxy_set_header Host $host;
        proxy_read_timeout 60s;
    }
}
EOF

t docs/api.md <<'EOF'
# filedrop HTTP API

## PUT /files/{name}

Upload a file. The body is the raw file content and `Content-Length` is required.

- `201 Created` with `{"id": "<short id>"}`
- `400 Bad Request` if the name is empty
- `413 Payload Too Large` for files over @LIM@ MB:

```json
{"error": "File exceeds the @LIM@ MB limit"}
```

## GET /files

Lists stored files, newest first, up to 10 per page. Use `?page=2` for more.

## Expiry

Files are removed 10 days after upload. There is no way to extend this.
EOF

t docs/capacity.md <<'EOF'
# Capacity planning

filedrop buffers each upload fully in memory while it is being handled, so the
worst case is every worker holding a maximum-size upload at the same time.

    peak upload memory = max upload size x workers
                       = @LIM@ MB x 8 workers = @PEAK@ MB

Rule of thumb: keep the peak under half of the container `mem_limit`. The
compose file sets `mem_limit: 256m`, so the peak must stay under 128 MB.

If you raise the upload limit or the worker count, redo this arithmetic and
update the numbers above.
EOF

t tests/test_config.py <<'EOF'
import unittest

from filedrop.config import Config


class ConfigTest(unittest.TestCase):
    def test_default_limit(self):
        self.assertEqual(Config().max_upload_mb, @LIM@)

    def test_env_override(self):
        cfg = Config.from_env({"FILEDROP_MAX_UPLOAD_MB": "3"})
        self.assertEqual(cfg.max_upload_bytes, 3 * 1024 * 1024)

    def test_ttl_default(self):
        self.assertEqual(Config.from_env({}).ttl_days, 10)


if __name__ == "__main__":
    unittest.main()
EOF

t tests/test_upload.py <<'EOF'
import io
import unittest

from filedrop.app import handle_upload
from filedrop.config import Config
from filedrop.storage import MemoryStorage

LIMIT = @LIM@ * 1024 * 1024


class UploadTest(unittest.TestCase):
    def setUp(self):
        self.cfg = Config()
        self.storage = MemoryStorage()

    def _put(self, name, size):
        return handle_upload(self.cfg, self.storage, name, size, io.BytesIO(b"x" * size))

    def test_small_upload_is_stored(self):
        status, body = self._put("report.csv", 1024)
        self.assertEqual(status, 201)
        self.assertIn("id", body)

    def test_exactly_at_limit_is_accepted(self):
        status, _ = self._put("big.bin", LIMIT)
        self.assertEqual(status, 201)

    def test_one_byte_over_limit_is_rejected(self):
        status, body = handle_upload(self.cfg, self.storage, "big.bin", LIMIT + 1, io.BytesIO(b""))
        self.assertEqual(status, 413)
        self.assertIn("limit", body["error"])

    def test_empty_name_is_rejected(self):
        status, _ = self._put("", 10)
        self.assertEqual(status, 400)


if __name__ == "__main__":
    unittest.main()
EOF

t tests/test_client.py <<'EOF'
import unittest

from filedrop import client
from filedrop.errors import FileTooLarge


class ClientTest(unittest.TestCase):
    def test_check_size_allows_limit(self):
        client.check_size(@LIM@ * 1024 * 1024)

    def test_check_size_rejects_over_limit(self):
        with self.assertRaises(FileTooLarge):
            client.check_size(@LIM@ * 1024 * 1024 + 1)


if __name__ == "__main__":
    unittest.main()
EOF

# ---- commits ----
w .gitignore <<'EOF'
__pycache__/
*.pyc
.env
EOF
w pyproject.toml <<'EOF'
[project]
name = "filedrop"
version = "0.2.0"
description = "Tiny internal file-drop service"
requires-python = ">=3.9"
EOF
render README.md
commit 0 "Initial skeleton: README, gitignore, pyproject"

w filedrop/__init__.py <<'EOF'
__version__ = "0.2.0"
EOF
w filedrop/errors.py <<'EOF'
class FileDropError(Exception):
    """Base class for filedrop errors."""


class FileTooLarge(FileDropError):
    pass


class BadRequest(FileDropError):
    pass
EOF
render filedrop/config.py
commit 0 "Add config and error types"

w filedrop/storage.py <<'EOF'
"""Storage backends. Only the in-memory one is used in tests."""
import itertools


class MemoryStorage:
    def __init__(self):
        self._files = {}
        self._ids = itertools.count(1)

    def put(self, name: str, data: bytes) -> str:
        file_id = f"f{next(self._ids):05d}"
        self._files[file_id] = (name, data)
        return file_id

    def get(self, file_id: str):
        return self._files[file_id]

    def count(self) -> int:
        return len(self._files)

    def names(self):
        return [name for name, _ in self._files.values()]
EOF
commit 0 "Add in-memory storage backend"

w filedrop/app.py <<'EOF'
"""Request handling, independent of the HTTP server so it is easy to test."""


def handle_upload(cfg, storage, name, content_length, stream):
    if not name:
        return 400, {"error": "missing file name"}
    if content_length > cfg.max_upload_bytes:
        return 413, {"error": f"File exceeds the {cfg.max_upload_mb} MB limit"}
    data = stream.read(content_length)
    file_id = storage.put(name, data)
    return 201, {"id": file_id}


def handle_list(storage, page=1, per_page=10):
    names = storage.names()
    start = (page - 1) * per_page
    return 200, {"files": names[start:start + per_page], "page": page}
EOF
commit 0 "Add upload and list handlers"

render tests/test_upload.py
w tests/__init__.py <<'EOF'
EOF
commit 1 "Tests for upload handler, including the size boundary"

w filedrop/server.py <<'EOF'
"""Thin http.server wrapper around filedrop.app."""
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import json

from .app import handle_list, handle_upload
from .config import Config
from .storage import MemoryStorage

CFG = Config.from_env()
STORAGE = MemoryStorage()


class Handler(BaseHTTPRequestHandler):
    def _send(self, status, body):
        payload = json.dumps(body).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)

    def do_PUT(self):
        name = self.path.rsplit("/", 1)[-1]
        length = int(self.headers.get("Content-Length", "0"))
        self._send(*handle_upload(CFG, STORAGE, name, length, self.rfile))

    def do_GET(self):
        self._send(*handle_list(STORAGE))


def main():
    ThreadingHTTPServer(("0.0.0.0", 8000), Handler).serve_forever()


if __name__ == "__main__":
    main()
EOF
commit 0 "Wire handlers into http.server"

render filedrop/client.py tests/test_client.py
commit 1 "Add client with pre-flight size check"

w Dockerfile <<'EOF'
FROM python:3.12-slim
WORKDIR /app
COPY filedrop ./filedrop
CMD ["python", "-m", "filedrop.server"]
EOF
render docker-compose.yml
commit 2 "Dockerfile and compose file with an nginx proxy"

render deploy/nginx.conf
commit 2 "nginx: proxy config for the compose stack"

render docs/api.md
commit 1 "docs: HTTP API reference"

w Makefile <<'EOF'
.PHONY: test
test:
	python3 -m unittest discover -s tests -t .
EOF
w scripts/smoke.sh <<'EOF'
#!/usr/bin/env bash
# Offline smoke test: run the unit tests, then import the server module.
set -euo pipefail
python3 -m unittest discover -s tests -t .
python3 -c "import filedrop.server"
echo "smoke ok"
EOF
chmod +x scripts/smoke.sh
commit 2 "Makefile and smoke script"

w CHANGELOG.md <<'EOF'
# Changelog

## 0.1.0
- First internal release: upload, list, in-memory storage.
EOF
commit 0 "Changelog for 0.1.0"

w docs/operations.md <<'EOF'
# Operations

## Retention

Uploads are kept for 10 days (`FILEDROP_TTL_DAYS`). A cleanup job runs hourly.

## Restarts

The in-memory backend loses everything on restart. This is accepted for now.

## Logs

The server logs one line per request to stderr.
EOF
commit 2 "docs: operations notes"

render docs/capacity.md
commit 2 "docs: capacity planning rule of thumb"

render .env.example tests/test_config.py
commit 1 "Add .env.example and a config test"

printf '.DS_Store\n' >> .gitignore
commit 1 "gitignore: ignore .DS_Store"

# raise limit 5 -> 10 (nginx forgotten at first)
LIM=10
render README.md filedrop/config.py filedrop/client.py .env.example docker-compose.yml docs/api.md docs/capacity.md tests/test_config.py tests/test_upload.py tests/test_client.py
commit 0 "Raise upload limit from 5 MB to 10 MB"

NGX=11m
render deploy/nginx.conf
commit 2 "nginx: 6m rejected 10 MB uploads with multipart overhead, allow 11m"

cat >> CHANGELOG.md <<'EOF'

## 0.2.0
- Upload limit raised from 5 MB to 10 MB.
- nginx body limit raised to 11m to leave room for multipart overhead.
EOF
commit 0 "Changelog for 0.2.0"

python3 - <<'EOF'
import re
p = "filedrop/storage.py"
s = open(p).read()
s = s.replace("    def names(self):\n        return [name for name, _ in self._files.values()]",
              "    def names(self):\n        # newest first, as documented in docs/api.md\n        return [name for name, _ in reversed(list(self._files.values()))]")
open(p, "w").write(s)
EOF
commit 1 "storage: list newest first to match the API docs"

w tests/test_storage.py <<'EOF'
import unittest

from filedrop.storage import MemoryStorage


class StorageTest(unittest.TestCase):
    def test_put_and_get(self):
        s = MemoryStorage()
        file_id = s.put("a.txt", b"hello")
        self.assertEqual(s.get(file_id), ("a.txt", b"hello"))

    def test_names_newest_first(self):
        s = MemoryStorage()
        s.put("old.txt", b"1")
        s.put("new.txt", b"2")
        self.assertEqual(s.names(), ["new.txt", "old.txt"])


if __name__ == "__main__":
    unittest.main()
EOF
commit 1 "Storage tests"

perl -pi -e 's/The server logs one line per request to stderr\./The server logs one line per request to stderr. Redirect it to a file in production./' docs/operations.md
commit 2 "docs: note about log redirection"

cat >> README.md <<'EOF'

## Status

Internal use only. Not yet exposed outside the VPN.
EOF
commit 0 "README: status note"

perl -pi -e 's/^## Retention$/## Retention (TTL)/' docs/operations.md
commit 2 "docs: clearer retention heading"
