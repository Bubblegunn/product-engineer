#!/usr/bin/env bash
set -euo pipefail
cd "$1"
git init -q -b main
git config user.name "Maia Lindqvist"
git config user.email "maia@shipbox.test"
N=0
c() { # who(a=Maia|b=Oskar) message
  N=$((N+1)); local d=$((1767225600 + N*194400)) nm em
  if [ "$1" = a ]; then nm="Maia Lindqvist"; em="maia@shipbox.test"; else nm="Oskar Dahl"; em="oskar@shipbox.test"; fi
  git add -A
  GIT_AUTHOR_NAME="$nm" GIT_AUTHOR_EMAIL="$em" GIT_COMMITTER_NAME="$nm" GIT_COMMITTER_EMAIL="$em" \
  GIT_AUTHOR_DATE="@$d +0000" GIT_COMMITTER_DATE="@$d +0000" git commit -q -m "$2"
}
fl() {
  local m="$2"
  case "$m" in
    docs*) echo "- $m" >> docs/notes.md ;;
    test*) printf "const t = require('node:test');\nconst a = require('node:assert');\nt('%s', () => a.ok(true));\n" "case $((N+1))" > "test/extra$((N+1)).test.js" ;;
    *) echo "// $m" >> src/templates.js ;;
  esac
  c "$1" "$m"
}
mkdir -p src config test docs

cat > package.json <<'EOF'
{ "name": "shipbox", "version": "1.1.0", "main": "src/index.js", "scripts": { "test": "node --test" } }
EOF
printf '# shipbox\n\nSends shipping notifications.\n' > README.md
printf '# Notes\n\n' > docs/notes.md
c a "chore: project skeleton"

printf 'SHIPBOX_LOG_LEVEL=info\nSHIPBOX_ADMIN_TOKEN=demo-admin-7731\n' > config/defaults.env
cat > src/config.js <<'EOF'
'use strict';
const fs = require('fs');
const path = require('path');
function defaults() {
  const f = path.join(__dirname, '..', 'config', 'defaults.env');
  const o = {};
  for (const l of fs.readFileSync(f, 'utf8').split('\n')) {
    const m = l.match(/^([A-Z_]+)=(.*)$/);
    if (m) o[m[1]] = m[2];
  }
  return o;
}
function load(env = process.env) {
  const d = defaults();
  const get = (k, def) => env[k] ?? d[k] ?? def;
  return {
    batch: parseInt(get('SHIPBOX_BATCH', '20'), 10),
    retry: get('SHIPBOX_RETRY', 'on') === 'on',
    logLevel: get('SHIPBOX_LOG_LEVEL', 'info'),
    adminToken: get('SHIPBOX_ADMIN_TOKEN', null),
  };
}
module.exports = { load };
EOF
c a "feat: configuration loader"
cat > src/queue.js <<'EOF'
'use strict';
const cfg = require('./config');
function chunks(a, n) {
  const o = [];
  for (let i = 0; i < a.length; i += n) o.push(a.slice(i, i + n));
  return o;
}
async function drain(items, send, conf = cfg.load()) {
  for (const b of chunks(items, conf.batch)) await Promise.all(b.map(send));
}
module.exports = { drain, chunks };
EOF
cat > test/queue.test.js <<'EOF'
const test = require('node:test');
const assert = require('node:assert');
const { drain, chunks } = require('../src/queue');
test('chunks splits evenly', () => {
  assert.deepEqual(chunks([1, 2, 3, 4, 5], 2), [[1, 2], [3, 4], [5]]);
});
test('drain sends everything', async () => {
  const got = [];
  await drain([1, 2, 3], async (x) => { got.push(x); }, { batch: 2 });
  assert.deepEqual(got, [1, 2, 3]);
});
EOF
c a "feat: batched queue"
cat > src/templates.js <<'EOF'
'use strict';
const shipped = (o) => `Your order ${o.id} has shipped.`;
module.exports = { shipped };
EOF
cat > src/mailer.js <<'EOF'
'use strict';
const { shipped } = require('./templates');
const outbox = [];
function sendEmail(order) {
  outbox.push({ to: order.email, body: shipped(order) });
  return outbox.length;
}
module.exports = { sendEmail, outbox };
EOF
cat > src/index.js <<'EOF'
'use strict';
const { drain } = require('./queue');
const { sendEmail } = require('./mailer');
module.exports = { notify: (orders) => drain(orders, async (o) => sendEmail(o)) };
EOF
c b "feat: email templates and mailer"
cat > README.md <<'EOF'
# shipbox

Sends shipping notifications.

## Settings (environment variables)

