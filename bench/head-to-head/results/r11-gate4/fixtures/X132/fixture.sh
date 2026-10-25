#!/usr/bin/env bash
set -euo pipefail
mkdir -p "$1"; cd "$1"
git init -q -b main
git config user.name "Dana Whitfield"
git config user.email "dana.whitfield@example.com"
c() {
  case "$1" in
    1) n="Dana Whitfield"; e="dana.whitfield@example.com";;
    2) n="Marek Kowal"; e="marek.kowal@example.com";;
    *) n="Priya Raman"; e="priya.raman@example.com";;
  esac
  git add -A
  GIT_AUTHOR_NAME="$n" GIT_AUTHOR_EMAIL="$e" GIT_AUTHOR_DATE="$2" GIT_COMMITTER_NAME="$n" GIT_COMMITTER_EMAIL="$e" GIT_COMMITTER_DATE="$2" git commit -q -m "$3"
}
mkdir -p src/middleware test docs

cat > package.json <<'EOF'
{
  "name": "ticketdesk",
  "version": "1.4.0",
  "description": "Tiny internal ticket service",
  "main": "src/server.js",
  "scripts": {
    "start": "node src/server.js",
    "test": "node --test"
  },
  "license": "UNLICENSED",
  "private": true
}
EOF
cat > README.md <<'EOF'
# ticketdesk

A small in-memory ticket service used by the support team for triage demos.

    npm start        # listens on PORT (default 3000)
    npm test

Configuration lives in `src/config.js`. See `docs/api.md` for endpoints and
`docs/ops.md` for deployment notes.
EOF
printf 'node_modules/\n*.log\n.DS_Store\n' > .gitignore
printf 'root = true\n\n[*]\nindent_style = space\nindent_size = 2\nend_of_line = lf\ninsert_final_newline = true\n' > .editorconfig
c 1 "2026-05-04T09:00:00+0000" "chore: project skeleton"

cat > src/config.js <<'EOF'
'use strict';

const config = {
  port: Number(process.env.PORT || 3000),
  logLevel: process.env.LOG_LEVEL || 'info',
  trustProxy: process.env.TRUST_PROXY === '1',
  maxBodyBytes: 64 * 1024,
};

module.exports = config;
EOF
c 1 "2026-05-04T09:40:00+0000" "feat: central config module"

cat > src/store.js <<'EOF'
'use strict';

const tickets = new Map();
let nextId = 1;

function create(data) {
  const ticket = { id: nextId++, status: 'open', ...data };
  tickets.set(ticket.id, ticket);
  return ticket;
}

function get(id) {
  return tickets.get(id);
}

function list() {
  return Array.from(tickets.values());
}

function reset() {
  tickets.clear();
  nextId = 1;
}

module.exports = { create, get, list, reset };
EOF
cat > test/store.test.js <<'EOF'
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const store = require('../src/store');

test.beforeEach(() => store.reset());

test('create assigns incrementing ids and open status', () => {
  const a = store.create({ title: 'Printer jam' });
  const b = store.create({ title: 'VPN down' });
  assert.strictEqual(a.id, 1);
  assert.strictEqual(b.id, 2);
  assert.strictEqual(a.status, 'open');
});

test('list returns all tickets', () => {
  store.create({ title: 'One' });
  store.create({ title: 'Two' });
  assert.strictEqual(store.list().length, 2);
});
EOF
c 2 "2026-05-05T10:00:00+0000" "feat: in-memory ticket store"

cat > src/tickets.js <<'EOF'
'use strict';

function validate(input) {
  const errors = [];
  if (!input || typeof input.title !== 'string' || input.title.trim() === '') {
    errors.push('title is required');
  } else if (input.title.length > 120) {
    errors.push('title must be at most 120 characters');
  }
  return errors;
}

module.exports = { validate };
EOF
cat > test/tickets.test.js <<'EOF'
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { validate } = require('../src/tickets');

test('accepts a normal title', () => {
  assert.deepStrictEqual(validate({ title: 'Laptop battery swollen' }), []);
});

test('rejects empty and overlong titles', () => {
  assert.strictEqual(validate({ title: '  ' }).length, 1);
  assert.strictEqual(validate({ title: 'x'.repeat(121) }).length, 1);
});
EOF
c 2 "2026-05-05T14:30:00+0000" "feat: ticket validation"

cat > src/middleware/compose.js <<'EOF'
'use strict';

