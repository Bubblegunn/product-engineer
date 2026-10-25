#!/usr/bin/env bash
set -euo pipefail
cd "$1"
git init -q -b main
git config user.name "Dana Ruiz"
git config user.email "dana@example.test"
N=0
c() {
  N=$((N+1)); local t=$((1735689600 + N*50000)) an ae
  case $1 in d) an="Dana Ruiz"; ae="dana@example.test";; t) an="Tom Okafor"; ae="tom@example.test";; l) an="Lena Vogt"; ae="lena@example.test";; esac
  git add -A
  GIT_AUTHOR_NAME="$an" GIT_AUTHOR_EMAIL="$ae" GIT_COMMITTER_NAME="$an" GIT_COMMITTER_EMAIL="$ae" \
  GIT_AUTHOR_DATE="$t +0000" GIT_COMMITTER_DATE="$t +0000" git commit -q -m "$2"
}
mkdir -p filedrop tests docs deploy scripts

cat > README.md <<'EOF'
# filedrop

Tiny upload service used by the support portal. Customers attach documents
(PDF, images, spreadsheets) to tickets; filedrop checks size and rate limits
and stores the file.

    python3 -m unittest
    python3 -m filedrop.cli --help

See docs/ for the API and deployment notes.
EOF
cat > pyproject.toml <<'EOF'
[project]
name = "filedrop"
version = "0.7.2"
requires-python = ">=3.9"
EOF
printf '__pycache__/\n*.pyc\n.env\n' > .gitignore
c d "initial commit"

cat > filedrop/__init__.py <<'EOF'
__version__ = "0.7.2"
EOF
cat > filedrop/errors.py <<'EOF'
class UploadTooLarge(Exception):
    pass


class RateLimited(Exception):
    pass
EOF
cat > filedrop/settings.py <<'EOF'
import os

# Maximum size of a regular document upload.
MAX_UPLOAD_BYTES = int(os.environ.get("FILEDROP_MAX_UPLOAD_MB", "10")) * 1024 * 1024

# Avatars are tiny on purpose.
MAX_AVATAR_BYTES = 2 * 1024 * 1024

RATE_LIMIT_PER_MINUTE = 10
TRASH_RETENTION_DAYS = 10
THUMBNAIL_PX = 128
EOF
c d "settings and errors"

cat > filedrop/uploads.py <<'EOF'
from .errors import UploadTooLarge
from .settings import MAX_UPLOAD_BYTES


def check_size(size):
    if size > MAX_UPLOAD_BYTES:
        raise UploadTooLarge("File exceeds the 10 MB upload limit")
    return size
EOF
cat > tests/__init__.py <<'EOF'
EOF
cat > tests/test_uploads.py <<'EOF'
import unittest

from filedrop.errors import UploadTooLarge
from filedrop.uploads import check_size

MB = 1024 * 1024


class UploadSizeTest(unittest.TestCase):
    def test_small_file_ok(self):
        self.assertEqual(check_size(1234), 1234)

    def test_exactly_at_limit_ok(self):
        self.assertEqual(check_size(10 * MB), 10 * MB)

    def test_over_limit_message(self):
        with self.assertRaises(UploadTooLarge) as ctx:
            check_size(10 * MB + 1)
        self.assertIn("10 MB", str(ctx.exception))
EOF
c d "upload size check"

cat > filedrop/server.py <<'EOF'
"""Request handling, kept free of any HTTP framework so it is easy to test."""
from .errors import UploadTooLarge
from .uploads import check_size


def handle_upload(headers, body):
    length = int(headers.get("Content-Length", 0))
    if length > 10485760:  # reject early, before reading the body
        return 413, "File exceeds the 10 MB upload limit"
    try:
        check_size(len(body))
    except UploadTooLarge as exc:
        return 413, str(exc)
    return 201, "stored"
EOF
cat > tests/test_server.py <<'EOF'
import unittest

from filedrop.server import handle_upload

MB = 1024 * 1024


class HandleUploadTest(unittest.TestCase):
    def test_accepts_file_at_limit(self):
        body = b"x" * (10 * MB)
        status, _ = handle_upload({"Content-Length": str(len(body))}, body)
        self.assertEqual(status, 201)

    def test_rejects_file_over_limit(self):
        body = b"x" * (10 * MB + 1)
        status, message = handle_upload({"Content-Length": str(len(body))}, body)
        self.assertEqual(status, 413)
        self.assertIn("10 MB", message)
EOF
c t "server: request handler with early reject"

cat > filedrop/ratelimit.py <<'EOF'
import time

from .settings import RATE_LIMIT_PER_MINUTE


class Limiter:
    def __init__(self, clock=time.time):
        self.clock = clock
        self.hits = {}

    def allow(self, key):
        now = self.clock()
        recent = [h for h in self.hits.get(key, []) if now - h < 60]
        if len(recent) >= RATE_LIMIT_PER_MINUTE:
            self.hits[key] = recent
            return False
        recent.append(now)
        self.hits[key] = recent
        return True
EOF
cat > tests/test_ratelimit.py <<'EOF'
import unittest

from filedrop.ratelimit import Limiter