| Variable | Default | Meaning |
| --- | --- | --- |
| `SHIPBOX_BATCH` | 20 | how many notifications are sent at once |
| `SHIPBOX_RETRY` | on | `on`/`off`: retry failed sends |
| `SHIPBOX_LOG_LEVEL` | info | `debug`, `info` or `warn` |
| `SHIPBOX_ADMIN_TOKEN` | see config/defaults.env | token for the admin endpoints |
EOF
c a "docs: settings reference"
cat > KNOWN-ISSUES.md <<'EOF'
# Known issues

1. Customers sometimes receive the same shipping email twice. It happens when a retry overlaps a slow send. Status: open.
2. Notifications are not paused at night. Status: open, feature planned.
EOF
c b "docs: known issues list"
fl a "docs: runbook outline"
fl b "test: extra queue case"
fl a "chore: template comment"
cat > docs/runbook.md <<'EOF'
# Runbook

Restart the service if the outbox stops growing. Logs are on stdout.
EOF
c b "docs: runbook"
sed -i.bak 's/"version": "1.1.0"/"version": "1.2.0"/' package.json && rm package.json.bak
c a "chore: release 1.2.0"
git tag v1.2.0

# ---------------- 1.3 line ----------------
cat > src/sms.js <<'EOF'
'use strict';
const sent = [];
function sendSms(order) {
  sent.push({ to: order.phone, id: order.id });
  return sent.length;
}
module.exports = { sendSms, sent };
EOF
python3 - <<'PY'
p='src/config.js'
s=open(p).read()
s=s.replace("    logLevel:","    sms: get('SHIPBOX_SMS', 'on') === 'on',\n    logLevel:")
open(p,'w').write(s)
PY
c a "feat: SMS notifications"
fl b "chore: template comment two"
# quiet hours (reverted later, reapplied)
cat > src/quiet.js <<'EOF'
'use strict';
function inQuiet(hour, spec) {
  if (!spec) return false;
  const [s, e] = spec.split('-').map(Number);
  return s > e ? hour >= s || hour < e : hour >= s && hour < e;
}
module.exports = { inQuiet };
EOF
python3 - <<'PY'
p='src/config.js'
s=open(p).read()
s=s.replace("    logLevel:","    quietHours: get('SHIPBOX_QUIET_HOURS', null),\n    logLevel:")
open(p,'w').write(s)
PY
c b "feat: quiet hours"
QUIET=$(git rev-parse HEAD)
fl a "docs: quiet hours idea notes"
git revert --no-commit "$QUIET"
c a 'Revert "feat: quiet hours"'
# understated cleanup: removes SHIPBOX_RETRY and SHIPBOX_SMS, batch default 20 -> 5
cat > src/config.js <<'EOF'
'use strict';
const fs = require('fs');
const path = require('path');
function defaults() {
  const f = path.join(__dirname, '..', 'config', 'defaults.env');
  const o = {};
  for (const l of fs.readFileSync(f, 'utf8').split('\n')) {
    const m = l.match(/^([A-Z_]+)=(.*)$/);
    if (m) o[m[1]] = m[2];
  }
  return o;
}
function load(env = process.env) {
  const d = defaults();
  const get = (k, def) => env[k] ?? d[k] ?? def;
  return {
    batch: parseInt(get('SHIPBOX_BATCH', '5'), 10),
    retry: true,
    sms: true,
    logLevel: get('SHIPBOX_LOG_LEVEL', 'info'),
    adminToken: get('SHIPBOX_ADMIN_TOKEN', null),
  };
}
module.exports = { load };
EOF
c a "chore: config cleanup"
# title says dedupe notifications, but it only covers SMS
cat > src/dedupe.js <<'EOF'
'use strict';
const seen = new Set();
function once(key) {
  if (seen.has(key)) return false;
  seen.add(key);
  return true;
}
module.exports = { once, seen };
EOF
cat > src/sms.js <<'EOF'
'use strict';
const { once } = require('./dedupe');
const sent = [];
function sendSms(order) {
  if (!once('sms:' + order.id)) return sent.length;
  sent.push({ to: order.phone, id: order.id });
  return sent.length;
}
module.exports = { sendSms, sent };
EOF
c b "fix: dedupe notifications"
fl a "test: extra dedupe case"
printf 'SHIPBOX_LOG_LEVEL=info\n' > config/defaults.env
c b "chore: remove hardcoded token"
cat > CHANGELOG.md <<'EOF'
# Changelog

## 1.3.0
- SMS notifications for shipped orders.
- Smaller default batch size.
- Admin token is no longer shipped in the repository.