// Runs middleware functions in order; each calls next() to continue.
function compose(middlewares, final) {
  return function run(req, res) {
    let i = 0;
    function next(err) {
      if (err) {
        res.statusCode = 500;
        res.end(JSON.stringify({ error: 'internal' }));
        return;
      }
      const mw = middlewares[i++];
      if (!mw) return final(req, res);
      try {
        mw(req, res, next);
      } catch (e) {
        next(e);
      }
    }
    next();
  };
}

module.exports = { compose };
EOF
cat > test/compose.test.js <<'EOF'
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { compose } = require('../src/middleware/compose');

test('runs middleware in order then the final handler', () => {
  const calls = [];
  const run = compose(
    [(q, s, n) => { calls.push('a'); n(); }, (q, s, n) => { calls.push('b'); n(); }],
    () => calls.push('final')
  );
  run({}, {});
  assert.deepStrictEqual(calls, ['a', 'b', 'final']);
});

test('a middleware that does not call next stops the chain', () => {
  const calls = [];
  const run = compose([() => calls.push('stop')], () => calls.push('final'));
  run({}, {});
  assert.deepStrictEqual(calls, ['stop']);
});
EOF
c 1 "2026-05-06T09:15:00+0000" "feat: middleware compose helper"

cat > src/middleware/logger.js <<'EOF'
'use strict';
const config = require('../config');

function clientIp(req) {
  const xff = req.headers && req.headers['x-forwarded-for'];
  if (config.trustProxy && xff) return xff.split(',')[0].trim();
  return (req.socket && req.socket.remoteAddress) || 'unknown';
}

function logger(req, res, next) {
  if (config.logLevel !== 'silent') {
    console.log(`${req.method} ${req.url} from ${clientIp(req)}`);
  }
  next();
}

module.exports = { logger, clientIp };
EOF
cat > test/logger.test.js <<'EOF'
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const config = require('../src/config');
const { clientIp } = require('../src/middleware/logger');

test('uses the socket address by default', () => {
  config.trustProxy = false;
  const req = { headers: { 'x-forwarded-for': '9.9.9.9' }, socket: { remoteAddress: '10.0.0.5' } };
  assert.strictEqual(clientIp(req), '10.0.0.5');
});

test('uses the first forwarded address when the proxy is trusted', () => {
  config.trustProxy = true;
  const req = { headers: { 'x-forwarded-for': '9.9.9.9, 10.1.1.1' }, socket: { remoteAddress: '10.0.0.5' } };
  assert.strictEqual(clientIp(req), '9.9.9.9');
  config.trustProxy = false;
});
EOF
c 1 "2026-05-06T11:00:00+0000" "feat: request logger with proxy-aware client ip"

cat > src/middleware/auth.js <<'EOF'
'use strict';

function auth(req, res, next) {
  const user = req.headers && req.headers['x-desk-user'];
  if (!user) {
    res.statusCode = 401;
    res.end(JSON.stringify({ error: 'unauthorized' }));
    return;
  }
  req.user = user;
  next();
}

module.exports = { auth };
EOF
cat > test/auth.test.js <<'EOF'
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { auth } = require('../src/middleware/auth');

function fakeRes() {
  return { statusCode: 200, body: null, end(b) { this.body = b; } };
}

test('rejects requests without a user header', () => {
  const res = fakeRes();
  auth({ headers: {} }, res, () => assert.fail('next called'));
  assert.strictEqual(res.statusCode, 401);
});

test('passes and records the user', () => {
  const req = { headers: { 'x-desk-user': 'amira' } };
  let called = false;
  auth(req, fakeRes(), () => { called = true; });
  assert.ok(called);
  assert.strictEqual(req.user, 'amira');
});
EOF
c 2 "2026-05-07T10:20:00+0000" "feat: header based auth middleware"

cat > src/router.js <<'EOF'
'use strict';
const store = require('./store');
const { validate } = require('./tickets');

function send(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
}

function handle(req, res, body) {
  const url = req.url.split('?')[0];
  if (req.method === 'GET' && url === '/tickets') return send(res, 200, store.list());
  if (req.method === 'POST' && url === '/tickets') {
    const errors = validate(body);
    if (errors.length) return send(res, 422, { errors });
    return send(res, 201, store.create({ title: body.title.trim() }));
  }
  const m = /^\/tickets\/(\d+)$/.exec(url);
  if (req.method === 'GET' && m) {
    const t = store.get(Number(m[1]));
    return t ? send(res, 200, t) : send(res, 404, { error: 'not_found' });
  }
  return send(res, 404, { error: 'not_found' });
}

