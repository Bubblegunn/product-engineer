#!/usr/bin/env bash
set -euo pipefail
cd "$1"
git init -q -b main
git config user.name "Dev Owner"
git config user.email "owner@example.test"
n=0
c() {
  n=$((n+1))
  local d
  d=$(printf '2026-%02d-%02dT09:%02d:00+0000' $((1+n/25)) $((1+n%25)) "$n")
  git add -A
  GIT_AUTHOR_DATE="$d" GIT_COMMITTER_DATE="$d" git commit -q -m "$1"
}
util() {
  mkdir -p src/util test
  cat > "src/util/$1.js" <<EOF
'use strict';
exports.$2 = $3;
EOF
  cat > "test/util-$1.test.js" <<EOF
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { $2 } = require('../src/util/$1');
test('$1 $2', () => {
  assert.strictEqual($4, $5);
});
EOF
  c "feat(util): add $1.$2"
}

mkdir -p src/auth src/routes src/util test scripts docs
cat > package.json <<'EOF'
{
  "name": "portal",
  "version": "2.4.0",
  "description": "Customer portal backend",
  "main": "src/index.js",
  "scripts": { "test": "node --test" },
  "license": "MIT"
}
EOF
cat > README.md <<'EOF'
# portal

Customer portal backend. Public routes live in `src/routes/public.js`, the
admin area in `src/routes/admin.js`. Authentication is in `src/auth/`.

    npm test
    node scripts/rotate-keys.js alice bob

Migration notes for the auth rewrite: `docs/migrating-auth.md`.
EOF
cat > CHANGELOG.md <<'EOF'
# Changelog

## Unreleased

## 2.4.0
- Add `scripts/rotate-keys.js`.

## 2.0.0
- New `src/auth/session.js`. `src/auth/legacy.js` is deprecated.
EOF
c "chore: project skeleton"

cat > src/auth/users.js <<'EOF'
'use strict';
const crypto = require('crypto');

// Demo user table. Both hash columns exist while two auth modules coexist.
const seed = [
  ['alice', 'wonderland', 'admin'],
  ['bob', 'builder', 'member'],
  ['carol', 'danvers', 'member'],
];
const sha = (alg, s) => crypto.createHash(alg).update(s).digest('hex');
const records = seed.map(([name, pw, role]) => ({
  name,
  role,
  sha1: sha('sha1', pw),
  sha256: sha('sha256', 'salt:' + pw),
}));

exports.find = (name) => records.find((r) => r.name === name) || null;
exports.sha = sha;
EOF
cat > src/auth/legacy.js <<'EOF'
'use strict';
// Deprecated since 2.0.0. Use ./session.
const crypto = require('crypto');
const users = require('./users');

const SECRET = 'legacy-secret';
const mac = (name) => crypto.createHmac('sha256', SECRET).update(name).digest('hex').slice(0, 16);

exports.checkLogin = (name, pw) => {
  const u = users.find(name);
  return !!u && u.sha1 === users.sha('sha1', pw);
};
exports.signToken = (name) => Buffer.from(name + ':' + mac(name)).toString('base64');
exports.verifyToken = (token) => {
  try {
    const [name, m] = Buffer.from(token, 'base64').toString().split(':');
    return users.find(name) && mac(name) === m ? name : null;
  } catch (e) {
    return null;
  }
};
EOF
cat > test/auth-legacy.test.js <<'EOF'
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const legacy = require('../src/auth/legacy');

test('legacy login accepts right password', () => {
  assert.strictEqual(legacy.checkLogin('alice', 'wonderland'), true);
});
test('legacy login rejects wrong password', () => {
  assert.strictEqual(legacy.checkLogin('alice', 'nope'), false);
});
test('legacy token round trip', () => {
  assert.strictEqual(legacy.verifyToken(legacy.signToken('bob')), 'bob');
});
EOF
c "feat(auth): legacy login and tokens"

cat > src/auth/session.js <<'EOF'
'use strict';
const crypto = require('crypto');
const users = require('./users');

const SECRET = 'session-secret';
const mac = (name) => crypto.createHmac('sha256', SECRET).update(name).digest('hex').slice(0, 24);

function sign(name) {
  return Buffer.from(name + '.' + mac(name)).toString('base64url');
}

function login(name, pw) {
  const u = users.find(name);
  if (!u || u.sha256 !== users.sha('sha256', 'salt:' + pw)) return null;
  return { token: sign(name), role: u.role };
}

function verify(token) {
  try {
    const [name, m] = Buffer.from(String(token), 'base64url').toString().split('.');
    const u = users.find(name);
    return u && mac(name) === m ? { name: u.name, role: u.role } : null;
  } catch (e) {
    return null;
  }
}

module.exports = { sign, login, verify };
EOF
cat > test/auth-session.test.js <<'EOF'
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const session = require('../src/auth/session');

test('login returns token and role', () => {
  const r = session.login('bob', 'builder');
  assert.strictEqual(r.role, 'member');
  assert.deepStrictEqual(session.verify(r.token), { name: 'bob', role: 'member' });
});
test('wrong password returns null', () => {
  assert.strictEqual(session.login('bob', 'x'), null);
});
test('garbage token returns null', () => {
  assert.strictEqual(session.verify('!!'), null);
});
EOF
c "feat(auth): session module replacing legacy"