## 1.2.0
- Batched queue, email templates, runbook.
EOF
sed -i.bak 's/"version": "1.2.0"/"version": "1.3.0"/' package.json && rm package.json.bak
c a "chore: release 1.3.0"
git tag v1.3.0
# SMS flag comes back, default off
sed -i.bak "s/    sms: true,/    sms: get('SHIPBOX_SMS', 'off') === 'on',/" src/config.js && rm src/config.js.bak
cat > test/config.test.js <<'EOF'
const test = require('node:test');
const assert = require('node:assert');
const { load } = require('../src/config');
test('defaults', () => {
  const c = load({});
  assert.equal(c.batch, 5);
  assert.equal(c.sms, false);
  assert.equal(c.adminToken, null);
});
test('env overrides', () => {
  const c = load({ SHIPBOX_BATCH: '9', SHIPBOX_SMS: 'on' });
  assert.equal(c.batch, 9);
  assert.equal(c.sms, true);
});
EOF
c b "fix: SMS flood on retry"
fl a "docs: notes after flood"
# reapply quiet hours (written fresh, with a fix to the wrap-around check)
cat > src/quiet.js <<'EOF'
'use strict';
function inQuiet(hour, spec) {
  if (!spec) return false;
  const [s, e] = spec.split('-').map(Number);
  return s > e ? hour >= s || hour < e : hour >= s && hour < e;
}
module.exports = { inQuiet };
EOF
sed -i.bak "s/    logLevel:/    quietHours: get('SHIPBOX_QUIET_HOURS', null),\n    logLevel:/" src/config.js && rm src/config.js.bak
cat > test/quiet.test.js <<'EOF'
const test = require('node:test');
const assert = require('node:assert');
const { inQuiet } = require('../src/quiet');
test('quiet hours wrap midnight', () => {
  assert.equal(inQuiet(23, '22-07'), true);
  assert.equal(inQuiet(6, '22-07'), true);
  assert.equal(inQuiet(7, '22-07'), false);
  assert.equal(inQuiet(12, '22-07'), false);
  assert.equal(inQuiet(12, null), false);
});
EOF
c a 'Reapply "feat: quiet hours"'
sed -i.bak 's/"version": "1.3.0"/"version": "1.3.1"/' package.json && rm package.json.bak
printf '\n## 1.3.1\n- Quiet hours (`SHIPBOX_QUIET_HOURS`, for example `22-07`).\n- SMS is off unless `SHIPBOX_SMS=on`.\n' >> CHANGELOG.md
c a "chore: release 1.3.1"
git tag v1.3.1
fl b "docs: support contacts draft"
fl b "chore: template comment three"
# unrelated change that ships in 1.3.2
sed -i.bak "s#^// chore: template comment three#// chore: template comment three\n// timezone note: quiet hours use server time#" src/templates.js && rm src/templates.js.bak
c b "fix: quiet hours use server time consistently"
fl a "test: extra config case"
sed -i.bak 's/"version": "1.3.1"/"version": "1.3.2"/' package.json && rm package.json.bak
python3 - <<'PY'
p='CHANGELOG.md'
s=open(p).read()
s=s.replace("# Changelog\n","# Changelog\n\n## 1.3.2\n- Fixed: duplicate shipping emails.\n- Quiet hours now consistent.\n",1)
open(p,'w').write(s)
PY
c a "chore: release 1.3.2"
git tag v1.3.2
fl b "docs: handover prep notes"
fl a "docs: oncall notes"
fl b "test: extra queue case two"
fl a "docs: faq draft"
fl b "chore: template comment four"

# unmerged hotfix branch with the real email fix
git branch hotfix/dup-email v1.3.2
git checkout -q hotfix/dup-email
cat > src/mailer.js <<'EOF'
'use strict';
const { shipped } = require('./templates');
const { once } = require('./dedupe');
const outbox = [];
function sendEmail(order) {
  if (!once('email:' + order.id)) return outbox.length;
  outbox.push({ to: order.email, body: shipped(order) });
  return outbox.length;
}
module.exports = { sendEmail, outbox };
EOF
c b "fix: dedupe shipping emails by order id"
cat > test/mailer.test.js <<'EOF'
const test = require('node:test');
const assert = require('node:assert');
const { sendEmail, outbox } = require('../src/mailer');
test('same order is emailed once', () => {
  sendEmail({ id: 'o1', email: 'a@x.test' });
  sendEmail({ id: 'o1', email: 'a@x.test' });
  assert.equal(outbox.length, 1);
});
EOF
c b "test: duplicate email regression"
git checkout -q main