module.exports = { handle };
EOF
c 1 "2026-05-11T09:00:00+0000" "feat: router for ticket endpoints"

cat > src/server.js <<'EOF'
'use strict';
const http = require('node:http');
const config = require('./config');
const { compose } = require('./middleware/compose');
const { logger } = require('./middleware/logger');
const { auth } = require('./middleware/auth');
const router = require('./router');

function readBody(req, cb) {
  let size = 0;
  const chunks = [];
  req.on('data', (c) => {
    size += c.length;
    if (size <= config.maxBodyBytes) chunks.push(c);
  });
  req.on('end', () => {
    try {
      cb(chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {});
    } catch (e) {
      cb(null);
    }
  });
}

function createServer() {
  const chain = compose([logger, auth], (req, res) => {
    readBody(req, (body) => router.handle(req, res, body));
  });
  return http.createServer(chain);
}

if (require.main === module) {
  createServer().listen(config.port, () => {
    console.log(`ticketdesk listening on ${config.port}`);
  });
}

module.exports = { createServer };
EOF
c 1 "2026-05-11T11:30:00+0000" "feat: http server wiring"

cat > docs/api.md <<'EOF'
# API

All requests need an `X-Desk-User` header.

| Method | Path | Description |
| ------ | ---- | ----------- |
| GET | /tickets | List tickets |
| POST | /tickets | Create a ticket (`{"title": "..."}`) |
| GET | /tickets/:id | Fetch one ticket |

Errors are JSON: `{"error": "..."}` or `{"errors": [...]}` for validation.
EOF
c 2 "2026-05-12T13:00:00+0000" "docs: API reference"

cat > CHANGELOG.md <<'EOF'
# Changelog

## Unreleased

## 1.4.0 - 2026-05-01
- Ticket validation.
- Header based authentication.
EOF
cat > package-lock.json <<'EOF'
{
  "name": "ticketdesk",
  "version": "1.4.0",
  "lockfileVersion": 3,
  "requires": true,
  "packages": {
    "": {
      "name": "ticketdesk",
      "version": "1.4.0",
      "license": "UNLICENSED"
    }
  }
}
EOF
c 1 "2026-05-13T08:45:00+0000" "chore: changelog and lockfile"

cat > docs/ops.md <<'EOF'
# Operations

- `PORT` sets the listening port (default 3000).
- `LOG_LEVEL=silent` disables request logging.
- `TRUST_PROXY=1` makes the service read the client address from
  `X-Forwarded-For`. Only enable it behind a proxy you control.
EOF
c 3 "2026-05-14T10:00:00+0000" "docs: operations notes"

# ---------- feature branch (Priya) ----------
git checkout -q -b feature/rate-limit
python3 - <<'PY'
p="src/config.js"
s=open(p).read()
s=s.replace("  trustProxy: process.env.TRUST_PROXY === '1',\n","  trustProxy: process.env.TRUST_PROXY === '1',\n  rateLimit: { windowMs: 60 * 1000, max: 100 },\n")
open(p,"w").write(s)
PY
c 3 "2026-05-18T09:00:00+0000" "feat: rate limit settings"

cat > src/middleware/ratelimit.js <<'EOF'
'use strict';
const config = require('../config');

const hits = new Map();

function clientIp(req) {
  const xff = req.headers && req.headers['x-forwarded-for'];
  if (config.trustProxy && xff) return xff.split(',')[0].trim();
  return (req.socket && req.socket.remoteAddress) || 'unknown';
}

function rateLimit(req, res, next) {
  const now = Date.now();
  const ip = clientIp(req);
  let entry = hits.get(ip);
  if (!entry || now - entry.start >= config.rateLimit.windowMs) {
    entry = { start: now, count: 0 };
    hits.set(ip, entry);
  }
  entry.count += 1;
  if (entry.count > config.rateLimit.max) {
    const retry = Math.ceil((entry.start + config.rateLimit.windowMs - now) / 1000);
    res.statusCode = 429;
    res.setHeader('Retry-After', String(retry));
    res.end(JSON.stringify({ error: 'rate_limited' }));
    return;
  }
  next();
}

function reset() {
  hits.clear();
}