cat > src/routes/public.js <<'EOF'
'use strict';
const session = require('../auth/session');

function login(body) {
  const r = session.login(body.name, body.password);
  return r ? { status: 200, body: r } : { status: 401 };
}

module.exports = { login };
EOF
cat > src/routes/health.js <<'EOF'
'use strict';
module.exports = { check: () => ({ status: 200, body: { ok: true } }) };
EOF
cat > src/routes/admin.js <<'EOF'
'use strict';
const legacy = require('../auth/legacy');
const users = require('../auth/users');

function requireAdmin(token) {
  const name = legacy.verifyToken(token || '');
  if (!name) return { status: 401 };
  const u = users.find(name);
  if (u.role !== 'admin') return { status: 403 };
  return { status: 200, user: name };
}

function listUsers(token) {
  const gate = requireAdmin(token);
  if (gate.status !== 200) return gate;
  return { status: 200, body: ['alice', 'bob', 'carol'].map((n) => ({ name: n, role: users.find(n).role })) };
}

module.exports = { requireAdmin, listUsers };
EOF
cat > test/routes.test.js <<'EOF'
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const pub = require('../src/routes/public');
const health = require('../src/routes/health');

test('public login ok', () => {
  assert.strictEqual(pub.login({ name: 'carol', password: 'danvers' }).status, 200);
});
test('public login bad', () => {
  assert.strictEqual(pub.login({ name: 'carol', password: 'x' }).status, 401);
});
test('health', () => {
  assert.strictEqual(health.check().status, 200);
});
EOF
cat > test/admin.test.js <<'EOF'
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const legacy = require('../src/auth/legacy');
const admin = require('../src/routes/admin');

test('admin token gets 200', () => {
  assert.strictEqual(admin.requireAdmin(legacy.signToken('alice')).status, 200);
});
test('member token gets 403', () => {
  assert.strictEqual(admin.requireAdmin(legacy.signToken('bob')).status, 403);
});
test('garbage token gets 401', () => {
  assert.strictEqual(admin.requireAdmin('zzz').status, 401);
});
test('listUsers returns three users for admin', () => {
  assert.strictEqual(admin.listUsers(legacy.signToken('alice')).body.length, 3);
});
EOF
c "feat(routes): public, health and admin routes"

cat > scripts/rotate-keys.js <<'EOF'
'use strict';
// Issue fresh tokens for the named users (used by the ops runbook).
const legacy = require('../src/auth/legacy');

function rotate(names) {
  return names.map((name) => ({ name, token: legacy.signToken(name) }));
}

if (require.main === module) {
  const names = process.argv.slice(2);
  if (!names.length) {
    console.error('usage: rotate-keys <name>...');
    process.exit(2);
  }
  for (const r of rotate(names)) console.log(r.name + ' ' + r.token);
}

module.exports = { rotate };
EOF
c "feat(ops): rotate-keys script"

cat > src/index.js <<'EOF'
'use strict';
const session = require('./auth/session');
const legacyAuth = require('./auth/legacy');
const pub = require('./routes/public');
const admin = require('./routes/admin');

module.exports = { session, legacyAuth, routes: { public: pub, admin } };
EOF
cat > docs/migrating-auth.md <<'EOF'
# Migrating from legacy auth

| Legacy (`src/auth/legacy.js`) | Replacement (`src/auth/session.js`)            |
| ----------------------------- | ---------------------------------------------- |
| `checkLogin(name, pw)` -> bool | `login(name, pw)` -> `{token, role}` or `null` |
| `signToken(name)`             | `sign(name)`                                   |
| `verifyToken(t)` -> name      | `verify(t)` -> `{name, role}` or `null`        |

Tokens are not compatible between the two modules.
EOF
cat > docs/api.md <<'EOF'
# API

`require('portal')` exports `session`, `legacyAuth` (deprecated, see
`docs/migrating-auth.md`) and `routes`.
EOF
c "docs: auth migration table and API"

cat > src/util/format.js <<'EOF'
'use strict';
exports.formatPrice = (n) => '$' + n.toLocaleString('en-US');
EOF
cat > test/format.test.js <<'EOF'
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { formatPrice } = require('../src/util/format');

test('formatPrice shows two decimals', () => {
  assert.strictEqual(formatPrice(1234.5), '$1,234.50');
});
EOF
c "feat(util): price formatter"

for spec in \
 "pad|left|(s, n) => String(s).padStart(n, '0')|left(7, 3)|007" \
 "bytes|kb|(n) => Math.round(n / 1024)|kb(2048)|2" \
 "names|initials|(s) => s.split(' ').map((w) => w[0]).join('')|initials('Ada Lovelace')|AL" \
 "keys|join|(...p) => p.join(':')|join('a', 'b')|a:b" \
 "stats|ratio|(a, b) => (b === 0 ? 0 : a / b)|ratio(1, 4)|0.25" ; do
  IFS='|' read -r f fn ex call exp <<<"$spec"
  case "$exp" in 2) e=2;; 0.25) e=0.25;; *) e="'$exp'";; esac
  util "$f" "$fn" "$ex" "$call" "$e"
done
echo node_modules > .gitignore
c "chore: gitignore"
