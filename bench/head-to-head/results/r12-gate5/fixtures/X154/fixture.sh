#!/usr/bin/env bash
set -euo pipefail
mkdir -p "$1"; cd "$1"
git init -q -b main
git config user.name "Aisha Rahman"; git config user.email "aisha@example.test"
A=("Aisha Rahman|aisha@example.test" "Jonas Weber|jonas@example.test" "Mei Tanaka|mei@example.test")
n=0
ci(){ local msg="$1" a="${2:-$((n%3))}"; n=$((n+1)); local d nm em
  d=$(printf '2026-%02d-%02dT14:00:00+0000' $((1+n/14)) $((1+(n%14)*2)))
  IFS='|' read -r nm em <<<"${A[$a]}"
  git add -A
  GIT_AUTHOR_NAME="$nm" GIT_AUTHOR_EMAIL="$em" GIT_COMMITTER_NAME="$nm" GIT_COMMITTER_EMAIL="$em" GIT_AUTHOR_DATE="$d" GIT_COMMITTER_DATE="$d" git commit -q -m "$msg"; }

mkdir -p src public test docs
printf 'node_modules/\n.env\n' > .gitignore
cat > package.json <<'X'
{
  "name": "docdrop",
  "version": "1.2.0",
  "private": true,
  "scripts": { "start": "node src/server.js", "test": "node --test" },
  "engines": { "node": ">=20" }
}
X
echo "# docdrop" > README.md
ci "chore: init" 0

cat > src/config.js <<'X'
'use strict';
const MiB = 1024 * 1024;

function int(value, fallback) {
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

module.exports = {
  port: int(process.env.PORT, 3000),
  // Largest accepted document upload. Deployments can override it.
  MAX_DOCUMENT_BYTES: int(process.env.DOCDROP_MAX_DOC_BYTES, 5 * MiB),
  // Profile pictures have their own, smaller budget.
  MAX_AVATAR_BYTES: 5 * MiB,
};
X
cat > src/errors.js <<'X'
'use strict';
module.exports = {
  documentTooLarge: () => new Error('Document exceeds 5 MB limit'),
  avatarTooLarge: () => new Error('Avatar exceeds 5 MB limit'),
};
X
cat > src/upload.js <<'X'
'use strict';
const config = require('./config');
const errors = require('./errors');

function validateDocument(bytes) {
  if (bytes > config.MAX_DOCUMENT_BYTES) {
    return { ok: false, error: errors.documentTooLarge().message };
  }
  return { ok: true };
}

function validateAvatar(bytes) {
  if (bytes > config.MAX_AVATAR_BYTES) {
    return { ok: false, error: errors.avatarTooLarge().message };
  }
  return { ok: true };
}

module.exports = { validateDocument, validateAvatar };
X
cat > test/upload.test.js <<'X'
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { validateDocument } = require('../src/upload');

test('accepts a document exactly at the limit', () => {
  assert.strictEqual(validateDocument(5 * 1024 * 1024).ok, true);
});

test('rejects a document one byte over the limit', () => {
  const r = validateDocument(5 * 1024 * 1024 + 1);
  assert.strictEqual(r.ok, false);
  assert.match(r.error, /exceeds/);
});
X
cat > test/avatar.test.js <<'X'
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { validateAvatar } = require('../src/upload');

test('avatar at 5 MiB is fine, one byte more is not', () => {
  assert.strictEqual(validateAvatar(5 * 1024 * 1024).ok, true);
  assert.strictEqual(validateAvatar(5 * 1024 * 1024 + 1).ok, false);
});
X
cat > test/config.test.js <<'X'
'use strict';
const test = require('node:test');
const assert = require('node:assert');

test('default document limit', () => {
  delete process.env.DOCDROP_MAX_DOC_BYTES;
  delete require.cache[require.resolve('../src/config')];
  assert.strictEqual(require('../src/config').MAX_DOCUMENT_BYTES, 5 * 1024 * 1024);
});
X
ci "feat(upload): size validation for documents and avatars" 1

cat > src/server.js <<'X'
'use strict';
const http = require('node:http');
const config = require('./config');
const { validateDocument } = require('./upload');

const server = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/documents') {
    const len = Number(req.headers['content-length'] || 0);
    const v = validateDocument(len);
    res.statusCode = v.ok ? 202 : 413;
    res.end(JSON.stringify(v));
    return;
  }
  res.statusCode = 404;
  res.end('not found');
});

if (require.main === module) server.listen(config.port);
module.exports = { server };
X
cat > public/upload.js <<'X'
// Client-side pre-check so people do not wait for a doomed upload.
const MAX_BYTES = 5242880;

document.getElementById('doc').addEventListener('change', (ev) => {
  const file = ev.target.files[0];
  const note = document.getElementById('note');
  if (file && file.size > MAX_BYTES) {
    note.textContent = 'File is larger than 5 MB';
    ev.target.value = '';
  } else {
    note.textContent = '';
  }
});
X
cat > public/index.html <<'X'
<!doctype html>
<meta charset="utf-8">
<title>docdrop</title>
<input id="doc" type="file"><p id="note"></p>
<script src="upload.js"></script>
X
ci "feat(server): documents endpoint and browser pre-check" 2

cat > nginx.conf <<'X'
server {
    listen 80;
    client_max_body_size 5m;
    location / {
        proxy_pass http://app:3000;
    }
}
X
cat > docker-compose.yml <<'X'
services:
  app:
    build: .
    environment:
      PORT: "3000"
      DOCDROP_MAX_DOC_BYTES: "5242880"
  proxy:
    image: nginx:1.27
    volumes:
      - ./nginx.conf:/etc/nginx/conf.d/default.conf:ro
    ports:
      - "8080:80"
X
cat > .env.example <<'X'
PORT=3000
DOCDROP_MAX_DOC_BYTES=5242880
SESSION_SECRET=changeme-local
X
cat > Dockerfile <<'X'
FROM node:20-alpine
WORKDIR /app
COPY package.json ./
COPY src ./src
COPY public ./public
CMD ["node", "src/server.js"]
X
ci "chore: docker, nginx and env example" 0

cat > README.md <<'X'
# docdrop

Small document drop service. Upload documents up to 5MB and avatars up to 5MB.

    npm start
    npm test

See `docs/api.md` and `docs/deploy.md`.
X
cat > docs/api.md <<'X'
# API

## POST /documents

Uploads a document. Maximum document size: 4 MB. Larger bodies get HTTP 413.

## Avatars

Avatars may be at most 5 MB.
X
cat > docs/deploy.md <<'X'
# Deploying

Run `docker compose up`. The nginx proxy in `nginx.conf` has its own body
limit (`client_max_body_size`); keep it at least as large as the document
limit or uploads are cut off before they reach the app.
X
cat > CHANGELOG.md <<'X'
# Changelog

## 1.2.0
- Avatar size validation.

## 1.1.0
- Browser pre-check.

## 1.0.0
- First release.
X
ci "docs: readme, api, deploy, changelog" 1

for i in $(seq 1 16); do
  if [ $((i%2)) -eq 0 ]; then
    printf -- '- 2026-%02d: ops note %d, proxy logs rotate weekly.\n' $((i%9+1)) $i >> docs/ops-log.md
    ci "docs: ops note $i" $((i%3))
  else
    printf 'sample %d\n' $i > test/sample_$i.txt
    ci "test: add upload sample $i" $((i%3))
  fi
done