module.exports = { rateLimit, reset };
EOF
python3 - <<'PY'
p="src/server.js"
s=open(p).read()
s=s.replace("const { auth } = require('./middleware/auth');\n","const { auth } = require('./middleware/auth');\nconst { rateLimit } = require('./middleware/ratelimit');\n")
s=s.replace("compose([logger, auth]","compose([logger, rateLimit, auth]")
open(p,"w").write(s)
PY
c 3 "2026-05-18T14:00:00+0000" "feat: per-client rate limit middleware"

cat > test/ratelimit.test.js <<'EOF'
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const config = require('../src/config');
const { rateLimit, reset } = require('../src/middleware/ratelimit');

function fakeRes() {
  return {
    statusCode: 200,
    headers: {},
    body: null,
    setHeader(k, v) { this.headers[k] = v; },
    end(b) { this.body = b; },
  };
}

function req(addr, xff) {
  return { headers: xff ? { 'x-forwarded-for': xff } : {}, socket: { remoteAddress: addr } };
}

test.beforeEach(() => {
  reset();
  config.rateLimit.max = 2;
  config.trustProxy = false;
});

test('allows requests up to the limit then answers 429', () => {
  let passed = 0;
  const last = fakeRes();
  rateLimit(req('10.0.0.1'), fakeRes(), () => passed++);
  rateLimit(req('10.0.0.1'), fakeRes(), () => passed++);
  rateLimit(req('10.0.0.1'), last, () => passed++);
  assert.strictEqual(passed, 2);
  assert.strictEqual(last.statusCode, 429);
  assert.ok(Number(last.headers['Retry-After']) >= 1);
});

test('separate clients behind a trusted proxy get separate buckets', () => {
  config.trustProxy = true;
  config.rateLimit.max = 1;
  let passed = 0;
  rateLimit(req('10.0.0.9', '1.1.1.1'), fakeRes(), () => passed++);
  rateLimit(req('10.0.0.9', '2.2.2.2'), fakeRes(), () => passed++);
  assert.strictEqual(passed, 2);
});
EOF
c 3 "2026-05-19T10:30:00+0000" "test: rate limit middleware"

python3 - <<'PY'
p="docs/api.md"
s=open(p).read()
s+="""
## Rate limiting

Each client address may make `rateLimit.max` requests per `rateLimit.windowMs`.
Beyond that the service answers `429` with a `Retry-After` header (seconds).
"""
open(p,"w").write(s)
p="CHANGELOG.md"
s=open(p).read()
s=s.replace("## Unreleased\n","## Unreleased\n- Rate limiting per client address (429 with Retry-After).\n")
open(p,"w").write(s)
PY
c 3 "2026-05-19T15:00:00+0000" "docs: document rate limiting"

# ---------- main continues ----------
git checkout -q main

python3 - <<'PY'
p="src/store.js"
s=open(p).read()
s=s.replace("function get(id) {\n  return tickets.get(id);\n}","function get(id) {\n  const t = tickets.get(id);\n  return t ? { ...t } : undefined;\n}")
s=s.replace("  return Array.from(tickets.values());","  return Array.from(tickets.values(), (t) => ({ ...t }));")
open(p,"w").write(s)
PY
c 2 "2026-05-20T09:00:00+0000" "fix: store returns copies so callers cannot mutate tickets"
cat >> test/store.test.js <<'EOF'

test('get returns a copy', () => {
  const a = store.create({ title: 'Copy me' });
  store.get(a.id).title = 'changed';
  assert.strictEqual(store.get(a.id).title, 'Copy me');
});
EOF
c 2 "2026-05-20T09:30:00+0000" "test: store copy semantics"

python3 - <<'PY'
p="src/tickets.js"
s=open(p).read()
s=s.replace("  return errors;","  if (input && input.priority !== undefined && !PRIORITIES.includes(input.priority)) {\n    errors.push('priority must be one of ' + PRIORITIES.join(', '));\n  }\n  return errors;")
s=s.replace("function validate","const PRIORITIES = ['low', 'normal', 'high'];\n\nfunction validate")
s=s.replace("module.exports = { validate };","module.exports = { validate, PRIORITIES };")
open(p,"w").write(s)
p="src/router.js"
s=open(p).read()
s=s.replace("store.create({ title: body.title.trim() })","store.create({ title: body.title.trim(), priority: body.priority || 'normal' })")
open(p,"w").write(s)
PY
c 1 "2026-05-21T10:00:00+0000" "feat: ticket priority field"
cat >> test/tickets.test.js <<'EOF'