class LimiterTest(unittest.TestCase):
    def test_blocks_after_ten(self):
        now = [1000.0]
        lim = Limiter(clock=lambda: now[0])
        results = [lim.allow("a") for _ in range(11)]
        self.assertEqual(results.count(True), 10)
        self.assertFalse(results[-1])

    @unittest.skip("flaky: depends on wall clock, see #31")
    def test_window_slides(self):
        lim = Limiter()
        for _ in range(10):
            lim.allow("a")
        self.assertFalse(lim.allow("a"))
EOF
c t "rate limiter"

cat > filedrop/avatars.py <<'EOF'
from .errors import UploadTooLarge
from .settings import MAX_AVATAR_BYTES


def check_avatar(size):
    if size > MAX_AVATAR_BYTES:
        raise UploadTooLarge("Avatar exceeds the 2 MB limit")
    return size
EOF
cat > tests/test_avatars.py <<'EOF'
import unittest

from filedrop.avatars import check_avatar
from filedrop.errors import UploadTooLarge


class AvatarTest(unittest.TestCase):
    def test_ok(self):
        self.assertEqual(check_avatar(1000), 1000)

    def test_too_big(self):
        with self.assertRaises(UploadTooLarge):
            check_avatar(2 * 1024 * 1024 + 1)
EOF
c l "avatar size check"

cat > filedrop/cli.py <<'EOF'
import argparse

from . import __version__
from .settings import MAX_UPLOAD_BYTES


def main(argv=None):
    p = argparse.ArgumentParser(prog="filedrop")
    p.add_argument("--version", action="store_true")
    p.add_argument("--show-limits", action="store_true")
    args = p.parse_args(argv)
    if args.version:
        print(__version__)
    if args.show_limits:
        print("max upload: %d bytes" % MAX_UPLOAD_BYTES)


if __name__ == "__main__":
    main()
EOF
c d "cli: --version and --show-limits"

cat > openapi.yaml <<'EOF'
openapi: 3.0.3
info:
  title: filedrop
  version: 0.7.2
paths:
  /upload:
    post:
      summary: Upload a document
      description: Files larger than 10 MB are rejected with 413.
      requestBody:
        content:
          application/octet-stream:
            schema:
              type: string
              format: binary
              x-max-bytes: 10485760
      responses:
        "201": {description: stored}
        "413": {description: too large}
EOF
c t "openapi spec"

cat > docs/api.md <<'EOF'
# API

## POST /upload

Stores a document. The body is the raw file. Files over **10 MB** get a
`413` response with the message `File exceeds the 10 MB upload limit`.

## POST /avatar

Same, but the cap is 2 MB.

Rate limit: 10 requests per minute per client.
EOF
c d "api docs"

cat > deploy/nginx.conf <<'EOF'
server {
    listen 80;
    server_name filedrop.internal.example;

    client_max_body_size 10m;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $host;
    }
}
EOF
c t "nginx front"

cat > deploy/docker-compose.yml <<'EOF'
services:
  filedrop:
    build: .
    environment:
      FILEDROP_MAX_UPLOAD_MB: "10"
      FILEDROP_STORAGE: /data
    volumes:
      - ./data:/data
  nginx:
    image: nginx:1.25
    volumes:
      - ./nginx.conf:/etc/nginx/conf.d/default.conf:ro
    ports:
      - "80:80"
EOF
c t "compose file"

cat > .env.example <<'EOF'
# copy to .env for local runs
FILEDROP_MAX_UPLOAD_MB=10
FILEDROP_STORAGE=./data
EOF
c d "env example"

cat > docs/limits.md <<'EOF'
# Limits

| What            | Limit              |
|-----------------|--------------------|
| Document upload | 8 MB               |
| Avatar          | 2 MB               |
| Requests        | 10 per minute      |
| Trash retention | 10 days            |
EOF
c l "document the limits"

cat > docs/deploy.md <<'EOF'
# Deploying

Run `docker compose -f deploy/docker-compose.yml up -d`. nginx terminates
requests in front of the app; storage lives in `./data`.
EOF
c d "deploy notes"

cat > scripts/chunk_upload.py <<'EOF'
"""Client helper: refuse to start an upload we know the server will reject."""
import os
import sys

CLIENT_MAX_BYTES = 10 * 1024 * 1024


def main(path):
    size = os.path.getsize(path)
    if size > CLIENT_MAX_BYTES:
        sys.exit("refusing to upload: %d bytes is over the limit" % size)
    print("ok to upload %s" % path)


if __name__ == "__main__":
    main(sys.argv[1])
EOF
c l "helper script for support to pre-check files"

cat > CHANGELOG.md <<'EOF'
# Changelog

## 0.7.2
- Early reject of oversized uploads
- Avatar limit

## 0.7.0
- First public version
EOF
c d "changelog"

printf '\n# NOTE: window is 60s\n' >> filedrop/ratelimit.py
c t "tweak ratelimit comment"

cat >> README.md <<'EOF'

## Support

Ask in #portal-support. Known flaky test: the sliding-window rate limit test
is skipped until we inject a fake clock everywhere.
EOF
c l "readme: support section"

printf '\n# TODO: log rejected sizes\n' >> filedrop/uploads.py
c d "misc"

sed -i.bak 's/2 MB limit/2 MB limit/' filedrop/avatars.py && rm -f filedrop/avatars.py.bak
printf '\n# avatars: keep in sync with docs/limits.md\n' >> filedrop/avatars.py
c t "fix avatars"

printf '\nDocker note: rebuild the image after changing settings.\n' >> docs/deploy.md
c d "deploy doc: rebuild note"