test('rejects unknown priority', () => {
  assert.strictEqual(validate({ title: 'ok', priority: 'urgent' }).length, 1);
  assert.deepStrictEqual(validate({ title: 'ok', priority: 'high' }), []);
});
EOF
c 1 "2026-05-21T10:40:00+0000" "test: priority validation"
python3 - <<'PY'
p="docs/api.md"
s=open(p).read()
s=s.replace("(`{\"title\": \"...\"}`)","(`{\"title\": \"...\", \"priority\": \"low|normal|high\"}`)")
open(p,"w").write(s)
PY
c 1 "2026-05-21T11:00:00+0000" "docs: priority in API reference"

python3 - <<'PY'
p="src/middleware/logger.js"
s=open(p).read()
s=s.replace("console.log(`${req.method}","console.log(`${new Date().toISOString()} ${req.method}")
open(p,"w").write(s)
PY
c 2 "2026-05-25T09:00:00+0000" "refactor: logger prints ISO timestamps"
cat >> test/logger.test.js <<'EOF'

test('prints an ISO timestamp in front of each line', () => {
  const { logger } = require('../src/middleware/logger');
  const lines = [];
  const orig = console.log;
  console.log = (l) => lines.push(l);
  try {
    logger({ method: 'GET', url: '/tickets', headers: {}, socket: { remoteAddress: '10.0.0.5' } }, {}, () => {});
  } finally {
    console.log = orig;
  }
  assert.match(lines[0], /^\d{4}-\d{2}-\d{2}T/);
});
EOF
c 2 "2026-05-25T09:30:00+0000" "test: logger timestamp"

python3 - <<'PY'
p="src/config.js"
s=open(p).read()
s=s.replace("  maxBodyBytes: 64 * 1024,\n","  maxBodyBytes: 64 * 1024,\n  requestTimeoutMs: Number(process.env.REQUEST_TIMEOUT_MS || 10000),\n")
open(p,"w").write(s)
p="src/server.js"
s=open(p).read()
s=s.replace("  return http.createServer(chain);","  const server = http.createServer(chain);\n  server.setTimeout(config.requestTimeoutMs);\n  return server;")
open(p,"w").write(s)
p="CHANGELOG.md"
s=open(p).read()
s=s.replace("## Unreleased\n","## Unreleased\n- Configurable request timeout (`REQUEST_TIMEOUT_MS`).\n")
open(p,"w").write(s)
PY
c 1 "2026-05-26T10:00:00+0000" "feat: configurable request timeout"

python3 - <<'PY'
import re
p="src/config.js"
s=open(p).read()
s=s.replace("  trustProxy: process.env.TRUST_PROXY === '1',\n","  proxy: {\n    trust: process.env.TRUST_PROXY === '1',\n  },\n")
open(p,"w").write(s)
p="src/middleware/logger.js"
s=open(p).read()
s=s.replace("config.trustProxy","config.proxy.trust")
open(p,"w").write(s)
p="test/logger.test.js"
s=open(p).read()
s=s.replace("config.trustProxy","config.proxy.trust")
open(p,"w").write(s)
PY
c 1 "2026-05-27T09:00:00+0000" "refactor: group proxy settings under config.proxy"
python3 - <<'PY'
p="docs/ops.md"
s=open(p).read()
s=s.replace("- `TRUST_PROXY=1` makes the service read","- `TRUST_PROXY=1` (config key `proxy.trust`) makes the service read")
open(p,"w").write(s)
PY
c 1 "2026-05-27T09:20:00+0000" "docs: ops notes use the proxy.trust key"

python3 - <<'PY'
p="src/middleware/auth.js"
s=open(p).read()
s=s.replace("if (!user) {","if (!user || user.trim() === '') {")
open(p,"w").write(s)
PY
c 2 "2026-05-28T11:00:00+0000" "fix: auth rejects a blank user header"
cat >> test/auth.test.js <<'EOF'

test('rejects a whitespace only user header', () => {
  const res = fakeRes();
  auth({ headers: { 'x-desk-user': '   ' } }, res, () => assert.fail('next called'));
  assert.strictEqual(res.statusCode, 401);
});
EOF
c 2 "2026-05-28T11:30:00+0000" "test: blank user header"

# ---------- owner's uncommitted, unrelated work ----------
cat >> README.md <<'EOF'

## Local notes (Dana)

Demo data for the Thursday triage session lives in the shared drive, not here.
EOF
printf 'GET http://localhost:3000/tickets\nX-Desk-User: dana\n' > scratch.http
